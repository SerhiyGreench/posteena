import { type ReactElement, useEffect, useMemo, useState } from 'react';

import ScaledPage from '@/features/invoices/components/InvoicesManager/ScaledPage';
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
                className="rounded-lg p-10 text-[13px] leading-snug shadow-sm"
                style={{
                    width: Page.width,
                    minHeight: Page.minHeight,
                    backgroundColor: Paper.background,
                    color: Paper.ink,
                    colorScheme: 'light',
                }}
            >
                {model.barcode && (
                    <img
                        src={model.barcode.dataUrl}
                        alt={model.barcode.text}
                        className="mb-2 h-10"
                        style={{ width: 150 }}
                    />
                )}

                <div className="flex items-start justify-between gap-6">
                    <h2
                        className="text-2xl font-bold tracking-wide uppercase"
                        style={{ color: Paper.ink }}
                    >
                        {model.title}
                    </h2>
                    <div className="text-right">
                        <div
                            className="text-[11px]"
                            style={{ color: Paper.muted }}
                        >
                            {model.numberLabel}
                        </div>
                        <div className="text-xl font-bold">{model.number}</div>
                    </div>
                </div>

                <div
                    className="mt-2 mb-5 h-0.5 w-full"
                    style={{ backgroundColor: Paper.ink }}
                />

                <div className="grid grid-cols-2 gap-6">
                    {[model.supplier, model.customer].map(party => (
                        <div key={party.heading}>
                            <div
                                className="text-[11px] font-semibold uppercase"
                                style={{ color: Paper.muted }}
                            >
                                {party.heading}
                            </div>
                            {party.addressLines.map((line, index) => (
                                <div
                                    key={line}
                                    className={
                                        index === 0 ? 'text-base font-bold' : ''
                                    }
                                >
                                    {line}
                                </div>
                            ))}
                            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3">
                                {party.fields.map(field => (
                                    <div key={field.label} className="contents">
                                        <dt
                                            className="text-[11px]"
                                            style={{ color: Paper.muted }}
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

                <div className="mt-5 grid grid-cols-2 gap-6">
                    {[model.dates, model.payment].map((group, groupIndex) => (
                        <dl
                            key={groupIndex}
                            className="grid grid-cols-[auto_1fr] gap-x-3"
                        >
                            {group.map(field => (
                                <div key={field.label} className="contents">
                                    <dt
                                        className="text-[11px]"
                                        style={{ color: Paper.muted }}
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
                    className="mt-6 mb-2 text-[11px] font-semibold uppercase"
                    style={{ color: Paper.muted }}
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
                                        className="px-1 py-1.5 text-[11px] font-semibold break-words hyphens-auto"
                                        style={{
                                            color: Paper.muted,
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

                <div className="mt-5 flex flex-row items-start justify-between gap-4">
                    <div
                        className="flex w-[40%] flex-col gap-1 text-[12px] italic"
                        style={{ color: Paper.muted }}
                    >
                        {model.amountInWords.map(field => (
                            <p key={field.label}>
                                {field.label}: {field.value}
                            </p>
                        ))}
                    </div>

                    <div className="w-[60%]">
                        <dl className="grid grid-cols-[1fr_auto] gap-x-4">
                            {model.summary.map(field => (
                                <div key={field.label} className="contents">
                                    <dt
                                        className="text-right text-[11px]"
                                        style={{ color: Paper.muted }}
                                    >
                                        {field.label}
                                    </dt>
                                    <dd className="text-right whitespace-nowrap tabular-nums">
                                        {field.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <div
                            className="mt-2 flex items-baseline justify-between gap-6 rounded px-3 py-2"
                            style={{
                                backgroundColor: Paper.band,
                                color: Paper.onBand,
                            }}
                        >
                            <span className="flex flex-col text-[12px] font-semibold">
                                {model.totalDue.labelLines.map(line => (
                                    <span key={line}>{line}</span>
                                ))}
                            </span>
                            <span className="text-lg font-bold whitespace-nowrap tabular-nums">
                                {model.totalDue.value}
                            </span>
                        </div>
                    </div>
                </div>

                {model.notes.length > 0 && (
                    <div className="mt-5 flex flex-col gap-1">
                        {model.notes.map(note => (
                            <p key={note}>{note}</p>
                        ))}
                    </div>
                )}
                {model.payBySquare && (
                    <div className="mt-6 flex flex-col items-start gap-1">
                        <img
                            src={model.payBySquare.dataUrl}
                            alt={model.payBySquare.caption}
                            className="size-28"
                        />
                        <span
                            className="text-[11px]"
                            style={{ color: Paper.muted }}
                        >
                            {model.payBySquare.caption}
                        </span>
                    </div>
                )}
            </div>
        </ScaledPage>
    );
}
