import type { Invoice } from '@/features/invoices/types';

/** Rendered QR, sized for the bottom-left corner of the document. */
export interface PayBySquareQr {
    dataUrl: string;
    caption: string;
}

const Caption = 'PAY by square';

/**
 * BySquare format version written into the QR header.
 *
 * The library defaults to 1.2.0, which banking apps reject outright as an
 * unsupported code. Decoding the QR codes off two real Slovak invoices — one
 * produced by KROS OMEGA — shows both use 1.0.0, so that is what banking apps
 * are actually guaranteed to read.
 *
 * The version sits in the second header nibble: `00…` is 1.0.0, `04…` is
 * 1.1.0 and `08…` is 1.2.0. Beneficiary name still encodes fine at 1.0.0,
 * exactly as it does on those reference invoices.
 */
const FormatVersion = 0;

/** The standard caps the invoice id at ten characters. */
const MaxInvoiceIdLength = 10;

/** Banking identifiers are stored with spaces for readability. */
function compact(value: string): string {
    return value.replace(/\s+/g, '').toUpperCase();
}

/** `YYYY-MM-DD` to the `YYYYMMDD` the standard expects. */
function toCompactDate(isoDate: string): string | undefined {
    const digits = isoDate.replace(/\D/g, '');

    return digits.length === 8 ? digits : undefined;
}

/**
 * Whether an invoice can produce a payment QR at all.
 *
 * A code without an IBAN or an amount would scan into an unusable payment
 * order, so it is better to print nothing.
 */
export function canCreatePayBySquare(invoice: Invoice): boolean {
    return (
        invoice.payBySquare &&
        compact(invoice.supplier.bank.iban).length > 0 &&
        invoice.totals.amountDue > 0
    );
}

/**
 * Builds the PAY by square payload for an invoice.
 *
 * Exported on its own so the encoding can be tested without rasterising a QR
 * image. Returns the compressed, base32-encoded string banking apps read.
 */
export async function encodePayBySquare(invoice: Invoice): Promise<string> {
    const { encode, PaymentOptions } = await import('bysquare/pay');
    const { bank } = invoice.supplier;

    return encode(
        {
            invoiceId: invoice.number.slice(0, MaxInvoiceIdLength),
            payments: [
                {
                    type: PaymentOptions.PaymentOrder,
                    amount: invoice.totals.amountDue,
                    currencyCode: invoice.currency,
                    paymentDueDate: toCompactDate(invoice.dueDate),
                    variableSymbol: invoice.symbols.variableSymbol || undefined,
                    constantSymbol: invoice.symbols.constantSymbol || undefined,
                    specificSymbol: invoice.symbols.specificSymbol || undefined,
                    paymentNote: invoice.number,
                    bankAccounts: [
                        {
                            iban: compact(bank.iban),
                            bic: compact(bank.swift) || undefined,
                        },
                    ],
                    // Reference invoices carry the name only; street and city
                    // are omitted, keeping the payload short.
                    beneficiary: {
                        name: bank.accountHolder || invoice.supplier.name,
                    },
                },
            ],
        },
        { version: FormatVersion },
    );
}

/**
 * Renders the PAY by square code for an invoice, or null when the invoice
 * cannot produce one.
 *
 * Both libraries are imported dynamically so they stay out of the main bundle,
 * matching how the PDF and DOCX renderers are loaded.
 */
export async function createPayBySquareQr(
    invoice: Invoice,
): Promise<PayBySquareQr | null> {
    if (!canCreatePayBySquare(invoice)) {
        return null;
    }

    try {
        const payload = await encodePayBySquare(invoice);
        const { default: QRCode } = await import('qrcode');
        // One alphanumeric segment, not the mixed numeric/alphanumeric split
        // the encoder picks by default: the reference codes are single-segment
        // and picky bank scanners are happiest with the same shape.
        const dataUrl = await QRCode.toDataURL(
            [{ data: payload, mode: 'alphanumeric' }],
            {
                errorCorrectionLevel: 'M',
                margin: 1,
                scale: 8,
                color: { dark: '#111111', light: '#ffffff' },
            },
        );

        return { dataUrl, caption: Caption };
    } catch (error) {
        // A malformed IBAN should not stop the invoice from being generated.
        console.error('Failed to build the PAY by square code:', error);

        return null;
    }
}

/** Decodes a PNG data URL into bytes, for embedding in a DOCX. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}
