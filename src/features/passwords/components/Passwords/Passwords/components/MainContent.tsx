import { type ReactElement } from 'react';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { CardContent } from 'ui/card';
import ItemForm from '@/features/passwords/components/Passwords/ItemForm';
import PasswordCard from '@/features/passwords/components/Passwords/PasswordCard';
import PasswordTable from '@/features/passwords/components/Passwords/PasswordTable';
import type { PasswordGroup, PasswordItem } from '@/features/passwords/types';

interface MainContentProps {
    currentGroup: PasswordGroup | null;
    isLoadingGroupItems: string | null;
    isAddingItem: boolean;
    editingItem: PasswordItem | null;
    viewMode: 'table' | 'cards';
    filteredAndSortedItems: PasswordItem[];
    sortBy: 'name' | 'email' | 'username' | null;
    sortOrder: 'asc' | 'desc';
    onAddItem: (item: Omit<PasswordItem, 'id'>) => Promise<void>;
    onUpdateItem: (item: PasswordItem) => Promise<void>;
    onDeleteItem: (itemId: string) => Promise<void>;
    onCancelAdd: () => void;
    onCancelEdit: () => void;
    onEdit: (item: PasswordItem) => void;
    onSort: (field: 'name' | 'email' | 'username') => void;
    onClearSearch: () => void;
}

export function MainContent({
    currentGroup,
    isLoadingGroupItems,
    isAddingItem,
    editingItem,
    viewMode,
    filteredAndSortedItems,
    sortBy,
    sortOrder,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onCancelAdd,
    onCancelEdit,
    onEdit,
    onSort,
    onClearSearch,
}: MainContentProps): ReactElement {
    const { t } = useTranslation();

    return (
        <CardContent className="relative flex min-h-50 flex-col">
            {isLoadingGroupItems && !isAddingItem && !editingItem && (
                <div className="flex flex-1 items-center justify-center py-12">
                    <Loader2 className="text-primary h-10 w-10 animate-spin" />
                </div>
            )}

            {isAddingItem && (
                <div className="mb-6">
                    <ItemForm onSave={onAddItem} onCancel={onCancelAdd} />
                </div>
            )}

            {editingItem && viewMode === 'table' && (
                <div className="mb-6">
                    <ItemForm
                        item={editingItem}
                        onSave={updatedFields =>
                            onUpdateItem({
                                ...updatedFields,
                                id: editingItem.id,
                            })
                        }
                        onCancel={onCancelEdit}
                    />
                </div>
            )}

            {!isLoadingGroupItems &&
                viewMode === 'table' &&
                filteredAndSortedItems.length > 0 && (
                    <PasswordTable
                        items={filteredAndSortedItems}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={onSort}
                        onEdit={onEdit}
                        onDelete={onDeleteItem}
                    />
                )}

            {viewMode === 'cards' && (
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {!isLoadingGroupItems &&
                        filteredAndSortedItems.map(item => (
                            <div
                                key={item.id}
                                className={
                                    editingItem?.id === item.id
                                        ? 'col-span-full'
                                        : ''
                                }
                            >
                                {editingItem?.id === item.id ? (
                                    <ItemForm
                                        item={editingItem}
                                        onSave={updatedFields =>
                                            onUpdateItem({
                                                ...updatedFields,
                                                id: item.id,
                                            })
                                        }
                                        onCancel={onCancelEdit}
                                    />
                                ) : (
                                    <PasswordCard
                                        item={item}
                                        onEdit={() => onEdit(item)}
                                        onDelete={() => onDeleteItem(item.id)}
                                    />
                                )}
                            </div>
                        ))}
                </div>
            )}

            {!isLoadingGroupItems &&
                currentGroup &&
                currentGroup.items.length > 0 &&
                filteredAndSortedItems.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <Search className="text-muted-foreground mb-4 h-12 w-12 opacity-20" />
                        <h3 className="text-xl font-semibold">
                            {t('noResults')}
                        </h3>
                        <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                            {t('tryDifferent')}
                        </p>
                        <Button
                            variant="ghost"
                            className="mt-4"
                            onClick={onClearSearch}
                        >
                            {t('clearSearch')}
                        </Button>
                    </div>
                )}

            {!isLoadingGroupItems &&
                currentGroup &&
                currentGroup.items.length === 0 &&
                !isAddingItem && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                        <div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                            <ShieldCheck className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-semibold">
                            {t('noItemsInGroup')}
                        </h3>
                        <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                            {t('noItemsInGroupDesc')}
                        </p>
                        <Button
                            variant="outline"
                            className="mt-6"
                            onClick={() => onAddItem}
                        >
                            {t('addItem')}
                        </Button>
                    </div>
                )}

            {!isLoadingGroupItems && !currentGroup && (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                    <div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                        <ShieldCheck className="h-10 w-10 opacity-20" />
                    </div>
                    <h3 className="text-xl font-semibold">
                        {t('selectGroup')}
                    </h3>
                    <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                        {t('selectGroupDesc')}
                    </p>
                </div>
            )}
        </CardContent>
    );
}
