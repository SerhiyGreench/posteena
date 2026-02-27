import { type ReactElement, useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Edit,
    Eye,
    EyeOff,
    MoreVertical,
    Trash,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from 'ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from 'ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip';
import { FeedbackTooltip } from '@/components/FeedbackTooltip';
import type { PasswordItem } from '@/features/passwords/types';

export interface PasswordTableProps {
    items: PasswordItem[];
    sortBy: 'name' | 'email' | 'username' | null;
    sortOrder: 'asc' | 'desc';
    onSort: (field: 'name' | 'email' | 'username') => void;
    onEdit: (item: PasswordItem) => void;
    onDelete: (itemId: string) => void;
}

export default function PasswordTable({
    items,
    sortBy,
    sortOrder,
    onSort,
    onEdit,
    onDelete,
}: PasswordTableProps): ReactElement {
    const { t } = useTranslation();
    const [visiblePasswords, setVisiblePasswords] = useState<
        Record<string, boolean>
    >({});
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const togglePasswordVisibility = (itemId: string): void => {
        setVisiblePasswords(prev => ({
            ...prev,
            [itemId]: !prev[itemId],
        }));
    };

    const copyToClipboard = (itemId: string, text: string): void => {
        void navigator.clipboard.writeText(text);
        setCopiedId(itemId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const renderSortIcon = (
        field: 'name' | 'email' | 'username',
    ): ReactElement => {
        return (
            <div className="flex w-5 shrink-0 items-center justify-center">
                {sortBy === field &&
                    (sortOrder === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    ))}
            </div>
        );
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => onSort('name')}
                        >
                            <div className="flex items-center gap-1">
                                <span className="flex-1">{t('name')}</span>
                                {renderSortIcon('name')}
                            </div>
                        </TableHead>
                        <TableHead
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => onSort('email')}
                        >
                            <div className="flex items-center gap-1">
                                <span className="flex-1">{t('email')}</span>
                                {renderSortIcon('email')}
                            </div>
                        </TableHead>
                        <TableHead
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => onSort('username')}
                        >
                            <div className="flex items-center gap-1">
                                <span className="flex-1">{t('username')}</span>
                                {renderSortIcon('username')}
                            </div>
                        </TableHead>
                        <TableHead className="w-60">{t('password')}</TableHead>
                        <TableHead className="text-right">
                            {t('actions') || 'Actions'}
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">
                                {item.name}
                            </TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>{item.username}</TableCell>
                            <TableCell>
                                <div className="flex w-60 items-center gap-2">
                                    <code className="flex-1 truncate font-mono text-sm">
                                        {visiblePasswords[item.id]
                                            ? item.password
                                            : '••••••••••••'}
                                    </code>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() =>
                                                togglePasswordVisibility(
                                                    item.id,
                                                )
                                            }
                                        >
                                            {visiblePasswords[item.id] ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <FeedbackTooltip
                                            show={copiedId === item.id}
                                            message={t('copiedToClipboard')}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() =>
                                                    copyToClipboard(
                                                        item.id,
                                                        item.password,
                                                    )
                                                }
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </FeedbackTooltip>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                {/* Desktop / larger screens: show inline action buttons */}
                                <div className="hidden justify-end gap-1 md:flex">
                                    <Tooltip>
                                        <TooltipTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => onEdit(item)}
                                                />
                                            }
                                        >
                                            <Edit className="h-4 w-4" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {t('editItem')}
                                        </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="hover:text-destructive h-8 w-8"
                                                    onClick={() =>
                                                        onDelete(item.id)
                                                    }
                                                />
                                            }
                                        >
                                            <Trash className="h-4 w-4" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {t('deleteItem')}
                                        </TooltipContent>
                                    </Tooltip>
                                </div>

                                {/* Mobile: collapse actions into a three-dots menu */}
                                <div className="flex items-center justify-end md:hidden">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            render={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                />
                                            }
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">
                                                {t('actions')}
                                            </span>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => onEdit(item)}
                                            >
                                                <Edit className="mr-2 h-4 w-4" />{' '}
                                                {t('editItem')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() =>
                                                    onDelete(item.id)
                                                }
                                            >
                                                <Trash className="mr-2 h-4 w-4" />{' '}
                                                {t('deleteItem')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
