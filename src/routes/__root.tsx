import { type ReactElement, type UIEvent, useEffect, useState } from 'react';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ThemeProvider, useTheme } from 'next-themes';
import { TooltipProvider } from 'ui/tooltip';
import Header from '@/components/Header';
import '@/i18n';

export const Route = createRootRoute({
    component: RootLayout,
});

function ThemeColor(): null {
    const { theme, resolvedTheme } = useTheme();

    useEffect(() => {
        const currentTheme = resolvedTheme || theme;
        const color = currentTheme === 'dark' ? '#000000' : '#ffffff';

        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', color);
    }, [theme, resolvedTheme]);

    return null;
}

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
                <ThemeColor />
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
                        <div className="h-20 shrink-0 md:hidden" />
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
