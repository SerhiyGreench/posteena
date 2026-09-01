import { describe, expect, it } from 'vitest';

import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import type { InvoiceRegistry } from '@/features/invoices/types';
import { createEmptyParty } from '@/features/invoices/utils/createInvoiceDraft';
import {
    buildSettingsExport,
    buildSettingsExportFileName,
    parseSettingsImport,
} from '@/features/invoices/utils/invoiceSettingsTransfer';
import { createInitialRegistry } from '@/features/invoices/utils/normaliseRegistry';

function registry(): InvoiceRegistry {
    const base = createInitialRegistry();

    return {
        ...base,
        settings: {
            ...base.settings,
            supplier: {
                ...base.settings.supplier,
                name: 'Example Supplier s. r. o.',
            },
            numbering: { ...base.settings.numbering, nextSequence: 42 },
        },
        companies: [{ ...createEmptyParty(), name: 'Example Customer Ltd' }],
    };
}

describe('invoice settings transfer', () => {
    it('round-trips settings and companies', () => {
        const imported = parseSettingsImport(buildSettingsExport(registry()));

        expect(imported.settings.supplier.name).toBe(
            'Example Supplier s. r. o.',
        );
        expect(imported.settings.numbering.nextSequence).toBe(42);
        expect(imported.companies).toHaveLength(1);
        expect(imported.companies[0].name).toBe('Example Customer Ltd');
    });

    it('never carries invoices across', () => {
        const exported = JSON.parse(buildSettingsExport(registry())) as Record<
            string,
            unknown
        >;

        expect(exported).not.toHaveProperty('invoices');
    });

    it('names the file by export date', () => {
        expect(buildSettingsExportFileName(new Date('2026-09-01'))).toBe(
            'posteena-invoice-settings-2026-09-01.json',
        );
    });

    it('fills in missing sections from the defaults', () => {
        const imported = parseSettingsImport(
            JSON.stringify({ settings: { numbering: { nextSequence: 7 } } }),
        );

        expect(imported.settings.numbering.nextSequence).toBe(7);
        expect(imported.settings.drive.folderPath).toBe(
            DefaultInvoiceSettings.drive.folderPath,
        );
        expect(imported.companies).toEqual([]);
    });

    it('rejects a file that is not JSON', () => {
        expect(() => parseSettingsImport('not json at all')).toThrow(
            /not valid JSON/,
        );
    });

    it('rejects JSON without settings', () => {
        expect(() => parseSettingsImport('{"kind":"something"}')).toThrow(
            /does not contain invoice settings/,
        );
    });

    it('rejects a JSON array', () => {
        expect(() => parseSettingsImport('[1,2,3]')).toThrow();
    });
});
