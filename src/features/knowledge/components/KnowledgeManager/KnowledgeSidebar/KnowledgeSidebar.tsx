import { type DragEvent, type ReactElement, useState } from 'react';
import {
    ChevronDown,
    ChevronRight,
    CloudUpload,
    Edit,
    FileText,
    Folder,
    GripVertical,
    MoreVertical,
    RefreshCw,
    Trash,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Card, CardContent } from 'ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from 'ui/dropdown-menu';
import { Input } from 'ui/input';
import { cn } from 'ui/lib/utils';
import { Skeleton } from 'ui/skeleton';
import { ScrollArea } from '@/components/enhanced/scroll-area-enhanced';
import type { Knowledge, KnowledgeChapter } from '@/features/knowledge/types';

interface KnowledgeSidebarProps {
    knowledge: Knowledge;
    selectedArticleId: string | null;
    onSelectArticle: (id: string) => void;
    onAddChapter: (parentId: string | null) => void;
    onAddArticle: (chapterId: string | null) => void;
    onDeleteChapter: (id: string) => void;
    onDeleteArticle: (id: string) => void;
    onMoveChapter: (
        id: string,
        newParentId: string | null,
        targetIndex?: number,
    ) => void;
    onMoveArticle: (
        id: string,
        newChapterId: string | null,
        targetIndex?: number,
    ) => void;
    onUpdateChapterTitle: (id: string, title: string) => void;
    isSyncing: boolean;
    onSync: () => void;
    loading?: boolean;
}

const bgClasses: Record<string, string> = {
    green: 'bg-green-500/10 dark:bg-green-500/10 hover:bg-green-500/15 dark:hover:bg-green-500/15',
    blue: 'bg-blue-500/10 dark:bg-blue-500/10 hover:bg-blue-500/15 dark:hover:bg-blue-500/15',
    purple: 'bg-purple-500/10 dark:bg-purple-500/10 hover:bg-purple-500/15 dark:hover:bg-purple-500/15',
    red: 'bg-red-500/10 dark:bg-red-500/10 hover:bg-red-500/15 dark:hover:bg-red-500/15',
    orange: 'bg-orange-500/10 dark:bg-orange-500/10 hover:bg-orange-500/15 dark:hover:bg-orange-500/15',
    yellow: 'bg-yellow-400/10 dark:bg-yellow-400/10 hover:bg-yellow-400/15 dark:hover:bg-yellow-400/15',
    gray: 'bg-gray-400/10 dark:bg-gray-400/10 hover:bg-gray-400/15 dark:hover:bg-gray-400/15',
};

const selectedBgClasses: Record<string, string> = {
    green: 'bg-green-500/20 dark:bg-green-500/20',
    blue: 'bg-blue-500/20 dark:bg-blue-500/20',
    purple: 'bg-purple-500/20 dark:bg-purple-500/20',
    red: 'bg-red-500/20 dark:bg-red-500/20',
    orange: 'bg-orange-500/20 dark:bg-orange-500/20',
    yellow: 'bg-yellow-400/20 dark:bg-yellow-400/20',
    gray: 'bg-gray-400/20 dark:bg-gray-400/20',
};

export default function KnowledgeSidebar({
    knowledge,
    selectedArticleId,
    onSelectArticle,
    onAddChapter,
    onAddArticle,
    onDeleteChapter,
    onDeleteArticle,
    onMoveChapter,
    onMoveArticle,
    onUpdateChapterTitle,
    isSyncing,
    onSync,
    loading = false,
}: KnowledgeSidebarProps): ReactElement {
    const { t } = useTranslation();
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
        new Set(),
    );
    const [editingChapterId, setEditingChapterId] = useState<string | null>(
        null,
    );
    const [tempTitle, setTempTitle] = useState('');
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [dragOverPosition, setDragOverPosition] = useState<
        'top' | 'bottom' | 'middle' | null
    >(null);

    const toggleChapter = (id: string) => {
        const next = new Set(expandedChapters);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setExpandedChapters(next);
    };

    const handleStartEditing = (chapter: KnowledgeChapter) => {
        setEditingChapterId(chapter.id);
        setTempTitle(chapter.title);
    };

    const handleFinishEditing = () => {
        if (editingChapterId && tempTitle.trim()) {
            onUpdateChapterTitle(editingChapterId, tempTitle.trim());
        }
        setEditingChapterId(null);
    };

    const handleDragOver = (
        e: DragEvent,
        id: string,
        type: 'chapter' | 'article',
    ) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const threshold = rect.height / 3;

        let position: 'top' | 'bottom' | 'middle';
        if (type === 'chapter') {
            if (y < threshold) {
                position = 'top';
            } else if (y > threshold * 2) {
                position = 'bottom';
            } else {
                position = 'middle';
            }
        } else {
            if (y < rect.height / 2) {
                position = 'top';
            } else {
                position = 'bottom';
            }
        }

        setDragOverId(id);
        setDragOverPosition(position);
    };

    const handleDrop = (
        e: DragEvent,
        targetId: string,
        targetType: 'chapter' | 'article',
        parentId: string | null,
    ) => {
        e.preventDefault();
        e.stopPropagation();

        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        const { id: draggedId, type: draggedType } = data;

        const position = dragOverPosition;
        setDragOverId(null);
        setDragOverPosition(null);

        if (draggedId === targetId) {
            return;
        }

        if (position === 'middle' && targetType === 'chapter') {
            // Drop inside chapter
            if (draggedType === 'chapter') {
                onMoveChapter(draggedId, targetId);
            } else {
                onMoveArticle(draggedId, targetId);
            }
            if (!expandedChapters.has(targetId)) {
                toggleChapter(targetId);
            }
            return;
        }

        // Drop top/bottom (reordering)
        const siblings =
            draggedType === 'chapter'
                ? knowledge.chapters
                      .filter(c => c.parentId === parentId)
                      .sort((a, b) => a.order - b.order)
                : knowledge.articles
                      .filter(a => a.chapterId === parentId)
                      .sort((a, b) => a.order - b.order);

        const targetIndex = siblings.findIndex(s => s.id === targetId);
        let newIndex = position === 'top' ? targetIndex : targetIndex + 1;

        // Adjust index if moving within same parent
        const currentIndex = siblings.findIndex(s => s.id === draggedId);
        if (currentIndex !== -1 && currentIndex < newIndex) {
            newIndex--;
        }

        if (draggedType === 'chapter') {
            onMoveChapter(draggedId, parentId, newIndex);
        } else {
            onMoveArticle(draggedId, parentId, newIndex);
        }
    };

    const renderChapter = (chapter: KnowledgeChapter, depth: number) => {
        const isExpanded = expandedChapters.has(chapter.id);
        const subChapters = knowledge.chapters
            .filter(c => c.parentId === chapter.id)
            .sort((a, b) => a.order - b.order);
        const articles = knowledge.articles
            .filter(a => a.chapterId === chapter.id)
            .sort((a, b) => a.order - b.order);

        const isEditing = editingChapterId === chapter.id;
        const isDragOver = dragOverId === chapter.id;

        return (
            <div key={chapter.id} className="flex flex-col">
                <div
                    className={cn(
                        'group hover:bg-accent/50 relative flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm transition-colors',
                        depth > 0 && 'ml-2',
                        isDragOver &&
                            dragOverPosition === 'middle' &&
                            'bg-accent',
                        isDragOver &&
                            dragOverPosition === 'top' &&
                            'before:bg-primary before:absolute before:top-0 before:right-0 before:left-0 before:h-0.5 before:rounded-full',
                        isDragOver &&
                            dragOverPosition === 'bottom' &&
                            'after:bg-primary after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full',
                    )}
                    onClick={() => !isEditing && toggleChapter(chapter.id)}
                    draggable
                    onDragStart={e => {
                        e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({ type: 'chapter', id: chapter.id }),
                        );
                    }}
                    onDragOver={e => handleDragOver(e, chapter.id, 'chapter')}
                    onDragLeave={() => {
                        setDragOverId(null);
                        setDragOverPosition(null);
                    }}
                    onDrop={e =>
                        handleDrop(e, chapter.id, 'chapter', chapter.parentId)
                    }
                >
                    <GripVertical className="text-muted-foreground size-3 shrink-0 cursor-grab opacity-0 group-hover:opacity-100" />
                    {subChapters.length > 0 || articles.length > 0 ? (
                        isExpanded ? (
                            <ChevronDown className="mr-1 size-4 shrink-0" />
                        ) : (
                            <ChevronRight className="mr-1 size-4 shrink-0" />
                        )
                    ) : (
                        <div className="mr-1 size-4 shrink-0" />
                    )}
                    <Folder className="text-primary/70 mr-2 size-4 shrink-0" />

                    {isEditing ? (
                        <Input
                            autoFocus
                            value={tempTitle}
                            onChange={e => setTempTitle(e.target.value)}
                            onBlur={handleFinishEditing}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    handleFinishEditing();
                                }
                                if (e.key === 'Escape') {
                                    setEditingChapterId(null);
                                }
                            }}
                            className="h-7 px-1 py-0 text-xs"
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className="flex-1 truncate"
                            onDoubleClick={e => {
                                e.stopPropagation();
                                handleStartEditing(chapter);
                            }}
                        >
                            {chapter.title}
                        </span>
                    )}

                    <div className="ml-2 flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-6"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <MoreVertical className="size-3" />
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-42">
                                <DropdownMenuItem
                                    onClick={() => onAddArticle(chapter.id)}
                                >
                                    <FileText className="mr-2 size-3" />
                                    <span className="truncate">
                                        {t('knowledge.addArticle')}
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onAddChapter(chapter.id)}
                                >
                                    <Folder className="mr-2 size-3" />
                                    <span className="truncate">
                                        {t('knowledge.addChapter')}
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleStartEditing(chapter)}
                                >
                                    <Edit className="mr-2 size-3" />
                                    <span className="truncate">
                                        {t('knowledge.editTitle')}
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => onDeleteChapter(chapter.id)}
                                >
                                    <Trash className="mr-2 size-3" />
                                    <span className="truncate">
                                        {t('delete')}
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {isExpanded &&
                    (subChapters.length > 0 || articles.length > 0) && (
                        <div className="mt-1 ml-6 flex flex-col gap-1 border-l">
                            {subChapters.map(c => renderChapter(c, depth + 1))}
                            {articles.map(article => (
                                <div
                                    key={article.id}
                                    className={cn(
                                        'group relative ml-2 flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm transition-all duration-200',
                                        selectedArticleId === article.id
                                            ? selectedBgClasses[
                                                  article.color || 'yellow'
                                              ]
                                            : bgClasses[
                                                  article.color || 'yellow'
                                              ],
                                        selectedArticleId === article.id
                                            ? 'text-primary font-medium'
                                            : 'text-muted-foreground hover:text-foreground',
                                        dragOverId === article.id &&
                                            dragOverPosition === 'top' &&
                                            'before:bg-primary before:absolute before:top-0 before:right-0 before:left-0 before:h-0.5 before:rounded-full',
                                        dragOverId === article.id &&
                                            dragOverPosition === 'bottom' &&
                                            'after:bg-primary after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full',
                                    )}
                                    onClick={() => onSelectArticle(article.id)}
                                    draggable
                                    onDragStart={e => {
                                        e.dataTransfer.setData(
                                            'application/json',
                                            JSON.stringify({
                                                type: 'article',
                                                id: article.id,
                                            }),
                                        );
                                    }}
                                    onDragOver={e =>
                                        handleDragOver(e, article.id, 'article')
                                    }
                                    onDragLeave={() => {
                                        setDragOverId(null);
                                        setDragOverPosition(null);
                                    }}
                                    onDrop={e =>
                                        handleDrop(
                                            e,
                                            article.id,
                                            'article',
                                            chapter.id,
                                        )
                                    }
                                >
                                    <GripVertical className="text-muted-foreground size-3 shrink-0 cursor-grab opacity-0 group-hover:opacity-100" />
                                    <FileText className="text-muted-foreground mr-2 size-3 shrink-0" />
                                    <span className="flex-1 truncate">
                                        {article.title}
                                    </span>
                                    <div className="ml-2 flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                render={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-6"
                                                        onClick={e =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <MoreVertical className="size-3" />
                                                    </Button>
                                                }
                                            />
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() =>
                                                        onDeleteArticle(
                                                            article.id,
                                                        )
                                                    }
                                                >
                                                    <Trash className="mr-2 size-3" />
                                                    <span>{t('delete')}</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
            </div>
        );
    };

    const rootChapters = knowledge.chapters
        .filter(c => !c.parentId)
        .sort((a, b) => a.order - b.order);

    const rootArticles = knowledge.articles
        .filter(a => !a.chapterId)
        .sort((a, b) => a.order - b.order);

    return (
        <div className="flex w-full shrink-0 flex-col gap-6 md:sticky md:h-[calc(100vh-11rem)] md:w-80">
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden px-0 pb-0">
                    <div className="flex shrink-0 flex-col gap-2 px-3 pt-3">
                        <div className="flex items-center justify-between gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onSync}
                                disabled={isSyncing}
                                className="h-9 flex-1 gap-2 rounded-lg bg-black px-3 text-xs font-medium text-white/70 hover:bg-black/90 hover:text-white"
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
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                size="sm"
                                onClick={() => onAddArticle(null)}
                                className="bg-primary text-primary-foreground h-9 w-full rounded-lg px-2 text-xs font-bold"
                            >
                                <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                    {t('knowledge.addArticle')}
                                </span>
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => onAddChapter(null)}
                                className="bg-primary text-primary-foreground h-9 w-full rounded-lg px-2 text-xs font-bold"
                            >
                                <Folder className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                    {t('knowledge.addChapter')}
                                </span>
                            </Button>
                        </div>
                    </div>

                    <ScrollArea
                        className="min-h-0 flex-1 px-0"
                        onDragOver={(e: DragEvent) => {
                            e.preventDefault();
                            if (dragOverId !== 'root') {
                                setDragOverId('root');
                                setDragOverPosition('bottom');
                            }
                        }}
                        onDrop={(e: DragEvent) => {
                            e.preventDefault();
                            setDragOverId(null);
                            setDragOverPosition(null);
                            const data = JSON.parse(
                                e.dataTransfer.getData('application/json'),
                            );
                            if (data.type === 'chapter') {
                                onMoveChapter(data.id, null);
                            } else if (data.type === 'article') {
                                onMoveArticle(data.id, null);
                            }
                        }}
                    >
                        <div
                            className={cn(
                                'flex min-h-[100px] flex-col gap-1 px-4 py-2',
                                dragOverId === 'root' &&
                                    'bg-accent/20 rounded-lg transition-colors',
                            )}
                        >
                            {loading &&
                            knowledge.articles.length === 0 &&
                            knowledge.chapters.length === 0 ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="ml-4 h-8 w-4/5" />
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="ml-4 h-8 w-3/4" />
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            ) : (
                                <>
                                    {rootChapters.map(c => renderChapter(c, 0))}
                                    {rootArticles.map(article => (
                                        <div
                                            key={article.id}
                                            className={cn(
                                                'group relative flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm transition-all duration-200',
                                                selectedArticleId === article.id
                                                    ? selectedBgClasses[
                                                          article.color ||
                                                              'yellow'
                                                      ]
                                                    : bgClasses[
                                                          article.color ||
                                                              'yellow'
                                                      ],
                                                selectedArticleId === article.id
                                                    ? 'text-primary font-medium'
                                                    : 'text-muted-foreground hover:text-foreground',
                                                dragOverId === article.id &&
                                                    dragOverPosition ===
                                                        'top' &&
                                                    'before:bg-primary before:absolute before:top-0 before:right-0 before:left-0 before:h-0.5 before:rounded-full',
                                                dragOverId === article.id &&
                                                    dragOverPosition ===
                                                        'bottom' &&
                                                    'after:bg-primary after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full',
                                            )}
                                            onClick={() =>
                                                onSelectArticle(article.id)
                                            }
                                            draggable
                                            onDragStart={e => {
                                                e.dataTransfer.setData(
                                                    'application/json',
                                                    JSON.stringify({
                                                        type: 'article',
                                                        id: article.id,
                                                    }),
                                                );
                                            }}
                                            onDragOver={e =>
                                                handleDragOver(
                                                    e,
                                                    article.id,
                                                    'article',
                                                )
                                            }
                                            onDragLeave={() => {
                                                setDragOverId(null);
                                                setDragOverPosition(null);
                                            }}
                                            onDrop={e =>
                                                handleDrop(
                                                    e,
                                                    article.id,
                                                    'article',
                                                    null,
                                                )
                                            }
                                        >
                                            <GripVertical className="text-muted-foreground size-3 shrink-0 cursor-grab opacity-0 group-hover:opacity-100" />
                                            <FileText className="text-muted-foreground mr-2 size-3 shrink-0" />
                                            <span className="flex-1 truncate">
                                                {article.title}
                                            </span>
                                            <div className="ml-2 flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-6"
                                                                onClick={e =>
                                                                    e.stopPropagation()
                                                                }
                                                            >
                                                                <MoreVertical className="size-3" />
                                                            </Button>
                                                        }
                                                    />
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() =>
                                                                onDeleteArticle(
                                                                    article.id,
                                                                )
                                                            }
                                                        >
                                                            <Trash className="mr-2 size-3" />
                                                            <span>
                                                                {t('delete')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
