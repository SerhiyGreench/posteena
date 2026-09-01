import { describe, expect, it } from 'vitest';

import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import { DocumentLanguages } from '@/features/invoices/constants/DocumentLanguages';
import type { Invoice } from '@/features/invoices/types';
import { buildInvoiceDocument } from '@/features/invoices/utils/buildInvoiceDocument';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createEmptyParty,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';

/**
 * An explicit supplier and customer fixture.
 *
 * Deliberately independent of the seeded defaults: those are sample data a
 * user is free to blank out, and the document builder's behaviour must not
 * depend on them.
 */
const supplier = {
    ...DefaultInvoiceSettings.supplier,
    name: 'Example Supplier s. r. o.',
    street: 'Testovacia 1',
    postalCode: '000 01',
    city: 'Bratislava',
    countryCode: 'SK',
    registrationNumber: '12 345 678',
    taxNumber: '1234567890',
    vatRegistered: false,
    vatNumber: '',
    bank: {
        accountHolder: 'Example Supplier s. r. o.',
        bankName: 'Example Bank, a. s.',
        iban: 'SK24 9999 0000 0000 0000 1234',
        swift: 'TESTSKBX',
        accountNumber: '',
    },
};

const customer = {
    ...createEmptyParty(),
    name: 'Example Customer Ltd',
    legalForm: 'Limited Company',
    street: 'Sample Street 2',
    postalCode: '0000',
    city: 'Limassol',
    countryCode: 'CY',
    registrationNumber: 'HE 000000',
};

/** An invoice for 42 hours at 30 EUR with no VAT. */
function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
    const draft = createInvoiceDraft(
        { ...DefaultInvoiceSettings, supplier },
        customer,
    );
    const items = draft.items.map(item => ({
        ...item,
        descriptions: {
            en: 'Software development services',
            sk: 'Vývoj softvéru',
        },
        quantity: 42,
        units: { sk: 'hod', en: 'hrs' },
        unitPrice: 30,
        vatRate: 0,
    }));

    return {
        ...draft,
        items,
        totals: calculateInvoiceTotals(items),
        number: '20260009',
        symbols: { ...draft.symbols, variableSymbol: '20260009' },
        issueDate: '2026-08-10',
        supplyDate: '2026-08-10',
        dueDate: '2026-08-24',
        ...overrides,
    };
}

describe('buildInvoiceDocument', () => {
    it('prints every label bilingually by default', () => {
        const model = buildInvoiceDocument(buildInvoice());

        expect(model.title).toBe('Faktúra / Invoice');
        expect(model.supplier.heading).toBe('Dodávateľ / Supplier');
        expect(model.customer.heading).toBe('Odberateľ / Customer');
        expect(model.totalDue.labelLines).toEqual([
            'Celkom na úhradu',
            'Total due',
        ]);
    });

    it('carries the supplier and customer snapshots into the address blocks', () => {
        const model = buildInvoiceDocument(buildInvoice());

        expect(model.supplier.addressLines[0]).toBe(
            'Example Supplier s. r. o.',
        );
        expect(model.supplier.addressLines).toContain('Testovacia 1');
        expect(model.customer.addressLines[0]).toBe('Example Customer Ltd');
        expect(model.customer.addressLines).toContain(
            'Cyperská republika / Republic of Cyprus',
        );
    });

    it('translates the country into each selected language', () => {
        const model = buildInvoiceDocument(
            buildInvoice({
                languages: [
                    DocumentLanguages.Slovak,
                    DocumentLanguages.English,
                    DocumentLanguages.Ukrainian,
                ],
            }),
        );

        // Resolved from the ISO code through Intl, not a stored string.
        expect(model.supplier.addressLines).toContain(
            'Slovenská republika / Slovak Republic / Словацька Республіка',
        );
        expect(model.customer.addressLines).toContain(
            'Cyperská republika / Republic of Cyprus / Республіка Кіпр',
        );
    });

    it('prints labels in every selected language', () => {
        const model = buildInvoiceDocument(
            buildInvoice({
                languages: [
                    DocumentLanguages.Slovak,
                    DocumentLanguages.English,
                    DocumentLanguages.Ukrainian,
                ],
            }),
        );

        expect(model.title).toBe('Faktúra / Invoice / Рахунок-фактура');
        expect(model.supplier.heading).toBe(
            'Dodávateľ / Supplier / Постачальник',
        );
    });

    it('prints a Ukrainian-only document', () => {
        const model = buildInvoiceDocument(
            buildInvoice({ languages: [DocumentLanguages.Ukrainian] }),
        );

        expect(model.title).toBe('Рахунок-фактура');
        expect(model.customer.addressLines).toContain('Республіка Кіпр');
        expect(model.items.rows[0]).toContain('Software development services');
    });

    it('falls back to the common Intl name when official names are off', () => {
        const model = buildInvoiceDocument(
            buildInvoice({ officialCountryNames: false }),
        );

        // Intl only knows the common name, in every style.
        expect(model.supplier.addressLines).toContain('Slovensko / Slovakia');
        // Identical spellings collapse rather than repeating.
        expect(model.customer.addressLines).toContain('Cyprus');
    });

    it('states that the supplier is not VAT registered', () => {
        const model = buildInvoiceDocument(buildInvoice());
        const vatField = model.supplier.fields.find(field =>
            field.label.includes('IČ DPH'),
        );

        expect(vatField?.value).toBe(
            'Nie je platiteľom DPH / Not registered for VAT',
        );
    });

    it('stacks each language on its own line in the column headings', () => {
        const model = buildInvoiceDocument(
            buildInvoice({
                languages: [
                    DocumentLanguages.Slovak,
                    DocumentLanguages.English,
                    DocumentLanguages.Ukrainian,
                ],
            }),
        );
        const description = model.items.headers[1];

        // Joined with a slash these run far wider than the column.
        expect(description).toEqual(['Popis', 'Description', 'Опис']);
    });

    it('collapses a heading the languages spell identically', () => {
        const model = buildInvoiceDocument(
            buildInvoice({
                languages: [
                    DocumentLanguages.Slovak,
                    DocumentLanguages.English,
                ],
            }),
        );

        // "MJ" in Slovak, "Unit" in English — but VAT % differs only by case.
        expect(model.items.headers[3]).toEqual(['MJ', 'Unit']);
    });

    it('prints the unit in each selected language', () => {
        const model = buildInvoiceDocument(
            buildInvoice({
                languages: [
                    DocumentLanguages.Slovak,
                    DocumentLanguages.English,
                ],
            }),
        );

        expect(model.items.rows[0]).toContain('hod / hrs');
    });

    it('falls back to a translated unit the document does not select', () => {
        const invoice = buildInvoice({
            languages: [DocumentLanguages.Ukrainian],
        });
        const model = buildInvoiceDocument(invoice);

        // Nothing entered for Ukrainian, so a filled language stands in
        // rather than printing an empty cell.
        expect(model.items.rows[0]).toContain('hod');
    });

    it('drops the VAT columns when no line carries VAT', () => {
        const model = buildInvoiceDocument(buildInvoice());

        expect(model.items.headers).toHaveLength(6);
        expect(model.items.headers.join(' ')).not.toContain('DPH %');
        expect(model.items.widths).toHaveLength(6);
        expect(model.summary).toHaveLength(1);
    });

    it('adds the VAT columns as soon as a line is taxed', () => {
        const invoice = buildInvoice();
        const items = invoice.items.map(item => ({ ...item, vatRate: 23 }));
        const model = buildInvoiceDocument({
            ...invoice,
            items,
            totals: calculateInvoiceTotals(items),
        });

        expect(model.items.headers).toHaveLength(8);
        expect(model.items.widths).toHaveLength(8);
        expect(model.items.aligns).toHaveLength(8);
        expect(model.summary).toHaveLength(3);
    });

    it('formats amounts, dates and the amount in words', () => {
        const model = buildInvoiceDocument(buildInvoice());

        expect(model.totalDue.value).toBe('1 260,00\u00A0EUR');
        expect(model.dates.map(field => field.value)).toContain('24.08.2026');
        // One entry per language, each carrying that language's own label.
        expect(model.amountInWords).toEqual([
            { label: 'Slovom', value: 'tisícdvestošesťdesiat eur' },
            {
                label: 'In words',
                value: 'one thousand two hundred and sixty euro',
            },
        ]);
    });

    it('renders a single language on request', () => {
        const model = buildInvoiceDocument(
            buildInvoice({ languages: [DocumentLanguages.English] }),
        );

        expect(model.title).toBe('Invoice');
        expect(model.supplier.heading).toBe('Supplier');
        expect(model.items.rows[0]).toContain('Software development services');
        expect(model.totalDue.value).toBe('1,260.00\u00A0EUR');
    });

    it('uses the Slovak line description for Slovak documents', () => {
        const model = buildInvoiceDocument(
            buildInvoice({ languages: [DocumentLanguages.Slovak] }),
        );

        expect(model.items.rows[0]).toContain('Vývoj softvéru');
    });

    it('keeps the bank details and payment symbols on the document', () => {
        const model = buildInvoiceDocument(buildInvoice());
        const values = model.payment.map(field => field.value);

        expect(values).toContain('SK24 9999 0000 0000 0000 1234');
        expect(values).toContain('TESTSKBX');
        expect(values).toContain('20260009');
    });
});

describe('field labels', () => {
    it('keeps the field grids on one slash-joined line', () => {
        const model = buildInvoiceDocument(buildInvoice());
        const bank = model.payment.find(field => field.label.includes('Banka'));

        // Only the totals stack; these labels wrap instead, so the value
        // column beside them stays wide enough for an IBAN.
        expect(bank?.label).toBe('Banka / Bank');
    });

    it('spells SWIFT the same in every language', () => {
        const model = buildInvoiceDocument(buildInvoice());
        const swift = model.payment.find(field =>
            field.label.includes('SWIFT'),
        );

        // "SWIFT / SWIFT / BIC" otherwise, which reads as two labels.
        expect(swift?.label).toBe('SWIFT');
    });
});
