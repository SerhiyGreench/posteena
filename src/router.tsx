import { type ReactElement } from 'react';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { Messages } from '@/constants/Messages';
import i18n from '@/i18n';
import { routeTree } from './routeTree.gen';

function DefaultNotFound(): ReactElement {
    return <p>{i18n.t(Messages.NotFound)}</p>;
}

export const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: DefaultNotFound,
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
