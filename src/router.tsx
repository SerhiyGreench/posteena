import { type ReactElement } from 'react';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { m } from '#/paraglide/messages';
import { routeTree } from './routeTree.gen';

function DefaultNotFound(): ReactElement {
    return <p>{m.notFound()}</p>;
}

export const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: DefaultNotFound,
});

export function getRouter(): typeof router {
    return router;
}

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
