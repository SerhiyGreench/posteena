import {
    type ChangeEvent,
    type ReactElement,
    useEffect,
    useState,
} from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, uk } from 'date-fns/locale';
import { CalendarClock, Copy, Edit3, Eye, Trash, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Field, FieldContent, FieldLabel } from 'ui/field';
import { Input } from 'ui/input';
import { cn } from 'ui/lib/utils';
import { FeedbackTooltip } from '@/components/FeedbackTooltip';
import RichTextEditor from '@/components/RichTextEditor/RichTextEditor';
import type {
    KnowledgeArticle,
    KnowledgeColor,
} from '@/features/knowledge/types';

const colorClasses: Record<KnowledgeColor, string> = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-400',
    gray: 'bg-gray-400',
};

interface KnowledgeEditorProps {
    article: KnowledgeArticle;
    onUpdate: (article: KnowledgeArticle) => void;
    onRemove: (id: string) => void;
    isNewArticle?: boolean;
}

export default function KnowledgeEditor({
    article,
    onUpdate,
    onRemove,
    isNewArticle = false,
}: KnowledgeEditorProps): ReactElement {
    const { t, i18n } = useTranslation();
    const [isPreserved, setIsPreserved] = useState(!isNewArticle);
    const [isCopied, setIsCopied] = useState(false);
    const dateLocale = i18n.language === 'uk' ? uk : enUS;

    // Reset editing state when switching articles or based on creation
    useEffect(() => {
        setIsPreserved(!isNewArticle);
    }, [article.id, isNewArticle]);

    const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ...article, title: e.target.value });
    };

    const handleContentChange = (content: string) => {
        onUpdate({ ...article, content });
    };

    const setColor = (color: KnowledgeColor) => {
        onUpdate({ ...article, color });
    };

    const handleCopyFormatted = async (): Promise<void> => {
        // Since content is now Markdown, we can just copy it directly.
        // If we want it as HTML in clipboard, we'd need a converter,
        // but often copying Markdown is what's desired for 'md' files.
        // However, the original code had a TODO/comment about it.
        const content = `# ${article.title}\n\n${article.content}`;

        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const togglePreserved = () => setIsPreserved(!isPreserved);

    return (
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
                                ] as KnowledgeColor[]
                            ).map(c => (
                                <button
                                    key={c}
                                    aria-label={c}
                                    onClick={() => setColor(c)}
                                    className={`ring-border size-6 rounded-full ring-1 ${colorClasses[c]} ${
                                        c === (article.color || 'yellow')
                                            ? 'ring-primary ring-2'
                                            : ''
                                    }`}
                                />
                            ))}
                        </div>

                        <div className="flex flex-1 items-center justify-end gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={togglePreserved}
                                className={cn(
                                    'h-8 flex-1 gap-2 px-2 sm:flex-none',
                                    isPreserved
                                        ? 'text-primary'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {isPreserved ? (
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
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 flex-1 px-2 sm:flex-none"
                                onClick={() => onRemove(article.id)}
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

            {isPreserved ? (
                <h1 className="px-1 text-3xl font-bold tracking-tight md:text-4xl">
                    {article.title || t('notes.untitled')}
                </h1>
            ) : (
                <Field>
                    <FieldLabel htmlFor="article-title" className="sr-only">
                        {t('name')}
                    </FieldLabel>
                    <FieldContent>
                        <Input
                            id="article-title"
                            value={article.title}
                            disabled={isPreserved}
                            onChange={handleTitleChange}
                            placeholder={t('knowledge.articleTitlePlaceholder')}
                        />
                    </FieldContent>
                </Field>
            )}

            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 border-b pb-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" />
                    <span className="font-medium">
                        {t('knowledge.createdAt')}:
                    </span>
                    <span>
                        {formatDistanceToNow(new Date(article.createdAt), {
                            addSuffix: true,
                            locale: dateLocale,
                        })}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <User className="size-3.5" />
                    <span className="font-medium">
                        {t('knowledge.createdBy')}:
                    </span>
                    <span className="max-w-[150px] truncate">
                        {article.createdBy}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5" />
                    <span className="font-medium">
                        {t('knowledge.updatedAt')}:
                    </span>
                    <span>
                        {formatDistanceToNow(new Date(article.updatedAt), {
                            addSuffix: true,
                            locale: dateLocale,
                        })}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <User className="size-3.5" />
                    <span className="font-medium">
                        {t('knowledge.updatedBy')}:
                    </span>
                    <span className="max-w-[150px] truncate">
                        {article.updatedBy}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-visible">
                <RichTextEditor
                    content={article.content}
                    onUpdate={handleContentChange}
                    editable={!isPreserved}
                    output="markdown"
                />
            </div>
        </div>
    );
}
