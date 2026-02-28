import { type ReactElement, useMemo, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from 'ui/card';
import { Skeleton } from 'ui/skeleton';
import LoginScreen from '@/components/LoginScreen';
import { PageContainer } from '@/components/PageContainer';
import { useKnowledge } from '@/features/knowledge/hooks/useKnowledge';
import KnowledgeEditor from './KnowledgeEditor';
import KnowledgeSidebar from './KnowledgeSidebar/KnowledgeSidebar';

export default function KnowledgeManager(): ReactElement {
    const { t } = useTranslation();
    const {
        knowledge,
        loading,
        isSyncing,
        isAuthenticated,
        login,
        sync,
        addChapter,
        addArticle,
        updateArticle,
        deleteArticle,
        deleteChapter,
        moveChapter,
        moveArticle,
        updateChapterTitle,
    } = useKnowledge();

    const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
        null,
    );
    const [isNewArticle, setIsNewArticle] = useState(false);

    const selectedArticle = useMemo(() => {
        return knowledge.articles.find(a => a.id === selectedArticleId) || null;
    }, [knowledge.articles, selectedArticleId]);

    const handleSelectArticle = (id: string | null) => {
        setSelectedArticleId(id);
        setIsNewArticle(false);
    };

    const handleAddChapter = async (parentId: string | null) => {
        await addChapter(t('knowledge.newChapter'), parentId);
        // Chapter added, sidebar will handle renaming via its state if we implemented it there.
        // For now, let's keep it simple.
    };

    const handleAddArticle = async (chapterId: string | null) => {
        const newArticle = await addArticle(
            chapterId,
            t('knowledge.newArticle'),
        );
        setIsNewArticle(true);
        setSelectedArticleId(newArticle.id);
    };

    if (loading && !isAuthenticated) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <Loader2 className="text-primary h-12 w-12 animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <LoginScreen
                onLogin={login}
                title={t('features.knowledge.name')}
                description={t('features.knowledge.description')}
                icon={<BookOpen className="text-primary size-12" />}
            />
        );
    }

    return (
        <PageContainer className="flex h-full flex-col space-y-6 px-4 py-4 md:px-8">
            <div className="flex shrink-0 items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                    <BookOpen className="text-primary size-8 shrink-0" />
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                        {t('features.knowledge.name')}
                    </h1>
                </div>
            </div>

            <div className="flex flex-col items-start gap-6 md:flex-row">
                <KnowledgeSidebar
                    knowledge={knowledge}
                    selectedArticleId={selectedArticleId}
                    onSelectArticle={handleSelectArticle}
                    onAddChapter={handleAddChapter}
                    onAddArticle={handleAddArticle}
                    onDeleteChapter={deleteChapter}
                    onDeleteArticle={deleteArticle}
                    onMoveChapter={moveChapter}
                    onMoveArticle={moveArticle}
                    onUpdateChapterTitle={updateChapterTitle}
                    isSyncing={isSyncing}
                    onSync={sync}
                    loading={loading}
                />

                <main className="min-h-0 w-full flex-1">
                    {loading && !selectedArticle ? (
                        <div className="space-y-4 pt-1">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-12 w-3/4" />
                            <div className="space-y-2 pt-4">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                            </div>
                        </div>
                    ) : selectedArticle ? (
                        <KnowledgeEditor
                            article={selectedArticle}
                            onUpdate={updateArticle}
                            onRemove={deleteArticle}
                            isNewArticle={isNewArticle}
                        />
                    ) : (
                        <Card className="text-muted-foreground flex h-[600px] items-center justify-center">
                            <div className="text-center">
                                <BookOpen className="mx-auto mb-4 size-12 opacity-20" />
                                <p>{t('knowledge.selectArticleToStart')}</p>
                            </div>
                        </Card>
                    )}
                </main>
            </div>
        </PageContainer>
    );
}
