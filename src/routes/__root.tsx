import { type ReactElement } from 'react';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from 'ui/tooltip.tsx';
import Header from '@/components/Header';
import '@/i18n';

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout(): ReactElement {
    return (
        <TooltipProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                storageKey="theme"
                disableTransitionOnChange
            >
                <Header />
                <Outlet />
                <TanStackDevtools
                    config={{
                        inspectHotkey: ['Control', 'Meta'],
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
