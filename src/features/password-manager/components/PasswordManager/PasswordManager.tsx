import { type ReactElement, useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import {
    Calendar,
    Key,
    LayoutGrid,
    Loader2,
    Lock,
    Plus,
    Search,
    ShieldCheck,
    SortAsc,
    Table as TableIcon,
    Trash,
    User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from 'ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'ui/card';
import { Field, FieldContent, FieldError, FieldLabel } from 'ui/field';
import { Input } from 'ui/input';
import { Item, ItemContent, ItemDescription, ItemTitle } from 'ui/item';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from 'ui/select';
import { Skeleton } from 'ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from 'ui/toggle-group';
import LoginScreen from '@/components/LoginScreen';
import { usePasswordManager } from '@/features/password-manager/hooks/usePasswordManager';
import type {
    PasswordGroup,
    PasswordItem,
} from '@/features/password-manager/types';
import { Storage } from '@/lib/Storage';
import ItemForm from './ItemForm';
import PasswordCard from './PasswordCard';
import PasswordTable from './PasswordTable';

const groupSchema = (
    t: (key: string) => string,
): z.ZodObject<{ name: z.ZodString }> =>
    z.object({
        name: z
            .string()
            .min(
                1,
                t('validation.required').replace('{{field}}', t('groupName')),
            ),
    });

export default function PasswordManager(): ReactElement {
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
    } = usePasswordManager();

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

    const groupForm = useForm({
        defaultValues: {
            name: '',
        },
        validators: {
            onChange: ({ value }) => {
                const res = groupSchema(t).safeParse(value);
                return res.success ? undefined : res.error.errors[0].message;
            },
        },
        onSubmit: async ({ value }) => {
            await addGroup(value.name);
            groupForm.reset();
        },
    });

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

    if (!isAuthenticated) {
        return (
            <LoginScreen
                title={t('passwordManager')}
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

    return (
        <div className="w-full space-y-6 px-4 py-4 md:px-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                    <Key className="text-primary size-8 shrink-0" />
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                        {t('passwordManager')}
                    </h1>
                </div>
            </div>

            <div className="flex flex-col items-start gap-6 md:flex-row">
                <Card className="w-full shrink-0 md:sticky md:top-4 md:w-80">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {t('passwordGroups')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex max-h-72 flex-col space-y-4 md:max-h-[calc(100vh-240px)] md:min-h-0">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                void groupForm.handleSubmit();
                            }}
                            className="flex shrink-0 gap-2"
                        >
                            <groupForm.Field
                                name="name"
                                validators={{
                                    onChange: ({ value }) => {
                                        const res =
                                            groupSchema(t).shape.name.safeParse(
                                                value,
                                            );
                                        return res.success
                                            ? undefined
                                            : res.error.errors[0].message;
                                    },
                                }}
                            >
                                {field => (
                                    <Field className="flex-1">
                                        <FieldLabel
                                            htmlFor={field.name}
                                            className="sr-only"
                                        >
                                            {t('groupName')}
                                        </FieldLabel>
                                        <FieldContent>
                                            <Input
                                                id={field.name}
                                                key={`group-name-${t('groupName')}`}
                                                value={field.state.value}
                                                onBlur={field.handleBlur}
                                                onChange={e =>
                                                    field.handleChange(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={t('groupName')}
                                                className={
                                                    field.state.meta.errors
                                                        .length > 0
                                                        ? 'border-destructive'
                                                        : ''
                                                }
                                            />
                                            <FieldError
                                                errors={field.state.meta.errors.map(
                                                    e => ({
                                                        message: String(e),
                                                    }),
                                                )}
                                            />
                                        </FieldContent>
                                    </Field>
                                )}
                            </groupForm.Field>
                            <Button
                                size="icon"
                                type="submit"
                                disabled={isAddingGroup}
                            >
                                {isAddingGroup ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                            </Button>
                        </form>
                        <div className="flex-1 overflow-y-auto">
                            <div className="space-y-1">
                                {isGroupsLoading && groups.length === 0 && (
                                    <div className="space-y-2">
                                        <Skeleton className="h-14 w-full" />
                                        <Skeleton className="h-14 w-full" />
                                        <Skeleton className="h-14 w-full" />
                                    </div>
                                )}
                                {groups.map(group => (
                                    <Item
                                        key={group.id}
                                        variant={
                                            selectedGroupId === group.id
                                                ? 'muted'
                                                : 'default'
                                        }
                                        className="relative cursor-pointer border-none px-3 py-3"
                                        onClick={() =>
                                            setSelectedGroupId(group.id)
                                        }
                                    >
                                        <ItemContent className="min-w-0">
                                            <ItemTitle className="block w-full truncate text-base leading-tight font-bold">
                                                {group.name}
                                            </ItemTitle>
                                            <ItemDescription className="mt-1 flex flex-col gap-1 text-[13px] leading-snug">
                                                {group.modifiedTime && (
                                                    <span className="flex items-center gap-1.5 truncate opacity-70">
                                                        <Calendar className="h-3 w-3 shrink-0" />
                                                        <span className="truncate text-[11px] font-medium tracking-wide">
                                                            {t('updated')}:{' '}
                                                            {new Date(
                                                                group.modifiedTime,
                                                            ).toLocaleString()}
                                                        </span>
                                                    </span>
                                                )}
                                                {group.lastModifyingUser && (
                                                    <span className="flex items-center gap-1.5 truncate opacity-70">
                                                        <User className="h-3 w-3 shrink-0" />
                                                        <span className="truncate text-[11px] font-medium tracking-wide">
                                                            {t(
                                                                'lastModifiedBy',
                                                            )}
                                                            :{' '}
                                                            {
                                                                group.lastModifyingUser
                                                            }
                                                        </span>
                                                    </span>
                                                )}
                                            </ItemDescription>
                                        </ItemContent>
                                        <div className="absolute top-2 right-2 flex items-center gap-1">
                                            {(isLoadingGroupItems ===
                                                group.fileId ||
                                                (loading &&
                                                    selectedGroupId ===
                                                        group.id)) && (
                                                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    if (
                                                        confirm(
                                                            t(
                                                                'confirmDeleteGroup',
                                                            ).replace(
                                                                '{{name}}',
                                                                group.name,
                                                            ),
                                                        )
                                                    ) {
                                                        void deleteGroup(
                                                            group.fileId,
                                                        );
                                                    }
                                                }}
                                                disabled={
                                                    loading ||
                                                    isLoadingGroupItems ===
                                                        group.fileId
                                                }
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </Item>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="w-full flex-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg empty:hidden">
                            {currentGroup ? currentGroup.name : null}
                        </CardTitle>
                        <div className="flex items-center gap-2 empty:hidden">
                            {currentGroup && (
                                <Button
                                    size="icon"
                                    onClick={() => setIsAddingItem(true)}
                                    disabled={loading}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    {currentGroup && (
                        <div className="flex flex-col gap-3 px-4 pb-2 md:flex-row md:items-center">
                            <div className="relative flex-1">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    key={`search-${t('search')}`}
                                    value={searchTerm}
                                    onChange={e =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                key={`sort-${t('sortBy')}`}
                                value={sortBy ?? ''}
                                onValueChange={value => {
                                    setSortBy(
                                        value as
                                            | 'name'
                                            | 'email'
                                            | 'username'
                                            | null,
                                    );
                                    setSortOrder('asc');
                                }}
                            >
                                <SelectTrigger className="w-full md:w-40">
                                    <SelectValue placeholder={t('sortBy')}>
                                        <div className="flex items-center gap-2">
                                            <SortAsc className="h-4 w-4" />
                                            <span>
                                                {sortBy
                                                    ? t(sortBy)
                                                    : t('sortBy')}
                                            </span>
                                        </div>
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">
                                        {t('name')}
                                    </SelectItem>
                                    <SelectItem value="email">
                                        {t('email')}
                                    </SelectItem>
                                    <SelectItem value="username">
                                        {t('username')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <ToggleGroup
                                value={[viewMode]}
                                onValueChange={values => {
                                    const next =
                                        (values?.[0] as
                                            | 'table'
                                            | 'cards'
                                            | undefined) ?? 'cards';
                                    setViewMode(next);
                                }}
                                className="bg-muted/50 rounded-lg p-1"
                            >
                                <ToggleGroupItem
                                    value="table"
                                    title={t('tableView')}
                                >
                                    <TableIcon className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="cards"
                                    title={t('cardView')}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                    )}
                    <CardContent className="relative flex min-h-50 flex-col">
                        {isLoadingGroupItems &&
                            !isAddingItem &&
                            !editingItem && (
                                <div className="flex flex-1 items-center justify-center py-12">
                                    <Loader2 className="text-primary h-10 w-10 animate-spin" />
                                </div>
                            )}
                        {isAddingItem && (
                            <div className="mb-6">
                                <ItemForm
                                    onSave={handleAddItem}
                                    onCancel={() => setIsAddingItem(false)}
                                />
                            </div>
                        )}

                        {editingItem && viewMode === 'table' && (
                            <div className="mb-6">
                                <ItemForm
                                    item={editingItem}
                                    onSave={updatedFields =>
                                        handleUpdateItem({
                                            ...updatedFields,
                                            id: editingItem.id,
                                        })
                                    }
                                    onCancel={() => setEditingItem(null)}
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
                                    onSort={handleSort}
                                    onEdit={setEditingItem}
                                    onDelete={itemId =>
                                        void handleDeleteItem(itemId)
                                    }
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
                                                    ? 'col-span-1 lg:col-span-2'
                                                    : ''
                                            }
                                        >
                                            {editingItem?.id === item.id ? (
                                                <ItemForm
                                                    item={editingItem}
                                                    onSave={updatedFields =>
                                                        handleUpdateItem({
                                                            ...updatedFields,
                                                            id: item.id,
                                                        })
                                                    }
                                                    onCancel={() =>
                                                        setEditingItem(null)
                                                    }
                                                />
                                            ) : (
                                                <PasswordCard
                                                    item={item}
                                                    onEdit={() =>
                                                        setEditingItem(item)
                                                    }
                                                    onDelete={() =>
                                                        void handleDeleteItem(
                                                            item.id,
                                                        )
                                                    }
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
                                <div className="col-span-1 flex flex-col items-center justify-center py-12 text-center lg:col-span-2">
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
                                        onClick={() => setSearchTerm('')}
                                    >
                                        {t('clearSearch')}
                                    </Button>
                                </div>
                            )}

                        {!isLoadingGroupItems &&
                            currentGroup &&
                            currentGroup.items.length === 0 &&
                            !isAddingItem && (
                                <div className="col-span-1 flex flex-col items-center justify-center py-12 text-center lg:col-span-2">
                                    <div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
                                        <ShieldCheck className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-xl font-semibold">
                                        {t('noPasswords')}
                                    </h3>
                                    <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                                        {t('addFirstPassword')}
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-6 border-dashed"
                                        onClick={() => setIsAddingItem(true)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {t('addItem')}
                                    </Button>
                                </div>
                            )}

                        {!currentGroup && !loading && !isLoadingGroupItems && (
                            <div className="text-muted-foreground col-span-1 py-12 pb-28 text-center md:col-span-2">
                                <div className="mb-4 flex justify-center">
                                    <Lock className="h-12 w-12 opacity-10" />
                                </div>
                                <p className="text-lg">{t('selectGroup')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
