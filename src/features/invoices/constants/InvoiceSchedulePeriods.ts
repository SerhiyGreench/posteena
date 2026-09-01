/**
 * Billing period an invoice covers.
 *
 * `None` keeps the dates on the day the invoice is created, which is how
 * one-off invoices work. The others anchor the dates to a calendar period so
 * recurring invoices land on the right days without manual entry.
 */
export const InvoiceSchedulePeriods = {
    None: 'none',
    Monthly: 'monthly',
    Quarterly: 'quarterly',
} as const;

export type InvoiceSchedulePeriodType =
    (typeof InvoiceSchedulePeriods)[keyof typeof InvoiceSchedulePeriods];
