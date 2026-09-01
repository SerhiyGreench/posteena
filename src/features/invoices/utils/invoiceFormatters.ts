import { format, parseISO } from 'date-fns';

import {
    type DocumentLanguageType,
    DocumentLocales,
} from '@/features/invoices/constants/DocumentLanguages';

/** Both scanned reference invoices use this format, in either language. */
const DateFormat = 'dd.MM.yyyy';

/**
 * Number formatting follows the first selected language, so a Slovak-first
 * document reads "2 097,25" and an English-first one "2,097.25".
 */
function resolveLocale(languages: DocumentLanguageType[]): string {
    return DocumentLocales[languages[0]] ?? DocumentLocales.en;
}

/**
 * `Intl` emits narrow no-break spaces as group separators, which some PDF and
 * DOCX consumers render as a missing glyph. Normalise them to a plain no-break
 * space, which every font in use covers.
 */
function normaliseSpaces(value: string): string {
    return value.replace(/[\u202F\u2009]/g, '\u00A0');
}

/**
 * Formats a monetary amount with exactly two decimals, without a currency
 * symbol — the currency code is printed separately on the document.
 */
export function formatInvoiceMoney(
    value: number,
    languages: DocumentLanguageType[],
): string {
    const formatted = new Intl.NumberFormat(resolveLocale(languages), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);

    return normaliseSpaces(formatted);
}

/**
 * Formats a line item quantity, dropping trailing zeros for whole numbers.
 */
export function formatInvoiceQuantity(
    value: number,
    languages: DocumentLanguageType[],
): string {
    const formatted = new Intl.NumberFormat(resolveLocale(languages), {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 3,
    }).format(value);

    return normaliseSpaces(formatted);
}

/**
 * Formats an ISO date (yyyy-MM-dd) for printing. Returns an empty string for
 * missing or unparseable input so the renderers never show "Invalid Date".
 */
export function formatInvoiceDate(isoDate: string): string {
    if (!isoDate) {
        return '';
    }

    try {
        return format(parseISO(isoDate), DateFormat);
    } catch {
        return isoDate;
    }
}

/**
 * Rounds to whole cents. Applied after every multiplication so the printed
 * line totals always add up to the printed grand total.
 */
export function roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
