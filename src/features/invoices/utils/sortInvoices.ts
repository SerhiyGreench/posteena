import {
    SortDirections,
    type SortDirectionType,
} from '@/constants/SortDirections';
import {
    InvoiceSortColumns,
    type InvoiceSortColumnType,
} from '@/features/invoices/constants/InvoiceSortColumns';
import { InvoiceStatuses } from '@/features/invoices/constants/InvoiceStatuses';
import type { Invoice } from '@/features/invoices/types';

/** Lifecycle order, so sorting by status follows the workflow. */
const StatusRank: Record<string, number> = {
    [InvoiceStatuses.Draft]: 0,
    [InvoiceStatuses.Issued]: 1,
    [InvoiceStatuses.Paid]: 2,
    [InvoiceStatuses.Cancelled]: 3,
};

/**
 * Compares invoice numbers naturally, so `20260009` precedes `20260010`
 * even when a pattern mixes digits and letters.
 */
function compareText(left: string, right: string): number {
    return left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

function compareBy(
    left: Invoice,
    right: Invoice,
    column: InvoiceSortColumnType,
): number {
    if (column === InvoiceSortColumns.Customer) {
        return compareText(left.customer.name, right.customer.name);
    }

    if (column === InvoiceSortColumns.IssueDate) {
        return compareText(left.issueDate, right.issueDate);
    }

    if (column === InvoiceSortColumns.DueDate) {
        return compareText(left.dueDate, right.dueDate);
    }

    if (column === InvoiceSortColumns.Total) {
        return left.totals.amountDue - right.totals.amountDue;
    }

    if (column === InvoiceSortColumns.Status) {
        return (StatusRank[left.status] ?? 0) - (StatusRank[right.status] ?? 0);
    }

    return compareText(left.number, right.number);
}

/**
 * Orders the registry by a column.
 *
 * Ties fall back to newest-created first, which keeps several invoices issued
 * on the same day in a stable, predictable order.
 */
export function sortInvoices(
    invoices: Invoice[],
    column: InvoiceSortColumnType,
    direction: SortDirectionType,
): Invoice[] {
    const factor = direction === SortDirections.Descending ? -1 : 1;

    return [...invoices].sort((left, right) => {
        const result = compareBy(left, right, column);

        if (result !== 0) {
            return result * factor;
        }

        return compareText(right.createdAt, left.createdAt);
    });
}
