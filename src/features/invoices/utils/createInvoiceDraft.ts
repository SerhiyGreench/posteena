import { InvoiceStatuses } from '@/features/invoices/constants/InvoiceStatuses';
import type {
    Invoice,
    InvoiceLineItem,
    InvoiceSettings,
    Party,
    SupplierProfile,
} from '@/features/invoices/types';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import { peekNextInvoiceNumber } from '@/features/invoices/utils/formatInvoiceNumber';
import { resolveScheduledDates } from '@/features/invoices/utils/resolveScheduledDates';

/**
 * Derives a Slovak variable symbol from an invoice number: banks accept up to
 * ten digits, so every non-digit is stripped and the tail is kept.
 */
export function deriveVariableSymbol(invoiceNumber: string): string {
    return invoiceNumber.replace(/\D/g, '').slice(-10);
}

/**
 * A blank company record, used by the "add company" form.
 */
export function createEmptyParty(): Party {
    const now = new Date().toISOString();

    return {
        id: crypto.randomUUID(),
        name: '',
        legalForm: '',
        street: '',
        city: '',
        postalCode: '',
        countryCode: '',
        country: '',
        registrationNumber: '',
        taxNumber: '',
        vatNumber: '',
        commercialRegister: '',
        email: '',
        phone: '',
        note: '',
        isPrimary: false,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * A single blank line, using the configured unit and VAT rate.
 */
export function createDefaultLineItem(
    settings: InvoiceSettings,
): InvoiceLineItem {
    return {
        id: crypto.randomUUID(),
        descriptions: {},
        quantity: 1,
        units: { ...settings.defaults.units },
        unitPrice: 0,
        vatRate: settings.defaults.vatRate,
    };
}

/**
 * The line items a new invoice starts with, taken from the configured
 * defaults.
 *
 * Each gets a fresh id so editing the invoice can never write back into the
 * settings. Falls back to one blank line when no defaults are configured.
 */
export function createDefaultLineItems(
    settings: InvoiceSettings,
): InvoiceLineItem[] {
    const configured = settings.defaults.items ?? [];

    if (configured.length === 0) {
        return [createDefaultLineItem(settings)];
    }

    return configured.map(item => ({ ...item, id: crypto.randomUUID() }));
}

/**
 * Builds a new draft invoice from the global settings.
 *
 * The number shown on a draft is only a preview: the sequence is not consumed
 * until the invoice is actually issued, so abandoned drafts leave no gaps.
 */
export function createInvoiceDraft(
    settings: InvoiceSettings,
    customer: Party | null,
): Invoice {
    const now = new Date();
    const nowIso = now.toISOString();
    const { issueDate, supplyDate, dueDate } = resolveScheduledDates(
        settings.defaults.schedule,
        settings.defaults.dueDays,
        now,
    );
    const { number, sequence, period } = peekNextInvoiceNumber(
        settings.numbering,
        now,
    );
    const items = createDefaultLineItems(settings);

    return {
        id: crypto.randomUUID(),
        number,
        sequenceNumber: sequence,
        sequencePeriod: period,
        numberIsManual: false,
        status: InvoiceStatuses.Draft,
        languages: [...settings.defaults.languages],
        currency: settings.defaults.currency,
        paymentMethod: settings.defaults.paymentMethod,
        issueDate,
        supplyDate,
        dueDate,
        orderNumber: '',
        symbols: {
            variableSymbol: deriveVariableSymbol(number),
            constantSymbol: settings.defaults.constantSymbol,
            specificSymbol: '',
        },
        items,
        totals: calculateInvoiceTotals(items),
        notes: [...settings.defaults.notes],
        payBySquare: settings.defaults.payBySquare,
        officialCountryNames: settings.defaults.officialCountryNames,
        barcode: settings.defaults.barcode,
        supplier: structuredClone(settings.supplier),
        customer: customer ? structuredClone(customer) : createEmptyParty(),
        customerId: customer?.id ?? null,
        files: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        issuedAt: null,
        clonedFromId: null,
    };
}

/**
 * Copies an existing invoice into a fresh draft.
 *
 * Everything the user entered is preserved — items, notes, customer and the
 * supplier snapshot — while identity, dates, number and generated files are
 * reset. This is what powers both "clone" and "reissue".
 */
export function cloneInvoice(
    source: Invoice,
    settings: InvoiceSettings,
    options: { refreshSupplier: boolean } = { refreshSupplier: false },
): Invoice {
    const now = new Date();
    const nowIso = now.toISOString();
    const { issueDate, supplyDate, dueDate } = resolveScheduledDates(
        settings.defaults.schedule,
        settings.defaults.dueDays,
        now,
    );
    const { number, sequence, period } = peekNextInvoiceNumber(
        settings.numbering,
        now,
    );

    const supplier: SupplierProfile = options.refreshSupplier
        ? structuredClone(settings.supplier)
        : structuredClone(source.supplier);

    return {
        ...structuredClone(source),
        id: crypto.randomUUID(),
        number,
        sequenceNumber: sequence,
        sequencePeriod: period,
        numberIsManual: false,
        status: InvoiceStatuses.Draft,
        issueDate,
        supplyDate,
        dueDate,
        symbols: {
            ...source.symbols,
            variableSymbol: deriveVariableSymbol(number),
        },
        items: source.items.map(item => ({
            ...item,
            id: crypto.randomUUID(),
        })),
        supplier,
        files: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        issuedAt: null,
        clonedFromId: source.id,
    };
}
