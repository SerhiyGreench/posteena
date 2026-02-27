import { type ReactElement } from 'react';
import {
    LayoutGrid,
    Plus,
    Search,
    SortAsc,
    Table as TableIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { CardHeader, CardTitle } from 'ui/card';
import { Input } from 'ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from 'ui/select';
import { ToggleGroup, ToggleGroupItem } from 'ui/toggle-group';
import type { PasswordGroup } from '@/features/passwords/types';

interface MainHeaderProps {
    currentGroup: PasswordGroup | null;
    searchTerm: string;
    sortBy: 'name' | 'email' | 'username' | null;
    viewMode: 'table' | 'cards';
    loading: boolean;
    onSearchChange: (value: string) => void;
    onSortChange: (value: 'name' | 'email' | 'username' | null) => void;
    onViewModeChange: (mode: 'table' | 'cards') => void;
    onAddItem: () => void;
}

export function MainHeader({
    currentGroup,
    searchTerm,
    sortBy,
    viewMode,
    loading,
    onSearchChange,
    onSortChange,
    onViewModeChange,
    onAddItem,
}: MainHeaderProps): ReactElement {
    const { t } = useTranslation();

    return (
        <>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg empty:hidden">
                    {currentGroup ? currentGroup.name : null}
                </CardTitle>
                <div className="flex items-center gap-2 empty:hidden">
                    {currentGroup && (
                        <Button
                            size="icon"
                            onClick={onAddItem}
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
                            value={searchTerm}
                            onChange={e => onSearchChange(e.target.value)}
                            className="pl-9"
                            placeholder={t('search')}
                        />
                    </div>
                    <Select
                        value={sortBy ?? ''}
                        onValueChange={value =>
                            onSortChange(
                                value as 'name' | 'email' | 'username' | null,
                            )
                        }
                    >
                        <SelectTrigger className="w-full md:w-40">
                            <SelectValue placeholder={t('sortBy')}>
                                <div className="flex items-center gap-2">
                                    <SortAsc className="h-4 w-4" />
                                    <span>
                                        {sortBy ? t(sortBy) : t('sortBy')}
                                    </span>
                                </div>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">{t('name')}</SelectItem>
                            <SelectItem value="email">{t('email')}</SelectItem>
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
                            onViewModeChange(next);
                        }}
                        className="bg-muted/50 rounded-lg p-1"
                    >
                        <ToggleGroupItem value="table" title={t('tableView')}>
                            <TableIcon className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="cards" title={t('cardView')}>
                            <LayoutGrid className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            )}
        </>
    );
}
