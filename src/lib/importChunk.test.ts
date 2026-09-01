// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ChunkLoadError,
    extractModuleUrl,
    importChunk,
    isChunkLoadError,
    StaleDeploymentError,
} from '@/lib/importChunk';

const ChunkUrl = 'https://posteena.com/assets/vfs_fonts-CWFBu_GZ.js';

/** A load that always fails the way a browser reports a missing chunk. */
function failing(): () => Promise<never> {
    return async (): Promise<never> => {
        throw new Error(
            `Failed to fetch dynamically imported module: ${ChunkUrl}`,
        );
    };
}

/** Answers the "is the file still there?" probe with a status. */
function stubProbe(status: number): void {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('', { status })),
    );
}

describe('isChunkLoadError', () => {
    it('recognises the browsers’ chunk-load messages', () => {
        for (const message of [
            `Failed to fetch dynamically imported module: ${ChunkUrl}`,
            'error loading dynamically imported module',
            'Importing a module script failed.',
            "Expected a JavaScript module script but the server responded with a MIME type of 'text/html' is not a valid JavaScript MIME type.",
        ]) {
            expect(isChunkLoadError(new Error(message))).toBe(true);
        }
    });

    it('leaves unrelated failures alone', () => {
        expect(isChunkLoadError(new Error('Network request failed'))).toBe(
            false,
        );
        expect(isChunkLoadError(new TypeError('x is not a function'))).toBe(
            false,
        );
    });
});

describe('extractModuleUrl', () => {
    it('takes the module URL out of the failure message', () => {
        expect(
            extractModuleUrl(
                new Error(
                    `Failed to fetch dynamically imported module: ${ChunkUrl}`,
                ),
            ),
        ).toBe(ChunkUrl);
        expect(
            extractModuleUrl(
                new Error(
                    'Failed to fetch dynamically imported module: /assets/pdfmake-D1QrUNiY.js',
                ),
            ),
        ).toBe('/assets/pdfmake-D1QrUNiY.js');
    });

    it('returns null when the message names no file', () => {
        expect(
            extractModuleUrl(new Error('Importing a module script failed')),
        ).toBeNull();
    });
});

describe('importChunk', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the module when the import succeeds', async () => {
        await expect(importChunk(async () => ({ value: 1 }))).resolves.toEqual({
            value: 1,
        });
    });

    it('blames the deployment only when the file is really gone', async () => {
        stubProbe(404);

        await expect(importChunk(failing())).rejects.toBeInstanceOf(
            StaleDeploymentError,
        );
        await expect(importChunk(failing())).rejects.toThrow(/Reload the page/);
    });

    it('blames the connection when the file is still served', async () => {
        // The regression: an up-to-date page was told it was out of date.
        stubProbe(200);

        await expect(importChunk(failing())).rejects.toBeInstanceOf(
            ChunkLoadError,
        );
        await expect(importChunk(failing())).rejects.toThrow(
            /Check your connection/,
        );
    });

    it('does not blame the deployment when the probe cannot be made', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new TypeError('Failed to fetch');
            }),
        );

        await expect(importChunk(failing())).rejects.toBeInstanceOf(
            ChunkLoadError,
        );
    });

    it('passes other errors through untouched', async () => {
        const load = async (): Promise<never> => {
            throw new RangeError('bad value');
        };

        await expect(importChunk(load)).rejects.toBeInstanceOf(RangeError);
    });
});
