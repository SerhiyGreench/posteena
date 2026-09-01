import type {
    InvoiceRegistry,
    InvoiceSettings,
    Party,
} from '@/features/invoices/types';
import {
    normaliseRegistry,
    RegistryVersion,
} from '@/features/invoices/utils/normaliseRegistry';

/** Marker so an imported file can be recognised as ours. */
const TransferKind = 'posteena-invoice-settings';

/**
 * The portable configuration: the issuing company, numbering, defaults, Drive
 * output and the customer registry. Issued invoices are deliberately excluded
 * — this is configuration, not an accounting archive.
 */
export interface InvoiceSettingsTransfer {
    kind: typeof TransferKind;
    version: number;
    exportedAt: string;
    settings: InvoiceSettings;
    companies: Party[];
}

export interface ImportedInvoiceSettings {
    settings: InvoiceSettings;
    companies: Party[];
}

/** Serialises the current configuration for download. */
export function buildSettingsExport(registry: InvoiceRegistry): string {
    const transfer: InvoiceSettingsTransfer = {
        kind: TransferKind,
        version: RegistryVersion,
        exportedAt: new Date().toISOString(),
        settings: registry.settings,
        companies: registry.companies,
    };

    return JSON.stringify(transfer, null, 2);
}

/** File name a fresh export is offered under. */
export function buildSettingsExportFileName(date = new Date()): string {
    return `posteena-invoice-settings-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Parses a previously exported file.
 *
 * The contents are untrusted, so every field is run back through
 * `normaliseRegistry`: anything missing falls back to a default and anything
 * unexpected is dropped, rather than reaching the rest of the app half-shaped.
 * Throws a readable message when the file clearly is not one of ours.
 */
export function parseSettingsImport(content: string): ImportedInvoiceSettings {
    let parsed: unknown;

    try {
        parsed = JSON.parse(content);
    } catch {
        throw new Error('The selected file is not valid JSON');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('The selected file does not contain settings');
    }

    const candidate = parsed as Partial<InvoiceSettingsTransfer>;

    if (!candidate.settings || typeof candidate.settings !== 'object') {
        throw new Error('The selected file does not contain invoice settings');
    }

    const normalised = normaliseRegistry({
        version: RegistryVersion,
        settings: candidate.settings,
        companies: Array.isArray(candidate.companies)
            ? candidate.companies
            : [],
        invoices: [],
        updatedAt: new Date().toISOString(),
    } as InvoiceRegistry);

    return {
        settings: normalised.settings,
        companies: normalised.companies,
    };
}
