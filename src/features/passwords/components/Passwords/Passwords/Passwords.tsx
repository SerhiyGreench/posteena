import { type ReactElement } from 'react';
import { Key, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from 'ui/card';
import LoginScreen from '@/components/LoginScreen';
import { GroupSidebar } from '@/features/passwords/components/Passwords/Passwords/components/GroupSidebar';
import { MainContent } from '@/features/passwords/components/Passwords/Passwords/components/MainContent';
import { MainHeader } from '@/features/passwords/components/Passwords/Passwords/components/MainHeader';
import { usePasswordsLogic } from '@/features/passwords/components/Passwords/Passwords/hooks/usePasswordsLogic';

export default function Passwords(): ReactElement {
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
        viewMode,
        setViewMode,
        handleAddItem,
        handleUpdateItem,
        handleDeleteItem,
        handleSort,
        filteredAndSortedItems,
    } = usePasswordsLogic();

    if (!isAuthenticated) {
        return (
            <LoginScreen
                title={t('features.passwords.name')}
                icon={<Key className="text-primary h-8 w-8" />}
                onLogin={login}
                loading={loading}
                showShield
                shieldTitle={t('clientSideEncryption')}
                shieldDescription={t('clientSideEncryptionDesc')}
            />
        );
    }

    if (!encryptionKey && loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center p-4">
                <Loader2 className="text-primary h-12 w-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col space-y-6 px-4 py-4 md:px-8">
            <div className="flex shrink-0 items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                    <Key className="text-primary size-8 shrink-0" />
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                        {t('features.passwords.name')}
                    </h1>
                </div>
            </div>

            <div className="flex flex-col items-start gap-6 md:flex-row">
                <GroupSidebar
                    groups={groups}
                    selectedGroupId={selectedGroupId}
                    isGroupsLoading={isGroupsLoading}
                    isAddingGroup={isAddingGroup}
                    isLoadingGroupItems={isLoadingGroupItems}
                    loading={loading}
                    onSelectGroup={setSelectedGroupId}
                    onAddGroup={async name => {
                        void addGroup(name);
                    }}
                    onDeleteGroup={(fileId, name) => {
                        if (
                            confirm(
                                t('confirmDeleteGroup').replace(
                                    '{{name}}',
                                    name,
                                ),
                            )
                        ) {
                            void deleteGroup(fileId);
                        }
                    }}
                />

                <Card className="w-full flex-1">
                    <MainHeader
                        currentGroup={currentGroup}
                        searchTerm={searchTerm}
                        sortBy={sortBy}
                        viewMode={viewMode}
                        loading={loading}
                        onSearchChange={setSearchTerm}
                        onSortChange={value => {
                            setSortBy(value);
                            // Resetting sort order when changing field is done in handleSort or here
                        }}
                        onViewModeChange={setViewMode}
                        onAddItem={() => setIsAddingItem(true)}
                    />
                    <MainContent
                        currentGroup={currentGroup}
                        isLoadingGroupItems={isLoadingGroupItems}
                        isAddingItem={isAddingItem}
                        editingItem={editingItem}
                        viewMode={viewMode}
                        filteredAndSortedItems={filteredAndSortedItems}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onAddItem={handleAddItem}
                        onUpdateItem={handleUpdateItem}
                        onDeleteItem={handleDeleteItem}
                        onCancelAdd={() => setIsAddingItem(false)}
                        onCancelEdit={() => setEditingItem(null)}
                        onEdit={setEditingItem}
                        onSort={handleSort}
                        onClearSearch={() => setSearchTerm('')}
                    />
                </Card>
            </div>
        </div>
    );
}
