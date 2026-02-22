import { type ReactElement, useState } from 'react';
import { Copy, Edit, Eye, EyeOff, Trash } from 'lucide-react';
import { Button } from 'ui/button';
import { Card, CardContent } from 'ui/card';
import type { PasswordItem } from '../../types';

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
    const [showPassword, setShowPassword] = useState(false);

    const copyToClipboard = (text: string): void => {
        void navigator.clipboard.writeText(text);
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
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8"
                            onClick={e => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            title="Edit"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            onClick={e => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            title="Delete"
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
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
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
