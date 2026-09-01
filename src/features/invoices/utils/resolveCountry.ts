import {
    type DocumentLanguageType,
    DocumentLocales,
} from '@/features/invoices/constants/DocumentLanguages';
import { OfficialCountryNames } from '@/features/invoices/constants/OfficialCountryNames';

const AlphabetSize = 26;
const CharCodeA = 65;

let cachedCodes: string[] | null = null;
const nameCache = new Map<string, string>();

/** `Intl.DisplayNames` for a language, created once per language. */
const displayNames = new Map<string, Intl.DisplayNames>();

function regionNames(language: DocumentLanguageType): Intl.DisplayNames {
    const locale = DocumentLocales[language];
    const existing = displayNames.get(locale);

    if (existing) {
        return existing;
    }

    const created = new Intl.DisplayNames([locale], {
        type: 'region',
        fallback: 'code',
    });

    displayNames.set(locale, created);

    return created;
}

/**
 * Every ISO 3166-1 alpha-2 code the runtime actually knows a name for.
 *
 * `Intl.supportedValuesOf` does not cover regions, so the 676 possible
 * two-letter codes are probed instead: a code the runtime cannot name comes
 * back unchanged and is discarded. Computed once and cached.
 */
export function listCountryCodes(): string[] {
    if (cachedCodes) {
        return cachedCodes;
    }

    const english = regionNames('en');
    const codes: string[] = [];

    for (let first = 0; first < AlphabetSize; first += 1) {
        for (let second = 0; second < AlphabetSize; second += 1) {
            const code =
                String.fromCharCode(CharCodeA + first) +
                String.fromCharCode(CharCodeA + second);

            if (english.of(code) !== code) {
                codes.push(code);
            }
        }
    }

    cachedCodes = codes;

    return codes;
}

/**
 * The country name in one language, e.g. `SK` -> "Slovensko" in Slovak.
 * Returns an empty string for an unset code.
 */
export function resolveCountryName(
    code: string,
    language: DocumentLanguageType,
    official = false,
): string {
    if (!code) {
        return '';
    }

    if (official) {
        const formal = OfficialCountryNames[code]?.[language];

        if (formal) {
            return formal;
        }
    }

    const key = `${language}:${code}`;
    const cached = nameCache.get(key);

    if (cached !== undefined) {
        return cached;
    }

    const name = regionNames(language).of(code) ?? code;

    nameCache.set(key, name);

    return name;
}

/**
 * The country as printed on a document, joining the selected languages and
 * collapsing duplicates ("Slovensko / Slovakia", but just "Cyprus" when every
 * language spells it the same).
 *
 * `fallback` covers records saved before countries were picked from a list.
 */
export function resolveCountryLabel(
    code: string,
    languages: DocumentLanguageType[],
    fallback = '',
    official = false,
): string {
    if (!code) {
        return fallback;
    }

    const names = languages.map(language =>
        resolveCountryName(code, language, official),
    );

    return [...new Set(names.filter(Boolean))].join(' / ') || fallback;
}

/** Country options for a picker, sorted by name in the given language. */
export function listCountryOptions(
    language: DocumentLanguageType,
): { value: string; label: string }[] {
    const locale = DocumentLocales[language];

    return listCountryCodes()
        .map(code => ({
            value: code,
            label: resolveCountryName(code, language),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, locale));
}
