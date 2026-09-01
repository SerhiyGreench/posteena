import { describe, expect, it } from 'vitest';

import { SortDirections } from '@/constants/SortDirections';
import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import { InvoiceSortColumns } from '@/features/invoices/constants/InvoiceSortColumns';
import { InvoiceStatuses } from '@/features/invoices/constants/InvoiceStatuses';
import type { Invoice } from '@/features/invoices/types';
import { createInvoiceDraft } from '@/features/invoices/utils/createInvoiceDraft';
import { sortInvoices } from '@/features/invoices/utils/sortInvoices';

function invoice(overrides: Partial<Invoice>): Invoice {
    return {
        ...createInvoiceDraft(DefaultInvoiceSettings, null),
        ...overrides,
    };
}

const numbers = (list: Invoice[]): string[] => list.map(item => item.number);

describe('sortInvoices', () => {
    const list = [
        invoice({
            number: '20260009',
            issueDate: '2026-03-01',
            createdAt: '2026-03-01T10:00:00.000Z',
        }),
        invoice({
            number: '20260010',
            issueDate: '2026-01-15',
            createdAt: '2026-01-15T10:00:00.000Z',
        }),
        invoice({
            number: '20260002',
            issueDate: '2026-08-20',
            createdAt: '2026-08-20T10:00:00.000Z',
        }),
    ];

    it('puts the latest issue date first by default', () => {
        expect(
            numbers(
                sortInvoices(
                    list,
                    InvoiceSortColumns.IssueDate,
                    SortDirections.Descending,
                ),
            ),
        ).toEqual(['20260002', '20260009', '20260010']);
    });

    it('reverses on ascending', () => {
        expect(
            numbers(
                sortInvoices(
                    list,
                    InvoiceSortColumns.IssueDate,
                    SortDirections.Ascending,
                ),
            ),
        ).toEqual(['20260010', '20260009', '20260002']);
    });

    it('orders numbers naturally rather than as raw strings', () => {
        expect(
            numbers(
                sortInvoices(
                    list,
                    InvoiceSortColumns.Number,
                    SortDirections.Ascending,
                ),
            ),
        ).toEqual(['20260002', '20260009', '20260010']);
    });

    it('breaks ties with the newest record first', () => {
        const sameDay = [
            invoice({
                number: 'A',
                issueDate: '2026-05-01',
                createdAt: '2026-05-01T08:00:00.000Z',
            }),
            invoice({
                number: 'B',
                issueDate: '2026-05-01',
                createdAt: '2026-05-01T17:00:00.000Z',
            }),
        ];

        expect(
            numbers(
                sortInvoices(
                    sameDay,
                    InvoiceSortColumns.IssueDate,
                    SortDirections.Descending,
                ),
            ),
        ).toEqual(['B', 'A']);
    });

    it('sorts amounts numerically', () => {
        const amounts = [
            invoice({
                number: 'small',
                totals: {
                    subtotal: 90,
                    vatAmount: 0,
                    total: 90,
                    paidInAdvance: 0,
                    amountDue: 90,
                },
            }),
            invoice({
                number: 'large',
                totals: {
                    subtotal: 1000,
                    vatAmount: 0,
                    total: 1000,
                    paidInAdvance: 0,
                    amountDue: 1000,
                },
            }),
        ];

        expect(
            numbers(
                sortInvoices(
                    amounts,
                    InvoiceSortColumns.Total,
                    SortDirections.Descending,
                ),
            ),
        ).toEqual(['large', 'small']);
    });

    it('sorts status by lifecycle order, not alphabetically', () => {
        const statuses = [
            invoice({ number: 'paid', status: InvoiceStatuses.Paid }),
            invoice({ number: 'draft', status: InvoiceStatuses.Draft }),
            invoice({ number: 'issued', status: InvoiceStatuses.Issued }),
        ];

        expect(
            numbers(
                sortInvoices(
                    statuses,
                    InvoiceSortColumns.Status,
                    SortDirections.Ascending,
                ),
            ),
        ).toEqual(['draft', 'issued', 'paid']);
    });

    it('does not mutate the array it is given', () => {
        const original = numbers(list);

        sortInvoices(list, InvoiceSortColumns.Total, SortDirections.Ascending);

        expect(numbers(list)).toEqual(original);
    });
});
