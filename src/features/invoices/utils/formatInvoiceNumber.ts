import type { InvoiceNumbering } from '@/features/invoices/types';

/** Period key used when the counter never resets. */
const ContinuousPeriod = 'all';

/**
 * Expands a numbering pattern into a concrete invoice number.
 *
 * Supported placeholders:
 * - `{YYYY}` / `{YY}` — issue year, four or two digits
 * - `{MM}` / `{DD}` — issue month and day, zero padded
 * - `{N}`, `{NN}`, `{NNNN}`, … — the sequence counter, padded to the number
 *   of `N` characters used
 *
 * Any other text is copied verbatim, so `FA-{YYYY}-{NNN}` yields `FA-2026-007`.
 */
export function formatInvoiceNumber(
    pattern: string,
    sequence: number,
    issueDate: Date,
): string {
    const year = issueDate.getFullYear();
    const month = String(issueDate.getMonth() + 1).padStart(2, '0');
    const day = String(issueDate.getDate()).padStart(2, '0');

    return pattern
        .replace(/\{YYYY\}/g, String(year))
        .replace(/\{YY\}/g, String(year).slice(-2))
        .replace(/\{MM\}/g, month)
        .replace(/\{DD\}/g, day)
        .replace(/\{(N+)\}/g, (_match, placeholder: string) =>
            String(sequence).padStart(placeholder.length, '0'),
        );
}

/**
 * The period an invoice issued on `issueDate` belongs to. Yearly resetting
 * sequences are grouped by year; continuous ones share a single bucket.
 */
export function resolveNumberingPeriod(
    resetYearly: boolean,
    issueDate: Date,
): string {
    return resetYearly ? String(issueDate.getFullYear()) : ContinuousPeriod;
}

/**
 * Computes the number the next invoice would receive, together with the
 * numbering state to persist once it is actually issued.
 *
 * Pure and side-effect free, so the UI can preview the number while the user is
 * still editing the draft without consuming it.
 */
export function peekNextInvoiceNumber(
    numbering: InvoiceNumbering,
    issueDate: Date,
): {
    number: string;
    sequence: number;
    period: string;
    nextNumbering: InvoiceNumbering;
} {
    const period = resolveNumberingPeriod(numbering.resetYearly, issueDate);
    const isNewPeriod = numbering.currentPeriod !== period;
    const sequence = isNewPeriod ? 1 : numbering.nextSequence;
    const number = formatInvoiceNumber(numbering.pattern, sequence, issueDate);

    return {
        number,
        sequence,
        period,
        nextNumbering: {
            ...numbering,
            currentPeriod: period,
            nextSequence: sequence + 1,
        },
    };
}
