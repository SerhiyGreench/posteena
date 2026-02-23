import { type ReactElement, useState } from 'react';
import { Copy, Edit, Eye, EyeOff, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Card, CardContent } from 'ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip';
import { FeedbackTooltip } from '@/components/FeedbackTooltip';
import type { PasswordItem } from '@/features/password-manager/types';

export interface PasswordCardProps {
    item: PasswordItem;
    onEdit: () => void;
    onDelete: () => void;
}

export default function PasswordCard({
    item,
    onEdit,
    onDelete,
}: PasswordCardProps): ReactElement {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = (text: string): void => {
        void navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <Card className="group relative h-50 overflow-hidden border-none transition-colors dark:bg-black">
            <CardContent className="space-y-3 px-6.5 pt-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground truncate text-sm font-medium">
                            {item.email}
                        </div>
                        <div className="mt-2 truncate text-3xl leading-tight font-bold">
                            {item.name}
                        </div>
                    </div>
                    <div className="z-10 flex shrink-0 gap-1">
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8"
                                        onClick={e => {
                                            e.stopPropagation();
                                            onEdit();
                                        }}
                                    />
                                }
                            >
                                <Edit className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>{t('editItem')}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                        onClick={e => {
                                            e.stopPropagation();
                                            onDelete();
                                        }}
                                    />
                                }
                            >
                                <Trash className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent>{t('deleteItem')}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="text-muted-foreground flex items-center gap-2 truncate text-lg font-medium">
                        {item.username}
                    </div>

                    <div className="group/password-box flex items-center justify-between gap-2 py-1">
                        <code className="truncate font-mono text-sm">
                            {showPassword ? item.password : '••••••••••••'}
                        </code>
                        <div className="flex shrink-0 items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-7 w-7"
                                onClick={e => {
                                    e.stopPropagation();
                                    setShowPassword(!showPassword);
                                }}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                )}
                            </Button>
                            <FeedbackTooltip
                                show={isCopied}
                                message={t('copiedToClipboard')}
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-7 w-7"
                                    onClick={e => {
                                        e.stopPropagation();
                                        copyToClipboard(item.password);
                                    }}
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </FeedbackTooltip>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
