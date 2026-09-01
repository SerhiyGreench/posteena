// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import { DocumentLanguages } from '@/features/invoices/constants/DocumentLanguages';
import type { Invoice, Party } from '@/features/invoices/types';
import { buildInvoiceDocument } from '@/features/invoices/utils/buildInvoiceDocument';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createEmptyParty,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';
import { renderInvoiceDocx } from '@/features/invoices/utils/renderInvoiceDocx';
import {
    buildPdfDefinition,
    renderInvoicePdf,
} from '@/features/invoices/utils/renderInvoicePdf';

/**
 * A realistic bilingual invoice with Slovak diacritics in the descriptions, so
 * a missing font subset shows up as a failure rather than mangled text.
 *
 * Built from explicit data rather than the seeded defaults, which are sample
 * values a user may blank out.
 */
function buildInvoice(customerOverrides: Partial<Party> = {}): Invoice {
    const supplier = {
        ...DefaultInvoiceSettings.supplier,
        name: 'Example Supplier s. r. o.',
        street: 'Testovacia 1',
        postalCode: '000 01',
        city: 'Bratislava',
        countryCode: 'SK',
        registrationNumber: '12 345 678',
        taxNumber: '1234567890',
        bank: {
            accountHolder: 'Example Supplier s. r. o.',
            bankName: 'Example Bank, a. s.',
            iban: 'SK24 9999 0000 0000 0000 1234',
            swift: 'TESTSKBX',
            accountNumber: '',
        },
    };
    const customer: Party = {
        ...createEmptyParty(),
        name: 'Example Customer Ltd',
        street: 'Sample Street 2',
        postalCode: '0000',
        city: 'Limassol',
        countryCode: 'CY',
        registrationNumber: 'HE 000000',
        ...customerOverrides,
    };
    const draft = createInvoiceDraft(
        { ...DefaultInvoiceSettings, supplier },
        customer,
    );
    const items = draft.items.map(item => ({
        ...item,
        descriptions: {
            en: 'Software development services',
            sk: 'Vývoj softvéru a IT poradenstvo',
            uk: 'Розробка програмного забезпечення',
        },
        quantity: 42,
        unitPrice: 30,
    }));

    return {
        ...draft,
        items,
        totals: calculateInvoiceTotals(items),
        number: '20260009',
        issueDate: '2026-08-10',
        supplyDate: '2026-08-10',
        dueDate: '2026-08-24',
        languages: [
            DocumentLanguages.Slovak,
            DocumentLanguages.English,
            DocumentLanguages.Ukrainian,
        ],
    };
}

async function magicBytes(blob: Blob, length: number): Promise<string> {
    const buffer = await blob.arrayBuffer();

    return new TextDecoder('latin1').decode(
        new Uint8Array(buffer).slice(0, length),
    );
}

describe('renderInvoicePdf', () => {
    it('produces a real, non-empty PDF', async () => {
        const blob = await renderInvoicePdf(
            buildInvoiceDocument(buildInvoice()),
        );

        expect(await magicBytes(blob, 5)).toBe('%PDF-');
        // A blank or font-less document would come out far smaller than this.
        expect(blob.size).toBeGreaterThan(2000);
    }, 30_000);
});

describe('renderInvoiceDocx', () => {
    it('produces a real, non-empty DOCX', async () => {
        const blob = await renderInvoiceDocx(
            buildInvoiceDocument(buildInvoice()),
        );

        // DOCX is a zip archive, so it starts with the local file header.
        expect(await magicBytes(blob, 2)).toBe('PK');
        expect(blob.size).toBeGreaterThan(2000);
    }, 30_000);
});

/** Every hex colour anywhere in a nested structure. */
function collectHexColours(value: unknown, found: string[] = []): string[] {
    if (typeof value === 'string') {
        if (/^#[0-9a-f]{6}$/i.test(value)) {
            found.push(value);
        }
    } else if (Array.isArray(value)) {
        value.forEach(entry => collectHexColours(entry, found));
    } else if (value && typeof value === 'object') {
        Object.values(value).forEach(entry => collectHexColours(entry, found));
    }

    return found;
}

describe('a customer with no identifiers', () => {
    /** Private individuals have no IČO, DIČ, VAT id or e-mail on file. */
    const bare = {
        registrationNumber: '',
        taxNumber: '',
        vatNumber: '',
        email: '',
    };

    it('still renders a PDF', async () => {
        const blob = await renderInvoicePdf(
            buildInvoiceDocument(buildInvoice(bare)),
        );

        expect(await magicBytes(blob, 5)).toBe('%PDF-');
    }, 30_000);

    it('still renders a DOCX', async () => {
        const blob = await renderInvoiceDocx(
            buildInvoiceDocument(buildInvoice(bare)),
        );

        expect(await magicBytes(blob, 2)).toBe('PK');
    }, 30_000);
});

describe('invoice document palette', () => {
    it('uses greyscale only', () => {
        const colours = collectHexColours(
            buildPdfDefinition(buildInvoiceDocument(buildInvoice())),
        );

        expect(colours.length).toBeGreaterThan(0);

        const coloured = colours.filter(hex => {
            const [red, green, blue] = [1, 3, 5].map(offset =>
                hex.slice(offset, offset + 2).toLowerCase(),
            );

            return !(red === green && green === blue);
        });

        expect(coloured).toEqual([]);
    });
});

describe('invoice table widths', () => {
    it('declares percentage widths that add up to the full page', () => {
        const definition = buildPdfDefinition(
            buildInvoiceDocument(buildInvoice()),
        );
        const itemsTable = definition.content.find(
            (entry): entry is Extract<typeof entry, { table: unknown }> =>
                typeof entry === 'object' &&
                entry !== null &&
                'table' in entry &&
                entry.table.headerRows === 1,
        );
        const widths = itemsTable?.table.widths ?? [];

        // Numeric widths would overflow: pdfmake adds cell padding on top of
        // them, while a percentage has that reserve subtracted for us.
        expect(widths.length).toBeGreaterThan(0);
        widths.forEach(width => expect(String(width)).toMatch(/^\d+%$/));

        const total = widths.reduce<number>(
            (sum, width) => sum + Number.parseFloat(String(width)),
            0,
        );

        expect(total).toBe(100);
    });
});
