import { type ChangeEvent, type ReactElement } from 'react';
import { Check, Copy, Dices, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { CollapsibleTrigger } from 'ui/collapsible';
import { Input } from 'ui/input';
import { cn } from 'ui/lib/utils';

interface PasswordInputProps {
    password?: string;
    copied: boolean;
    showSettings: boolean;
    onCopy: () => Promise<void>;
    onGenerate: () => void;
    onToggleSettings: () => void;
    onPasswordChange: (value: string) => void;
}

export function PasswordInput({
    password,
    copied,
    showSettings,
    onCopy,
    onGenerate,
    onToggleSettings,
    onPasswordChange,
}: PasswordInputProps): ReactElement {
    const { t } = useTranslation();

    const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
        onPasswordChange(e.target.value);
    };

    return (
        <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Input
                    value={password || ''}
                    onChange={handleChange}
                    placeholder={t('passwordGenerator.placeholder')}
                    className="pr-10 font-mono"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 h-full w-10"
                    onClick={onCopy}
                    disabled={!password}
                >
                    {copied ? (
                        <Check className="size-4 text-green-500" />
                    ) : (
                        <Copy className="size-4" />
                    )}
                </Button>
            </div>
            <Button onClick={onGenerate} size="icon" className="shrink-0">
                <Dices className="size-4" />
            </Button>
            <CollapsibleTrigger
                render={
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn('shrink-0', showSettings && 'bg-accent')}
                        onClick={onToggleSettings}
                    >
                        <Settings2
                            className={cn(
                                'size-4 transition-transform duration-200 ease-out',
                                showSettings && 'rotate-90',
                            )}
                        />
                    </Button>
                }
            />
        </div>
    );
}
