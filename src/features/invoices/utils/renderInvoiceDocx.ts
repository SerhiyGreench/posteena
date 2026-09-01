import type {
    Footer as FooterType,
    IBorderOptions,
    TextRun as TextRunType,
    Paragraph as ParagraphType,
    TableCell as TableCellType,
    Table as TableType,
} from 'docx';

import { SummaryColumns } from '@/features/invoices/constants/DocumentLayout';
import type {
    InvoiceDocumentField,
    InvoiceDocumentModel,
    InvoiceDocumentParty,
} from '@/features/invoices/types';
import { dataUrlToBytes } from '@/features/invoices/utils/createPayBySquareQr';
import { importChunk } from '@/lib/importChunk';

/** Hex colours without the leading hash, which is how OOXML expects them. */
const Colors = {
    ink: '111111',
    muted: '666666',
    line: 'D4D4D4',
    /** Filled band behind the amount due, printed with white text. */
    band: '111111',
    white: 'FFFFFF',
} as const;

/** Font sizes in half-points, as OOXML measures them. */
const Sizes = {
    title: 44,
    number: 36,
    partyName: 24,
    body: 18,
    label: 16,
    totalDue: 26,
} as const;

/** A4 page in twips (1 inch = 1440 twips). */
const PageSize = { width: 11906, height: 16838 } as const;
/** 40pt, matching the PDF page margin exactly (1pt = 20 twips). */
const PageMargin = 800;

/** Same family pdfmake embeds in the PDF. */
const DocumentFont = 'Roboto';

/** 150pt at 96dpi, matching the PDF's printed barcode width. */
const BarcodeWidthPixels = 200;

/**
 * Printable width in twips.
 *
 * Table widths must be given in twips, not percentages: `columnWidths` is
 * written straight into `w:gridCol`, which OOXML always reads as DXA. Handing
 * it percentages collapses every column to a millimetre.
 */
const ContentWidth = PageSize.width - PageMargin * 2;

/** Splits a width into whole twips by the given ratios. */
function splitWidth(total: number, ratios: number[]): number[] {
    return ratios.map(ratio => Math.round(total * ratio));
}

type DocxModule = typeof import('docx');

let cachedDocx: DocxModule | null = null;

/**
 * Loads the `docx` library on first use so it stays out of the main bundle.
 */
async function loadDocx(): Promise<DocxModule> {
    if (!cachedDocx) {
        cachedDocx = await importChunk(() => import('docx'));
    }

    return cachedDocx;
}

/**
 * Builds the document body. Kept as a single function so all the helpers can
 * close over the dynamically imported `docx` namespace instead of threading it
 * through every call.
 */
function buildDocxChildren(
    docx: DocxModule,
    model: InvoiceDocumentModel,
): (ParagraphType | TableType)[] {
    const {
        AlignmentType,
        BorderStyle,
        ImageRun,
        Paragraph,
        ShadingType,
        Table,
        TableCell,
        TableRow,
        TextRun,
        WidthType,
    } = docx;

    const noBorder: IBorderOptions = {
        style: BorderStyle.NONE,
        size: 0,
        color: Colors.white,
    };

    const invisibleBorders = {
        top: noBorder,
        bottom: noBorder,
        left: noBorder,
        right: noBorder,
        insideHorizontal: noBorder,
        insideVertical: noBorder,
    };

    const cellBorders = {
        top: noBorder,
        bottom: noBorder,
        left: noBorder,
        right: noBorder,
    };

    const dxa = (size: number) => ({ size, type: WidthType.DXA }) as const;

    const text = (
        value: string,
        options: {
            bold?: boolean;
            size?: number;
            color?: string;
            italics?: boolean;
            alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
            spacingBefore?: number;
            spacingAfter?: number;
        } = {},
    ): ParagraphType =>
        new Paragraph({
            alignment: options.alignment,
            spacing: {
                before: options.spacingBefore ?? 0,
                after: options.spacingAfter ?? 20,
            },
            children: [
                new TextRun({
                    text: value,
                    bold: options.bold,
                    italics: options.italics,
                    size: options.size ?? Sizes.body,
                    color: options.color ?? Colors.ink,
                }),
            ],
        });

    /** A borderless cell holding already built paragraphs or tables. */
    const plainCell = (
        children: (ParagraphType | TableType)[],
        width?: number,
        bottom?: IBorderOptions,
    ): TableCellType =>
        new TableCell({
            // A cell's own borders override the table's, so a rule under a row
            // has to be set here rather than on the table.
            borders: bottom ? { ...cellBorders, bottom } : cellBorders,
            margins: { top: 0, bottom: 0, left: 0, right: 120 },
            width: width === undefined ? undefined : dxa(width),
            children,
        });

    /** Borderless two column grid of label/value pairs. */
    /** Empty grids render as a blank paragraph; a table with no rows is invalid. */
    const fieldGrid = (
        fields: InvoiceDocumentField[],
        width = ContentWidth,
    ): ParagraphType | TableType => {
        if (fields.length === 0) {
            return text('');
        }

        const [labelWidth, valueWidth] = splitWidth(width, [0.4, 0.6]);

        return new Table({
            width: dxa(width),
            borders: invisibleBorders,
            columnWidths: [labelWidth, valueWidth],
            rows: fields.map(
                field =>
                    new TableRow({
                        children: [
                            plainCell(
                                [
                                    text(field.label, {
                                        size: Sizes.label,
                                        color: Colors.muted,
                                    }),
                                ],
                                labelWidth,
                            ),
                            plainCell(
                                [
                                    text(field.value, {
                                        bold: field.strong === true,
                                    }),
                                ],
                                valueWidth,
                            ),
                        ],
                    }),
            ),
        });
    };

    const headerColumns = splitWidth(ContentWidth, [0.6, 0.4]);
    const partyColumns = splitWidth(ContentWidth, [0.5, 0.5]);
    const summaryColumns = splitWidth(ContentWidth, [0.55, 0.45]);

    const partyBlock = (
        party: InvoiceDocumentParty,
    ): (ParagraphType | TableType)[] => {
        const [name, ...rest] = party.addressLines;

        return [
            text(party.heading.toUpperCase(), {
                size: Sizes.label,
                bold: true,
                color: Colors.muted,
            }),
            text(name ?? '', { bold: true, size: Sizes.partyName }),
            ...rest.map(line => text(line)),
            ...(party.fields.length > 0
                ? [fieldGrid(party.fields, partyColumns[0])]
                : []),
        ];
    };

    const alignmentFor = (
        align: 'left' | 'right' | 'center',
    ): (typeof AlignmentType)[keyof typeof AlignmentType] => {
        if (align === 'right') {
            return AlignmentType.RIGHT;
        }

        if (align === 'center') {
            return AlignmentType.CENTER;
        }

        return AlignmentType.LEFT;
    };

    /** Line items table: header underline plus a hairline between rows. */
    const itemsTable = (): TableType => {
        const { items } = model;
        const columnWidths = splitWidth(ContentWidth, items.widths);

        const headerRow = new TableRow({
            tableHeader: true,
            children: items.headers.map(
                (lines, index) =>
                    new TableCell({
                        borders: {
                            ...cellBorders,
                            bottom: {
                                style: BorderStyle.SINGLE,
                                size: 8,
                                color: Colors.ink,
                            },
                        },
                        margins: { top: 60, bottom: 60, left: 60, right: 60 },
                        width: dxa(columnWidths[index]),
                        // A paragraph per language, so the heading stacks
                        // rather than running off the column.
                        children: lines.map(line =>
                            text(line, {
                                size: Sizes.label,
                                bold: true,
                                color: Colors.muted,
                                alignment: alignmentFor(items.aligns[index]),
                                spacingAfter: 0,
                            }),
                        ),
                    }),
            ),
        });

        const bodyRows = items.rows.map(
            row =>
                new TableRow({
                    children: row.map(
                        (cell, index) =>
                            new TableCell({
                                borders: {
                                    ...cellBorders,
                                    bottom: {
                                        style: BorderStyle.SINGLE,
                                        size: 2,
                                        color: Colors.line,
                                    },
                                },
                                margins: {
                                    top: 80,
                                    bottom: 80,
                                    left: 60,
                                    right: 60,
                                },
                                width: dxa(columnWidths[index]),
                                children: [
                                    text(cell, {
                                        alignment: alignmentFor(
                                            items.aligns[index],
                                        ),
                                    }),
                                ],
                            }),
                    ),
                }),
        );

        return new Table({
            width: dxa(ContentWidth),
            columnWidths,
            borders: invisibleBorders,
            rows: [headerRow, ...bodyRows],
        });
    };

    /** Totals stack, closing with the highlighted amount due. */
    const summaryTable = (width: number): TableType => {
        const summaryColumnWidths = splitWidth(width, [
            SummaryColumns.label,
            SummaryColumns.value,
        ]);
        const summaryRows = model.summary.map(
            field =>
                new TableRow({
                    children: [
                        plainCell(
                            [
                                text(field.label, {
                                    size: Sizes.label,
                                    color: Colors.muted,
                                    alignment: AlignmentType.RIGHT,
                                }),
                            ],
                            summaryColumnWidths[0],
                        ),
                        plainCell(
                            [
                                text(field.value, {
                                    alignment: AlignmentType.RIGHT,
                                }),
                            ],
                            summaryColumnWidths[1],
                        ),
                    ],
                }),
        );

        const shadedCell = (lines: string[], size: number): TableCellType =>
            new TableCell({
                borders: cellBorders,
                shading: {
                    type: ShadingType.CLEAR,
                    color: 'auto',
                    fill: Colors.band,
                },
                margins: { top: 100, bottom: 100, left: 120, right: 120 },
                // A paragraph per language, matching the stacked headings.
                children: lines.map(line =>
                    text(line, {
                        bold: true,
                        size,
                        color: Colors.white,
                        alignment: AlignmentType.RIGHT,
                        spacingAfter: 0,
                    }),
                ),
            });

        return new Table({
            width: dxa(width),
            borders: invisibleBorders,
            columnWidths: summaryColumnWidths,
            rows: [
                ...summaryRows,
                new TableRow({
                    children: [
                        shadedCell(model.totalDue.labelLines, Sizes.body),
                        shadedCell([model.totalDue.value], Sizes.totalDue),
                    ],
                }),
            ],
        });
    };

    const headerRule: IBorderOptions = {
        style: BorderStyle.SINGLE,
        size: 16,
        color: Colors.ink,
    };

    const headerTable = new Table({
        width: dxa(ContentWidth),
        columnWidths: headerColumns,
        borders: invisibleBorders,
        rows: [
            new TableRow({
                children: [
                    plainCell(
                        [
                            text(model.title.toUpperCase(), {
                                bold: true,
                                size: Sizes.title,
                                color: Colors.ink,
                            }),
                        ],
                        headerColumns[0],
                        headerRule,
                    ),
                    plainCell(
                        [
                            text(model.numberLabel, {
                                size: Sizes.label,
                                color: Colors.muted,
                                alignment: AlignmentType.RIGHT,
                            }),
                            text(model.number, {
                                bold: true,
                                size: Sizes.number,
                                alignment: AlignmentType.RIGHT,
                            }),
                        ],
                        headerColumns[1],
                        headerRule,
                    ),
                ],
            }),
        ],
    });

    const partiesTable = new Table({
        width: dxa(ContentWidth),
        borders: invisibleBorders,
        columnWidths: partyColumns,
        rows: [
            new TableRow({
                children: [
                    plainCell(partyBlock(model.supplier), partyColumns[0]),
                    plainCell(partyBlock(model.customer), partyColumns[1]),
                ],
            }),
        ],
    });

    const metaTable = new Table({
        width: dxa(ContentWidth),
        borders: invisibleBorders,
        columnWidths: partyColumns,
        rows: [
            new TableRow({
                children: [
                    plainCell(
                        [fieldGrid(model.dates, partyColumns[0])],
                        partyColumns[0],
                    ),
                    plainCell(
                        [fieldGrid(model.payment, partyColumns[1])],
                        partyColumns[1],
                    ),
                ],
            }),
        ],
    });

    const wordsAndSummary = new Table({
        width: dxa(ContentWidth),
        borders: invisibleBorders,
        columnWidths: summaryColumns,
        rows: [
            new TableRow({
                children: [
                    plainCell(
                        [
                            text(
                                `${model.amountInWords.label}: ${model.amountInWords.value}`,
                                { italics: true, color: Colors.muted },
                            ),
                        ],
                        summaryColumns[0],
                    ),
                    plainCell(
                        [summaryTable(summaryColumns[1])],
                        summaryColumns[1],
                    ),
                ],
            }),
        ],
    });

    const payBySquareBlock: (ParagraphType | TableType)[] = model.payBySquare
        ? [
              new Paragraph({
                  spacing: { before: 320, after: 0 },
                  children: [
                      new ImageRun({
                          type: 'png',
                          data: dataUrlToBytes(model.payBySquare.dataUrl),
                          transformation: { width: 120, height: 120 },
                      }),
                  ],
              }),
              text(model.payBySquare.caption, {
                  size: Sizes.label,
                  color: Colors.muted,
              }),
          ]
        : [];

    // Same printed width as the PDF: 150pt = 200px at 96dpi.
    const barcodeBlock: (ParagraphType | TableType)[] = model.barcode
        ? [
              new Paragraph({
                  spacing: { before: 0, after: 120 },
                  children: [
                      new ImageRun({
                          type: 'png',
                          data: dataUrlToBytes(model.barcode.dataUrl),
                          transformation: {
                              width: BarcodeWidthPixels,
                              height: Math.round(
                                  BarcodeWidthPixels /
                                      model.barcode.widthToHeight,
                              ),
                          },
                      }),
                  ],
              }),
          ]
        : [];

    return [
        ...barcodeBlock,
        headerTable,
        text('', { spacingAfter: 200 }),
        partiesTable,
        text('', { spacingAfter: 200 }),
        metaTable,
        text(model.itemsHeading.toUpperCase(), {
            size: Sizes.label,
            bold: true,
            color: Colors.muted,
            spacingBefore: 320,
            spacingAfter: 80,
        }),
        itemsTable(),
        text('', { spacingAfter: 160 }),
        wordsAndSummary,
        ...model.notes.map((note, index) =>
            text(note, { spacingBefore: index === 0 ? 320 : 0 }),
        ),
        ...payBySquareBlock,
    ];
}

/**
 * The page footer, mirroring the PDF's: invoice number on the left, page
 * position on the right.
 */
function buildFooter(
    docx: DocxModule,
    model: InvoiceDocumentModel,
): FooterType {
    const {
        AlignmentType,
        BorderStyle,
        Footer,
        Paragraph,
        PageNumber,
        Table,
        TableCell,
        TableRow,
        TextRun,
        WidthType,
    } = docx;

    const noBorder = {
        style: BorderStyle.NONE,
        size: 0,
        color: Colors.white,
    };
    const borders = {
        top: noBorder,
        bottom: noBorder,
        left: noBorder,
        right: noBorder,
    };
    const label = (
        children: (string | TextRunType)[],
        right: boolean,
    ): TableCellType =>
        new TableCell({
            borders,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
                new Paragraph({
                    alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    children: children.map(child =>
                        typeof child === 'string'
                            ? new TextRun({
                                  text: child,
                                  size: Sizes.label,
                                  color: Colors.muted,
                              })
                            : child,
                    ),
                }),
            ],
        });

    const pageRun = (children: string[]): TextRunType =>
        new TextRun({ children, size: Sizes.label, color: Colors.muted });

    return new Footer({
        children: [
            new Table({
                width: { size: ContentWidth, type: WidthType.DXA },
                borders: {
                    ...borders,
                    insideHorizontal: noBorder,
                    insideVertical: noBorder,
                },
                columnWidths: splitWidth(ContentWidth, [0.5, 0.5]),
                rows: [
                    new TableRow({
                        children: [
                            label([model.number], false),
                            label(
                                [
                                    pageRun([
                                        PageNumber.CURRENT,
                                        ' / ',
                                        PageNumber.TOTAL_PAGES,
                                    ]),
                                ],
                                true,
                            ),
                        ],
                    }),
                ],
            }),
        ],
    });
}

/**
 * Renders an invoice document model into a .docx blob.
 */
export async function renderInvoiceDocx(
    model: InvoiceDocumentModel,
): Promise<Blob> {
    const docx = await loadDocx();
    const { Document, Packer } = docx;

    const document = new Document({
        title: `${model.title} ${model.number}`,
        description: model.number,
        styles: {
            default: {
                document: {
                    run: {
                        // The family the PDF embeds, so the two documents match
                        // where Roboto is installed; Word substitutes a similar
                        // sans elsewhere. Embedding fonts in a .docx is not
                        // something the format lets us do portably.
                        font: DocumentFont,
                        size: Sizes.body,
                        color: Colors.ink,
                    },
                },
            },
        },
        sections: [
            {
                footers: { default: buildFooter(docx, model) },
                properties: {
                    page: {
                        size: {
                            width: PageSize.width,
                            height: PageSize.height,
                        },
                        margin: {
                            top: PageMargin,
                            right: PageMargin,
                            bottom: PageMargin,
                            left: PageMargin,
                        },
                    },
                },
                children: buildDocxChildren(docx, model),
            },
        ],
    });

    return Packer.toBlob(document);
}
