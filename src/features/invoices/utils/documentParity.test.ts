// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import {
    SummaryColumns,
    TotalsRow,
} from '@/features/invoices/constants/DocumentLayout';
import type { InvoiceDocumentModel } from '@/features/invoices/types';
import { buildInvoiceDocument } from '@/features/invoices/utils/buildInvoiceDocument';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createEmptyParty,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';
import { renderInvoiceDocx } from '@/features/invoices/utils/renderInvoiceDocx';
import { buildPdfDefinition } from '@/features/invoices/utils/renderInvoicePdf';

function buildModel(): InvoiceDocumentModel {
    const supplier = {
        ...DefaultInvoiceSettings.supplier,
        name: 'Example Supplier s. r. o.',
        countryCode: 'SK',
        registrationNumber: '12 345 678',
        bank: {
            accountHolder: 'Example Supplier s. r. o.',
            bankName: 'Example Bank, a. s.',
            iban: 'SK24 9999 0000 0000 0000 1234',
            swift: 'TESTSKBX',
            accountNumber: '',
        },
    };
    const draft = createInvoiceDraft(
        { ...DefaultInvoiceSettings, supplier },
        {
            ...createEmptyParty(),
            name: 'Example Customer Ltd',
            countryCode: 'CY',
        },
    );
    const items = draft.items.map(item => ({ ...item, unitPrice: 6500 }));

    return buildInvoiceDocument({
        ...draft,
        items,
        totals: calculateInvoiceTotals(items),
        number: '20260009',
        notes: ['Not a VAT payer.'],
    });
}

/** Point sizes the two renderers must agree on. */
const SharedSizes = {
    pageMarginPt: 40,
    titlePt: 22,
    numberPt: 18,
    partyNamePt: 12,
    bodyPt: 9,
    labelPt: 8,
    totalDuePt: 13,
};

describe('PDF and DOCX parity', () => {
    const definition = buildPdfDefinition(buildModel());

    it('uses the same page margins', () => {
        // DOCX margins are twips; 1pt = 20 twips.
        expect(definition.pageMargins?.[0]).toBe(SharedSizes.pageMarginPt);
        expect(definition.pageMargins?.[1]).toBe(SharedSizes.pageMarginPt);
    });

    it('uses the same type scale', () => {
        const styles = definition.styles ?? {};

        // DOCX sizes are half-points, so each is exactly double these.
        expect(styles.title?.fontSize).toBe(SharedSizes.titlePt);
        expect(styles.number?.fontSize).toBe(SharedSizes.numberPt);
        expect(styles.partyName?.fontSize).toBe(SharedSizes.partyNamePt);
        expect(styles.label?.fontSize).toBe(SharedSizes.labelPt);
        expect(styles.totalDueValue?.fontSize).toBe(SharedSizes.totalDuePt);
        expect(definition.defaultStyle?.fontSize).toBe(SharedSizes.bodyPt);
    });

    it('orders the blocks the same way, with notes before the payment code', () => {
        const serialised = JSON.stringify(definition.content);
        const notesAt = serialised.indexOf('Not a VAT payer.');
        const qrAt = serialised.indexOf('"image"');

        expect(notesAt).toBeGreaterThan(-1);

        if (qrAt > -1) {
            expect(qrAt).toBeGreaterThan(notesAt);
        }
    });

    it('splits the header 60/40 like the DOCX grid', () => {
        const header = definition.content[0];
        const widths =
            typeof header === 'object' && 'columns' in header
                ? header.columns.map(column =>
                      typeof column === 'object' && 'width' in column
                          ? column.width
                          : undefined,
                  )
                : [];

        expect(widths).toEqual(['60%', '40%']);
    });

    it('sizes the totals value column to the amount, not to the page', () => {
        const serialised = JSON.stringify(definition.content);

        // Any fixed width is eventually too narrow for the amount, and a
        // token that does not fit gets broken mid-word.
        expect(serialised).toContain('["*","auto"]');
        expect(SummaryColumns.value).toBeGreaterThan(SummaryColumns.label);
    });

    it('gives the totals block the wider half of its row', () => {
        const serialised = JSON.stringify(definition.content);

        // Both renderers split that row by the same shared ratio.
        expect(serialised).toContain(`"${TotalsRow.words * 100}%"`);
        expect(serialised).toContain(`"${TotalsRow.totals * 100}%"`);
        expect(TotalsRow.totals).toBeGreaterThan(TotalsRow.words);
        expect(TotalsRow.words + TotalsRow.totals).toBeCloseTo(1);
    });

    it('never breaks the amount due across lines', () => {
        // "1 260,00 EUR" is one token; a narrow column used to hyphenate it
        // into "EU" and "R".
        const serialised = JSON.stringify(definition.content);
        const dueCell = serialised.slice(
            serialised.indexOf('totalDueValue') - 200,
            serialised.indexOf('totalDueValue') + 200,
        );

        expect(dueCell).toContain('"noWrap":true');
    });
});

/** Reads word/document.xml out of a .docx, which is a plain zip. */
async function readDocumentXml(blob: Blob): Promise<string> {
    const { unzipSync, strFromU8 } = await import('fflate');
    const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));

    return strFromU8(zip['word/document.xml']);
}

describe('DOCX header rule', () => {
    it('draws the divider on the header cells, not just the table', async () => {
        const xml = await readDocumentXml(
            await renderInvoiceDocx(buildModel()),
        );
        const cellBorders =
            xml.match(/<w:tcBorders>.*?<\/w:tcBorders>/gs) ?? [];
        const ruled = cellBorders.filter(
            borders =>
                borders.includes('w:val="single"') &&
                borders.includes('w:sz="16"'),
        );

        // A cell's own borders override the table's, so declaring the rule only
        // on the table left Word drawing nothing under the header.
        expect(ruled).toHaveLength(2);
    }, 30_000);
});
