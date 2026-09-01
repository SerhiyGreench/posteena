/**
 * Loads a lazily imported module, turning a stale-deployment failure into
 * something the user can act on.
 *
 * Built chunks carry a content hash in their file name. When a new version is
 * deployed, the old chunks disappear, so a tab that was loaded before the
 * deploy asks for a file that no longer exists and the import rejects with
 * "Failed to fetch dynamically imported module" — an opaque message that says
 * nothing about the actual remedy, which is simply to reload.
 *
 * The page is deliberately not reloaded automatically: an unsaved invoice
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

export class StaleDeploymentError extends Error {
    constructor(cause: unknown) {
        super(
            'This page is running an older version of the app. Reload the page and try again.',
        );
        this.name = 'StaleDeploymentError';
        this.cause = cause;
    }
}

/**
 * Wraps a dynamic `import()` so a missing chunk reports the real problem.
 */
export async function importChunk<T>(load: () => Promise<T>): Promise<T> {
    try {
        return await load();
    } catch (error) {
        if (isChunkLoadError(error)) {
            throw new StaleDeploymentError(error);
        }

        throw error;
    }
}
