/**
 * Columns the invoice registry can be ordered by.
 */
export const InvoiceSortColumns = {
    Number: 'number',
    Customer: 'customer',
    IssueDate: 'issueDate',
    DueDate: 'dueDate',
    Total: 'total',
    Status: 'status',
} as const;

export type InvoiceSortColumnType =
    (typeof InvoiceSortColumns)[keyof typeof InvoiceSortColumns];
