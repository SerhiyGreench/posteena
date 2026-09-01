// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKeys } from '@/constants/StorageKeys';
import { GoogleDriveInvoicesAdapter } from '@/features/invoices/api/GoogleDriveInvoicesAdapter';
import type { InvoiceRegistry } from '@/features/invoices/types';
import { createInitialRegistry } from '@/features/invoices/utils/normaliseRegistry';
import { resetLoadedScripts, ScriptLoadedAttribute } from '@/lib/loadScript';
import { Storage } from '@/lib/Storage';

interface FakeGlobal {
    gapi?: unknown;
    google?: unknown;
    fetch?: typeof fetch;
}

/**
 * Stands in for the Google client.
 *
 * `drive` is deliberately absent until `client.init` runs, which is exactly how
 * gapi behaves: the discovery document defines `gapi.client.drive`, and
 * touching it earlier throws "Cannot read properties of undefined".
 */
function installFakeGapi(): { listCalls: number } {
    const counters = { listCalls: 0 };
    const client: Record<string, unknown> = {
        init: vi.fn(async () => {
            client.drive = {
                files: {
                    list: vi.fn(async () => {
                        counters.listCalls += 1;

                        return { result: { files: [{ id: 'folder-1' }] } };
                    }),
                    create: vi.fn(async () => ({ result: { id: 'folder-1' } })),
                },
                about: { get: vi.fn(async () => ({ result: { user: {} } })) },
            };
        }),
        setToken: vi.fn(),
    };

    // Stand in for scripts that have already executed: jsdom never fires
    // `onload` for a tag it did not fetch.
    resetLoadedScripts();

    for (const src of [
        'https://apis.google.com/js/api.js',
        'https://accounts.google.com/gsi/client',
    ]) {
        const script = document.createElement('script');

        script.src = src;
        script.setAttribute(ScriptLoadedAttribute, 'true');
        document.body.appendChild(script);
    }

    const scope = globalThis as unknown as FakeGlobal;

    scope.gapi = {
        load: (_name: string, callback: () => void) => callback(),
        client,
    };
    scope.google = {
        accounts: {
            oauth2: {
                initTokenClient: () => ({
                    requestAccessToken: vi.fn(),
                    callback: vi.fn(),
                    error_callback: vi.fn(),
                }),
                revoke: vi.fn(),
            },
        },
    };
    scope.fetch = vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: 'file-1', webViewLink: '' }),
    })) as unknown as typeof fetch;

    return counters;
}

describe('GoogleDriveInvoicesAdapter write paths', () => {
    beforeEach(() => {
        // A stored, still-valid session — the state after a page reload.
        Storage.set(StorageKeys.DriveFileToken, {
            accessToken: 'token',
            expiresAt: Date.now() + 3_600_000,
        });
    });

    it('initialises gapi before saving, even as the very first call', async () => {
        const counters = installFakeGapi();
        const adapter = new GoogleDriveInvoicesAdapter('client-id');

        // Reproduces "Cannot read properties of undefined (reading 'files')":
        // issuing an invoice writes before anything has read from Drive.
        await expect(
            adapter.saveRegistry(createInitialRegistry() as InvoiceRegistry),
        ).resolves.toBeUndefined();

        expect(counters.listCalls).toBeGreaterThan(0);
    });

    it('initialises gapi before uploading a document', async () => {
        installFakeGapi();
        const adapter = new GoogleDriveInvoicesAdapter('client-id');

        await expect(
            adapter.uploadDocument({
                folderPath: 'Invoices/2026',
                fileName: 'invoice.pdf',
                mimeType: 'application/pdf',
                content: new Blob(['x']),
            }),
        ).resolves.toEqual({ driveFileId: 'file-1', webViewLink: '' });
    });
});
