import type { LanguageRecord } from '@/features/invoices/constants/DocumentLanguages';

/**
 * Official (long-form) state names, which `Intl` does not provide.
 *
 * `Intl.DisplayNames` only ever returns the *common* name — "Slovakia",
 * "Slovensko", "Словаччина" — in every style, and CLDR's variant forms are not
 * reachable through it. Contracts and invoices often want the formal name
 * instead, so the ones we care about are listed here.
 *
 * Any country not listed falls back to the common name from `Intl`, so this
 * table only ever needs the entries you actually invoice across. Adding one is
 * a single line.
 */
export const OfficialCountryNames: Record<string, LanguageRecord<string>> = {
    AT: {
        en: 'Republic of Austria',
        sk: 'Rakúska republika',
        uk: 'Австрійська Республіка',
    },
    CH: {
        en: 'Swiss Confederation',
        sk: 'Švajčiarska konfederácia',
        uk: 'Швейцарська Конфедерація',
    },
    CY: {
        en: 'Republic of Cyprus',
        sk: 'Cyperská republika',
        uk: 'Республіка Кіпр',
    },
    CZ: {
        en: 'Czech Republic',
        sk: 'Česká republika',
        uk: 'Чеська Республіка',
    },
    DE: {
        en: 'Federal Republic of Germany',
        sk: 'Spolková republika Nemecko',
        uk: 'Федеративна Республіка Німеччина',
    },
    EE: {
        en: 'Republic of Estonia',
        sk: 'Estónska republika',
        uk: 'Естонська Республіка',
    },
    ES: {
        en: 'Kingdom of Spain',
        sk: 'Španielske kráľovstvo',
        uk: 'Королівство Іспанія',
    },
    FR: {
        en: 'French Republic',
        sk: 'Francúzska republika',
        uk: 'Французька Республіка',
    },
    GB: {
        en: 'United Kingdom of Great Britain and Northern Ireland',
        sk: 'Spojené kráľovstvo Veľkej Británie a Severného Írska',
        uk: 'Сполучене Королівство Великої Британії та Північної Ірландії',
    },
    IE: { en: 'Ireland', sk: 'Írsko', uk: 'Ірландія' },
    IT: {
        en: 'Italian Republic',
        sk: 'Talianska republika',
        uk: 'Італійська Республіка',
    },
    NL: {
        en: 'Kingdom of the Netherlands',
        sk: 'Holandské kráľovstvo',
        uk: 'Королівство Нідерландів',
    },
    PL: {
        en: 'Republic of Poland',
        sk: 'Poľská republika',
        uk: 'Республіка Польща',
    },
    SK: {
        en: 'Slovak Republic',
        sk: 'Slovenská republika',
        uk: 'Словацька Республіка',
    },
    UA: { en: 'Ukraine', sk: 'Ukrajina', uk: 'Україна' },
    US: {
        en: 'United States of America',
        sk: 'Spojené štáty americké',
        uk: 'Сполучені Штати Америки',
    },
};
