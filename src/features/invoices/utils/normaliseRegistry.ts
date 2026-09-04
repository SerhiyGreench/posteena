import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import {
    type DocumentLanguageType,
    DocumentLanguages,
} from '@/features/invoices/constants/DocumentLanguages';
import { SeedCompanies } from '@/features/invoices/constants/SeedCompanies';
import type {
    Invoice,
    InvoiceLineItem,
    InvoiceRegistry,
    Party,
} from '@/features/invoices/types';

/** Schema version of the stored registry document. */
export const RegistryVersion = 1;

/** The registry a first-time user starts from. */
export function createInitialRegistry(): InvoiceRegistry {
    return {
        version: RegistryVersion,
        settings: structuredClone(DefaultInvoiceSettings),
        companies: structuredClone(SeedCompanies),
        invoices: [],
        updatedAt: new Date().toISOString(),
    };
}

/** Shapes written by earlier versions, migrated on load. */
interface LegacyLineItem {
    description?: string;
    descriptionSk?: string;
    /** A single unit string, before units were kept per language. */
    unit?: string;
}

interface LegacyLanguageHolder {
    language?: string;
    languages?: DocumentLanguageType[];
}

/**
 * Upgrades a line item that stored a single English/Slovak description pair to
 * the per-language map.
 */
function normaliseLineItem(item: InvoiceLineItem): InvoiceLineItem {
    const legacy = item as LegacyLineItem;

    return {
        ...item,
        descriptions: item.descriptions ?? {
            en: legacy.description ?? '',
            sk: legacy.descriptionSk ?? '',
        },
        // The old presets were Slovak abbreviations; keeping the value under
        // `sk` preserves what the document printed, since a language with no
        // entry falls back to one that has it.
        units: item.units ?? (legacy.unit ? { sk: legacy.unit } : {}),
    };
}

/**
 * Upgrades the old single `language` field — where "bilingual" meant Slovak
 * plus English — to the language list.
 */
function normaliseLanguages(
    holder: LegacyLanguageHolder,
): DocumentLanguageType[] {
    if (holder.languages && holder.languages.length > 0) {
        return holder.languages;
    }

    if (holder.language === 'sk' || holder.language === 'en') {
        return [holder.language];
    }

    return [DocumentLanguages.Slovak, DocumentLanguages.English];
}

/** Country was free text before it was picked from the `Intl` region list. */
function normaliseParty<T extends Party>(party: T): T {
    return {
        ...party,
        countryCode: party.countryCode ?? '',
        country: party.country ?? '',
        isPrimary: party.isPrimary ?? false,
    };
}

/** Brings a stored invoice up to the current shape. */
function normaliseInvoice(invoice: Invoice): Invoice {
    return {
        ...invoice,
        languages: normaliseLanguages(invoice),
        payBySquare: invoice.payBySquare ?? false,
        officialCountryNames: invoice.officialCountryNames ?? false,
        barcode: invoice.barcode ?? false,
        items: (invoice.items ?? []).map(normaliseLineItem),
        files: invoice.files ?? [],
        notes: invoice.notes ?? [],
        supplier: normaliseParty(invoice.supplier),
        customer: normaliseParty(invoice.customer),
    };
}

/**
 * Fills in anything a registry stored by an older version of the app is
 * missing, so loading never crashes on a partially shaped document.
 */
export function normaliseRegistry(
    registry: InvoiceRegistry | null,
): InvoiceRegistry {
    if (!registry) {
        return createInitialRegistry();
    }

    const defaults = structuredClone(DefaultInvoiceSettings);
    const stored = registry.settings;
    const storedDefaults = { ...defaults.defaults, ...stored?.defaults };
    const storedItems = stored?.defaults?.items;

    return {
        version: RegistryVersion,
        settings: {
            supplier: normaliseParty({
                ...defaults.supplier,
                ...stored?.supplier,
                bank: { ...defaults.supplier.bank, ...stored?.supplier?.bank },
            }),
            numbering: { ...defaults.numbering, ...stored?.numbering },
            defaults: {
                ...storedDefaults,
                languages: normaliseLanguages(storedDefaults),
                schedule: {
                    ...defaults.defaults.schedule,
                    ...stored?.defaults?.schedule,
                    issueDayOfMonth:
                        stored?.defaults?.schedule?.issueDayOfMonth ??
                        defaults.defaults.schedule.issueDayOfMonth,
                    supplyDayOfMonth:
                        stored?.defaults?.schedule?.supplyDayOfMonth ??
                        defaults.defaults.schedule.supplyDayOfMonth,
                },
                items: (storedItems && storedItems.length > 0
                    ? storedItems
                    : defaults.defaults.items
                ).map(normaliseLineItem),
            },
            drive: { ...defaults.drive, ...stored?.drive },
            email: { ...defaults.email, ...stored?.email },
            logo: stored?.logo ?? null,
        },
        companies: (registry.companies ?? []).map(normaliseParty),
        invoices: (registry.invoices ?? []).map(normaliseInvoice),
        updatedAt: registry.updatedAt ?? new Date().toISOString(),
    };
}
