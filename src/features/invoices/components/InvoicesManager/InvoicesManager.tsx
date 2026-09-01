import { Loader2, Plus, ReceiptText, RefreshCw } from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from 'ui/button';
import { Dialog, DialogContent } from 'ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'ui/tabs';

import LoginScreen from '@/components/LoginScreen';
import { PageContainer } from '@/components/PageContainer';
import AsyncButton from '@/features/invoices/components/InvoicesManager/AsyncButton';
import DialogTopBar from '@/features/invoices/components/InvoicesManager/DialogTopBar';
import InvoiceEditor from '@/features/invoices/components/InvoicesManager/InvoiceEditor';
import InvoiceList from '@/features/invoices/components/InvoicesManager/InvoiceList';
import InvoicePreview from '@/features/invoices/components/InvoicesManager/InvoicePreview';
import SettingsPanel from '@/features/invoices/components/InvoicesManager/SettingsPanel';
import {
    type InvoiceStatusType,
    InvoiceStatuses,
} from '@/features/invoices/constants/InvoiceStatuses';
import { useInvoices } from '@/features/invoices/hooks/useInvoices';
import type {
    Invoice,
    InvoiceFileFormatType,
    InvoiceSettings,
    Party,
} from '@/features/invoices/types';

const Panels = {
    Invoices: 'invoices',
    Settings: 'settings',
} as const;

/**
 * Entry point of the invoices feature: the registry, the customer companies
 * and the global settings, all backed by the user's own Google Drive.
 */
export default function InvoicesManager(): ReactElement {
    const { t } = useTranslation();
    const {
        settings,
        companies,
        invoices,
        isAuthenticated,
        loading,
        isSyncing,
        error,
        login,
        sync,
        saveSettings,
        exportSettings,
        importSettings,
        saveCompany,
        removeCompany,
        createDraft,
        saveInvoice,
        issueInvoice,
        setInvoiceStatus,
        duplicateInvoice,
        removeInvoice,
        generateDocument,
        composeEmail,
    } = useInvoices();

    const [editing, setEditing] = useState<Invoice | null>(null);
    const [previewing, setPreviewing] = useState<Invoice | null>(null);

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center">
                <LoginScreen
                    title={t('invoices.title')}
                    description={t('invoices.description')}
                    icon={<ReceiptText className="text-primary size-8" />}
                    loading={loading}
                    showShield
                    shieldTitle={t('invoices.title')}
                    shieldDescription={t('invoices.authDescription')}
                    onLogin={() => void login()}
                />
                {error && (
                    <p
                        className="text-destructive max-w-md px-4 pb-8 text-center text-sm"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
            </div>
        );
    }

    const handleSave = async (invoice: Invoice): Promise<void> => {
        await saveInvoice(invoice);
        setEditing(null);
        toast.success(t('invoices.toast.saved'));
    };

    const handleIssue = async (invoice: Invoice): Promise<void> => {
        try {
            const issued = await issueInvoice(invoice);

            setEditing(null);
            toast.success(
                t('invoices.toast.issued', { number: issued.number }),
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        }
    };

    const handleGenerate = async (
        invoice: Invoice,
        fileFormat: InvoiceFileFormatType,
    ): Promise<void> => {
        try {
            const file = await generateDocument(invoice, fileFormat);

            toast.success(
                t('invoices.toast.generated', { fileName: file.fileName }),
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        }
    };

    const handleEmail = async (invoice: Invoice): Promise<void> => {
        try {
            const url = await composeEmail(invoice);

            if (!url.startsWith('http')) {
                // `mailto:` and `intent:` hand the message to an installed
                // app, and Chrome only allows that from a live user gesture.
                // Creating the draft — rendering the PDF, uploading it,
                // calling Gmail — takes longer than the few seconds a tap
                // stays valid for, so navigating from here is silently
                // dropped. The link in the toast gives the launch its own
                // tap, and being a real link is handled by the browser
                // rather than by script.
                toast.success(t('invoices.toast.emailReady'), {
                    duration: 30_000,
                    action: (
                        <a
                            href={url}
                            className="bg-primary text-primary-foreground shrink-0 rounded-md px-2.5 py-1 text-xs font-medium"
                        >
                            {t('invoices.actions.openEmail')}
                        </a>
                    ),
                });

                return;
            }

            // Gmail's composer opens in its own tab, leaving the app in place.
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        }
    };

    const handleClone = (invoice: Invoice, refreshSupplier: boolean): void => {
        const clone = duplicateInvoice(invoice.id, refreshSupplier);

        if (clone) {
            setEditing(clone);
        }
    };

    const handleDelete = async (invoice: Invoice): Promise<void> => {
        if (
            !window.confirm(
                t('invoices.confirmDeleteInvoice', { number: invoice.number }),
            )
        ) {
            return;
        }

        await removeInvoice(invoice.id);
        toast.success(t('invoices.toast.deleted'));
    };

    const handleStatusChange = async (
        invoice: Invoice,
        status: InvoiceStatusType,
    ): Promise<void> => {
        await setInvoiceStatus(invoice.id, status);
    };

    const handleSaveCompany = async (company: Party): Promise<void> => {
        await saveCompany(company);
        toast.success(t('invoices.toast.saved'));
    };

    const handleSaveSettings = async (next: InvoiceSettings): Promise<void> => {
        await saveSettings(next);
        toast.success(t('invoices.toast.saved'));
    };

    const handleImportSettings = async (content: string): Promise<void> => {
        try {
            await importSettings(content);
            toast.success(t('invoices.toast.imported'));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <PageContainer className="flex flex-col gap-6 p-4 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold">
                        {t('invoices.title')}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {t('invoices.description')}
                    </p>
                </div>

                {/* Wrapped onto its own line on a phone, the row spans the
                    width so sync and the new-invoice button sit at opposite
                    ends rather than bunching up on the left. */}
                <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                    {isSyncing && (
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Loader2 className="size-3.5 animate-spin" />
                            {t('invoices.syncing')}
                        </span>
                    )}
                    <AsyncButton
                        variant="ghost"
                        size="icon"
                        spinnerOnly
                        onClick={sync}
                    >
                        <RefreshCw className="size-4" />
                    </AsyncButton>
                    <Button
                        className="gap-2"
                        onClick={() => setEditing(createDraft(null))}
                    >
                        <Plus className="size-4" />
                        {t('invoices.actions.new')}
                    </Button>
                </div>
            </div>

            {error && (
                <p className="text-destructive text-sm" role="alert">
                    {error}
                </p>
            )}

            <Tabs defaultValue={Panels.Invoices}>
                <TabsList>
                    <TabsTrigger value={Panels.Invoices}>
                        {t('invoices.tabs.invoices')}
                    </TabsTrigger>
                    <TabsTrigger value={Panels.Settings}>
                        {t('invoices.tabs.settings')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={Panels.Invoices}>
                    <InvoiceList
                        invoices={invoices}
                        onEdit={setEditing}
                        onPreview={setPreviewing}
                        onClone={handleClone}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onGenerate={handleGenerate}
                        onEmail={handleEmail}
                    />
                </TabsContent>

                <TabsContent value={Panels.Settings}>
                    <SettingsPanel
                        settings={settings}
                        companies={companies}
                        onSave={handleSaveSettings}
                        onSaveCompany={handleSaveCompany}
                        onRemoveCompany={removeCompany}
                        onExport={exportSettings}
                        onImport={handleImportSettings}
                    />
                </TabsContent>
            </Tabs>

            <Dialog
                open={editing !== null}
                onOpenChange={open => {
                    if (!open) {
                        setEditing(null);
                    }
                }}
            >
                <DialogContent
                    className="overflow-y-auto sm:max-w-4xl"
                    showCloseButton={false}
                >
                    <DialogTopBar>
                        {editing?.status === InvoiceStatuses.Draft
                            ? t('invoices.form.newTitle')
                            : t('invoices.form.editTitle', {
                                  number: editing?.number ?? '',
                              })}
                    </DialogTopBar>

                    {editing && (
                        <InvoiceEditor
                            key={editing.id}
                            invoice={editing}
                            companies={companies}
                            settings={settings}
                            onSave={handleSave}
                            onIssue={handleIssue}
                            onCancel={() => setEditing(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog
                open={previewing !== null}
                onOpenChange={open => {
                    if (!open) {
                        setPreviewing(null);
                    }
                }}
            >
                <DialogContent
                    className="overflow-y-auto sm:max-w-4xl"
                    showCloseButton={false}
                >
                    <DialogTopBar>{t('invoices.actions.preview')}</DialogTopBar>

                    {previewing && <InvoicePreview invoice={previewing} />}
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
