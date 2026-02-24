import { type ReactElement, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, uk } from 'date-fns/locale';
import {
    CalendarClock,
    CloudOff,
    CloudUpload,
    Copy,
    Edit3,
    Eye,
    NotebookPen,
    Plus,
    RefreshCw,
    Trash,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Card, CardContent } from 'ui/card';
import { Field, FieldContent, FieldLabel } from 'ui/field';
import { Input } from 'ui/input';
import { Item, ItemContent, ItemDescription, ItemTitle } from 'ui/item';
import { cn } from 'ui/lib/utils';
import { Skeleton } from 'ui/skeleton';
import { FeedbackTooltip } from '@/components/FeedbackTooltip';
import LoginScreen from '@/components/LoginScreen';
import RichTextEditor from '@/components/RichTextEditor/RichTextEditor';
import { useNotes } from '@/features/notes/hooks/useNotes';
import type { Note, NoteColor } from '@/features/notes/types';

const colorClasses: Record<NoteColor, string> = {
    green: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]',
    blue: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]',
    purple: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]',
    red: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]',
    orange: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]',
    yellow: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]',
    gray: 'bg-gray-400 shadow-[0_0_8px_rgba(156,163,175,0.4)]',
};

const bgClasses: Record<NoteColor, string> = {
    green: 'bg-green-500/10 dark:bg-green-500/10 hover:bg-green-500/15 dark:hover:bg-green-500/15',
    blue: 'bg-blue-500/10 dark:bg-blue-500/10 hover:bg-blue-500/15 dark:hover:bg-blue-500/15',
    purple: 'bg-purple-500/10 dark:bg-purple-500/10 hover:bg-purple-500/15 dark:hover:bg-purple-500/15',
    red: 'bg-red-500/10 dark:bg-red-500/10 hover:bg-red-500/15 dark:hover:bg-red-500/15',
    orange: 'bg-orange-500/10 dark:bg-orange-500/10 hover:bg-orange-500/15 dark:hover:bg-orange-500/15',
    yellow: 'bg-yellow-400/10 dark:bg-yellow-400/10 hover:bg-yellow-400/15 dark:hover:bg-yellow-400/15',
    gray: 'bg-gray-400/10 dark:bg-gray-400/10 hover:bg-gray-400/15 dark:hover:bg-gray-400/15',
};

const selectedBgClasses: Record<NoteColor, string> = {
    green: 'bg-green-500/20 dark:bg-green-500/20',
    blue: 'bg-blue-500/20 dark:bg-blue-500/20',
    purple: 'bg-purple-500/20 dark:bg-purple-500/20',
    red: 'bg-red-500/20 dark:bg-red-500/20',
    orange: 'bg-orange-500/20 dark:bg-orange-500/20',
    yellow: 'bg-yellow-400/20 dark:bg-yellow-400/20',
    gray: 'bg-gray-400/20 dark:bg-gray-400/20',
};

export default function NotesManager(): ReactElement {
    const { t, i18n } = useTranslation();
    const {
        notes,
        selectedId,
        loading,
        isSyncing,
        isAuthenticated,
        login,
        select,
        create,
        update,
        remove,
        sync,
    } = useNotes();

    const current = useMemo<Note | null>(
        () => notes.find(n => n.id === selectedId) ?? null,
        [notes, selectedId],
    );

    const [isCopied, setIsCopied] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const dateLocale = i18n.language === 'uk' ? uk : enUS;

    const handleCreate = async (): Promise<void> => {
        const n = await create({
            title: t('notes.untitled') || '',
            color: 'yellow',
        });
        select(n.id);
    };

    const handleCopyFormatted = async (): Promise<void> => {
        if (!current) {
            return;
        }
        const html = `<h1>${current.title}</h1>` + current.contentHtml;
        try {
            if ('ClipboardItem' in window) {
                const type = 'text/html';
                const blob = new Blob([html], { type });
                const ClipboardItemCtor = (
                    window as unknown as {
                        ClipboardItem?: new (
                            data: Record<string, Blob>,
                        ) => ClipboardItem;
                    }
                ).ClipboardItem as
                    | (new (data: Record<string, Blob>) => ClipboardItem)
                    | undefined;
                if (ClipboardItemCtor) {
                    const item = new ClipboardItemCtor({ [type]: blob });
                    await navigator.clipboard.write([item]);
                } else {
                    await navigator.clipboard.writeText(html);
                }
            } else {
                await navigator.clipboard.writeText(html);
            }
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            // fallback toast could be added later
        }
    };

    const setTitle = (title: string): void => {
        if (!current) {
            return;
        }
        void update({ ...current, title });
    };

    const setColor = (color: NoteColor): void => {
        if (!current) {
            return;
        }
        void update({ ...current, color });
    };

    const togglePreserved = (): void => {
        if (!current) {
            return;
        }
        void update({ ...current, isPreserved: !current.isPreserved });
    };

    const setContent = (contentHtml: string): void => {
        if (!current || current.contentHtml === contentHtml) {
            return;
        }
        void update({ ...current, contentHtml });
    };

    const previewText = (html: string): string => {
        const tmp = document.createElement('div');
        // Replace common block elements and <br> with spaces/newlines to preserve some structure in preview
        const processedHtml = html
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<\/p>/gi, ' ')
            .replace(/<\/h[1-6]>/gi, ' ')
            .replace(/<li>/gi, '  • ');
        tmp.innerHTML = processedHtml;
        return (tmp.textContent || tmp.innerText || '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const filteredNotes = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term) {
            return notes;
        }
        return notes.filter(n => {
            const titleMatch = n.title.toLowerCase().includes(term);
            const contentMatch = previewText(n.contentHtml)
                .toLowerCase()
                .includes(term);
            return titleMatch || contentMatch;
        });
    }, [notes, searchTerm]);

    if (!isAuthenticated) {
        return (
            <LoginScreen
                title={t('notes.title')}
                description={t('notes.authRequiredDesc')}
                icon={<NotebookPen className="text-primary size-12" />}
                onLogin={login}
                loading={loading}
            />
        );
    }

    return (
        <div className="w-full space-y-6 px-4 py-4 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                    <NotebookPen className="text-primary size-8 shrink-0" />
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                        {t('features.notes.name')}
                    </h1>
                </div>
            </div>

            <div className="flex flex-col items-start gap-6 md:flex-row">
                <Card className="w-full shrink-0 md:sticky md:top-4 md:w-80">
                    <CardContent className="flex max-h-96 flex-col space-y-4 p-3 md:max-h-[calc(100vh-240px)] md:min-h-0">
                        <div className="flex shrink-0 items-center justify-between gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void sync()}
                                disabled={isSyncing}
                                className="h-9 w-fit gap-2 rounded-lg bg-black px-3 text-xs font-medium text-white/70 hover:bg-black/90 hover:text-white"
                            >
                                {isSyncing ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CloudUpload className="h-3.5 w-3.5" />
                                )}
                                <span>
                                    {isSyncing
                                        ? t('notes.syncing')
                                        : t('notes.synced')}
                                </span>
                            </Button>

                            <Button
                                size="sm"
                                onClick={handleCreate}
                                className="bg-primary text-primary-foreground h-9 w-fit rounded-lg px-3 text-xs font-bold"
                            >
                                <Plus className="sm:mr-1.5 h-3.5 w-3.5" />
                                <span className="sm:inline-block hidden">{t('notes.newNote')}</span>
                            </Button>
                        </div>
                        <div className="relative shrink-0">
                            <Input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={t('search')}
                                className="h-9 pr-8"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
                                >
                                    <Plus className="size-4 rotate-45" />
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading && notes.length === 0 ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-14 w-full" />
                                    <Skeleton className="h-14 w-full" />
                                    <Skeleton className="h-14 w-full" />
                                </div>
                            ) : notes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <CloudOff className="text-muted-foreground mb-4 size-12 opacity-20" />
                                    <div className="text-muted-foreground text-sm">
                                        {t('notes.emptyState')}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredNotes.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-8 text-center">
                                            <CloudOff className="text-muted-foreground mb-4 size-12 opacity-20" />
                                            <div className="text-muted-foreground text-sm">
                                                {t('notes.noSearchResults')}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {filteredNotes.map(n => (
                                                <Item
                                                    key={n.id}
                                                    className={cn(
                                                        'cursor-pointer border-none px-3 py-3 transition-all duration-200',
                                                        selectedId === n.id
                                                            ? selectedBgClasses[n.color]
                                                            : bgClasses[n.color],
                                                    )}
                                                    onClick={() => select(n.id)}
                                                >
                                                    <div className="flex w-full items-start gap-4">
                                                        <div className="mt-1 shrink-0">
                                                            <div
                                                                className={cn(
                                                                    'h-10 w-1 rounded-full',
                                                                    colorClasses[n.color],
                                                                )}
                                                            />
                                                        </div>
                                                        <ItemContent className="min-w-0">
                                                            <ItemTitle className="block w-full truncate text-base leading-tight font-bold">
                                                                {n.title || t('notes.untitled')}
                                                            </ItemTitle>
                                                            <ItemDescription className="text-muted-foreground mt-1 line-clamp-2 text-[13px] leading-snug break-words">
                                                                {previewText(n.contentHtml) ||
                                                                    t('notes.noContentPreview')}
                                                            </ItemDescription>
                                                            <div className="text-muted-foreground mt-2 flex items-center gap-1.5 truncate text-[11px] font-medium tracking-wide opacity-70">
                                                                <CalendarClock className="size-3 shrink-0" />
                                                                <span className="shrink-0">
                                                                    {t('updated')}
                                                                    {':'}
                                                                </span>
                                                                <span className="truncate">
                                                                    {formatDistanceToNow(new Date(n.updatedAt), {
                                                                        addSuffix: true,
                                                                        locale: dateLocale,
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </ItemContent>
                                                    </div>
                                                </Item>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="w-full flex-1">
                    {current ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex w-full items-center gap-1">
                                    <div className="flex w-full flex-wrap items-center gap-1 rounded-md border p-1 shadow-sm">
                                        <div className="flex items-center gap-1 border-r pr-1">
                                            {(
                                                [
                                                    'gray',
                                                    'red',
                                                    'orange',
                                                    'yellow',
                                                    'green',
                                                    'blue',
                                                    'purple',
                                                ] as NoteColor[]
                                            ).map(c => (
                                                <button
                                                    key={c}
                                                    aria-label={c}
                                                    onClick={() => setColor(c)}
                                                    className={`ring-border size-6 rounded-full ring-1 ${colorClasses[c]} ${
                                                        c === current.color
                                                            ? 'ring-primary ring-2'
                                                            : ''
                                                    }`}
                                                />
                                            ))}
                                        </div>

                                        <div className="flex flex-1 justify-end items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={togglePreserved}
                                                className={cn(
                                                    'h-8 flex-1 gap-2 px-2 sm:flex-none',
                                                    current.isPreserved
                                                        ? 'text-primary'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {current.isPreserved ? (
                                                    <>
                                                        <Edit3 className="size-4" />
                                                        <span className="hidden sm:inline">
                                                            {t('notes.editing')}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="size-4" />
                                                        <span className="hidden sm:inline">
                                                            {t('notes.preview')}
                                                        </span>
                                                    </>
                                                )}
                                            </Button>
                                            <div className="bg-border h-4 w-px" />
                                            <FeedbackTooltip
                                                show={isCopied}
                                                message={t('copiedToClipboard')}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 flex-1 px-2 sm:flex-none"
                                                    onClick={handleCopyFormatted}
                                                >
                                                    <Copy className="size-4 sm:mr-2" />{' '}
                                                    <span className="hidden sm:inline">
                                                        {t('notes.copyFormatted')}
                                                    </span>
                                                </Button>
                                            </FeedbackTooltip>
                                            <div className="bg-border h-4 w-px" />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive px-2 sm:flex-none"
                                                onClick={() => void remove(current.id)}
                                            >
                                                <Trash className="size-4 sm:mr-2" />{' '}
                                                <span className="hidden sm:inline">
                                                    {t('delete')}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {current.isPreserved ? (
                                <h1 className="px-1 text-3xl font-bold tracking-tight md:text-4xl">
                                    {current.title || t('notes.untitled')}
                                </h1>
                            ) : (
                                <Field>
                                    <FieldLabel
                                        htmlFor="note-title"
                                        className="sr-only"
                                    >
                                        {t('name')}
                                    </FieldLabel>
                                    <FieldContent>
                                        <Input
                                            id="note-title"
                                            value={current.title}
                                            disabled={current.isPreserved}
                                            onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                            ) => setTitle(e.target.value)}
                                            placeholder={t(
                                                'notes.titlePlaceholder',
                                            )}
                                        />
                                    </FieldContent>
                                </Field>
                            )}

                            <RichTextEditor
                                content={current.contentHtml}
                                onUpdate={setContent}
                                editable={!current.isPreserved}
                            />
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="text-muted-foreground p-6 text-center text-sm">
                                {t('notes.selectOrCreate')}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
