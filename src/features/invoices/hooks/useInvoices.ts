import { parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';

import config from '@/config';
import { StorageKeys } from '@/constants/StorageKeys';
import { GoogleDriveInvoicesAdapter } from '@/features/invoices/api/GoogleDriveInvoicesAdapter';
import { GoogleGmailAdapter } from '@/features/invoices/api/GoogleGmailAdapter';
import { EmailDeliveryModes } from '@/features/invoices/constants/EmailDeliveryModes';
import { InvoiceStatuses } from '@/features/invoices/constants/InvoiceStatuses';
import {
    type GeneratedFileRef,
    type Invoice,
    type InvoiceFileFormatType,
    InvoiceFileFormats,
    type InvoiceRegistry,
    type InvoiceSettings,
    type InvoicesStorageAdapter,
    type Party,
} from '@/features/invoices/types';
import {
    buildEmailValues,
    buildGmailAppUrl,
    buildGmailComposeUrl,
    buildMailtoUrl,
    expandEmailTemplate,
} from '@/features/invoices/utils/buildGmailComposeUrl';
import {
    attachDocumentImages,
    buildInvoiceDocument,
} from '@/features/invoices/utils/buildInvoiceDocument';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    cloneInvoice as cloneInvoiceRecord,
    createInvoiceDraft,
    deriveVariableSymbol,
} from '@/features/invoices/utils/createInvoiceDraft';
import { downloadBlob } from '@/features/invoices/utils/downloadBlob';
import { peekNextInvoiceNumber } from '@/features/invoices/utils/formatInvoiceNumber';
import {
    buildSettingsExport,
    buildSettingsExportFileName,
    parseSettingsImport,
} from '@/features/invoices/utils/invoiceSettingsTransfer';
import { normaliseRegistry } from '@/features/invoices/utils/normaliseRegistry';
import { renderInvoiceDocx } from '@/features/invoices/utils/renderInvoiceDocx';
import { renderInvoicePdf } from '@/features/invoices/utils/renderInvoicePdf';
import {
    resolveDocumentMimeType,
    resolveDriveFileName,
    resolveDriveFolderSegments,
} from '@/features/invoices/utils/resolveDriveTarget';
import { isAndroid } from '@/lib/platform';
import { Storage } from '@/lib/Storage';

export interface UseInvoicesResult {
    registry: InvoiceRegistry;
    settings: InvoiceSettings;
    companies: Party[];
    invoices: Invoice[];
    /** The number the next automatically numbered invoice will receive. */
    nextInvoiceNumber: string;
    isAuthenticated: boolean;
    loading: boolean;
    isSyncing: boolean;
    error: string | null;
    clearError: () => void;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    sync: () => Promise<void>;
    saveSettings: (settings: InvoiceSettings) => Promise<void>;
    exportSettings: () => void;
    importSettings: (content: string) => Promise<void>;
    saveCompany: (company: Party) => Promise<void>;
    removeCompany: (id: string) => Promise<void>;
    createDraft: (customerId: string | null) => Invoice;
    saveInvoice: (invoice: Invoice) => Promise<Invoice>;
    issueInvoice: (invoice: Invoice) => Promise<Invoice>;
    setInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;
    duplicateInvoice: (id: string, refreshSupplier: boolean) => Invoice | null;
    removeInvoice: (id: string) => Promise<void>;
    generateDocument: (
        invoice: Invoice,
        fileFormat: InvoiceFileFormatType,
    ) => Promise<GeneratedFileRef>;
    composeEmail: (invoice: Invoice) => Promise<string>;
}

/**
 * Owns the invoice registry: settings, the customer company list and every
 * issued invoice, backed by a single JSON document in the user's Google Drive
 * with a local cache so the UI stays usable offline.
 */
export function useInvoices(): UseInvoicesResult {
    const [adapter] = useState<InvoicesStorageAdapter>(
        () => new GoogleDriveInvoicesAdapter(config.googleClientId),
    );
    const [gmail] = useState(
        () => new GoogleGmailAdapter(config.googleClientId),
    );
    const [registry, setRegistry] = useState<InvoiceRegistry>(() =>
        normaliseRegistry(
            Storage.get<InvoiceRegistry | null>(
                StorageKeys.InvoicesCache,
                null,
            ),
        ),
    );
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback((): void => setError(null), []);

    /**
     * Writes the registry to the local cache immediately and to Drive when a
     * session is available. The local write is synchronous so the UI never
     * shows stale data while the upload is in flight.
     */
    const persist = useCallback(
        async (next: InvoiceRegistry): Promise<void> => {
            const stamped: InvoiceRegistry = {
                ...next,
                updatedAt: new Date().toISOString(),
            };

            setRegistry(stamped);
            Storage.set(StorageKeys.InvoicesCache, stamped);

            if (!adapter.isAuthenticated()) {
                return;
            }

            setIsSyncing(true);

            try {
                await adapter.saveRegistry(stamped);
                setError(null);
            } catch (err) {
                console.error('Failed to save the invoice registry:', err);
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to save to Google Drive',
                );
            } finally {
                setIsSyncing(false);
            }
        },
        [adapter],
    );

    const sync = useCallback(async (): Promise<void> => {
        if (!adapter.isAuthenticated()) {
            setLoading(false);

            return;
        }

        setIsSyncing(true);

        try {
            const remote = await adapter.fetchRegistry();

            if (remote) {
                const normalised = normaliseRegistry(remote);

                setRegistry(normalised);
                Storage.set(StorageKeys.InvoicesCache, normalised);
            } else {
                // First run against this Drive: publish the seeded registry.
                const initial = normaliseRegistry(
                    Storage.get<InvoiceRegistry | null>(
                        StorageKeys.InvoicesCache,
                        null,
                    ),
                );

                await adapter.saveRegistry(initial);
                setRegistry(initial);
            }

            setError(null);
        } catch (err) {
            console.error('Failed to load the invoice registry:', err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load from Google Drive',
            );
        } finally {
            setIsSyncing(false);
            setLoading(false);
        }
    }, [adapter]);

    // Initial session check and load.
    useEffect((): void => {
        const authenticated = adapter.isAuthenticated();

        setIsAuthenticated(authenticated);

        if (authenticated) {
            void sync();
        } else {
            setLoading(false);
        }
    }, [adapter, sync]);

    // React to a sign-out performed elsewhere in the app.
    useEffect(() => {
        return Storage.subscribe((): void => {
            const authenticated = adapter.isAuthenticated();

            setIsAuthenticated(previous =>
                previous === authenticated ? previous : authenticated,
            );
        });
    }, [adapter]);

    const login = useCallback(async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            await adapter.login();
            setIsAuthenticated(true);
            await sync();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        } finally {
            setLoading(false);
        }
    }, [adapter, sync]);

    const logout = useCallback(async (): Promise<void> => {
        await adapter.logout();
        setIsAuthenticated(false);
    }, [adapter]);

    const saveSettings = useCallback(
        async (settings: InvoiceSettings): Promise<void> => {
            await persist({ ...registry, settings });
        },
        [persist, registry],
    );

    /** Downloads the current configuration as a JSON file. */
    const exportSettings = useCallback((): void => {
        downloadBlob(
            new Blob([buildSettingsExport(registry)], {
                type: 'application/json',
            }),
            buildSettingsExportFileName(),
        );
    }, [registry]);

    /**
     * Replaces settings and companies from a previously exported file.
     * Issued invoices are left untouched — an import must never rewrite the
     * accounting record.
     */
    const importSettings = useCallback(
        async (content: string): Promise<void> => {
            const imported = parseSettingsImport(content);

            await persist({
                ...registry,
                settings: imported.settings,
                companies: imported.companies,
            });
        },
        [persist, registry],
    );

    const saveCompany = useCallback(
        async (company: Party): Promise<void> => {
            const updated: Party = {
                ...company,
                updatedAt: new Date().toISOString(),
            };
            const exists = registry.companies.some(
                item => item.id === company.id,
            );

            const withCompany = exists
                ? registry.companies.map(item =>
                      item.id === company.id ? updated : item,
                  )
                : [...registry.companies, updated];

            await persist({
                ...registry,
                // Marking one company primary clears the flag on the others.
                companies: withCompany.map(item =>
                    updated.isPrimary && item.id !== updated.id
                        ? { ...item, isPrimary: false }
                        : item,
                ),
            });
        },
        [persist, registry],
    );

    const removeCompany = useCallback(
        async (id: string): Promise<void> => {
            await persist({
                ...registry,
                companies: registry.companies.filter(item => item.id !== id),
            });
        },
        [persist, registry],
    );

    const createDraft = useCallback(
        (customerId: string | null): Invoice => {
            const customer =
                registry.companies.find(item => item.id === customerId) ??
                // No explicit choice: start on the company marked primary.
                registry.companies.find(item => item.isPrimary) ??
                null;

            return createInvoiceDraft(registry.settings, customer);
        },
        [registry.companies, registry.settings],
    );

    const saveInvoice = useCallback(
        async (invoice: Invoice): Promise<Invoice> => {
            const updated: Invoice = {
                ...invoice,
                totals: calculateInvoiceTotals(
                    invoice.items,
                    invoice.totals.paidInAdvance,
                ),
                updatedAt: new Date().toISOString(),
            };
            const exists = registry.invoices.some(
                item => item.id === invoice.id,
            );

            await persist({
                ...registry,
                invoices: exists
                    ? registry.invoices.map(item =>
                          item.id === invoice.id ? updated : item,
                      )
                    : [updated, ...registry.invoices],
            });

            return updated;
        },
        [persist, registry],
    );

    /**
     * Renders one document and returns the bytes plus where they belong in
     * Drive. Shared by the download buttons and the automatic archiving that
     * happens when an invoice is issued.
     */
    const renderDocument = useCallback(
        async (
            invoice: Invoice,
            fileFormat: InvoiceFileFormatType,
        ): Promise<{ blob: Blob; fileName: string; folderPath: string }> => {
            const { drive, logo } = registry.settings;
            const model = await attachDocumentImages(
                buildInvoiceDocument(invoice, logo),
                invoice,
            );

            return {
                blob:
                    fileFormat === InvoiceFileFormats.Pdf
                        ? await renderInvoicePdf(model)
                        : await renderInvoiceDocx(model),
                fileName: resolveDriveFileName(
                    drive.fileNamePattern,
                    invoice,
                    fileFormat,
                ),
                folderPath: resolveDriveFolderSegments(
                    drive.folderPath,
                    invoice.issueDate,
                ).join('/'),
            };
        },
        [registry.settings],
    );

    /**
     * Uploads a rendered document, returning the reference to record on the
     * invoice. A failed upload is reported but never throws: it must not stop
     * an invoice being issued or downloaded.
     */
    const storeDocument = useCallback(
        async (
            fileFormat: InvoiceFileFormatType,
            rendered: { blob: Blob; fileName: string; folderPath: string },
        ): Promise<GeneratedFileRef> => {
            let driveFileId: string | null = null;
            let webViewLink = '';

            if (
                registry.settings.drive.autoUpload &&
                adapter.isAuthenticated()
            ) {
                setIsSyncing(true);

                try {
                    const uploaded = await adapter.uploadDocument({
                        folderPath: rendered.folderPath,
                        fileName: rendered.fileName,
                        mimeType: resolveDocumentMimeType(fileFormat),
                        content: rendered.blob,
                    });

                    driveFileId = uploaded.driveFileId;
                    webViewLink = uploaded.webViewLink;
                } catch (err) {
                    console.error('Failed to upload to Drive:', err);
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to upload to Google Drive',
                    );
                } finally {
                    setIsSyncing(false);
                }
            }

            return {
                id: crypto.randomUUID(),
                format: fileFormat,
                fileName: rendered.fileName,
                driveFileId,
                folderPath: rendered.folderPath,
                webViewLink,
                generatedAt: new Date().toISOString(),
            };
        },
        [adapter, registry.settings.drive.autoUpload],
    );

    /** Replaces the reference for a format, keeping the others. */
    const withFileRef = (
        files: GeneratedFileRef[],
        fileRef: GeneratedFileRef,
    ): GeneratedFileRef[] => [
        ...files.filter(file => file.format !== fileRef.format),
        fileRef,
    ];

    /**
     * Renders and uploads both formats for a freshly issued invoice.
     *
     * Nothing is downloaded here — issuing should file the documents away in
     * Drive, not drop two files in the browser. Returns the references to
     * record, or an empty list when archiving is off or unavailable.
     */
    const archiveDocuments = useCallback(
        async (invoice: Invoice): Promise<GeneratedFileRef[]> => {
            if (
                !registry.settings.drive.autoUpload ||
                !adapter.isAuthenticated()
            ) {
                return [];
            }

            const formats = Object.values(InvoiceFileFormats);
            const refs: GeneratedFileRef[] = [];

            for (const fileFormat of formats) {
                try {
                    refs.push(
                        await storeDocument(
                            fileFormat,
                            await renderDocument(invoice, fileFormat),
                        ),
                    );
                } catch (err) {
                    console.error(
                        `Failed to archive the ${fileFormat} document:`,
                        err,
                    );
                    setError(
                        err instanceof Error
                            ? err.message
                            : `Failed to archive the ${fileFormat} document`,
                    );
                }
            }

            return refs;
        },
        [
            adapter,
            registry.settings.drive.autoUpload,
            renderDocument,
            storeDocument,
        ],
    );

    /**
     * Freezes a draft into an issued invoice.
     *
     * Automatic numbers are taken from the sequence at this moment — not when
     * the draft was created — so concurrent drafts cannot claim the same
     * number. A manually typed number is used as is and leaves the sequence
     * untouched, but must still be unique.
     */
    const issueInvoice = useCallback(
        async (invoice: Invoice): Promise<Invoice> => {
            if (invoice.status !== InvoiceStatuses.Draft) {
                return invoice;
            }

            const issuedAt = new Date().toISOString();
            const totals = calculateInvoiceTotals(
                invoice.items,
                invoice.totals.paidInAdvance,
            );

            const isDuplicate = (candidate: string): boolean =>
                registry.invoices.some(
                    item =>
                        item.id !== invoice.id &&
                        item.number === candidate &&
                        item.status !== InvoiceStatuses.Draft,
                );

            let issued: Invoice;
            let settings = registry.settings;

            if (invoice.numberIsManual) {
                if (isDuplicate(invoice.number)) {
                    throw new Error(
                        `Invoice number ${invoice.number} is already used`,
                    );
                }

                issued = { ...invoice, totals };
            } else {
                const issueDate = parseISO(invoice.issueDate);
                const next = peekNextInvoiceNumber(
                    registry.settings.numbering,
                    Number.isNaN(issueDate.getTime()) ? new Date() : issueDate,
                );

                if (isDuplicate(next.number)) {
                    throw new Error(
                        `Invoice number ${next.number} is already used — check the numbering settings`,
                    );
                }

                // The variable symbol identifies the payment to the bank and
                // must match the final number. Only re-derive it when the user
                // has not typed a symbol of their own.
                const wasDerived =
                    invoice.symbols.variableSymbol ===
                    deriveVariableSymbol(invoice.number);

                issued = {
                    ...invoice,
                    number: next.number,
                    sequenceNumber: next.sequence,
                    sequencePeriod: next.period,
                    symbols: {
                        ...invoice.symbols,
                        variableSymbol: wasDerived
                            ? deriveVariableSymbol(next.number)
                            : invoice.symbols.variableSymbol,
                    },
                    totals,
                };
                settings = {
                    ...registry.settings,
                    numbering: next.nextNumbering,
                };
            }

            issued = {
                ...issued,
                status: InvoiceStatuses.Issued,
                issuedAt,
                updatedAt: issuedAt,
            };

            const exists = registry.invoices.some(
                item => item.id === invoice.id,
            );
            const nextRegistry: InvoiceRegistry = {
                ...registry,
                settings,
                invoices: exists
                    ? registry.invoices.map(item =>
                          item.id === issued.id ? issued : item,
                      )
                    : [issued, ...registry.invoices],
            };

            // Record the issue first: it is the accounting fact, and must
            // stand even if archiving the documents later fails.
            await persist(nextRegistry);

            const files = await archiveDocuments(issued);

            if (files.length > 0) {
                const archived = { ...issued, files };

                await persist({
                    ...nextRegistry,
                    invoices: nextRegistry.invoices.map(item =>
                        item.id === archived.id ? archived : item,
                    ),
                });

                return archived;
            }

            return issued;
        },
        [archiveDocuments, persist, registry],
    );

    const setInvoiceStatus = useCallback(
        async (id: string, status: Invoice['status']): Promise<void> => {
            await persist({
                ...registry,
                invoices: registry.invoices.map(item =>
                    item.id === id
                        ? {
                              ...item,
                              status,
                              updatedAt: new Date().toISOString(),
                          }
                        : item,
                ),
            });
        },
        [persist, registry],
    );

    const duplicateInvoice = useCallback(
        (id: string, refreshSupplier: boolean): Invoice | null => {
            const source = registry.invoices.find(item => item.id === id);

            if (!source) {
                return null;
            }

            return cloneInvoiceRecord(source, registry.settings, {
                refreshSupplier,
            });
        },
        [registry.invoices, registry.settings],
    );

    const removeInvoice = useCallback(
        async (id: string): Promise<void> => {
            await persist({
                ...registry,
                invoices: registry.invoices.filter(item => item.id !== id),
            });
        },
        [persist, registry],
    );

    /**
     * Renders an invoice to PDF or DOCX, hands the file to the browser and,
     * when enabled, uploads it to the configured Drive folder. The resulting
     * reference is recorded on the invoice so the registry shows what exists.
     */
    /**
     * Opens a Gmail draft for an invoice.
     *
     * With `attachPdf` on, a real draft is created through the Gmail API with
     * the invoice attached; the sender and Cc come from settings. With it off,
     * a compose URL is opened instead, which cannot carry an attachment or set
     * the sender, so the invoice travels as a Drive link.
     */
    const composeEmail = useCallback(
        async (invoice: Invoice): Promise<string> => {
            const { email } = registry.settings;
            const values = buildEmailValues(invoice, '');
            const subject = expandEmailTemplate(email.subject, values);

            if (email.mode === EmailDeliveryModes.Attachment) {
                const rendered = await renderDocument(
                    invoice,
                    InvoiceFileFormats.Pdf,
                );
                const draft = await gmail.createDraft({
                    from: email.from.trim() || undefined,
                    to: invoice.customer.email,
                    cc: email.cc,
                    subject,
                    // The link placeholder has nothing to point at when the
                    // file itself is attached.
                    body: expandEmailTemplate(email.body, {
                        ...values,
                        link: '',
                    }).trimEnd(),
                    attachment: {
                        fileName: rendered.fileName,
                        mimeType: resolveDocumentMimeType(
                            InvoiceFileFormats.Pdf,
                        ),
                        bytes: new Uint8Array(
                            await rendered.blob.arrayBuffer(),
                        ),
                    },
                });

                // The draft is complete in Gmail; on a phone it has to be
                // opened in the app rather than in a browser tab.
                return isAndroid() ? buildGmailAppUrl(draft.url) : draft.url;
            }

            const stored = invoice.files.find(
                file =>
                    file.format === InvoiceFileFormats.Pdf && file.webViewLink,
            );
            let link = stored?.webViewLink ?? '';

            if (!link) {
                if (!adapter.isAuthenticated()) {
                    throw new Error(
                        'Sign in to Google Drive so the invoice can be linked',
                    );
                }

                const fileRef = await storeDocument(
                    InvoiceFileFormats.Pdf,
                    await renderDocument(invoice, InvoiceFileFormats.Pdf),
                );

                link = fileRef.webViewLink;

                await persist({
                    ...registry,
                    invoices: registry.invoices.map(item =>
                        item.id === invoice.id
                            ? {
                                  ...item,
                                  files: withFileRef(item.files, fileRef),
                              }
                            : item,
                    ),
                });
            }

            const message = {
                invoice,
                link,
                cc: email.cc,
                subjectTemplate: email.subject,
                bodyTemplate: email.body,
            };

            // On a phone the mail app beats Gmail's mobile web composer, and
            // Android routes `mailto:` straight to it.
            return isAndroid()
                ? buildMailtoUrl(message)
                : buildGmailComposeUrl(message);
        },
        [adapter, gmail, persist, registry, renderDocument, storeDocument],
    );

    const generateDocument = useCallback(
        async (
            invoice: Invoice,
            fileFormat: InvoiceFileFormatType,
        ): Promise<GeneratedFileRef> => {
            const rendered = await renderDocument(invoice, fileFormat);

            downloadBlob(rendered.blob, rendered.fileName);

            const fileRef = await storeDocument(fileFormat, rendered);
            const stored = registry.invoices.find(
                item => item.id === invoice.id,
            );

            if (stored) {
                await persist({
                    ...registry,
                    invoices: registry.invoices.map(item =>
                        item.id === invoice.id
                            ? {
                                  ...item,
                                  files: withFileRef(item.files, fileRef),
                              }
                            : item,
                    ),
                });
            }

            return fileRef;
        },
        [persist, registry, renderDocument, storeDocument],
    );

    const nextInvoiceNumber = useMemo(
        (): string =>
            peekNextInvoiceNumber(registry.settings.numbering, new Date())
                .number,
        [registry.settings.numbering],
    );

    return {
        registry,
        settings: registry.settings,
        companies: registry.companies,
        invoices: registry.invoices,
        nextInvoiceNumber,
        isAuthenticated,
        loading,
        isSyncing,
        error,
        clearError,
        login,
        logout,
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
    };
}
