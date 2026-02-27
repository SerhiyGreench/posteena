import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePasswords } from '@/features/passwords/hooks/usePasswords';
import type {
    GroupMetadata,
    PasswordGroup,
    PasswordItem,
} from '@/features/passwords/types';
import { Storage } from '@/lib/Storage';

interface UsePasswordsLogicReturn {
    isAuthenticated: boolean;
    groups: GroupMetadata[];
    loading: boolean;
    isGroupsLoading: boolean;
    isAddingGroup: boolean;
    isLoadingGroupItems: string | null;
    encryptionKey: string | null;
    login: () => Promise<void>;
    addGroup: (name: string) => Promise<GroupMetadata | undefined>;
    deleteGroup: (fileId: string) => Promise<void>;
    selectedGroupId: string | null;
    setSelectedGroupId: (id: string | null) => void;
    currentGroup: PasswordGroup | null;
    isAddingItem: boolean;
    setIsAddingItem: (value: boolean) => void;
    editingItem: PasswordItem | null;
    setEditingItem: (item: PasswordItem | null) => void;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    sortBy: 'name' | 'email' | 'username' | null;
    setSortBy: (value: 'name' | 'email' | 'username' | null) => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: (value: 'asc' | 'desc') => void;
    viewMode: 'table' | 'cards';
    setViewMode: (mode: 'table' | 'cards') => void;
    handleAddItem: (item: Omit<PasswordItem, 'id'>) => Promise<void>;
    handleUpdateItem: (item: PasswordItem) => Promise<void>;
    handleDeleteItem: (itemId: string) => Promise<void>;
    handleSort: (field: 'name' | 'email' | 'username') => void;
    filteredAndSortedItems: PasswordItem[];
}

export function usePasswordsLogic(): UsePasswordsLogicReturn {
    const { t } = useTranslation();
    const {
        isAuthenticated,
        groups,
        loading,
        isGroupsLoading,
        isAddingGroup,
        isLoadingGroupItems,
        encryptionKey,
        login,
        addGroup,
        deleteGroup,
        saveGroup,
        loadGroup,
    } = usePasswords();

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() =>
        Storage.get('posteena_last_password_group_id', null),
    );
    const [currentGroup, setCurrentGroup] = useState<PasswordGroup | null>(
        null,
    );
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [editingItem, setEditingItem] = useState<PasswordItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'email' | 'username' | null>(
        'name',
    );
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>(() =>
        Storage.get('posteena_password_manager_view_mode', 'cards'),
    );

    useEffect(() => {
        if (selectedGroupId) {
            Storage.set('posteena_last_password_group_id', selectedGroupId);
        }
    }, [selectedGroupId]);

    useEffect(() => {
        Storage.set('posteena_password_manager_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (!selectedGroupId && groups.length > 0) {
            const savedGroupId = Storage.get(
                'posteena_last_password_group_id',
                null,
            );
            if (savedGroupId && groups.some(g => g.id === savedGroupId)) {
                setSelectedGroupId(savedGroupId);
            }
        }
    }, [groups, selectedGroupId]);

    useEffect(() => {
        setIsAddingItem(false);
        setEditingItem(null);

        if (selectedGroupId && encryptionKey) {
            const meta = groups.find(g => g.id === selectedGroupId);
            if (meta) {
                void loadGroup(meta.fileId)
                    .then(setCurrentGroup)
                    .catch(console.error);
            }
        } else {
            setCurrentGroup(null);
        }
    }, [selectedGroupId, encryptionKey, groups, loadGroup]);

    const handleAddItem = async (
        item: Omit<PasswordItem, 'id'>,
    ): Promise<void> => {
        if (!currentGroup) {
            return;
        }

        const newItem = { ...item, id: crypto.randomUUID() };
        const updatedGroup = {
            ...currentGroup,
            items: [...currentGroup.items, newItem],
        };

        try {
            await saveGroup(updatedGroup);
            setCurrentGroup(updatedGroup);
            setIsAddingItem(false);
        } catch (error) {
            console.error('Failed to add item:', error);
        }
    };

    const handleUpdateItem = async (item: PasswordItem): Promise<void> => {
        if (!currentGroup) {
            return;
        }

        const updatedGroup = {
            ...currentGroup,
            items: currentGroup.items.map(i => (i.id === item.id ? item : i)),
        };

        try {
            await saveGroup(updatedGroup);
            setCurrentGroup(updatedGroup);
            setEditingItem(null);
        } catch (error) {
            console.error('Failed to update item:', error);
        }
    };

    const handleDeleteItem = async (itemId: string): Promise<void> => {
        if (!currentGroup) {
            return;
        }

        if (!confirm(t('confirmDeleteItem'))) {
            return;
        }

        const updatedGroup = {
            ...currentGroup,
            items: currentGroup.items.filter(i => i.id !== itemId),
        };

        try {
            await saveGroup(updatedGroup);
            setCurrentGroup(updatedGroup);
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    };

    const handleSort = (field: 'name' | 'email' | 'username'): void => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const filteredAndSortedItems =
        currentGroup?.items
            .filter(item => {
                const search = searchTerm.toLowerCase();

                return (
                    item.name.toLowerCase().includes(search) ||
                    item.email.toLowerCase().includes(search) ||
                    item.username.toLowerCase().includes(search)
                );
            })
            .sort((a, b) => {
                if (!sortBy) {
                    return 0;
                }

                const comparison = a[sortBy].localeCompare(b[sortBy]);
                return sortOrder === 'asc' ? comparison : -comparison;
            }) || [];

    return {
        isAuthenticated,
        groups,
        loading,
        isGroupsLoading,
        isAddingGroup,
        isLoadingGroupItems,
        encryptionKey,
        login,
        addGroup,
        deleteGroup,
        selectedGroupId,
        setSelectedGroupId,
        currentGroup,
        isAddingItem,
        setIsAddingItem,
        editingItem,
        setEditingItem,
        searchTerm,
        setSearchTerm,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        viewMode,
        setViewMode,
        handleAddItem,
        handleUpdateItem,
        handleDeleteItem,
        handleSort,
        filteredAndSortedItems,
    };
}
