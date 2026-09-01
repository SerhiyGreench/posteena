import { describe, expect, it } from 'vitest';

import {
    importChunk,
    isChunkLoadError,
    StaleDeploymentError,
} from '@/lib/importChunk';

describe('isChunkLoadError', () => {
    it('recognises the browsers’ chunk-load messages', () => {
        for (const message of [
            'Failed to fetch dynamically imported module: https://posteena.com/assets/vfs_fonts-CWFBu_GZ.js',
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

describe('importChunk', () => {
    it('returns the module when the import succeeds', async () => {
        await expect(importChunk(async () => ({ value: 1 }))).resolves.toEqual({
            value: 1,
        });
    });

    it('reports a stale deployment with a remedy the user can follow', async () => {
        const load = async (): Promise<never> => {
            throw new Error(
                'Failed to fetch dynamically imported module: /assets/vfs_fonts-CWFBu_GZ.js',
            );
        };

        await expect(importChunk(load)).rejects.toBeInstanceOf(
            StaleDeploymentError,
        );
        await expect(importChunk(load)).rejects.toThrow(/Reload the page/);
    });

    it('passes other errors through untouched', async () => {
        const load = async (): Promise<never> => {
            throw new RangeError('bad value');
        };

        await expect(importChunk(load)).rejects.toBeInstanceOf(RangeError);
    });
});
