import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import type { InvoiceActionsProps } from '@/features/invoices/components/InvoicesManager/InvoiceActions';
import InvoiceActionsMenu from '@/features/invoices/components/InvoicesManager/InvoiceActionsMenu';
import InvoiceStatusBadge from '@/features/invoices/components/InvoicesManager/InvoiceStatusBadge';
import {
    formatInvoiceDate,
    formatInvoiceMoney,
} from '@/features/invoices/utils/invoiceFormatters';

export type InvoiceCardProps = InvoiceActionsProps;

/**
 * Card rendering of one invoice, used instead of a table row on narrow
 * screens where seven columns cannot fit.
 */
export default function InvoiceCard({
    invoice,
    ...actions
}: InvoiceCardProps): ReactElement {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="font-medium">{invoice.number}</div>
                    <div className="text-muted-foreground truncate text-sm">
                        {invoice.customer.name}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <InvoiceStatusBadge status={invoice.status} />
                    <InvoiceActionsMenu invoice={invoice} {...actions} />
                </div>
            </div>

            <div className="flex items-end justify-between gap-3">
                <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-2 text-xs">
                    <dt>{t('invoices.list.issueDate')}</dt>
                    <dd className="text-foreground">
                        {formatInvoiceDate(invoice.issueDate)}
                    </dd>
                    <dt>{t('invoices.list.dueDate')}</dt>
                    <dd className="text-foreground">
                        {formatInvoiceDate(invoice.dueDate)}
                    </dd>
                </dl>
                <div className="text-right text-base font-bold tabular-nums">
                    {formatInvoiceMoney(
                        invoice.totals.amountDue,
                        invoice.languages,
                    )}{' '}
                    {invoice.currency}
                </div>
            </div>
        </div>
    );
}
