import { type ReactElement } from 'react';
import { useForm } from '@tanstack/react-form';
import { Calendar, Loader2, Plus, Trash, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from 'ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'ui/card';
import { Field, FieldContent, FieldError, FieldLabel } from 'ui/field';
import { Input } from 'ui/input';
import { Item, ItemContent, ItemDescription, ItemTitle } from 'ui/item';
import { Skeleton } from 'ui/skeleton';
import { ScrollArea } from '@/components/enhanced/scroll-area-enhanced';
import PasswordGenerator from '@/features/passwords/components/Passwords/PasswordGenerator';
import type { GroupMetadata } from '@/features/passwords/types';

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

interface GroupSidebarProps {
    groups: GroupMetadata[];
    selectedGroupId: string | null;
    isGroupsLoading: boolean;
    isAddingGroup: boolean;
    isLoadingGroupItems: string | null;
    loading: boolean;
    onSelectGroup: (id: string) => void;
    onAddGroup: (name: string) => Promise<void>;
    onDeleteGroup: (fileId: string, name: string) => void;
}

export function GroupSidebar({
    groups,
    selectedGroupId,
    isGroupsLoading,
    isAddingGroup,
    isLoadingGroupItems,
    loading,
    onSelectGroup,
    onAddGroup,
    onDeleteGroup,
}: GroupSidebarProps): ReactElement {
    const { t } = useTranslation();

    const groupForm = useForm({
        defaultValues: {
            name: '',
        },
        validators: {
            onChange: ({ value }) => {
                const res = groupSchema(t).safeParse(value);
                return res.success ? undefined : res.error.issues[0].message;
            },
        },
        onSubmit: async ({ value }) => {
            await onAddGroup(value.name);
            groupForm.reset();
        },
    });

    return (
        <div className="flex w-full shrink-0 flex-col gap-6 md:sticky md:max-h-[calc(100vh-11rem)] md:w-80">
            <PasswordGenerator className="w-full shrink-0" />
            <Card className="flex max-h-96 min-h-0 flex-1 flex-col overflow-hidden md:max-h-[unset]">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {t('passwordGroups')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden px-0 pb-0">
                    <div className="shrink-0 px-4">
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                void groupForm.handleSubmit();
                            }}
                            className="flex gap-2"
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
                                            : res.error.issues[0].message;
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
                    </div>
                    <ScrollArea className="min-h-0 flex-1 px-0">
                        <div className="space-y-1 px-4 py-1">
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
                                    onClick={() => onSelectGroup(group.id)}
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
                                                        {t('lastModifiedBy')}:{' '}
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
                                                onDeleteGroup(
                                                    group.fileId,
                                                    group.name,
                                                );
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
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
