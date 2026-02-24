import { type ReactElement, type UIEvent, useState } from 'react';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from 'ui/tooltip';
import Header from '@/components/Header';
import '@/i18n';

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout(): ReactElement {
    const [scrolled, setScrolled] = useState(false);

    const onScroll = (event: UIEvent<HTMLDivElement>): void => {
        setScrolled(event.currentTarget.scrollTop > 0);
    };

    return (
        <TooltipProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                storageKey="theme"
                disableTransitionOnChange
            >
                <div
                    className="relative flex flex-col overflow-hidden"
                    style={{ height: 'var(--screen-height, 100vh)' }}
                >
                    <Header scrolled={scrolled} />
                    <div
                        id="app-container"
                        className="flex-1 overflow-y-auto"
                        onScroll={onScroll}
                    >
                        <Outlet />
                    </div>
                </div>
                <TanStackDevtools
                    config={{
                        inspectHotkey: ['Control', 'Meta'],
                        theme: 'dark',
                        hideUntilHover: true,
                    }}
                    plugins={[
                        {
                            name: 'Tanstack Router',
                            render: <TanStackRouterDevtoolsPanel />,
                        },
                    ]}
                />
            </ThemeProvider>
        </TooltipProvider>
    );
}
