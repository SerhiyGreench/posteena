/**
 * Lifecycle of an invoice record.
 *
 * - `Draft` — editable, does not consume a number from the sequence.
 * - `Issued` — number assigned and frozen, documents may be generated.
 * - `Paid` — settled by the customer.
 * - `Cancelled` — voided; the number stays reserved so the sequence has no gaps.
 */
export const InvoiceStatuses = {
    Draft: 'draft',
    Issued: 'issued',
    Paid: 'paid',
    Cancelled: 'cancelled',
} as const;

export type InvoiceStatusType =
    (typeof InvoiceStatuses)[keyof typeof InvoiceStatuses];
