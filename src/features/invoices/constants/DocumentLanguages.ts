/**
 * Languages an invoice document can be printed in.
 *
 * A document carries a *list* of these: selecting Slovak and English prints
 * every label as "Dodávateľ / Supplier". To add a language, add it here and
 * TypeScript will flag every label and currency that still needs translating.
 */
export const DocumentLanguages = {
    Slovak: 'sk',
    English: 'en',
    Ukrainian: 'uk',
} as const;

export type DocumentLanguageType =
    (typeof DocumentLanguages)[keyof typeof DocumentLanguages];

/** Display order used by the language picker and on the document. */
export const DocumentLanguageOrder: DocumentLanguageType[] = [
    DocumentLanguages.Slovak,
    DocumentLanguages.English,
    DocumentLanguages.Ukrainian,
];

/**
 * Every label and currency name must cover every language, so a new entry in
 * `DocumentLanguages` fails to compile until it is fully translated.
 */
export type LanguageRecord<T> = Record<DocumentLanguageType, T>;

/** BCP 47 tag used for `Intl` number, date and region formatting. */
export const DocumentLocales: LanguageRecord<string> = {
    sk: 'sk-SK',
    en: 'en-GB',
    uk: 'uk-UA',
};
