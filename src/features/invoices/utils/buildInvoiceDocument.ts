import type { CurrencyType } from '@/features/invoices/constants/Currencies';
import type { DocumentLanguageType } from '@/features/invoices/constants/DocumentLanguages';
import { InvoiceLabels } from '@/features/invoices/constants/InvoiceLabels';
import {
    type PaymentMethodType,
    PaymentMethods,
} from '@/features/invoices/constants/PaymentMethods';
import type {
    Invoice,
    InvoiceDocumentField,
    InvoiceDocumentModel,
    InvoiceDocumentParty,
    InvoiceDocumentTable,
    InvoiceDocumentTotal,
    Party,
    SupplierProfile,
} from '@/features/invoices/types';
import { amountToWordsPerLanguage } from '@/features/invoices/utils/amountToWords';
import {
    calculateLineGross,
    calculateLineNet,
} from '@/features/invoices/utils/calculateInvoiceTotals';
import { createInvoiceBarcode } from '@/features/invoices/utils/createInvoiceBarcode';
import { createPayBySquareQr } from '@/features/invoices/utils/createPayBySquareQr';
import {
    formatInvoiceDate,
    formatInvoiceMoney,
    formatInvoiceQuantity,
} from '@/features/invoices/utils/invoiceFormatters';
import { resolveCountryLabel } from '@/features/invoices/utils/resolveCountry';
import {
    resolveInvoiceLabel,
    resolveInvoiceLabelLines,
    resolveInvoiceText,
} from '@/features/invoices/utils/resolveInvoiceLabel';

/** Drops fields whose value is empty so the document never prints blank rows. */
function compactFields(
    fields: (InvoiceDocumentField | null)[],
): InvoiceDocumentField[] {
    return fields.filter(
        (field): field is InvoiceDocumentField =>
            field !== null && field.value.trim().length > 0,
    );
}

/**
 * Postal address lines, skipping any part the party did not fill in.
 *
 * The country is rendered from its ISO code through `Intl`, so it appears in
 * each selected language without us maintaining a country name table.
 */
function buildAddressLines(
    party: Party,
    languages: DocumentLanguageType[],
    official: boolean,
): string[] {
    const cityLine = [party.postalCode, party.city]
        .filter(Boolean)
        .join(' ')
        .trim();
    const country = resolveCountryLabel(
        party.countryCode,
        languages,
        party.country,
        official,
    );

    return [party.name, party.street, cityLine, country].filter(
        (line): line is string => Boolean(line && line.trim()),
    );
}

/**
 * Builds the supplier block, which carries the registration details a Slovak
 * invoice is legally required to show.
 */
function buildSupplierBlock(
    supplier: SupplierProfile,
    languages: DocumentLanguageType[],
    official: boolean,
): InvoiceDocumentParty {
    const label = (key: Parameters<typeof resolveInvoiceLabel>[0]): string =>
        resolveInvoiceLabel(key, languages);

    return {
        heading: label('supplier'),
        addressLines: buildAddressLines(supplier, languages, official),
        fields: compactFields([
            {
                label: label('registrationNumber'),
                value: supplier.registrationNumber,
            },
            { label: label('taxNumber'), value: supplier.taxNumber },
            supplier.vatRegistered
                ? {
                      label: label('vatNumber'),
                      value: supplier.vatNumber,
                  }
                : {
                      label: label('vatNumber'),
                      value: label('notVatRegistered'),
                  },
            {
                label: label('commercialRegister'),
                value: supplier.commercialRegister,
            },
            { label: label('email'), value: supplier.email },
            { label: label('phone'), value: supplier.phone },
        ]),
    };
}

/**
 * Builds the customer block. Foreign customers usually have neither a DIČ nor
 * an IČ DPH, so those rows drop out on their own.
 */
function buildCustomerBlock(
    customer: Party,
    languages: DocumentLanguageType[],
    official: boolean,
): InvoiceDocumentParty {
    const label = (key: Parameters<typeof resolveInvoiceLabel>[0]): string =>
        resolveInvoiceLabel(key, languages);

    return {
        heading: label('customer'),
        addressLines: buildAddressLines(customer, languages, official),
        fields: compactFields([
            {
                label: label('registrationNumber'),
                value: customer.registrationNumber,
            },
            { label: label('taxNumber'), value: customer.taxNumber },
            { label: label('vatNumber'), value: customer.vatNumber },
            { label: label('email'), value: customer.email },
        ]),
    };
}

/** Human readable payment method in the requested language. */
function resolvePaymentMethod(
    method: PaymentMethodType,
    languages: DocumentLanguageType[],
): string {
    if (method === PaymentMethods.Cash) {
        return resolveInvoiceLabel('cash', languages);
    }

    if (method === PaymentMethods.Card) {
        return resolveInvoiceLabel('card', languages);
    }

    return resolveInvoiceLabel('bankTransfer', languages);
}

/**
 * Line items table. The VAT columns are dropped entirely when no line carries
 * VAT, which keeps invoices from non-VAT payers uncluttered.
 */
function buildItemsTable(
    invoice: Invoice,
    languages: DocumentLanguageType[],
): InvoiceDocumentTable {
    const hasVat = invoice.items.some(item => item.vatRate > 0);
    const money = (value: number): string =>
        formatInvoiceMoney(value, languages);
    const headerLines = (
        key: Parameters<typeof resolveInvoiceLabelLines>[0],
    ): string[] => resolveInvoiceLabelLines(key, languages);

    const headers = [
        headerLines('lineNumber'),
        headerLines('description'),
        headerLines('quantity'),
        headerLines('unit'),
        headerLines('unitPrice'),
        headerLines('lineNet'),
    ];
    const aligns: InvoiceDocumentTable['aligns'] = [
        'center',
        'left',
        'right',
        'center',
        'right',
        'right',
    ];
    const widths = hasVat
        ? [0.05, 0.35, 0.08, 0.07, 0.13, 0.13, 0.06, 0.13]
        : [0.06, 0.46, 0.09, 0.08, 0.15, 0.16];

    if (hasVat) {
        headers.push(headerLines('vatRate'), headerLines('lineGross'));
        aligns.push('right', 'right');
    }

    const rows = invoice.items.map((item, index) => {
        const row = [
            String(index + 1),
            resolveInvoiceText(item.descriptions, languages),
            formatInvoiceQuantity(item.quantity, languages),
            resolveInvoiceText(item.units, languages),
            money(item.unitPrice),
            money(calculateLineNet(item)),
        ];

        if (hasVat) {
            row.push(
                `${formatInvoiceQuantity(item.vatRate, languages)} %`,
                money(calculateLineGross(item)),
            );
        }

        return row;
    });

    return { headers, rows, aligns, widths };
}

/** The totals block in the bottom right of the document. */
function buildSummary(
    invoice: Invoice,
    languages: DocumentLanguageType[],
    currency: CurrencyType,
): InvoiceDocumentTotal[] {
    // Stacked, not slash-joined: the totals block is too narrow to run three
    // translations of "Total amount excl. VAT" together on one line.
    const labelLines = (
        key: Parameters<typeof resolveInvoiceLabelLines>[0],
    ): string[] => resolveInvoiceLabelLines(key, languages);
    // A no-break space: the amount and its currency must never land on
    // separate lines.
    const money = (value: number): string =>
        `${formatInvoiceMoney(value, languages)}\u00A0${currency}`;
    const hasVat = invoice.items.some(item => item.vatRate > 0);

    return [
        {
            labelLines: labelLines('subtotal'),
            value: money(invoice.totals.subtotal),
        },
        hasVat
            ? {
                  labelLines: labelLines('totalVat'),
                  value: money(invoice.totals.vatAmount),
              }
            : null,
        hasVat
            ? {
                  labelLines: labelLines('totalGross'),
                  value: money(invoice.totals.total),
              }
            : null,
        invoice.totals.paidInAdvance > 0
            ? {
                  labelLines: labelLines('paidInAdvance'),
                  value: money(invoice.totals.paidInAdvance),
              }
            : null,
    ].filter((row): row is InvoiceDocumentTotal => row !== null);
}

/**
 * Turns a stored invoice into the renderer-agnostic document model.
 *
 * Everything language and format dependent is resolved here, so the PDF and
 * DOCX renderers receive plain strings and only decide about layout.
 */
export function buildInvoiceDocument(invoice: Invoice): InvoiceDocumentModel {
    const { languages, currency } = invoice;
    const label = (key: Parameters<typeof resolveInvoiceLabel>[0]): string =>
        resolveInvoiceLabel(key, languages);
    const money = (value: number): string =>
        `${formatInvoiceMoney(value, languages)}\u00A0${currency}`;
    const { bank } = invoice.supplier;
    const spelled = amountToWordsPerLanguage(
        invoice.totals.amountDue,
        currency,
        languages,
    );

    return {
        title: label('invoice'),
        numberLabel: label('invoiceNumber'),
        number: invoice.number,
        supplier: buildSupplierBlock(
            invoice.supplier,
            languages,
            invoice.officialCountryNames,
        ),
        customer: buildCustomerBlock(
            invoice.customer,
            languages,
            invoice.officialCountryNames,
        ),
        dates: compactFields([
            {
                label: label('issueDate'),
                value: formatInvoiceDate(invoice.issueDate),
            },
            {
                label: label('supplyDate'),
                value: formatInvoiceDate(invoice.supplyDate),
            },
            {
                label: label('dueDate'),
                value: formatInvoiceDate(invoice.dueDate),
                strong: true,
            },
            {
                label: label('orderNumber'),
                value: invoice.orderNumber,
            },
        ]),
        payment: compactFields([
            {
                label: label('paymentMethod'),
                value: resolvePaymentMethod(invoice.paymentMethod, languages),
            },
            { label: label('bank'), value: bank.bankName },
            { label: label('iban'), value: bank.iban },
            { label: label('swift'), value: bank.swift },
            {
                label: label('accountNumber'),
                value: bank.accountNumber,
            },
            {
                label: label('variableSymbol'),
                value: invoice.symbols.variableSymbol,
            },
            {
                label: label('constantSymbol'),
                value: invoice.symbols.constantSymbol,
            },
            {
                label: label('specificSymbol'),
                value: invoice.symbols.specificSymbol,
            },
        ]),
        itemsHeading: label('itemsHeading'),
        items: buildItemsTable(invoice, languages),
        summary: buildSummary(invoice, languages, currency),
        totalDue: {
            labelLines: resolveInvoiceLabelLines('totalDue', languages),
            value: money(invoice.totals.amountDue),
        },
        amountInWords: spelled.map((value, index) => ({
            label: InvoiceLabels.amountInWords[languages[index]],
            value,
        })),
        notes: invoice.notes.filter(note => note.trim().length > 0),
        // Rasterising these is async; `attachDocumentImages` fills them in.
        payBySquare: null,
        barcode: null,
    };
}

/**
 * Adds the rendered payment QR and invoice barcode to a document model.
 *
 * Kept separate from `buildInvoiceDocument` so that stays synchronous — the
 * on-screen preview builds the model during render and loads the images after.
 */
export async function attachDocumentImages(
    model: InvoiceDocumentModel,
    invoice: Invoice,
): Promise<InvoiceDocumentModel> {
    const [payBySquare, barcode] = await Promise.all([
        createPayBySquareQr(invoice),
        invoice.barcode
            ? createInvoiceBarcode(invoice.number)
            : Promise.resolve(null),
    ]);

    return { ...model, payBySquare, barcode };
}
