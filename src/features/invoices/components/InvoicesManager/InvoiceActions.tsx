import {
    Ban,
    CheckCheck,
    Copy,
    ExternalLink,
    Eye,
    FileText,
    Mail,
    Pencil,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';

import AsyncButton from '@/features/invoices/components/InvoicesManager/AsyncButton';
import {
    type InvoiceStatusType,
    InvoiceStatuses,
} from '@/features/invoices/constants/InvoiceStatuses';
import {
    type Invoice,
    type InvoiceFileFormatType,
    InvoiceFileFormats,
} from '@/features/invoices/types';

export interface InvoiceActionsProps {
    invoice: Invoice;
    onEdit: (invoice: Invoice) => void;
    onPreview: (invoice: Invoice) => void;
    onClone: (invoice: Invoice, refreshSupplier: boolean) => void;
    onDelete: (invoice: Invoice) => Promise<void>;
    onStatusChange: (
        invoice: Invoice,
        status: InvoiceStatusType,
    ) => Promise<void>;
    onGenerate: (
        invoice: Invoice,
        fileFormat: InvoiceFileFormatType,
    ) => Promise<void>;
    onEmail: (invoice: Invoice) => Promise<void>;
}

/**
 * The action buttons for a single invoice.
 *
 * Shared by the desktop table row and the mobile card so the two views can
 * never offer a different set of actions.
 */
export default function InvoiceActions({
    invoice,
    onEdit,
    onPreview,
    onClone,
    onDelete,
    onStatusChange,
    onGenerate,
    onEmail,
}: InvoiceActionsProps): ReactElement {
    const { t } = useTranslation();
    const driveLink = invoice.files.find(file => file.webViewLink)?.webViewLink;

    return (
        <>
            <Button
                variant="ghost"
                size="icon-sm"
                title={t('invoices.actions.preview')}
                onClick={() => onPreview(invoice)}
            >
                <Eye className="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                title={t('invoices.actions.edit')}
                onClick={() => onEdit(invoice)}
            >
                <Pencil className="size-4" />
            </Button>
            <AsyncButton
                variant="ghost"
                size="sm"
                title={t('invoices.actions.downloadPdf')}
                onClick={() => onGenerate(invoice, InvoiceFileFormats.Pdf)}
            >
                <FileText className="size-4" />
                {t('invoices.actions.downloadPdf')}
            </AsyncButton>
            <AsyncButton
                variant="ghost"
                size="sm"
                title={t('invoices.actions.downloadDocx')}
                onClick={() => onGenerate(invoice, InvoiceFileFormats.Docx)}
            >
                <FileText className="size-4" />
                {t('invoices.actions.downloadDocx')}
            </AsyncButton>
            <AsyncButton
                variant="ghost"
                size="icon-sm"
                spinnerOnly
                title={t('invoices.actions.email')}
                onClick={() => onEmail(invoice)}
            >
                <Mail className="size-4" />
            </AsyncButton>
            <Button
                variant="ghost"
                size="icon-sm"
                title={t('invoices.actions.clone')}
                onClick={() => onClone(invoice, false)}
            >
                <Copy className="size-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon-sm"
                title={t('invoices.actions.reissue')}
                onClick={() => onClone(invoice, true)}
            >
                <RefreshCw className="size-4" />
            </Button>
            {invoice.status === InvoiceStatuses.Issued && (
                <AsyncButton
                    variant="ghost"
                    size="icon-sm"
                    spinnerOnly
                    title={t('invoices.actions.markPaid')}
                    onClick={() =>
                        onStatusChange(invoice, InvoiceStatuses.Paid)
                    }
                >
                    <CheckCheck className="size-4" />
                </AsyncButton>
            )}
            {invoice.status !== InvoiceStatuses.Cancelled &&
                invoice.status !== InvoiceStatuses.Draft && (
                    <AsyncButton
                        variant="ghost"
                        size="icon-sm"
                        spinnerOnly
                        title={t('invoices.actions.markCancelled')}
                        onClick={() =>
                            onStatusChange(invoice, InvoiceStatuses.Cancelled)
                        }
                    >
                        <Ban className="size-4" />
                    </AsyncButton>
                )}
            {driveLink && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t('invoices.actions.openInDrive')}
                    render={
                        <a href={driveLink} target="_blank" rel="noreferrer" />
                    }
                >
                    <ExternalLink className="size-4" />
                </Button>
            )}
            <AsyncButton
                variant="ghost"
                size="icon-sm"
                spinnerOnly
                className="text-destructive"
                title={t('invoices.actions.delete')}
                onClick={() => onDelete(invoice)}
            >
                <Trash2 className="size-4" />
            </AsyncButton>
        </>
    );
}
