// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import {
    DocumentMetrics,
    LogoHeightPt,
} from '@/features/invoices/constants/DocumentLayout';
import type { Invoice, InvoiceLogo } from '@/features/invoices/types';
import { buildInvoiceDocument } from '@/features/invoices/utils/buildInvoiceDocument';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createEmptyParty,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';
import { renderInvoiceDocx } from '@/features/invoices/utils/renderInvoiceDocx';
import { buildPdfDefinition } from '@/features/invoices/utils/renderInvoicePdf';

/** A 2x1 transparent PNG: the smallest thing a renderer will accept. */
const logo: InvoiceLogo = {
    dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADUlEQVR4nGNgYGD4DwABBAEAX+jqbQAAAABJRU5ErkJggg==',
    width: 2,
    height: 1,
};

function buildInvoice(): Invoice {
    const draft = createInvoiceDraft(DefaultInvoiceSettings, {
        ...createEmptyParty(),
        name: 'Example Customer Ltd',
    });
    const items = draft.items.map(item => ({ ...item, unitPrice: 6500 }));

    return {
        ...draft,
        items,
        totals: calculateInvoiceTotals(items),
        number: '20260009',
    };
}

describe('the invoice logo', () => {
    it('is absent unless one is attached', () => {
        expect(buildInvoiceDocument(buildInvoice()).logo).toBeNull();
    });

    it('sits in the top right corner of the PDF, out of the flow', () => {
        const definition = buildPdfDefinition(
            buildInvoiceDocument(buildInvoice(), logo),
        );
        const [first] = definition.content;

        expect(first).toMatchObject({
            image: logo.dataUrl,
            // Twice as wide as tall, like the image itself.
            width: LogoHeightPt * 2,
            absolutePosition: {
                y: DocumentMetrics.pageMargin,
            },
        });
    });

    it('leaves the page it is drawn on untouched', () => {
        // An absolutely positioned block is not laid out, so everything after
        // it has to be identical to a document with no logo at all.
        const withLogo = buildPdfDefinition(
            buildInvoiceDocument(buildInvoice(), logo),
        );
        const without = buildPdfDefinition(
            buildInvoiceDocument(buildInvoice()),
        );

        expect(withLogo.content).toHaveLength(without.content.length + 1);
        expect(JSON.stringify(withLogo.content.slice(1))).toBe(
            JSON.stringify(without.content),
        );
    });

    it('floats over the DOCX page rather than wrapping in it', async () => {
        const { unzipSync, strFromU8 } = await import('fflate');
        const blob = await renderInvoiceDocx(
            buildInvoiceDocument(buildInvoice(), logo),
        );
        const xml = strFromU8(
            unzipSync(new Uint8Array(await blob.arrayBuffer()))[
                'word/document.xml'
            ],
        );

        // Anchored to the page and wrapped by nothing: Word then reflows
        // nothing around it.
        expect(xml).toContain('<wp:wrapNone/>');
        expect(xml).toContain('relativeFrom="page"');
    }, 30_000);
});
