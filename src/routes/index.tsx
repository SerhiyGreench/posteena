import { type ReactElement } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Messages } from '@/constants/Messages';
import { Routes } from '@/constants/Routes';

export const Route = createFileRoute(Routes.Home)({ component: App });

function App(): ReactElement {
    const { t } = useTranslation();

    return (
        <main className="flex h-full flex-col items-center justify-center overflow-auto p-4 text-center">
            <div className="w-full max-w-md space-y-8">
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {t(Messages.Description)}
                </p>
                <div className="pt-4">
                    <Link to={Routes.CreatePost}>
                        <Button className="font-bold" size="lg">
                            {t(Messages.CreatePost)}
                        </Button>
                    </Link>
                </div>
            </div>
        </main>
    );
}
