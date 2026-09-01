import { describe, expect, it } from 'vitest';

import { Currencies } from '@/features/invoices/constants/Currencies';
import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import { DocumentLanguages } from '@/features/invoices/constants/DocumentLanguages';
import type {
    InvoiceLineItem,
    InvoiceNumbering,
    InvoiceSettings,
} from '@/features/invoices/types';
import { amountToWords } from '@/features/invoices/utils/amountToWords';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createDefaultLineItems,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';
import {
    formatInvoiceNumber,
    peekNextInvoiceNumber,
} from '@/features/invoices/utils/formatInvoiceNumber';
import {
    resolveDriveFolderSegments,
    sanitiseDriveName,
} from '@/features/invoices/utils/resolveDriveTarget';
import { resolveInvoiceLabel } from '@/features/invoices/utils/resolveInvoiceLabel';

function item(overrides: Partial<InvoiceLineItem> = {}): InvoiceLineItem {
    return {
        id: 'item',
        descriptions: { en: 'Service', sk: 'Služba' },
        quantity: 1,
        units: { sk: 'ks', en: 'pcs' },
        unitPrice: 100,
        vatRate: 0,
        ...overrides,
    };
}

describe('calculateInvoiceTotals', () => {
    it('sums lines without VAT', () => {
        const totals = calculateInvoiceTotals([
            item({ id: 'a', quantity: 42, unitPrice: 30 }),
        ]);

        expect(totals.subtotal).toBe(1260);
        expect(totals.vatAmount).toBe(0);
        expect(totals.total).toBe(1260);
        expect(totals.amountDue).toBe(1260);
    });

    it('applies VAT per line and rounds to cents', () => {
        const totals = calculateInvoiceTotals([
            item({ id: 'a', quantity: 3, unitPrice: 33.33, vatRate: 20 }),
        ]);

        expect(totals.subtotal).toBe(99.99);
        expect(totals.vatAmount).toBe(20);
        expect(totals.total).toBe(119.99);
    });

    it('subtracts an advance payment', () => {
        const totals = calculateInvoiceTotals(
            [item({ unitPrice: 2097.25 })],
            97.25,
        );

        expect(totals.total).toBe(2097.25);
        expect(totals.amountDue).toBe(2000);
    });

    it('keeps line rounding so the parts add up to the whole', () => {
        const totals = calculateInvoiceTotals([
            item({ id: 'a', quantity: 1, unitPrice: 0.125 }),
            item({ id: 'b', quantity: 1, unitPrice: 0.125 }),
        ]);

        expect(totals.subtotal).toBe(0.26);
    });
});

describe('formatInvoiceNumber', () => {
    const date = new Date(2026, 8, 1);

    it('expands year and padded counter placeholders', () => {
        expect(formatInvoiceNumber('{YYYY}{NNNN}', 9, date)).toBe('20260009');
    });

    it('supports arbitrary literal text and separators', () => {
        expect(formatInvoiceNumber('FA-{YYYY}-{NNN}', 7, date)).toBe(
            'FA-2026-007',
        );
    });

    it('expands month, day and two digit year', () => {
        expect(formatInvoiceNumber('{YY}{MM}{DD}-{N}', 3, date)).toBe(
            '260901-3',
        );
    });
});

describe('peekNextInvoiceNumber', () => {
    const numbering: InvoiceNumbering = {
        pattern: '{YYYY}{NNNN}',
        nextSequence: 9,
        resetYearly: true,
        currentPeriod: '2026',
    };

    it('continues the sequence within the same period', () => {
        const result = peekNextInvoiceNumber(numbering, new Date(2026, 8, 1));

        expect(result.number).toBe('20260009');
        expect(result.sequence).toBe(9);
        expect(result.nextNumbering.nextSequence).toBe(10);
    });

    it('restarts the counter in a new year', () => {
        const result = peekNextInvoiceNumber(numbering, new Date(2027, 0, 4));

        expect(result.number).toBe('20270001');
        expect(result.nextNumbering.currentPeriod).toBe('2027');
        expect(result.nextNumbering.nextSequence).toBe(2);
    });

    it('never restarts when yearly reset is off', () => {
        const result = peekNextInvoiceNumber(
            { ...numbering, resetYearly: false, currentPeriod: 'all' },
            new Date(2027, 0, 4),
        );

        expect(result.sequence).toBe(9);
        expect(result.nextNumbering.currentPeriod).toBe('all');
    });

    it('does not mutate the numbering it was given', () => {
        peekNextInvoiceNumber(numbering, new Date(2027, 0, 4));

        expect(numbering.nextSequence).toBe(9);
        expect(numbering.currentPeriod).toBe('2026');
    });
});

describe('amountToWords', () => {
    it('spells an amount in English', () => {
        expect(
            amountToWords(2097.25, Currencies.Eur, [DocumentLanguages.English]),
        ).toBe('two thousand and ninety-seven euro and twenty-five cents');
    });

    it('spells an amount in Slovak with the right unit form', () => {
        expect(
            amountToWords(2097.25, Currencies.Eur, [DocumentLanguages.Slovak]),
        ).toBe('dvetisícdeväťdesiatsedem eur a dvadsaťpäť centov');
    });

    it('uses the singular Slovak form for exactly one', () => {
        expect(
            amountToWords(1, Currencies.Eur, [DocumentLanguages.Slovak]),
        ).toBe('jeden euro');
    });

    it('uses the 2-4 Slovak form', () => {
        expect(
            amountToWords(3, Currencies.Eur, [DocumentLanguages.Slovak]),
        ).toBe('tri eurá');
    });

    it('omits cents when the amount is whole', () => {
        expect(
            amountToWords(1260, Currencies.Eur, [DocumentLanguages.English]),
        ).toBe('one thousand two hundred and sixty euro');
    });

    it('joins both languages for bilingual documents', () => {
        const words = amountToWords(5, Currencies.Eur, [
            DocumentLanguages.Slovak,
            DocumentLanguages.English,
        ]);

        expect(words).toBe('päť eur / five euro');
    });
});

describe('resolveInvoiceLabel', () => {
    it('joins Slovak and English for bilingual documents', () => {
        expect(
            resolveInvoiceLabel('supplier', [
                DocumentLanguages.Slovak,
                DocumentLanguages.English,
            ]),
        ).toBe('Dodávateľ / Supplier');
    });

    it('collapses labels that are identical in both languages', () => {
        expect(
            resolveInvoiceLabel('iban', [
                DocumentLanguages.Slovak,
                DocumentLanguages.English,
            ]),
        ).toBe('IBAN');
    });

    it('returns a single language when asked for one', () => {
        expect(
            resolveInvoiceLabel('customer', [DocumentLanguages.Slovak]),
        ).toBe('Odberateľ');
        expect(
            resolveInvoiceLabel('customer', [DocumentLanguages.English]),
        ).toBe('Customer');
    });
});

describe('resolveDriveTarget', () => {
    it('expands the year in a folder path', () => {
        expect(
            resolveDriveFolderSegments(
                'Posteena Invoices/{YYYY}',
                '2026-09-01',
            ),
        ).toEqual(['Posteena Invoices', '2026']);
    });

    it('drops empty segments from stray slashes', () => {
        expect(resolveDriveFolderSegments('/a//b/', '2026-09-01')).toEqual([
            'a',
            'b',
        ]);
    });

    it('strips characters that are awkward in file names', () => {
        expect(sanitiseDriveName('Zero/Evoke: Ltd?')).toBe('Zero-Evoke- Ltd');
    });
});

/**
 * Settings carrying a configured default line.
 *
 * The shipped defaults are deliberately empty, so a test about default items
 * has to bring its own rather than depend on seed content.
 */
function withDefaultItems(): InvoiceSettings {
    return {
        ...DefaultInvoiceSettings,
        defaults: {
            ...DefaultInvoiceSettings.defaults,
            items: [
                {
                    id: 'configured-line',
                    descriptions: { en: 'Consulting', sk: 'Poradenstvo' },
                    quantity: 1,
                    units: { en: 'hrs', sk: 'hod' },
                    unitPrice: 0,
                    vatRate: 0,
                },
            ],
        },
    };
}

describe('createDefaultLineItems', () => {
    it('copies the configured default items with fresh ids', () => {
        const settings = withDefaultItems();
        const configured = settings.defaults.items;
        const items = createDefaultLineItems(settings);

        expect(items).toHaveLength(configured.length);
        expect(items[0].descriptions).toEqual(configured[0].descriptions);
        // A shared id would let invoice edits write back into the settings.
        expect(items[0].id).not.toBe(configured[0].id);
    });

    it('falls back to one blank line when no defaults are configured', () => {
        const items = createDefaultLineItems({
            ...DefaultInvoiceSettings,
            defaults: { ...DefaultInvoiceSettings.defaults, items: [] },
        });

        expect(items).toHaveLength(1);
        expect(items[0].descriptions).toEqual({});
        expect(items[0].units).toEqual(DefaultInvoiceSettings.defaults.units);
    });

    it('starts a draft from the configured default items', () => {
        const settings = withDefaultItems();
        const draft = createInvoiceDraft(settings, null);

        expect(draft.items[0].descriptions).toEqual(
            settings.defaults.items[0].descriptions,
        );
    });
});

describe('amountToWords in Ukrainian', () => {
    const uk = [DocumentLanguages.Ukrainian];

    it('spells thousands with the feminine "тисяча"', () => {
        expect(amountToWords(2000, Currencies.Eur, uk)).toBe('дві тисячі євро');
    });

    it('spells an amount with cents', () => {
        expect(amountToWords(6500.25, Currencies.Eur, uk)).toBe(
            "шість тисяч п'ятсот євро і двадцять п'ять центів",
        );
    });

    it('uses the "one" form for 21, unlike Slovak', () => {
        // Ukrainian: 21 -> one (21 долар). Slovak: 21 -> other (21 dolárov).
        expect(amountToWords(21, Currencies.Usd, uk)).toBe(
            'двадцять один долар',
        );
        expect(
            amountToWords(21, Currencies.Usd, [DocumentLanguages.Slovak]),
        ).toBe('dvadsaťjeden dolárov');
    });

    it('uses the "many" form for the teens', () => {
        expect(amountToWords(11, Currencies.Usd, uk)).toBe(
            'одинадцять доларів',
        );
    });

    it('agrees with a feminine currency', () => {
        expect(amountToWords(2, Currencies.Czk, uk)).toBe('дві крони');
        expect(amountToWords(1, Currencies.Czk, uk)).toBe('одна крона');
    });

    it('joins every selected language', () => {
        expect(
            amountToWords(5, Currencies.Eur, [
                DocumentLanguages.Slovak,
                DocumentLanguages.English,
                DocumentLanguages.Ukrainian,
            ]),
        ).toBe("päť eur / five euro / п'ять євро");
    });
});
