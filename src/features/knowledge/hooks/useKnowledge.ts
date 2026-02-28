import { useCallback, useEffect, useState } from 'react';
import config from '@/config';
import { GoogleDriveKnowledgeAdapter } from '@/features/knowledge/api/GoogleDriveKnowledgeAdapter';
import type {
    Knowledge,
    KnowledgeArticle,
    KnowledgeChapter,
    KnowledgeStorageAdapter,
} from '@/features/knowledge/types';
import { Storage } from '@/lib/Storage';

const CACHE_KEY = 'posteena_knowledge_cache';
const SYNC_PENDING_KEY = 'posteena_knowledge_sync_pending';

export function useKnowledge() {
    const [adapter] = useState<KnowledgeStorageAdapter>(
        () => new GoogleDriveKnowledgeAdapter(config.googleClientId),
    );
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [knowledge, setKnowledge] = useState<Knowledge>({
        chapters: [],
        articles: [],
    });
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userIdentifier, setUserIdentifier] = useState<string | null>(null);

    const sync = useCallback(
        async (force = false): Promise<void> => {
            if (!isAuthenticated && !force) {
                return;
            }
            setIsSyncing(true);
            try {
                const hasPending = Storage.get<boolean>(
                    SYNC_PENDING_KEY,
                    false,
                );
                if (hasPending) {
                    const localKnowledge = Storage.get<Knowledge>(CACHE_KEY, {
                        chapters: [],
                        articles: [],
                    });
                    await adapter.saveKnowledge(localKnowledge);
                    Storage.set(SYNC_PENDING_KEY, false);
                } else {
                    const remoteKnowledge = await adapter.fetchKnowledge();
                    setKnowledge(remoteKnowledge);
                    Storage.set(CACHE_KEY, remoteKnowledge);
                }
            } catch (err) {
                console.error('Knowledge sync failed:', err);
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setIsSyncing(false);
                setLoading(false);
            }
        },
        [adapter, isAuthenticated],
    );

    // Initial auth check and sync
    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true);
            await adapter.init();
            const authed = adapter.isAuthenticated();
            setIsAuthenticated(authed);
            if (authed) {
                try {
                    const userId = await adapter.getUserIdentifier();
                    setUserIdentifier(userId);
                    // Pass force=true because isAuthenticated state update might not be visible in this closure yet
                    await sync(true);
                } catch (err) {
                    console.error('Initial auth check failed:', err);
                    setIsAuthenticated(false);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };
        checkAuth();
    }, [adapter, sync]);

    // Initial load from storage to sync state
    useEffect(() => {
        const localKnowledge = Storage.get<Knowledge>(CACHE_KEY, {
            chapters: [],
            articles: [],
        });
        if (
            localKnowledge.chapters.length > 0 ||
            localKnowledge.articles.length > 0
        ) {
            setKnowledge(localKnowledge);
        }
    }, []);

    // Persist to local storage whenever knowledge changes
    useEffect(() => {
        const currentStorage = Storage.get<Knowledge>(CACHE_KEY, {
            chapters: [],
            articles: [],
        });

        if (JSON.stringify(knowledge) !== JSON.stringify(currentStorage)) {
            Storage.set(CACHE_KEY, knowledge);
            if (isAuthenticated) {
                Storage.set(SYNC_PENDING_KEY, true);
            }
        }
    }, [knowledge, isAuthenticated]);

    // Auto-sync debounced
    useEffect(() => {
        const hasPending = Storage.get<boolean>(SYNC_PENDING_KEY, false);
        if (!hasPending || !isAuthenticated) {
            return;
        }

        const timer = setTimeout(() => {
            void sync();
        }, 3000); // Sync after 3 seconds of inactivity

        return () => clearTimeout(timer);
    }, [knowledge, isAuthenticated, sync]);

    const login = async () => {
        await adapter.login();
        setIsAuthenticated(true);
        const userId = await adapter.getUserIdentifier();
        setUserIdentifier(userId);
        await sync();
    };

    const logout = async () => {
        await adapter.logout();
        setIsAuthenticated(false);
        setKnowledge({ chapters: [], articles: [] });
        setUserIdentifier(null);
    };

    const addChapter = async (
        title: string,
        parentId: string | null = null,
    ) => {
        const newChapter: KnowledgeChapter = {
            id: crypto.randomUUID(),
            title,
            parentId,
            order: knowledge.chapters.filter(c => c.parentId === parentId)
                .length,
        };
        setKnowledge(prev => ({
            ...prev,
            chapters: [...prev.chapters, newChapter],
        }));
        return newChapter;
    };

    const addArticle = async (chapterId: string | null, title: string) => {
        const now = new Date().toISOString();
        const newArticle: KnowledgeArticle = {
            id: crypto.randomUUID(),
            chapterId,
            title,
            content: '',
            color: 'yellow',
            createdAt: now,
            createdBy: userIdentifier || 'unknown',
            updatedAt: now,
            updatedBy: userIdentifier || 'unknown',
            order: knowledge.articles.filter(a => a.chapterId === chapterId)
                .length,
        };
        setKnowledge(prev => ({
            ...prev,
            articles: [...prev.articles, newArticle],
        }));
        return newArticle;
    };

    const updateArticle = async (article: KnowledgeArticle) => {
        const now = new Date().toISOString();
        const updatedArticle = {
            ...article,
            updatedAt: now,
            updatedBy: userIdentifier || 'unknown',
        };
        setKnowledge(prev => ({
            ...prev,
            articles: prev.articles.map(a =>
                a.id === article.id ? updatedArticle : a,
            ),
        }));
    };

    const deleteArticle = async (id: string) => {
        setKnowledge(prev => ({
            ...prev,
            articles: prev.articles.filter(a => a.id !== id),
        }));
    };

    const deleteChapter = async (id: string) => {
        // Recursive delete could be complex, for now just delete the chapter and move sub-items to root or delete them.
        // Let's delete sub-chapters and articles recursively for simplicity.
        const chapterIdsToDelete = new Set<string>([id]);
        const findSubChapters = (parentId: string) => {
            knowledge.chapters.forEach(c => {
                if (c.parentId === parentId) {
                    chapterIdsToDelete.add(c.id);
                    findSubChapters(c.id);
                }
            });
        };
        findSubChapters(id);

        setKnowledge(prev => ({
            ...prev,
            chapters: prev.chapters.filter(c => !chapterIdsToDelete.has(c.id)),
            articles: prev.articles.filter(
                a =>
                    a.chapterId === null ||
                    !chapterIdsToDelete.has(a.chapterId),
            ),
        }));
    };

    const moveChapter = async (
        chapterId: string,
        newParentId: string | null,
        targetIndex?: number,
    ) => {
        setKnowledge(prev => {
            const otherChapters = prev.chapters.filter(c => c.id !== chapterId);
            const chapterToMove = prev.chapters.find(c => c.id === chapterId);
            if (!chapterToMove) {
                return prev;
            }

            const updatedChapter = { ...chapterToMove, parentId: newParentId };
            const siblings = otherChapters
                .filter(c => c.parentId === newParentId)
                .sort((a, b) => a.order - b.order);

            if (targetIndex !== undefined) {
                siblings.splice(targetIndex, 0, updatedChapter);
            } else {
                siblings.push(updatedChapter);
            }

            const siblingsWithOrder = siblings.map((c, i) => ({
                ...c,
                order: i,
            }));
            const siblingIds = new Set(siblingsWithOrder.map(c => c.id));

            const newChapters = [
                ...otherChapters.filter(c => !siblingIds.has(c.id)),
                ...siblingsWithOrder,
            ];

            return {
                ...prev,
                chapters: newChapters,
            };
        });
    };

    const moveArticle = async (
        articleId: string,
        newChapterId: string | null,
        targetIndex?: number,
    ) => {
        setKnowledge(prev => {
            const otherArticles = prev.articles.filter(a => a.id !== articleId);
            const articleToMove = prev.articles.find(a => a.id === articleId);
            if (!articleToMove) {
                return prev;
            }

            const updatedArticle = {
                ...articleToMove,
                chapterId: newChapterId,
            };
            const siblings = otherArticles
                .filter(a => a.chapterId === newChapterId)
                .sort((a, b) => a.order - b.order);

            if (targetIndex !== undefined) {
                siblings.splice(targetIndex, 0, updatedArticle);
            } else {
                siblings.push(updatedArticle);
            }

            const siblingsWithOrder = siblings.map((a, i) => ({
                ...a,
                order: i,
            }));
            const siblingIds = new Set(siblingsWithOrder.map(a => a.id));

            const newArticles = [
                ...otherArticles.filter(a => !siblingIds.has(a.id)),
                ...siblingsWithOrder,
            ];

            return {
                ...prev,
                articles: newArticles,
            };
        });
    };

    const updateChapterTitle = async (id: string, title: string) => {
        setKnowledge(prev => ({
            ...prev,
            chapters: prev.chapters.map(c =>
                c.id === id ? { ...c, title } : c,
            ),
        }));
    };

    return {
        knowledge,
        loading,
        isSyncing,
        isAuthenticated,
        error,
        userIdentifier,
        login,
        logout,
        sync,
        addChapter,
        addArticle,
        updateArticle,
        deleteArticle,
        deleteChapter,
        moveChapter,
        moveArticle,
        updateChapterTitle,
    };
}
