import {
    Ban,
    CheckCheck,
    Copy,
    ExternalLink,
    Eye,
    FileText,
    Loader2,
    Mail,
    MoreVertical,
    Pencil,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from 'ui/dropdown-menu';

import type { InvoiceActionsProps } from '@/features/invoices/components/InvoicesManager/InvoiceActions';
import { InvoiceStatuses } from '@/features/invoices/constants/InvoiceStatuses';
import { InvoiceFileFormats } from '@/features/invoices/types';

export type InvoiceActionsMenuProps = InvoiceActionsProps;

/**
 * The invoice actions collapsed into a single menu.
 *
 * Used on narrow screens, where a row of nine buttons does not fit on a card.
 * Offers exactly the same actions as `InvoiceActions`, in the same order.
 */
export default function InvoiceActionsMenu({
    invoice,
    onEdit,
    onPreview,
    onClone,
    onDelete,
    onStatusChange,
    onGenerate,
    onEmail,
}: InvoiceActionsMenuProps): ReactElement {
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false);
    const isMounted = useRef(true);
    const driveLink = invoice.files.find(file => file.webViewLink)?.webViewLink;

    useEffect(() => {
        isMounted.current = true;

        return (): void => {
            isMounted.current = false;
        };
    }, []);

    /**
     * Runs an action, showing a spinner on the trigger meanwhile. Menu items
     * close on select, so the progress has to be reported on the button that
     * opened them.
     */
    const run = async (action: () => Promise<void>): Promise<void> => {
        if (isPending) {
            return;
        }

        setIsPending(true);

        try {
            await action();
        } finally {
            if (isMounted.current) {
                setIsPending(false);
            }
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" />}
            >
                {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <MoreVertical className="size-4" />
                )}
                <span className="sr-only">{t('invoices.list.actions')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => onPreview(invoice)}>
                    <Eye className="size-4" />
                    {t('invoices.actions.preview')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(invoice)}>
                    <Pencil className="size-4" />
                    {t('invoices.actions.edit')}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() =>
                        void run(() =>
                            onGenerate(invoice, InvoiceFileFormats.Pdf),
                        )
                    }
                >
                    <FileText className="size-4" />
                    {t('invoices.actions.downloadPdf')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() =>
                        void run(() =>
                            onGenerate(invoice, InvoiceFileFormats.Docx),
                        )
                    }
                >
                    <FileText className="size-4" />
                    {t('invoices.actions.downloadDocx')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => void run(() => onEmail(invoice))}
                >
                    <Mail className="size-4" />
                    {t('invoices.actions.email')}
                </DropdownMenuItem>
                {driveLink && (
                    <DropdownMenuItem
                        render={
                            <a
                                href={driveLink}
                                target="_blank"
                                rel="noreferrer"
                            />
                        }
                    >
                        <ExternalLink className="size-4" />
                        {t('invoices.actions.openInDrive')}
                    </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => onClone(invoice, false)}>
                    <Copy className="size-4" />
                    {t('invoices.actions.clone')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onClone(invoice, true)}>
                    <RefreshCw className="size-4" />
                    {t('invoices.actions.reissue')}
                </DropdownMenuItem>

                {invoice.status === InvoiceStatuses.Issued && (
                    <DropdownMenuItem
                        onClick={() =>
                            void run(() =>
                                onStatusChange(invoice, InvoiceStatuses.Paid),
                            )
                        }
                    >
                        <CheckCheck className="size-4" />
                        {t('invoices.actions.markPaid')}
                    </DropdownMenuItem>
                )}
                {invoice.status !== InvoiceStatuses.Cancelled &&
                    invoice.status !== InvoiceStatuses.Draft && (
                        <DropdownMenuItem
                            onClick={() =>
                                void run(() =>
                                    onStatusChange(
                                        invoice,
                                        InvoiceStatuses.Cancelled,
                                    ),
                                )
                            }
                        >
                            <Ban className="size-4" />
                            {t('invoices.actions.markCancelled')}
                        </DropdownMenuItem>
                    )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    variant="destructive"
                    onClick={() => void run(() => onDelete(invoice))}
                >
                    <Trash2 className="size-4" />
                    {t('invoices.actions.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
