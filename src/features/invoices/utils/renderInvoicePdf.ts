import type {
    PdfContent,
    PdfDocumentDefinition,
    PdfMakeStatic,
    PdfTableCell,
    PdfTableContent,
    PdfTableLayout,
} from 'pdfmake/build/pdfmake';

import {
    BandGapPt,
    DocumentFontSizes,
    DocumentMetrics,
    FieldLabelShare,
    LogoHeightPt,
    StackedLineHeight,
    TotalsRow,
} from '@/features/invoices/constants/DocumentLayout';
import type {
    InvoiceDocumentField,
    InvoiceDocumentModel,
    InvoiceDocumentParty,
} from '@/features/invoices/types';
import { importChunk } from '@/lib/importChunk';

/** A4 in points, as pdfmake lays it out. */
const PageWidth = 595.28;

/** A4 width minus the page margins on each side. */
const ContentWidth = Math.round(PageWidth - DocumentMetrics.pageMargin * 2);

/** Printed width of the invoice-number barcode, in points. */
const BarcodeWidth = DocumentMetrics.barcodeWidth;

/** Greyscale only — an invoice is a black-on-white document. */
const Colors = {
    ink: '#111111',
    muted: '#666666',
    line: '#d4d4d4',
    /** Filled band behind the amount due, printed with white text. */
    band: '#111111',
    white: '#ffffff',
} as const;

/** Table layout with a single hairline under the header row. */
const ItemsTableLayout: PdfTableLayout = {
    hLineWidth: (index: number): number => (index === 1 ? 1 : 0.5),
    vLineWidth: (): number => 0,
    hLineColor: (index: number): string =>
        index === 1 ? Colors.ink : Colors.line,
    paddingLeft: (): number => 4,
    paddingRight: (): number => 4,
    paddingTop: (): number => 5,
    paddingBottom: (): number => 5,
};

/** Borderless layout used for the label/value grids. */
const PlainLayout: PdfTableLayout = {
    hLineWidth: (): number => 0,
    vLineWidth: (): number => 0,
    paddingLeft: (): number => 0,
    paddingRight: (): number => 6,
    paddingTop: (): number => 1,
    paddingBottom: (): number => 1,
};

/**
 * The totals grid: as above, but with air between the last totals row and the
 * filled band, which is the last row of the same table.
 */
const SummaryLayout: PdfTableLayout = {
    ...PlainLayout,
    paddingBottom: (index: number, node: unknown): number => {
        const rows = (node as { table: { body: unknown[] } }).table.body.length;

        return index === rows - 2 ? BandGapPt : 1;
    },
};

let cachedPdfMake: PdfMakeStatic | null = null;

/**
 * Narrows the `vfs_fonts` export to the font map.
 *
 * pdfmake has published this three ways: `{ pdfMake: { vfs } }` (0.2 early),
 * `{ vfs }` (0.2 late) and the bare map (0.3+). Registering the wrong shape
 * fails only later, deep inside layout, as "Roboto-Medium.ttf not found".
 */
function resolveVirtualFileSystem(
    fontsModule: unknown,
): Record<string, string> | null {
    if (!fontsModule || typeof fontsModule !== 'object') {
        return null;
    }

    const candidate = fontsModule as {
        vfs?: unknown;
        pdfMake?: { vfs?: unknown };
    };
    const nested = candidate.pdfMake?.vfs ?? candidate.vfs;

    if (nested && typeof nested === 'object') {
        return nested as Record<string, string>;
    }

    // 0.3+ exports the map itself; sanity check that it looks like font files.
    const keys = Object.keys(candidate);

    return keys.some(key => key.toLowerCase().endsWith('.ttf'))
        ? (fontsModule as Record<string, string>)
        : null;
}

/**
 * Loads pdfmake and its bundled Roboto fonts on first use.
 *
 * The import is dynamic so roughly a megabyte of font data stays out of the
 * main bundle and is only fetched when a document is actually generated.
 */
async function loadPdfMake(): Promise<PdfMakeStatic> {
    if (cachedPdfMake) {
        return cachedPdfMake;
    }

    const [pdfMakeModule, vfsModule] = await Promise.all([
        importChunk(() => import('pdfmake/build/pdfmake')),
        importChunk(() => import('pdfmake/build/vfs_fonts')),
    ]);

    const pdfMake = pdfMakeModule.default;
    const vfs = resolveVirtualFileSystem(vfsModule.default);

    if (!vfs) {
        throw new Error(
            'pdfmake fonts could not be loaded — the vfs_fonts bundle has an unexpected shape',
        );
    }

    if (pdfMake.addVirtualFileSystem) {
        pdfMake.addVirtualFileSystem(vfs);
    } else {
        pdfMake.vfs = vfs;
    }

    cachedPdfMake = pdfMake;

    return pdfMake;
}

/**
 * Renders a list of label/value pairs as a borderless two column grid.
 *
 * An empty list yields a blank node rather than an empty table: pdfmake reads
 * `body[0].length` while preprocessing and throws on a table with no rows,
 * which happens whenever a party carries no identifiers at all.
 */
function renderFieldGrid(
    fields: InvoiceDocumentField[],
    labelWidth: number | string = `${FieldLabelShare * 100}%`,
): PdfContent {
    if (fields.length === 0) {
        return { text: '' };
    }

    return {
        table: {
            widths: [labelWidth, '*'],
            body: fields.map((field): PdfTableCell[] => [
                { text: field.label, style: 'label' },
                {
                    text: field.value,
                    style: 'value',
                    bold: field.strong === true,
                },
            ]),
        },
        layout: PlainLayout,
    };
}

/** Renders one of the two party blocks at the top of the document. */
function renderParty(party: InvoiceDocumentParty): PdfContent {
    const [name, ...rest] = party.addressLines;

    return {
        stack: [
            { text: party.heading, style: 'blockHeading' },
            { text: name ?? '', style: 'partyName' },
            ...rest.map((line): PdfContent => ({
                text: line,
                style: 'partyAddress',
            })),
            { stack: [renderFieldGrid(party.fields)], margin: [0, 6, 0, 0] },
        ],
    };
}

/** Renders the line items table. */
function renderItems(model: InvoiceDocumentModel): PdfTableContent {
    const { items } = model;

    const header = items.headers.map((lines, index): PdfTableCell => ({
        // Stacked, not slash-joined: a narrow column cannot hold
        // "Spolu bez DPH / Total excl. VAT" on one line.
        text: lines.join('\n'),
        style: 'tableHeader',
        alignment: items.aligns[index],
    }));

    const body = items.rows.map(row =>
        row.map((text, index): PdfTableCell => ({
            text,
            style: 'tableCell',
            alignment: items.aligns[index],
        })),
    );

    return {
        table: {
            headerRows: 1,
            // Percentages, not points. pdfmake adds cell padding and borders
            // *on top of* a numeric width, so point widths summing to the
            // content box overflow the page by one padding per column. For a
            // percentage it subtracts that reserved width itself, so the
            // columns add up to exactly the printable width.
            widths: items.widths.map(width => `${Math.round(width * 100)}%`),
            body: [header, ...body],
        },
        layout: ItemsTableLayout,
        margin: [0, 6, 0, 0],
    };
}

/** Renders the totals block, ending with the highlighted amount due. */
function renderSummary(model: InvoiceDocumentModel): PdfContent {
    const summaryRows = model.summary.map((field): PdfTableCell[] => [
        {
            text: field.labelLines.join('\n'),
            style: 'label',
            alignment: 'right',
            lineHeight: StackedLineHeight,
        },
        // Same reason as the amount due: an amount and its currency are one
        // token, and a token that does not fit is broken mid-word.
        { text: field.value, style: 'value', alignment: 'right', noWrap: true },
    ]);

    const dueRow: PdfTableCell[] = [
        {
            // Stacked like the table headings: the band is only as wide as
            // the summary column.
            text: model.totalDue.labelLines.join('\n'),
            style: 'totalDueLabel',
            fillColor: Colors.band,
            alignment: 'right',
            margin: [6, 6, 6, 6],
        },
        {
            text: model.totalDue.value,
            style: 'totalDueValue',
            fillColor: Colors.band,
            alignment: 'right',
            margin: [6, 6, 6, 6],
            // The amount is one unbreakable token; without this the renderer
            // would hyphenate it into "EU" and "R" rather than overflow.
            noWrap: true,
        },
    ];

    return {
        table: {
            // Sized to content, not to a share of the page. The value column
            // holds an amount and its currency as one unbreakable token, and
            // any fixed width is eventually too narrow for one — at which
            // point the renderer breaks the token itself, which is how "EUR"
            // ended up as "EU" and "R". `auto` asks for exactly the width the
            // longest amount needs; the labels take whatever is left.
            widths: ['*', 'auto'],
            body: [...summaryRows, dueRow],
        },
        layout: SummaryLayout,
    };
}

/**
 * Builds the pdfmake document definition for an invoice document model.
 *
 * Exported separately from the renderer so the layout can be unit tested
 * without loading pdfmake or producing an actual PDF.
 */
export function buildPdfDefinition(
    model: InvoiceDocumentModel,
): PdfDocumentDefinition {
    const content: PdfContent[] = [];

    if (model.logo) {
        const width = (model.logo.width / model.logo.height) * LogoHeightPt;

        content.push({
            image: model.logo.dataUrl,
            width,
            // Absolutely positioned, so it is taken out of the flow: the logo
            // is an overlay in the corner and moves nothing on the page.
            absolutePosition: {
                x: PageWidth - DocumentMetrics.pageMargin - width,
                y: DocumentMetrics.pageMargin,
            },
        });
    }

    if (model.barcode) {
        content.push({
            image: model.barcode.dataUrl,
            width: BarcodeWidth,
            margin: [0, 0, 0, 8],
        });
    }

    content.push(
        {
            columns: [
                {
                    width: '60%',
                    stack: [
                        { text: model.title.toUpperCase(), style: 'title' },
                    ],
                },
                {
                    width: '40%',
                    stack: [
                        {
                            text: model.numberLabel,
                            style: 'label',
                            alignment: 'right',
                        },
                        { text: model.number, style: 'number' },
                    ],
                },
            ],
            columnGap: 16,
        },
        {
            canvas: [
                {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: ContentWidth,
                    y2: 0,
                    lineWidth: 2,
                    lineColor: Colors.ink,
                },
            ],
            margin: [0, 6, 0, 12],
        },
        {
            columns: [renderParty(model.supplier), renderParty(model.customer)],
            columnGap: 24,
        },
        {
            columns: [
                { stack: [renderFieldGrid(model.dates)], width: '*' },
                { stack: [renderFieldGrid(model.payment)], width: '*' },
            ],
            columnGap: 24,
            margin: [0, 16, 0, 0],
        },
        {
            text: model.itemsHeading,
            style: 'blockHeading',
            margin: [0, 18, 0, 0],
        },
        renderItems(model),
        {
            columns: [
                {
                    width: `${TotalsRow.words * 100}%`,
                    // One spelled-out amount per language, under each other,
                    // every line spaced by the leading alone so a wrapped
                    // line and a change of language sit the same distance
                    // apart.
                    stack: model.amountInWords.map(field => ({
                        text: `${field.label}: ${field.value}`,
                        style: 'words',
                    })),
                },
                {
                    width: `${TotalsRow.totals * 100}%`,
                    stack: [renderSummary(model)],
                },
            ],
            columnGap: 16,
            margin: [0, 14, 0, 0],
        },
    );

    if (model.notes.length > 0) {
        content.push({
            stack: model.notes.map((note): PdfContent => ({
                text: note,
                style: 'note',
            })),
            margin: [0, 20, 0, 0],
        });
    }

    if (model.payBySquare) {
        content.push({
            stack: [
                { image: model.payBySquare.dataUrl, width: 90 },
                {
                    text: model.payBySquare.caption,
                    style: 'label',
                    margin: [0, 2, 0, 0],
                },
            ],
            margin: [0, 20, 0, 0],
        });
    }

    return {
        pageSize: 'A4',
        pageMargins: [
            DocumentMetrics.pageMargin,
            DocumentMetrics.pageMargin,
            DocumentMetrics.pageMargin,
            DocumentMetrics.pageMargin + 16,
        ],
        content,
        info: {
            title: `${model.title} ${model.number}`,
            author: model.supplier.addressLines[0] ?? '',
        },
        defaultStyle: {
            fontSize: DocumentFontSizes.body,
            color: Colors.ink,
            lineHeight: 1.15,
        },
        styles: {
            title: {
                fontSize: DocumentFontSizes.title,
                bold: true,
                color: Colors.ink,
                characterSpacing: 1,
            },
            number: {
                fontSize: DocumentFontSizes.number,
                bold: true,
                alignment: 'right',
            },
            blockHeading: {
                fontSize: DocumentFontSizes.blockHeading,
                bold: true,
                color: Colors.muted,
                characterSpacing: 0.6,
                margin: [0, 0, 0, 4],
            },
            partyName: { fontSize: DocumentFontSizes.partyName, bold: true },
            partyAddress: {
                fontSize: DocumentFontSizes.body,
                color: Colors.ink,
            },
            label: { fontSize: DocumentFontSizes.label, color: Colors.muted },
            value: { fontSize: DocumentFontSizes.body },
            tableHeader: {
                fontSize: DocumentFontSizes.label,
                bold: true,
                color: Colors.muted,
            },
            tableCell: { fontSize: DocumentFontSizes.body },
            words: {
                fontSize: DocumentFontSizes.body,
                italics: true,
                color: Colors.muted,
                lineHeight: StackedLineHeight,
            },
            note: {
                fontSize: DocumentFontSizes.body,
                color: Colors.ink,
                margin: [0, 0, 0, 2],
            },
            totalDueLabel: {
                fontSize: DocumentFontSizes.totalDueLabel,
                bold: true,
                color: Colors.white,
                lineHeight: StackedLineHeight,
            },
            totalDueValue: {
                fontSize: DocumentFontSizes.totalDueValue,
                bold: true,
                color: Colors.white,
            },
        },
        footer: (currentPage: number, pageCount: number): PdfContent => ({
            columns: [
                { text: model.number, style: 'label', margin: [40, 0, 0, 0] },
                {
                    text: `${currentPage} / ${pageCount}`,
                    style: 'label',
                    alignment: 'right',
                    margin: [0, 0, 40, 0],
                },
            ],
        }),
    };
}

/**
 * Renders an invoice document model into a PDF blob.
 */
export async function renderInvoicePdf(
    model: InvoiceDocumentModel,
): Promise<Blob> {
    const pdfMake = await loadPdfMake();
    const definition = buildPdfDefinition(model);

    // `getBlob` is promise based from 0.3 on; the old callback form silently
    // never resolved, which surfaced as a click that downloaded nothing.
    return pdfMake.createPdf(definition).getBlob();
}
