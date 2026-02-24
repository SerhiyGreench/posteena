import { useCallback, useEffect, useState } from 'react';
import config from '@/config';
import { GoogleDriveAdapter } from '@/features/password-manager/api/GoogleDriveAdapter';
import type {
    GroupMetadata,
    PasswordGroup,
    StorageAdapter,
} from '@/features/password-manager/types';
import { decrypt, encrypt } from '@/features/password-manager/utils/crypto';
import { Storage } from '@/lib/Storage';

export function usePasswordManager(): {
    isAuthenticated: boolean;
    groups: GroupMetadata[];
    loading: boolean;
    isGroupsLoading: boolean;
    isAddingGroup: boolean;
    isLoadingGroupItems: string | null;
    error: string | null;
    encryptionKey: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    fetchGroups: () => Promise<void>;
    addGroup: (name: string) => Promise<GroupMetadata | undefined>;
    deleteGroup: (fileId: string) => Promise<void>;
    saveGroup: (group: PasswordGroup) => Promise<void>;
    loadGroup: (fileId: string) => Promise<PasswordGroup>;
} {
    const [adapter] = useState<StorageAdapter>(
        () => new GoogleDriveAdapter(config.googleClientId),
    );
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [groups, setGroups] = useState<GroupMetadata[]>([]);
    const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isGroupsLoading, setIsGroupsLoading] = useState(false);
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [isLoadingGroupItems, setIsLoadingGroupItems] = useState<
        string | null
    >(null);
    const [error, setError] = useState<string | null>(null);

    const initializeEncryption = useCallback(async (): Promise<void> => {
        const userId = await adapter.getUserIdentifier();
        if (userId) {
            setEncryptionKey(userId);
        }
    }, [adapter]);

    // Subscribe to Storage changes to handle logout immediately
    useEffect(() => {
        const unsub = Storage.subscribe(() => {
            const hasStoredSession = adapter.isAuthenticated();
            if (!hasStoredSession && isAuthenticated) {
                setIsAuthenticated(false);
                setGroups([]);
                setEncryptionKey(null);
            }
        });
        return unsub;
    }, [adapter, isAuthenticated]);

    useEffect(() => {
        const checkAuth = async (): Promise<void> => {
            const hasStoredSession = adapter.isAuthenticated();
            if (hasStoredSession) {
                setLoading(true);
                try {
                    // This will trigger script loading and session restoration from Storage
                    await initializeEncryption();
                    const fetchedGroups = await adapter.getGroups();
                    setGroups(fetchedGroups);
                    setIsAuthenticated(true);
                } catch (err: unknown) {
                    console.error('Initial auth check failed:', err);
                    setIsAuthenticated(false);
                    const errorMessage =
                        err instanceof Error
                            ? err.message
                            : 'Authentication failed';
                    setError(errorMessage);
                } finally {
                    setLoading(false);
                }
            }
        };
        void checkAuth();
    }, [adapter, initializeEncryption]);

    const login = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);
        try {
            await adapter.login();
            await initializeEncryption();
            const fetchedGroups = await adapter.getGroups();
            setGroups(fetchedGroups);
            setIsAuthenticated(true);
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : 'Login failed';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [adapter, initializeEncryption]);

    const logout = useCallback(async (): Promise<void> => {
        await adapter.logout();
        setIsAuthenticated(false);
        setGroups([]);
        setEncryptionKey(null);
    }, [adapter]);

    const fetchGroups = useCallback(async (): Promise<void> => {
        if (!isAuthenticated) {
            return;
        }
        setIsGroupsLoading(true);
        try {
            const fetchedGroups = await adapter.getGroups();
            setGroups(fetchedGroups);
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to fetch groups';
            setError(errorMessage);
        } finally {
            setIsGroupsLoading(false);
        }
    }, [adapter, isAuthenticated]);

    const saveGroup = useCallback(
        async (group: PasswordGroup): Promise<void> => {
            if (!encryptionKey) {
                throw new Error('Encryption key not set');
            }
            setLoading(true);
            setError(null);
            try {
                const encryptedGroup = {
                    ...group,
                    items: await Promise.all(
                        group.items.map(async item => ({
                            ...item,
                            password: await encrypt(
                                item.password,
                                encryptionKey,
                            ),
                        })),
                    ),
                };
                const jsonString = JSON.stringify(encryptedGroup);
                const encryptedContent = await encrypt(
                    jsonString,
                    encryptionKey,
                );
                await adapter.saveGroup({
                    ...encryptedGroup,
                    encryptedContent,
                });
            } catch (err: unknown) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to save group';
                setError(errorMessage);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [adapter, encryptionKey],
    );

    const addGroup = useCallback(
        async (name: string): Promise<GroupMetadata | undefined> => {
            setIsAddingGroup(true);
            try {
                const newGroupMeta = await adapter.createGroup(name);
                const newGroup: PasswordGroup = {
                    id: newGroupMeta.id,
                    name: newGroupMeta.name,
                    items: [],
                };
                // Encrypt and save immediately to ensure it's encrypted from the start
                await saveGroup(newGroup);
                setGroups(prev => [...prev, newGroupMeta]);
                return newGroupMeta;
            } catch (err: unknown) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to add group';
                setError(errorMessage);
                return undefined;
            } finally {
                setIsAddingGroup(false);
            }
        },
        [adapter, saveGroup],
    );

    const loadGroup = useCallback(
        async (fileId: string): Promise<PasswordGroup> => {
            if (!encryptionKey) {
                throw new Error('Encryption key not set');
            }
            setIsLoadingGroupItems(fileId);
            try {
                const content = await adapter.loadGroup(fileId);
                let decryptedGroup: PasswordGroup;

                if (typeof content === 'string') {
                    // Whole file is encrypted
                    const decryptedJson = await decrypt(content, encryptionKey);
                    decryptedGroup = JSON.parse(decryptedJson) as PasswordGroup;
                } else {
                    // Old format: content is JSON, items might be encrypted
                    decryptedGroup = content;
                }

                // Decrypt items (if they are encrypted)
                decryptedGroup.items = await Promise.all(
                    (decryptedGroup.items || []).map(async item => {
                        try {
                            // Try to decrypt. If it fails, it might already be decrypted or use a different key.
                            // But with the new whole-file encryption, this is a bit redundant if the whole file was encrypted.
                            // However, we still have per-item encryption inside for extra security or compatibility.
                            return {
                                ...item,
                                password: await decrypt(
                                    item.password,
                                    encryptionKey,
                                ),
                            };
                        } catch {
                            return item; // Possibly already decrypted or decryption failed
                        }
                    }),
                );

                return decryptedGroup;
            } catch (err: unknown) {
                const errorMessage =
                    err instanceof Error ? err.message : 'Failed to load group';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoadingGroupItems(null);
            }
        },
        [adapter, encryptionKey],
    );

    const deleteGroup = useCallback(
        async (fileId: string): Promise<void> => {
            setLoading(true);
            try {
                await adapter.deleteGroup(fileId);
                setGroups(prev => prev.filter(g => g.fileId !== fileId));
            } catch (err: unknown) {
                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : 'Failed to delete group';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [adapter],
    );

    const returnObj = {
        isAuthenticated,
        groups,
        loading,
        isGroupsLoading,
        isAddingGroup,
        isLoadingGroupItems,
        error,
        encryptionKey,
        login,
        logout,
        fetchGroups,
        addGroup,
        deleteGroup,
        saveGroup,
        loadGroup,
    };

    return returnObj;
}
