/**
 * Loads a lazily imported module, and says something true when it fails.
 *
 * Built chunks carry a content hash in their file name, so a tab loaded
 * before a deploy asks for a file that no longer exists. But a phone that
 * loses its connection halfway through a 900KB library reports exactly the
 * same "Failed to fetch dynamically imported module", and the two need
 * opposite advice — one is fixed by reloading, the other by waiting for a
 * better signal. The message the user sees is therefore chosen by asking the
 * server whether the file is actually there, not by guessing.
 *
 * The page is deliberately never reloaded automatically: an unsaved invoice
 * draft only lives in memory, and throwing away someone's work to fix a
 * caching problem is a poor trade.
 */

/** Messages browsers use when a module script cannot be fetched or parsed. */
const ChunkLoadPatterns = [
    /failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /importing a module script failed/i,
    /'text\/html' is not a valid javascript mime type/i,
];

export function isChunkLoadError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);

    return ChunkLoadPatterns.some(pattern => pattern.test(message));
}

/** The deployment moved on and this page is asking for a file that is gone. */
export class StaleDeploymentError extends Error {
    constructor(cause: unknown) {
        super(
            'This page is running an older version of the app. Reload the page and try again.',
        );
        this.name = 'StaleDeploymentError';
        this.cause = cause;
    }
}

/** The file is still there; the request for it did not arrive. */
export class ChunkLoadError extends Error {
    constructor(cause: unknown) {
        super(
            'Part of the app could not be loaded. Check your connection, then reload the page and try again.',
        );
        this.name = 'ChunkLoadError';
        this.cause = cause;
    }
}

/** The module URL browsers put in the failure message, if it is there. */
export function extractModuleUrl(error: unknown): string | null {
    const message = error instanceof Error ? error.message : String(error);
    const match = /(https?:\/\/|\/)[^\s"']+\.m?js\b[^\s"')]*/.exec(message);

    return match ? match[0] : null;
}

/**
 * Whether the server still serves that file.
 *
 * `cache: 'reload'` so the answer comes from the server rather than from the
 * cache that may be the reason we are here. A request that cannot be made at
 * all says nothing about the file, so it counts as present: blaming the
 * deployment for what is plainly a connection problem is the mistake this
 * whole function exists to avoid.
 */
async function isChunkMissing(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { cache: 'reload' });

        return response.status === 404 || response.status === 403;
    } catch {
        return false;
    }
}

/**
 * Wraps a dynamic `import()` so a failure reports the real problem, and
 * retries once in case the request simply did not arrive.
 */
export async function importChunk<T>(load: () => Promise<T>): Promise<T> {
    try {
        return await load();
    } catch (error) {
        if (!isChunkLoadError(error)) {
            throw error;
        }

        const url = extractModuleUrl(error);

        if (!url) {
            throw new ChunkLoadError(error);
        }

        try {
            // A browser records a failed module fetch against its URL and
            // will not go back for it, so the retry has to ask for a URL that
            // is a character different.
            return (await import(
                /* @vite-ignore */ `${url}${url.includes('?') ? '&' : '?'}retry=${Date.now()}`
            )) as T;
        } catch (retryError) {
            throw (await isChunkMissing(url))
                ? new StaleDeploymentError(retryError)
                : new ChunkLoadError(retryError);
        }
    }
}
