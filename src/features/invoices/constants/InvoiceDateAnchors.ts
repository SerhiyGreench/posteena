/**
 * What a date on the invoice is pinned to.
 *
 * Services delivered over a month are usually supplied on the last day of that
 * month while the invoice itself is written today, so the two dates need to be
 * anchored independently.
 */
export const InvoiceDateAnchors = {
    Today: 'today',
    PeriodStart: 'periodStart',
    PeriodEnd: 'periodEnd',
    /** A fixed day within the billing period's month, e.g. always the 25th. */
    DayOfMonth: 'dayOfMonth',
} as const;

export type InvoiceDateAnchorType =
    (typeof InvoiceDateAnchors)[keyof typeof InvoiceDateAnchors];
