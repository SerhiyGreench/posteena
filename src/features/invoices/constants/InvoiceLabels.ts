import type { LanguageRecord } from '@/features/invoices/constants/DocumentLanguages';

/**
 * Every label printed on a generated invoice, in each supported language.
 *
 * The document renderers never hardcode a string: they resolve a key through
 * `resolveInvoiceLabel`, which joins the variants of the selected languages
 * ("Dodávateľ / Supplier"). Adding a language to `DocumentLanguages` makes
 * this table fail to compile until every entry is translated.
 */
export const InvoiceLabels = {
    invoice: { sk: 'Faktúra', en: 'Invoice', uk: 'Рахунок-фактура' },
    invoiceNumber: {
        sk: 'Faktúra číslo',
        en: 'Invoice number',
        uk: 'Номер рахунка',
    },

    supplier: { sk: 'Dodávateľ', en: 'Supplier', uk: 'Постачальник' },
    customer: { sk: 'Odberateľ', en: 'Customer', uk: 'Замовник' },

    registrationNumber: {
        sk: 'IČO',
        en: 'Company ID',
        uk: 'Код ЄДРПОУ',
    },
    taxNumber: { sk: 'DIČ', en: 'Tax number', uk: 'Податковий номер' },
    vatNumber: { sk: 'IČ DPH', en: 'VAT ID', uk: 'Номер ПДВ' },
    commercialRegister: {
        sk: 'Obchodný register',
        en: 'Commercial register',
        uk: 'Комерційний реєстр',
    },
    incomeTaxRegistration: {
        sk: 'Registrácia dane z príjmov',
        en: 'Income tax registration',
        uk: 'Реєстрація податку на прибуток',
    },
    notVatRegistered: {
        sk: 'Nie je platiteľom DPH',
        en: 'Not registered for VAT',
        uk: 'Не є платником ПДВ',
    },
    email: { sk: 'E-mail', en: 'E-mail', uk: 'Ел. пошта' },
    phone: { sk: 'Telefón', en: 'Phone', uk: 'Телефон' },

    bank: { sk: 'Banka', en: 'Bank', uk: 'Банк' },
    accountNumber: {
        sk: 'Číslo účtu',
        en: 'Account number',
        uk: 'Номер рахунку',
    },
    iban: { sk: 'IBAN', en: 'IBAN', uk: 'IBAN' },
    swift: { sk: 'SWIFT', en: 'SWIFT / BIC', uk: 'SWIFT / BIC' },

    issueDate: {
        sk: 'Dátum vyhotovenia',
        en: 'Issue date',
        uk: 'Дата виставлення',
    },
    supplyDate: {
        sk: 'Dátum dodania',
        en: 'Supply date',
        uk: 'Дата постачання',
    },
    dueDate: {
        sk: 'Dátum splatnosti',
        en: 'Due date',
        uk: 'Термін оплати',
    },
    paymentMethod: {
        sk: 'Forma úhrady',
        en: 'Payment method',
        uk: 'Спосіб оплати',
    },
    orderNumber: {
        sk: 'Objednávka číslo',
        en: 'Order number',
        uk: 'Номер замовлення',
    },

    bankTransfer: {
        sk: 'Prevodom',
        en: 'Bank transfer',
        uk: 'Банківський переказ',
    },
    cash: { sk: 'Hotovosť', en: 'Cash', uk: 'Готівка' },
    card: { sk: 'Platobnou kartou', en: 'Card', uk: 'Карткою' },

    variableSymbol: {
        sk: 'Variabilný symbol',
        en: 'Payment reference',
        uk: 'Призначення платежу',
    },
    constantSymbol: {
        sk: 'Konštantný symbol',
        en: 'Constant symbol',
        uk: 'Постійний символ',
    },
    specificSymbol: {
        sk: 'Špecifický symbol',
        en: 'Specific symbol',
        uk: 'Специфічний символ',
    },

    itemsHeading: {
        sk: 'Fakturujeme Vám za',
        en: 'We are invoicing you for',
        uk: 'Виставляємо рахунок за',
    },
    lineNumber: { sk: 'P.č.', en: 'No.', uk: '№' },
    description: { sk: 'Popis', en: 'Description', uk: 'Опис' },
    quantity: { sk: 'Množstvo', en: 'Qty', uk: 'К-сть' },
    unit: { sk: 'MJ', en: 'Unit', uk: 'Од.' },
    unitPrice: {
        sk: 'Cena za MJ',
        en: 'Price per unit',
        uk: 'Ціна за од.',
    },
    lineNet: {
        sk: 'Spolu bez DPH',
        en: 'Total excl. VAT',
        uk: 'Разом без ПДВ',
    },
    vatRate: { sk: 'DPH %', en: 'VAT %', uk: 'ПДВ %' },
    lineGross: {
        sk: 'Celková cena',
        en: 'Total incl. VAT',
        uk: 'Разом з ПДВ',
    },

    subtotal: {
        sk: 'Celková suma bez DPH',
        en: 'Total amount excl. VAT',
        uk: 'Загальна сума без ПДВ',
    },
    totalVat: { sk: 'DPH celkom', en: 'VAT', uk: 'ПДВ разом' },
    totalGross: {
        sk: 'Celková suma s DPH',
        en: 'Total amount incl. VAT',
        uk: 'Загальна сума з ПДВ',
    },
    paidInAdvance: {
        sk: 'Uhradené vopred',
        en: 'Paid in advance',
        uk: 'Сплачено авансом',
    },
    totalDue: { sk: 'Celkom na úhradu', en: 'Total due', uk: 'До сплати' },
    amountInWords: { sk: 'Slovom', en: 'In words', uk: 'Словами' },

    page: { sk: 'Strana', en: 'Page', uk: 'Сторінка' },
} as const satisfies Record<string, LanguageRecord<string>>;

export type InvoiceLabelKeyType = keyof typeof InvoiceLabels;
