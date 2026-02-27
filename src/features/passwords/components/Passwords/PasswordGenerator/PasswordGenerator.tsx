import { type ReactElement } from 'react';
import { Dices } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from 'ui/card';
import { Collapsible } from 'ui/collapsible';
import { cn } from 'ui/lib/utils';
import { PasswordInput } from '@/features/passwords/components/Passwords/PasswordGenerator/components/PasswordInput';
import { PasswordSettings } from '@/features/passwords/components/Passwords/PasswordGenerator/components/PasswordSettings';
import { usePasswordGenerator } from '@/features/passwords/components/Passwords/PasswordGenerator/hooks/usePasswordGenerator';

interface PasswordGeneratorProps {
    onPasswordGenerate?: (password: string) => void;
    className?: string;
    inline?: boolean;
    defaultValue?: string;
}

export default function PasswordGenerator({
    onPasswordGenerate,
    className,
    inline = false,
    defaultValue = '',
}: PasswordGeneratorProps): ReactElement {
    const { t } = useTranslation();
    const {
        password,
        settings,
        copied,
        showSettings,
        setShowSettings,
        handleGenerate,
        handleCopy,
        handlePasswordChange,
        updateSettings,
        updateAlphabet,
    } = usePasswordGenerator({ defaultValue, onPasswordGenerate });

    const content = (
        <div className="space-y-4">
            <PasswordInput
                password={password}
                copied={copied}
                showSettings={showSettings}
                onCopy={handleCopy}
                onGenerate={handleGenerate}
                onToggleSettings={() => setShowSettings(!showSettings)}
                onPasswordChange={handlePasswordChange}
            />
            <PasswordSettings
                settings={settings}
                onUpdateSettings={updateSettings}
                onUpdateAlphabet={updateAlphabet}
            />
        </div>
    );

    if (inline) {
        return (
            <Collapsible open={showSettings} onOpenChange={setShowSettings}>
                <div className={className}>{content}</div>
            </Collapsible>
        );
    }

    return (
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
            <Card className={cn('flex flex-col', className)}>
                <CardHeader className="shrink-0">
                    <CardTitle className="flex items-center gap-4 text-lg">
                        <Dices className="size-5" />
                        {t('passwordGenerator.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent>{content}</CardContent>
            </Card>
        </Collapsible>
    );
}
