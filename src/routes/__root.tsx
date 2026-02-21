import { type ReactElement, type ReactNode } from 'react';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from 'ui/tooltip.tsx';
import { getLocale } from '#/paraglide/runtime';
import Header from '@/components/Header';
import appCss from '@/styles.css?url';

export const Route = createRootRoute({
    beforeLoad: async () => {
        // Other redirect strategies are possible; see
        // https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('lang', getLocale());
        }
    },

    head: () => ({
        meta: [
            {
                charSet: 'utf-8',
            },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1',
            },
            {
                title: 'Posteena',
            },
        ],
        links: [
            {
                rel: 'stylesheet',
                href: appCss,
            },
            {
                rel: 'icon',
                type: 'image/svg+xml',
                href: '/logo.svg',
            },
            {
                rel: 'apple-touch-icon',
                href: '/logo.svg',
            },
            {
                rel: 'manifest',
                href: '/manifest.json',
            },
        ],
    }),
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }): ReactElement {
    return (
        <html lang={getLocale()} suppressHydrationWarning>
            <head className="bg-background">
                <title>Posteena</title>
                <HeadContent />
            </head>
            <body
                className="bg-background @container size-full min-h-screen font-sans antialiased"
                suppressHydrationWarning
            >
                <TooltipProvider>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="dark"
                        enableSystem
                        storageKey="theme"
                        disableTransitionOnChange
                    >
                        <Header />
                        {children}
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
                        <Scripts />
                    </ThemeProvider>
                </TooltipProvider>
            </body>
        </html>
    );
}
