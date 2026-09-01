import {
    type CurrencyType,
    type CurrencyUnitForms,
    CurrencyWords,
} from '@/features/invoices/constants/Currencies';
import {
    type DocumentLanguageType,
    DocumentLocales,
    type LanguageRecord,
} from '@/features/invoices/constants/DocumentLanguages';

/** Spells a non-negative integer; `feminine` makes 1 and 2 agree with the noun. */
type NumberSpeller = (value: number, feminine: boolean) => string;

const pluralRules = new Map<string, Intl.PluralRules>();

/**
 * Picks a grammatical form using the language's own plural rule.
 *
 * The rules genuinely differ: Slovak puts 21 in the "other" bucket while
 * Ukrainian puts it back in "one" (21 гривня), and hardcoding either would be
 * wrong for the other.
 */
function pickForm(
    count: number,
    forms: CurrencyUnitForms,
    language: DocumentLanguageType,
): string {
    const locale = DocumentLocales[language];
    let rules = pluralRules.get(locale);

    if (!rules) {
        rules = new Intl.PluralRules(locale);
        pluralRules.set(locale, rules);
    }

    const category = rules.select(count);

    if (category === 'one') {
        return forms.one;
    }

    if (category === 'few') {
        return forms.few;
    }

    return forms.many;
}

const EnglishOnes = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
];
const EnglishTens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
];
const EnglishScales = ['', 'thousand', 'million', 'billion'];

/** Spells 1–999 in English, e.g. 123 -> "one hundred and twenty-three". */
function englishUnderThousand(value: number): string {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    const parts: string[] = [];

    if (hundreds > 0) {
        parts.push(`${EnglishOnes[hundreds]} hundred`);
    }

    if (rest > 0) {
        if (hundreds > 0) {
            parts.push('and');
        }

        if (rest < 20) {
            parts.push(EnglishOnes[rest]);
        } else {
            const tens = Math.floor(rest / 10);
            const ones = rest % 10;

            parts.push(
                ones > 0
                    ? `${EnglishTens[tens]}-${EnglishOnes[ones]}`
                    : EnglishTens[tens],
            );
        }
    }

    return parts.join(' ');
}

export function integerToEnglishWords(value: number): string {
    if (value === 0) {
        return 'zero';
    }

    const groups: number[] = [];
    let remaining = value;

    while (remaining > 0) {
        groups.push(remaining % 1000);
        remaining = Math.floor(remaining / 1000);
    }

    const chunks: string[] = [];

    for (let index = groups.length - 1; index >= 0; index -= 1) {
        const group = groups[index];

        if (group === 0) {
            continue;
        }

        const scale = EnglishScales[index];

        chunks.push(
            scale
                ? `${englishUnderThousand(group)} ${scale}`
                : englishUnderThousand(group),
        );
    }

    const lastGroup = groups[0];

    // British invoice convention: "two thousand and ninety-seven".
    if (chunks.length > 1 && lastGroup > 0 && lastGroup < 100) {
        const tail = chunks.pop() as string;

        return `${chunks.join(' ')} and ${tail}`;
    }

    return chunks.join(' ');
}

const SlovakOnes = [
    '',
    'jeden',
    'dva',
    'tri',
    'štyri',
    'päť',
    'šesť',
    'sedem',
    'osem',
    'deväť',
];
const SlovakOnesFeminine = ['', 'jedna', 'dve'];
const SlovakTeens = [
    'desať',
    'jedenásť',
    'dvanásť',
    'trinásť',
    'štrnásť',
    'pätnásť',
    'šestnásť',
    'sedemnásť',
    'osemnásť',
    'devätnásť',
];
const SlovakTens = [
    '',
    '',
    'dvadsať',
    'tridsať',
    'štyridsať',
    'päťdesiat',
    'šesťdesiat',
    'sedemdesiat',
    'osemdesiat',
    'deväťdesiat',
];
const SlovakHundreds = [
    '',
    'sto',
    'dvesto',
    'tristo',
    'štyristo',
    'päťsto',
    'šesťsto',
    'sedemsto',
    'osemsto',
    'deväťsto',
];
const SlovakMillion: CurrencyUnitForms = {
    one: 'milión',
    few: 'milióny',
    many: 'miliónov',
};

/** Spells 1–999 in Slovak as a single word, e.g. 123 -> "stodvadsaťtri". */
function slovakUnderThousand(value: number, feminine = false): string {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    let result = SlovakHundreds[hundreds];

    if (rest === 0) {
        return result;
    }

    const ones = (digit: number): string =>
        (feminine && SlovakOnesFeminine[digit]) || SlovakOnes[digit];

    if (rest < 10) {
        result += ones(rest);
    } else if (rest < 20) {
        result += SlovakTeens[rest - 10];
    } else {
        result += SlovakTens[Math.floor(rest / 10)];
        result += ones(rest % 10);
    }

    return result;
}

/**
 * Spells a non-negative integer in Slovak.
 *
 * Slovak writes numbers below a million as a single word
 * ("dvetisícdeväťdesiatsedem"), while "milión" stays a separate noun that
 * agrees with its count ("dva milióny").
 */
export function integerToSlovakWords(value: number, feminine = false): string {
    if (value === 0) {
        return 'nula';
    }

    const millions = Math.floor(value / 1_000_000);
    const belowMillion = value % 1_000_000;
    const thousands = Math.floor(belowMillion / 1000);
    const rest = belowMillion % 1000;
    const parts: string[] = [];

    if (millions > 0) {
        const spelled =
            millions === 1 ? '' : `${slovakUnderThousand(millions)} `;

        parts.push(`${spelled}${pickForm(millions, SlovakMillion, 'sk')}`);
    }

    let word = '';

    if (thousands > 0) {
        // "tisíc" alone for exactly one thousand, and a feminine "dve" before it.
        word +=
            thousands === 1
                ? 'tisíc'
                : `${slovakUnderThousand(thousands, true)}tisíc`;
    }

    if (rest > 0) {
        word += slovakUnderThousand(rest, feminine);
    }

    if (word) {
        parts.push(word);
    }

    return parts.join(' ');
}

const UkrainianOnes = [
    '',
    'один',
    'два',
    'три',
    'чотири',
    "п'ять",
    'шість',
    'сім',
    'вісім',
    "дев'ять",
];
const UkrainianOnesFeminine = ['', 'одна', 'дві'];
const UkrainianTeens = [
    'десять',
    'одинадцять',
    'дванадцять',
    'тринадцять',
    'чотирнадцять',
    "п'ятнадцять",
    'шістнадцять',
    'сімнадцять',
    'вісімнадцять',
    "дев'ятнадцять",
];
const UkrainianTens = [
    '',
    '',
    'двадцять',
    'тридцять',
    'сорок',
    "п'ятдесят",
    'шістдесят',
    'сімдесят',
    'вісімдесят',
    "дев'яносто",
];
const UkrainianHundreds = [
    '',
    'сто',
    'двісті',
    'триста',
    'чотириста',
    "п'ятсот",
    'шістсот',
    'сімсот',
    'вісімсот',
    "дев'ятсот",
];
const UkrainianThousand: CurrencyUnitForms = {
    one: 'тисяча',
    few: 'тисячі',
    many: 'тисяч',
};
const UkrainianMillion: CurrencyUnitForms = {
    one: 'мільйон',
    few: 'мільйони',
    many: 'мільйонів',
};

/** Spells 1–999 in Ukrainian as separate words. */
function ukrainianUnderThousand(value: number, feminine = false): string[] {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    const parts: string[] = [];

    if (hundreds > 0) {
        parts.push(UkrainianHundreds[hundreds]);
    }

    const ones = (digit: number): string =>
        (feminine && UkrainianOnesFeminine[digit]) || UkrainianOnes[digit];

    if (rest >= 20 || rest === 0) {
        if (rest >= 20) {
            parts.push(UkrainianTens[Math.floor(rest / 10)]);
        }

        if (rest % 10 > 0) {
            parts.push(ones(rest % 10));
        }
    } else if (rest < 10) {
        parts.push(ones(rest));
    } else {
        parts.push(UkrainianTeens[rest - 10]);
    }

    return parts.filter(Boolean);
}

/**
 * Spells a non-negative integer in Ukrainian.
 *
 * Unlike Slovak, Ukrainian keeps the parts as separate words, and "тисяча" is
 * feminine, so 2000 is "дві тисячі" rather than "два тисячі".
 */
export function integerToUkrainianWords(
    value: number,
    feminine = false,
): string {
    if (value === 0) {
        return 'нуль';
    }

    const millions = Math.floor(value / 1_000_000);
    const belowMillion = value % 1_000_000;
    const thousands = Math.floor(belowMillion / 1000);
    const rest = belowMillion % 1000;
    const parts: string[] = [];

    if (millions > 0) {
        parts.push(
            ...ukrainianUnderThousand(millions),
            pickForm(millions, UkrainianMillion, 'uk'),
        );
    }

    if (thousands > 0) {
        parts.push(
            ...ukrainianUnderThousand(thousands, true),
            pickForm(thousands, UkrainianThousand, 'uk'),
        );
    }

    if (rest > 0) {
        parts.push(...ukrainianUnderThousand(rest, feminine));
    }

    return parts.join(' ');
}

/** One speller per language; adding a language means adding an entry here. */
const spellers: LanguageRecord<NumberSpeller> = {
    en: value => integerToEnglishWords(value),
    sk: (value, feminine) => integerToSlovakWords(value, feminine),
    uk: (value, feminine) => integerToUkrainianWords(value, feminine),
};

/** Words joining the major and minor amount, e.g. "… euro and 25 cents". */
const AndWord: LanguageRecord<string> = { en: 'and', sk: 'a', uk: 'і' };

/** Spells an amount in one language. */
function spellAmount(
    amount: number,
    currency: CurrencyType,
    language: DocumentLanguageType,
): string {
    const major = Math.floor(amount);
    const minor = Math.round((amount - major) * 100);
    const words = CurrencyWords[currency][language];
    const spell = spellers[language];

    const majorWords = `${spell(major, words.major.feminine === true)} ${pickForm(major, words.major, language)}`;

    if (minor === 0) {
        return majorWords;
    }

    const minorWords = `${spell(minor, words.minor.feminine === true)} ${pickForm(minor, words.minor, language)}`;

    return `${majorWords} ${AndWord[language]} ${minorWords}`;
}

/**
 * Spells a monetary amount out in words, in every selected language.
 *
 * Multi-language documents print the variants joined by a slash, matching how
 * the rest of the document is laid out.
 */
export function amountToWords(
    amount: number,
    currency: CurrencyType,
    languages: DocumentLanguageType[],
): string {
    const safeAmount = Math.max(0, amount);

    return languages
        .map(language => spellAmount(safeAmount, currency, language))
        .join(' / ');
}
