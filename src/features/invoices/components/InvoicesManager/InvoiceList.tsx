import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type ReactElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Input } from 'ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from 'ui/table';

import {
    SortDirections,
    type SortDirectionType,
} from '@/constants/SortDirections';
import InvoiceActions, {
    type InvoiceActionsProps,
} from '@/features/invoices/components/InvoicesManager/InvoiceActions';
import InvoiceCard from '@/features/invoices/components/InvoicesManager/InvoiceCard';
import InvoiceStatusBadge from '@/features/invoices/components/InvoicesManager/InvoiceStatusBadge';
import SelectField from '@/features/invoices/components/InvoicesManager/SelectField';
import {
    InvoiceSortColumns,
    type InvoiceSortColumnType,
} from '@/features/invoices/constants/InvoiceSortColumns';
import type { Invoice } from '@/features/invoices/types';
import {
    formatInvoiceDate,
    formatInvoiceMoney,
} from '@/features/invoices/utils/invoiceFormatters';
import { sortInvoices } from '@/features/invoices/utils/sortInvoices';

export interface InvoiceListProps extends Omit<InvoiceActionsProps, 'invoice'> {
    invoices: Invoice[];
}

/** Columns in display order, with the alignment their values use. */
const columns = [
    { key: InvoiceSortColumns.Number, label: 'number', align: 'start' },
    { key: InvoiceSortColumns.Customer, label: 'customer', align: 'start' },
    { key: InvoiceSortColumns.IssueDate, label: 'issueDate', align: 'start' },
    { key: InvoiceSortColumns.DueDate, label: 'dueDate', align: 'start' },
    { key: InvoiceSortColumns.Total, label: 'total', align: 'end' },
    { key: InvoiceSortColumns.Status, label: 'status', align: 'start' },
] as const;

/**
 * The invoice registry.
 *
 * Every row is a full snapshot of what was issued, so the actions here —
 * preview, clone, reissue and regenerate — all work from stored data rather
 * than re-deriving anything from the current settings.
 *
 * Renders as a sortable table on wide screens and as cards on narrow ones,
 * where seven columns plus the action bar cannot fit.
 */
export default function InvoiceList({
    invoices,
    ...actions
}: InvoiceListProps): ReactElement {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    // Newest first: the register is almost always read from the latest entry.
    const [sortColumn, setSortColumn] = useState<InvoiceSortColumnType>(
        InvoiceSortColumns.IssueDate,
    );
    const [sortDirection, setSortDirection] = useState<SortDirectionType>(
        SortDirections.Descending,
    );

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const matching = needle
            ? invoices.filter(
                  invoice =>
                      invoice.number.toLowerCase().includes(needle) ||
                      invoice.customer.name.toLowerCase().includes(needle),
              )
            : invoices;

        return sortInvoices(matching, sortColumn, sortDirection);
    }, [invoices, query, sortColumn, sortDirection]);

    /** Clicking the active column flips direction; a new column starts descending. */
    const toggleSort = (column: InvoiceSortColumnType): void => {
        if (column === sortColumn) {
            setSortDirection(current =>
                current === SortDirections.Descending
                    ? SortDirections.Ascending
                    : SortDirections.Descending,
            );

            return;
        }

        setSortColumn(column);
        setSortDirection(SortDirections.Descending);
    };

    const sortOptions = columns.map(column => ({
        value: column.key,
        label: t(`invoices.list.${column.label}`),
    }));

    if (invoices.length === 0) {
        return (
            <p className="text-muted-foreground py-10 text-center text-sm">
                {t('invoices.list.empty')}
            </p>
        );
    }

    const renderSortIcon = (column: InvoiceSortColumnType): ReactElement => {
        if (column !== sortColumn) {
            return <ArrowUpDown className="size-3 opacity-40" />;
        }

        return sortDirection === SortDirections.Descending ? (
            <ArrowDown className="size-3" />
        ) : (
            <ArrowUp className="size-3" />
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
                <Input
                    value={query}
                    placeholder={t('invoices.list.search')}
                    className="max-w-xs"
                    onChange={event => setQuery(event.target.value)}
                />

                {/* Headers are not clickable on cards, so expose sorting here. */}
                <div className="flex items-end gap-2 md:hidden">
                    <SelectField<InvoiceSortColumnType>
                        value={sortColumn}
                        options={sortOptions}
                        placeholder={t('invoices.list.sortBy')}
                        className="w-40"
                        onChange={setSortColumn}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        title={t('invoices.list.toggleSortDirection')}
                        onClick={() =>
                            setSortDirection(current =>
                                current === SortDirections.Descending
                                    ? SortDirections.Ascending
                                    : SortDirections.Descending,
                            )
                        }
                    >
                        {sortDirection === SortDirections.Descending ? (
                            <ArrowDown className="size-4" />
                        ) : (
                            <ArrowUp className="size-4" />
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
                {visible.map(invoice => (
                    <InvoiceCard
                        key={invoice.id}
                        invoice={invoice}
                        {...actions}
                    />
                ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map(column => (
                                <TableHead
                                    key={column.key}
                                    className={
                                        column.align === 'end'
                                            ? 'text-right'
                                            : undefined
                                    }
                                >
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-mx-2 gap-1.5 font-medium"
                                        aria-sort={
                                            column.key === sortColumn
                                                ? sortDirection ===
                                                  SortDirections.Descending
                                                    ? 'descending'
                                                    : 'ascending'
                                                : 'none'
                                        }
                                        onClick={() => toggleSort(column.key)}
                                    >
                                        {t(`invoices.list.${column.label}`)}
                                        {renderSortIcon(column.key)}
                                    </Button>
                                </TableHead>
                            ))}
                            <TableHead className="text-right">
                                {t('invoices.list.actions')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visible.map(invoice => (
                            <TableRow key={invoice.id}>
                                <TableCell className="font-medium">
                                    {invoice.number}
                                </TableCell>
                                <TableCell>{invoice.customer.name}</TableCell>
                                <TableCell>
                                    {formatInvoiceDate(invoice.issueDate)}
                                </TableCell>
                                <TableCell>
                                    {formatInvoiceDate(invoice.dueDate)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatInvoiceMoney(
                                        invoice.totals.amountDue,
                                        invoice.languages,
                                    )}{' '}
                                    {invoice.currency}
                                </TableCell>
                                <TableCell>
                                    <InvoiceStatusBadge
                                        status={invoice.status}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <InvoiceActions
                                            invoice={invoice}
                                            {...actions}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
