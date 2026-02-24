import { useCallback, useEffect, useState } from 'react';
import config from '@/config';
import { GoogleDriveNotesAdapter } from '@/features/notes/api/GoogleDriveNotesAdapter';
import type {
    Note,
    NoteColor,
    NotesStorageAdapter,
} from '@/features/notes/types';
import { Storage } from '@/lib/Storage';

const CACHE_KEY = 'posteena_notes_cache';
const SYNC_PENDING_KEY = 'posteena_notes_sync_pending';

export function useNotes(): {
    notes: Note[];
    selectedId: string | null;
    loading: boolean;
    isSyncing: boolean;
    isAuthenticated: boolean;
    error: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    select: (id: string | null) => void;
    create: (
        args?: Partial<Pick<Note, 'title' | 'contentHtml' | 'color'>>,
    ) => Promise<Note>;
    update: (note: Note) => Promise<void>;
    remove: (id: string) => Promise<void>;
    sync: () => Promise<void>;
} {
    const [adapter] = useState<NotesStorageAdapter>(
        () => new GoogleDriveNotesAdapter(config.googleClientId),
    );
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sync = useCallback(async (): Promise<void> => {
        if (!isAuthenticated) {
            return;
        }
        setIsSyncing(true);
        try {
            const remoteNotes = await adapter.list();

            // Basic conflict resolution: check if we have pending local changes
            const hasPending = Storage.get<boolean>(SYNC_PENDING_KEY, false);
            if (hasPending) {
                // If we have pending changes, we push our local state to remote
                const localNotes = Storage.get<Note[]>(CACHE_KEY, []);
                await adapter.save(localNotes);
                Storage.set(SYNC_PENDING_KEY, false);
            } else {
                // Otherwise we update local state from remote
                setNotes(remoteNotes);
                Storage.set(CACHE_KEY, remoteNotes);
            }
        } catch (err) {
            console.error('Sync failed:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSyncing(false);
            setLoading(false);
        }
    }, [adapter, isAuthenticated]);

    // Subscribe to Storage changes to handle logout immediately
    useEffect(() => {
        const unsub = Storage.subscribe(() => {
            const hasStoredSession = adapter.isAuthenticated();
            if (!hasStoredSession && isAuthenticated) {
                setIsAuthenticated(false);
                setNotes([]);
                setSelectedId(null);
            }
        });
        return unsub;
    }, [adapter, isAuthenticated]);

    // Initial auth check and sync
    useEffect(() => {
        const checkAuth = async (): Promise<void> => {
            setLoading(true);
            const hasStoredSession = adapter.isAuthenticated();
            if (hasStoredSession) {
                try {
                    // Try a lightweight call to verify session
                    await adapter.getUserIdentifier();
                    setIsAuthenticated(true);

                    // Trigger initial sync and wait for it to finish loading
                    await sync();
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
        void checkAuth();
    }, [adapter, sync]);

    useEffect(() => {
        if (isAuthenticated && !loading && notes.length === 0) {
            void sync();
        }
    }, [isAuthenticated, sync, loading, notes.length]);

    // Reactive subscription to local Storage (for cross-tab sync)
    useEffect(() => {
        const unsub = Storage.subscribe(() => {
            const localNotes = Storage.get<Note[]>(CACHE_KEY, []);
            // Only update if it's actually different to avoid cycles
            setNotes(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(localNotes)) {
                    return localNotes;
                }
                return prev;
            });
        });
        return unsub;
    }, []);

    const login = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            await adapter.login();
            setIsAuthenticated(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    }, [adapter]);

    const logout = useCallback(async (): Promise<void> => {
        await adapter.logout();
        setIsAuthenticated(false);
        setNotes([]);
        Storage.set(CACHE_KEY, []);
        Storage.set(SYNC_PENDING_KEY, false);
    }, [adapter]);

    const select = useCallback((id: string | null): void => {
        setSelectedId(id);
    }, []);

    const persistLocal = useCallback((updateFn: (prev: Note[]) => Note[]) => {
        // Use View Transitions API when available to animate list reorders
        const vtDoc = document as unknown as {
            startViewTransition?: (cb: () => void) => void;
        };
        const run = (): void => {
            setNotes(prev => updateFn(prev));
        };
        if (typeof window !== 'undefined' && vtDoc.startViewTransition) {
            vtDoc.startViewTransition(run);
        } else {
            run();
        }
    }, []);

    // Initial load from storage to sync state
    useEffect(() => {
        const localNotes = Storage.get<Note[]>(CACHE_KEY, []);
        if (localNotes.length > 0) {
            setNotes(localNotes);
        } else if (isAuthenticated) {
            setLoading(true);
        }
    }, [isAuthenticated]);

    // Persist to local storage whenever notes change
    useEffect(() => {
        // Only mark as pending if notes actually changed compared to what's in storage
        const currentStorage = Storage.get<Note[]>(CACHE_KEY, []);

        if (JSON.stringify(notes) !== JSON.stringify(currentStorage)) {
            Storage.set(CACHE_KEY, notes);
            if (isAuthenticated) {
                Storage.set(SYNC_PENDING_KEY, true);
            }
        }
    }, [notes, isAuthenticated]);

    const create = useCallback(
        async (
            args: Partial<Pick<Note, 'title' | 'contentHtml' | 'color'>> = {},
        ): Promise<Note> => {
            const now = new Date().toISOString();
            const note: Note = {
                id: crypto.randomUUID(),
                title: args.title ?? '',
                contentHtml: args.contentHtml ?? '',
                color: (args.color as NoteColor) ?? 'gray',
                updatedAt: now,
            };

            persistLocal(prev => [note, ...prev]);
            setSelectedId(note.id);
            return note;
        },
        [persistLocal],
    );

    const update = useCallback(
        async (note: Note): Promise<void> => {
            const now = new Date().toISOString();
            const updatedNote = { ...note, updatedAt: now };

            persistLocal(prev =>
                prev
                    .map(n => (n.id === note.id ? updatedNote : n))
                    .sort(
                        (a, b) =>
                            new Date(b.updatedAt).getTime() -
                            new Date(a.updatedAt).getTime(),
                    ),
            );
        },
        [persistLocal],
    );

    const remove = useCallback(
        async (id: string): Promise<void> => {
            persistLocal(prev => prev.filter(n => n.id !== id));
            setSelectedId(prev => (prev === id ? null : prev));
        },
        [persistLocal],
    );

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
    }, [notes, isAuthenticated, sync]);

    return {
        notes,
        selectedId,
        loading,
        isSyncing,
        isAuthenticated,
        error,
        login,
        logout,
        select,
        create,
        update,
        remove,
        sync,
    };
}
