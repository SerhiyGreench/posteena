import type { TFunction } from 'i18next';

import type { SelectFieldOption } from '@/features/invoices/components/InvoicesManager/SelectField';
import {
    Currencies,
    type CurrencyType,
} from '@/features/invoices/constants/Currencies';
import {
    type DocumentLanguageType,
    DocumentLanguageOrder,
    DocumentLocales,
} from '@/features/invoices/constants/DocumentLanguages';
import {
    type DueDateModeType,
    DueDateModes,
} from '@/features/invoices/constants/DueDateModes';
import {
    type EmailDeliveryModeType,
    EmailDeliveryModes,
} from '@/features/invoices/constants/EmailDeliveryModes';
import {
    type InvoiceDateAnchorType,
    InvoiceDateAnchors,
} from '@/features/invoices/constants/InvoiceDateAnchors';
import {
    type InvoiceSchedulePeriodType,
    InvoiceSchedulePeriods,
} from '@/features/invoices/constants/InvoiceSchedulePeriods';
import {
    type PaymentMethodType,
    PaymentMethods,
} from '@/features/invoices/constants/PaymentMethods';

/**
 * Dropdown option lists shared by the invoice editor and the settings panel,
 * so the two can never drift apart in wording or order.
 */

const paymentMethodKeys: Record<PaymentMethodType, string> = {
    [PaymentMethods.BankTransfer]: 'bankTransfer',
    [PaymentMethods.Cash]: 'cash',
    [PaymentMethods.Card]: 'card',
};

/**
 * Document languages, each labelled in its own language ("Slovenčina",
 * "English", "Українська") via `Intl` — no translation table to maintain.
 */
export function languageOptions(): SelectFieldOption<DocumentLanguageType>[] {
    return DocumentLanguageOrder.map(value => {
        const locale = DocumentLocales[value];
        const names = new Intl.DisplayNames([locale], { type: 'language' });
        const name = names.of(value) ?? value;

        return {
            value,
            label: name.charAt(0).toLocaleUpperCase(locale) + name.slice(1),
        };
    });
}

/** Language name per code, for labelling per-language fields. */
export const languageLabels: Record<string, string> = Object.fromEntries(
    languageOptions().map(option => [option.value, option.label]),
);

export function paymentMethodOptions(
    t: TFunction,
): SelectFieldOption<PaymentMethodType>[] {
    return Object.values(PaymentMethods).map(value => ({
        value,
        label: t(`invoices.paymentMethodOption.${paymentMethodKeys[value]}`),
    }));
}

/** Currency codes are the same in every language. */
export const currencyOptions: SelectFieldOption<CurrencyType>[] = Object.values(
    Currencies,
).map(value => ({ value, label: value }));

const schedulePeriodKeys: Record<InvoiceSchedulePeriodType, string> = {
    [InvoiceSchedulePeriods.None]: 'none',
    [InvoiceSchedulePeriods.Monthly]: 'monthly',
    [InvoiceSchedulePeriods.Quarterly]: 'quarterly',
};

const dateAnchorKeys: Record<InvoiceDateAnchorType, string> = {
    [InvoiceDateAnchors.Today]: 'today',
    [InvoiceDateAnchors.PeriodStart]: 'periodStart',
    [InvoiceDateAnchors.PeriodEnd]: 'periodEnd',
    [InvoiceDateAnchors.DayOfMonth]: 'dayOfMonth',
};

const dueDateModeKeys: Record<DueDateModeType, string> = {
    [DueDateModes.Days]: 'days',
    [DueDateModes.DayOfNextMonth]: 'dayOfNextMonth',
};

export function schedulePeriodOptions(
    t: TFunction,
): SelectFieldOption<InvoiceSchedulePeriodType>[] {
    return Object.values(InvoiceSchedulePeriods).map(value => ({
        value,
        label: t(`invoices.schedule.period.${schedulePeriodKeys[value]}`),
    }));
}

export function dateAnchorOptions(
    t: TFunction,
): SelectFieldOption<InvoiceDateAnchorType>[] {
    return Object.values(InvoiceDateAnchors).map(value => ({
        value,
        label: t(`invoices.schedule.anchor.${dateAnchorKeys[value]}`),
    }));
}

export function dueDateModeOptions(
    t: TFunction,
): SelectFieldOption<DueDateModeType>[] {
    return Object.values(DueDateModes).map(value => ({
        value,
        label: t(`invoices.schedule.dueMode.${dueDateModeKeys[value]}`),
    }));
}

const emailDeliveryKeys: Record<EmailDeliveryModeType, string> = {
    [EmailDeliveryModes.Attachment]: 'attachment',
    [EmailDeliveryModes.Link]: 'link',
};

export function emailDeliveryOptions(
    t: TFunction,
): SelectFieldOption<EmailDeliveryModeType>[] {
    return Object.values(EmailDeliveryModes).map(value => ({
        value,
        label: t(`invoices.email.mode.${emailDeliveryKeys[value]}`),
    }));
}
