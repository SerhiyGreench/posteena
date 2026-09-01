import type { DocumentLanguageType } from '@/features/invoices/constants/DocumentLanguages';
import {
    type InvoiceLabelKeyType,
    InvoiceLabels,
} from '@/features/invoices/constants/InvoiceLabels';

/** Distinct, non-empty variants, in the order the languages were selected. */
function distinctVariants(variants: string[]): string[] {
    return [...new Set(variants.filter(variant => variant.trim()))];
}

function joinVariants(variants: string[]): string {
    return distinctVariants(variants).join(' / ');
}

/**
 * A label as one line per language rather than joined with a slash.
 *
 * Column headings stack their translations instead of running them together,
 * which keeps a narrow column readable — "Spolu bez DPH / Total excl. VAT"
 * fits nowhere, the same words on three lines fit fine.
 */
export function resolveInvoiceLabelLines(
    key: InvoiceLabelKeyType,
    languages: DocumentLanguageType[],
): string[] {
    return distinctVariants(
        languages.map(language => InvoiceLabels[key][language]),
    );
}

/**
 * Resolves a document label for the selected languages.
 *
 * Variants are joined with a slash, collapsing to one value when the languages
 * happen to spell it the same (IBAN, E-mail).
 */
export function resolveInvoiceLabel(
    key: InvoiceLabelKeyType,
    languages: DocumentLanguageType[],
): string {
    return joinVariants(
        languages.map(language => InvoiceLabels[key][language]),
    );
}

/**
 * Joins free text the user maintains per language, the same way labels are
 * joined. A language with no text falls back to the first one that has any,
 * so a half-translated line item still prints.
 */
export function resolveInvoiceText(
    values: Partial<Record<DocumentLanguageType, string>>,
    languages: DocumentLanguageType[],
): string {
    const written = languages
        .map(language => values[language]?.trim() ?? '')
        .filter(Boolean);

    if (written.length > 0) {
        return joinVariants(written);
    }

    const fallback = Object.values(values).find(value => value?.trim());

    return fallback?.trim() ?? '';
}
