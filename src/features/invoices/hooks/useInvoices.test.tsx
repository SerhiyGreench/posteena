// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKeys } from '@/constants/StorageKeys';
import { GoogleDriveInvoicesAdapter } from '@/features/invoices/api/GoogleDriveInvoicesAdapter';
import { InvoiceStatuses } from '@/features/invoices/constants/InvoiceStatuses';
import { useInvoices } from '@/features/invoices/hooks/useInvoices';
import type { InvoiceRegistry } from '@/features/invoices/types';
import { Storage } from '@/lib/Storage';

interface Uploaded {
    fileName: string;
    folderPath: string;
    mimeType: string;
}

const uploads: Uploaded[] = [];

/** Replaces the Drive adapter with an in-memory double. */
function stubAdapter(): void {
    const prototype = GoogleDriveInvoicesAdapter.prototype;

    vi.spyOn(prototype, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(prototype, 'getUserIdentifier').mockResolvedValue('tester');
    vi.spyOn(prototype, 'fetchRegistry').mockResolvedValue(
        null as unknown as InvoiceRegistry,
    );
    vi.spyOn(prototype, 'saveRegistry').mockResolvedValue(undefined);
    vi.spyOn(prototype, 'uploadDocument').mockImplementation(async args => {
        uploads.push({
            fileName: args.fileName,
            folderPath: args.folderPath,
            mimeType: args.mimeType,
        });

        return { driveFileId: `id-${uploads.length}`, webViewLink: 'link' };
    });
}

describe('issuing an invoice', () => {
    beforeEach(() => {
        uploads.length = 0;
        Storage.set(StorageKeys.InvoicesCache, null);
        Storage.set(StorageKeys.DriveFileToken, {
            accessToken: 'token',
            expiresAt: Date.now() + 3_600_000,
        });
        stubAdapter();
    });

    it('archives both formats to Drive without downloading them', async () => {
        const { result } = renderHook(() => useInvoices());

        await waitFor(() => expect(result.current.loading).toBe(false));

        const draft = result.current.createDraft(null);
        const priced = {
            ...draft,
            items: draft.items.map(item => ({ ...item, unitPrice: 100 })),
        };

        await act(async () => {
            await result.current.issueInvoice(priced);
        });

        await waitFor(() => expect(uploads).toHaveLength(2));

        expect(uploads.map(upload => upload.mimeType).sort()).toEqual([
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
        expect(uploads.every(upload => upload.folderPath.length > 0)).toBe(
            true,
        );

        const issued = result.current.invoices[0];

        expect(issued.status).toBe(InvoiceStatuses.Issued);
        // Both references are recorded on the invoice.
        expect(issued.files.map(file => file.format).sort()).toEqual([
            'docx',
            'pdf',
        ]);
    }, 30_000);

    it('does not archive when Drive storage is switched off', async () => {
        const { result } = renderHook(() => useInvoices());

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.saveSettings({
                ...result.current.settings,
                drive: { ...result.current.settings.drive, autoUpload: false },
            });
        });

        const draft = result.current.createDraft(null);

        await act(async () => {
            await result.current.issueInvoice({
                ...draft,
                items: draft.items.map(item => ({ ...item, unitPrice: 100 })),
            });
        });

        expect(uploads).toHaveLength(0);
        expect(result.current.invoices[0].files).toEqual([]);
    }, 30_000);
});
