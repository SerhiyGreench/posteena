import type {
    PdfContent,
    PdfDocumentDefinition,
    PdfMakeStatic,
    PdfTableCell,
    PdfTableContent,
    PdfTableLayout,
} from 'pdfmake/build/pdfmake';

import {
    StackedLineHeight,
    TotalsRow,
} from '@/features/invoices/constants/DocumentLayout';
import type {
    InvoiceDocumentField,
    InvoiceDocumentModel,
    InvoiceDocumentParty,
} from '@/features/invoices/types';
import { importChunk } from '@/lib/importChunk';

/** A4 width (595.28pt) minus the 40pt page margins on each side. */
const ContentWidth = 515;

/** Printed width of the invoice-number barcode, in points. */
const BarcodeWidth = 150;

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
    labelWidth: number | string = '40%',
): PdfContent {
    if (fields.length === 0) {
        return { text: '' };
    }

    return {
        table: {
            widths: [labelWidth, '60%'],
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
        layout: PlainLayout,
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
                    // One spelled-out amount per language, under each other.
                    stack: model.amountInWords.map(field => ({
                        text: `${field.label}: ${field.value}`,
                        style: 'words',
                        margin: [0, 0, 0, 3] as [
                            number,
                            number,
                            number,
                            number,
                        ],
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
        pageMargins: [40, 40, 40, 56],
        content,
        info: {
            title: `${model.title} ${model.number}`,
            author: model.supplier.addressLines[0] ?? '',
        },
        defaultStyle: {
            fontSize: 9,
            color: Colors.ink,
            lineHeight: 1.15,
        },
        styles: {
            title: {
                fontSize: 22,
                bold: true,
                color: Colors.ink,
                characterSpacing: 1,
            },
            number: { fontSize: 18, bold: true, alignment: 'right' },
            blockHeading: {
                fontSize: 8,
                bold: true,
                color: Colors.muted,
                characterSpacing: 0.6,
                margin: [0, 0, 0, 4],
            },
            partyName: { fontSize: 12, bold: true },
            partyAddress: { fontSize: 9, color: Colors.ink },
            label: { fontSize: 8, color: Colors.muted },
            value: { fontSize: 9 },
            tableHeader: { fontSize: 8, bold: true, color: Colors.muted },
            tableCell: { fontSize: 9 },
            words: {
                fontSize: 9,
                italics: true,
                color: Colors.muted,
                lineHeight: StackedLineHeight,
            },
            note: { fontSize: 9, color: Colors.ink, margin: [0, 0, 0, 2] },
            totalDueLabel: {
                fontSize: 10,
                bold: true,
                color: Colors.white,
                lineHeight: StackedLineHeight,
            },
            totalDueValue: { fontSize: 13, bold: true, color: Colors.white },
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
