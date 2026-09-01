import type { LanguageRecord } from '@/features/invoices/constants/DocumentLanguages';

/**
 * Currencies an invoice can be issued in, keyed by ISO 4217 code.
 */
export const Currencies = {
    Eur: 'EUR',
    Usd: 'USD',
    Czk: 'CZK',
    Gbp: 'GBP',
} as const;

export type CurrencyType = (typeof Currencies)[keyof typeof Currencies];

/**
 * Grammatical forms of a currency unit, selected by count.
 *
 * The three slots follow CLDR plural categories: `one`, `few` and everything
 * else. Which count maps to which slot differs per language and is decided by
 * `Intl.PluralRules`, not here.
 */
export interface CurrencyUnitForms {
    one: string;
    few: string;
    many: string;
    /**
     * Whether the noun is feminine, so "one" and "two" agree with it —
     * Slovak "jedna koruna", Ukrainian "дві крони".
     */
    feminine?: boolean;
}

export interface CurrencyWording {
    major: CurrencyUnitForms;
    minor: CurrencyUnitForms;
}

/**
 * Names of the main and minor unit of each currency, used when spelling the
 * invoice total out in words.
 */
export const CurrencyWords: Record<
    CurrencyType,
    LanguageRecord<CurrencyWording>
> = {
    EUR: {
        en: {
            major: { one: 'euro', few: 'euro', many: 'euro' },
            minor: { one: 'cent', few: 'cents', many: 'cents' },
        },
        sk: {
            major: { one: 'euro', few: 'eurá', many: 'eur' },
            minor: { one: 'cent', few: 'centy', many: 'centov' },
        },
        uk: {
            major: { one: 'євро', few: 'євро', many: 'євро' },
            minor: { one: 'цент', few: 'центи', many: 'центів' },
        },
    },
    USD: {
        en: {
            major: { one: 'dollar', few: 'dollars', many: 'dollars' },
            minor: { one: 'cent', few: 'cents', many: 'cents' },
        },
        sk: {
            major: { one: 'dolár', few: 'doláre', many: 'dolárov' },
            minor: { one: 'cent', few: 'centy', many: 'centov' },
        },
        uk: {
            major: { one: 'долар', few: 'долари', many: 'доларів' },
            minor: { one: 'цент', few: 'центи', many: 'центів' },
        },
    },
    CZK: {
        en: {
            major: { one: 'koruna', few: 'korunas', many: 'korunas' },
            minor: { one: 'heller', few: 'hellers', many: 'hellers' },
        },
        sk: {
            major: {
                one: 'koruna',
                few: 'koruny',
                many: 'korún',
                feminine: true,
            },
            minor: { one: 'halier', few: 'haliere', many: 'halierov' },
        },
        uk: {
            major: {
                one: 'крона',
                few: 'крони',
                many: 'крон',
                feminine: true,
            },
            minor: { one: 'гелер', few: 'гелери', many: 'гелерів' },
        },
    },
    GBP: {
        en: {
            major: { one: 'pound', few: 'pounds', many: 'pounds' },
            minor: { one: 'penny', few: 'pence', many: 'pence' },
        },
        sk: {
            major: {
                one: 'libra',
                few: 'libry',
                many: 'libier',
                feminine: true,
            },
            minor: { one: 'penny', few: 'pence', many: 'pencí' },
        },
        uk: {
            major: {
                one: 'фунт',
                few: 'фунти',
                many: 'фунтів',
            },
            minor: { one: 'пенс', few: 'пенси', many: 'пенсів' },
        },
    },
};
