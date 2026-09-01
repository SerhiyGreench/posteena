import { type ReactElement, useEffect, useMemo, useState } from 'react';

import ScaledPage from '@/features/invoices/components/InvoicesManager/ScaledPage';
import {
    BandGapPt,
    DocumentFontSizes,
    DocumentMetrics,
    FieldLabelShare,
    points,
    StackedLineHeight,
    TotalsRow,
} from '@/features/invoices/constants/DocumentLayout';
import type { Invoice } from '@/features/invoices/types';
import { buildInvoiceDocument } from '@/features/invoices/utils/buildInvoiceDocument';
import {
    createInvoiceBarcode,
    type InvoiceBarcode,
} from '@/features/invoices/utils/createInvoiceBarcode';
import {
    createPayBySquareQr,
    type PayBySquareQr,
} from '@/features/invoices/utils/createPayBySquareQr';

export interface InvoicePreviewProps {
    invoice: Invoice;
}

/**
 * Palette mirroring `renderInvoicePdf` and `renderInvoiceDocx`.
 *
 * An invoice is a paper document: it is stored on a white page and must be
 * shown on one too, so these are fixed values rather than theme tokens. If the
 * preview followed the app's dark theme it would stop matching the PDF and
 * DOCX it is meant to represent.
 */
const Paper = {
    background: '#ffffff',
    ink: '#111111',
    muted: '#666666',
    line: '#d4d4d4',
    /** Filled band behind the amount due, printed with white text. */
    band: '#111111',
    onBand: '#ffffff',
} as const;

/**
 * A4 at 96dpi, matching the page the PDF and DOCX renderers target. The
 * preview is laid out at this width whatever the screen is, and scaled to fit.
 */
/** The label/value split the PDF and DOCX field grids use. */
const FieldGridColumns = `${FieldLabelShare * 100}% 1fr`;

const Page = {
    width: 794,
    minHeight: 1123,
} as const;

/**
 * On-screen rendering of an invoice.
 *
 * Built from the same `InvoiceDocumentModel` the PDF and DOCX renderers
 * consume, so what the user reviews here is exactly what gets generated —
 * labels, language, number and date formats included.
 */
export default function InvoicePreview({
    invoice,
}: InvoicePreviewProps): ReactElement {
    const base = useMemo(() => buildInvoiceDocument(invoice), [invoice]);
    const [images, setImages] = useState<{
        payBySquare: PayBySquareQr | null;
        barcode: InvoiceBarcode | null;
    }>({ payBySquare: null, barcode: null });

    // Rasterising these is async, so they arrive after the first paint.
    useEffect(() => {
        let active = true;

        void Promise.all([
            createPayBySquareQr(invoice),
            invoice.barcode
                ? createInvoiceBarcode(invoice.number)
                : Promise.resolve(null),
        ]).then(([payBySquare, barcode]) => {
            if (active) {
                setImages({ payBySquare, barcode });
            }
        });

        return (): void => {
            active = false;
        };
    }, [invoice]);

    const model = { ...base, ...images };

    return (
        <ScaledPage width={Page.width}>
            <div
                className="rounded-lg shadow-sm"
                style={{
                    width: Page.width,
                    minHeight: Page.minHeight,
                    padding: points(DocumentMetrics.pageMargin),
                    fontSize: points(DocumentFontSizes.body),
                    lineHeight: 1.15,
                    backgroundColor: Paper.background,
                    color: Paper.ink,
                    colorScheme: 'light',
                }}
            >
                {model.barcode && (
                    <img
                        src={model.barcode.dataUrl}
                        alt={model.barcode.text}
                        style={{
                            width: points(DocumentMetrics.barcodeWidth),
                            marginBottom: points(
                                DocumentMetrics.barcodeSpaceBelow,
                            ),
                        }}
                    />
                )}

                <div
                    className="flex items-start justify-between"
                    style={{ gap: points(DocumentMetrics.headingGap) }}
                >
                    <h2
                        className="font-bold tracking-wide uppercase"
                        style={{
                            color: Paper.ink,
                            fontSize: points(DocumentFontSizes.title),
                        }}
                    >
                        {model.title}
                    </h2>
                    <div className="text-right">
                        <div
                            style={{
                                color: Paper.muted,
                                fontSize: points(DocumentFontSizes.label),
                            }}
                        >
                            {model.numberLabel}
                        </div>
                        <div
                            className="font-bold"
                            style={{
                                fontSize: points(DocumentFontSizes.number),
                            }}
                        >
                            {model.number}
                        </div>
                    </div>
                </div>

                <div
                    className="w-full"
                    style={{
                        backgroundColor: Paper.ink,
                        height: points(DocumentMetrics.ruleWidth),
                        marginTop: points(DocumentMetrics.ruleSpaceAbove),
                        marginBottom: points(DocumentMetrics.ruleSpaceBelow),
                    }}
                />

                <div
                    className="grid grid-cols-2"
                    style={{ gap: points(DocumentMetrics.columnGap) }}
                >
                    {[model.supplier, model.customer].map(party => (
                        <div key={party.heading}>
                            <div
                                className="font-semibold uppercase"
                                style={{
                                    color: Paper.muted,
                                    fontSize: points(
                                        DocumentFontSizes.blockHeading,
                                    ),
                                }}
                            >
                                {party.heading}
                            </div>
                            {party.addressLines.map((line, index) => (
                                <div
                                    key={line}
                                    className={index === 0 ? 'font-bold' : ''}
                                >
                                    {line}
                                </div>
                            ))}
                            <dl
                                className="mt-2 grid gap-x-3"
                                style={{
                                    gridTemplateColumns: FieldGridColumns,
                                }}
                            >
                                {party.fields.map(field => (
                                    <div key={field.label} className="contents">
                                        <dt
                                            style={{
                                                color: Paper.muted,
                                                fontSize: points(
                                                    DocumentFontSizes.label,
                                                ),
                                            }}
                                        >
                                            {field.label}
                                        </dt>
                                        <dd>{field.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    ))}
                </div>

                <div
                    className="grid grid-cols-2"
                    style={{
                        gap: points(DocumentMetrics.columnGap),
                        marginTop: points(DocumentMetrics.fieldsSpaceAbove),
                    }}
                >
                    {[model.dates, model.payment].map((group, groupIndex) => (
                        <dl
                            key={groupIndex}
                            className="grid gap-x-3"
                            style={{ gridTemplateColumns: FieldGridColumns }}
                        >
                            {group.map(field => (
                                <div key={field.label} className="contents">
                                    <dt
                                        style={{
                                            color: Paper.muted,
                                            fontSize: points(
                                                DocumentFontSizes.label,
                                            ),
                                        }}
                                    >
                                        {field.label}
                                    </dt>
                                    <dd
                                        className={
                                            field.strong ? 'font-bold' : ''
                                        }
                                    >
                                        {field.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    ))}
                </div>

                <div
                    className="font-semibold uppercase"
                    style={{
                        color: Paper.muted,
                        fontSize: points(DocumentFontSizes.blockHeading),
                        marginTop: points(DocumentMetrics.itemsSpaceAbove),
                        marginBottom: points(4),
                    }}
                >
                    {model.itemsHeading}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full table-fixed border-collapse">
                        <colgroup>
                            {model.items.widths.map((width, index) => (
                                <col
                                    key={index}
                                    style={{ width: `${width * 100}%` }}
                                />
                            ))}
                        </colgroup>
                        <thead>
                            <tr
                                style={{
                                    borderBottom: `1px solid ${Paper.ink}`,
                                }}
                            >
                                {model.items.headers.map((lines, index) => (
                                    <th
                                        key={lines.join('|')}
                                        className="px-1 py-1.5 font-semibold break-words hyphens-auto"
                                        style={{
                                            color: Paper.muted,
                                            fontSize: points(
                                                DocumentFontSizes.label,
                                            ),
                                            lineHeight: StackedLineHeight,
                                            textAlign:
                                                model.items.aligns[index],
                                        }}
                                    >
                                        {lines.map(line => (
                                            <div key={line}>{line}</div>
                                        ))}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {model.items.rows.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    style={{
                                        borderBottom: `1px solid ${Paper.line}`,
                                    }}
                                >
                                    {row.map((cell, cellIndex) => (
                                        <td
                                            key={cellIndex}
                                            className="px-1 py-1.5 break-words tabular-nums"
                                            style={{
                                                textAlign:
                                                    model.items.aligns[
                                                        cellIndex
                                                    ],
                                            }}
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div
                    className="flex flex-row items-start justify-between"
                    style={{
                        gap: points(DocumentMetrics.headingGap),
                        marginTop: points(DocumentMetrics.totalsSpaceAbove),
                    }}
                >
                    <div
                        className="flex flex-col italic"
                        style={{
                            color: Paper.muted,
                            width: `${TotalsRow.words * 100}%`,
                            lineHeight: StackedLineHeight,
                        }}
                    >
                        {model.amountInWords.map(field => (
                            <p key={field.label}>
                                {field.label}: {field.value}
                            </p>
                        ))}
                    </div>

                    <div style={{ width: `${TotalsRow.totals * 100}%` }}>
                        <dl className="grid grid-cols-[1fr_auto] gap-x-4">
                            {model.summary.map(field => (
                                <div
                                    key={field.labelLines.join()}
                                    className="contents"
                                >
                                    <dt
                                        className="text-right"
                                        style={{
                                            color: Paper.muted,
                                            fontSize: points(
                                                DocumentFontSizes.label,
                                            ),
                                            lineHeight: StackedLineHeight,
                                        }}
                                    >
                                        {field.labelLines.map(line => (
                                            <span key={line} className="block">
                                                {line}
                                            </span>
                                        ))}
                                    </dt>
                                    <dd className="text-right whitespace-nowrap tabular-nums">
                                        {field.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <div
                            className="flex items-baseline justify-between"
                            style={{
                                backgroundColor: Paper.band,
                                color: Paper.onBand,
                                marginTop: points(BandGapPt),
                                gap: points(12),
                                padding: points(6),
                            }}
                        >
                            <span
                                className="flex flex-col font-semibold"
                                style={{
                                    fontSize: points(
                                        DocumentFontSizes.totalDueLabel,
                                    ),
                                    lineHeight: StackedLineHeight,
                                }}
                            >
                                {model.totalDue.labelLines.map(line => (
                                    <span key={line}>{line}</span>
                                ))}
                            </span>
                            <span
                                className="font-bold whitespace-nowrap tabular-nums"
                                style={{
                                    fontSize: points(
                                        DocumentFontSizes.totalDueValue,
                                    ),
                                }}
                            >
                                {model.totalDue.value}
                            </span>
                        </div>
                    </div>
                </div>

                {model.notes.length > 0 && (
                    <div
                        className="flex flex-col"
                        style={{
                            marginTop: points(DocumentMetrics.footerSpaceAbove),
                            gap: points(2),
                        }}
                    >
                        {model.notes.map(note => (
                            <p key={note}>{note}</p>
                        ))}
                    </div>
                )}
                {model.payBySquare && (
                    <div
                        className="flex flex-col items-start"
                        style={{
                            marginTop: points(DocumentMetrics.footerSpaceAbove),
                            gap: points(2),
                        }}
                    >
                        <img
                            src={model.payBySquare.dataUrl}
                            alt={model.payBySquare.caption}
                            style={{
                                width: points(DocumentMetrics.payBySquareWidth),
                            }}
                        />
                        <span
                            style={{
                                color: Paper.muted,
                                fontSize: points(DocumentFontSizes.label),
                            }}
                        >
                            {model.payBySquare.caption}
                        </span>
                    </div>
                )}
            </div>
        </ScaledPage>
    );
}
