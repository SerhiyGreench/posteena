import { type ReactElement } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';

export const Route = createFileRoute('/')({ component: App });

function App(): ReactElement {
    const { t } = useTranslation();

    return (
        <main className="flex flex-col items-center justify-center p-4 text-center">
            <div className="w-full max-w-md space-y-8">
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {t('description')}
                </p>
                <div className="pt-4">
                    <Button className="font-bold lowercase" size="lg">
                        {t('createPost')}
                    </Button>
                </div>
            </div>
        </main>
    );
}
