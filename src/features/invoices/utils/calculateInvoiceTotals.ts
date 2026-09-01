import type { InvoiceLineItem, InvoiceTotals } from '@/features/invoices/types';
import { roundMoney } from '@/features/invoices/utils/invoiceFormatters';

/**
 * Net (VAT exclusive) amount of a single line.
 */
export function calculateLineNet(item: InvoiceLineItem): number {
    return roundMoney(item.quantity * item.unitPrice);
}

/**
 * VAT amount of a single line, derived from the already rounded net amount so
 * the line's own net + VAT = gross identity always holds.
 */
export function calculateLineVat(item: InvoiceLineItem): number {
    return roundMoney((calculateLineNet(item) * item.vatRate) / 100);
}

/**
 * Gross (VAT inclusive) amount of a single line.
 */
export function calculateLineGross(item: InvoiceLineItem): number {
    return roundMoney(calculateLineNet(item) + calculateLineVat(item));
}

/**
 * Sums the line items into the invoice totals.
 *
 * Rounding happens per line before summing, which is what Slovak accounting
 * software does — it guarantees the printed line amounts add up to the printed
 * total rather than drifting by a cent.
 */
export function calculateInvoiceTotals(
    items: InvoiceLineItem[],
    paidInAdvance = 0,
): InvoiceTotals {
    const subtotal = roundMoney(
        items.reduce((sum, item) => sum + calculateLineNet(item), 0),
    );
    const vatAmount = roundMoney(
        items.reduce((sum, item) => sum + calculateLineVat(item), 0),
    );
    const total = roundMoney(subtotal + vatAmount);
    const advance = roundMoney(paidInAdvance);

    return {
        subtotal,
        vatAmount,
        total,
        paidInAdvance: advance,
        amountDue: roundMoney(total - advance),
    };
}
