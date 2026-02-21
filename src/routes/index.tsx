import { type ReactElement } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from 'ui/button';
import { m } from '#/paraglide/messages';

export const Route = createFileRoute('/')({ component: App });

function App(): ReactElement {
    return (
        <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-4 text-center">
            <div className="w-full max-w-md space-y-8">
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {m.description()}
                </p>
                <div className="pt-4">
                    <Button className="font-bold lowercase" size="lg">
                        {m.createPost()}
                    </Button>
                </div>
            </div>
        </main>
    );
}
