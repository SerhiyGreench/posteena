import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from 'ui/input';
import { Textarea } from 'ui/textarea';

import FormField from '@/features/invoices/components/InvoicesManager/FormField';
import SelectField from '@/features/invoices/components/InvoicesManager/SelectField';
import type { Party } from '@/features/invoices/types';
import { listCountryOptions } from '@/features/invoices/utils/resolveCountry';

/**
 * Countries come from `Intl`, listed in the interface language so the picker
 * reads naturally; the document prints them in the invoice's own languages.
 */
const countryOptions = listCountryOptions('en');

export interface PartyFieldsetProps<T extends Party> {
    value: T;
    onChange: (party: T) => void;
    /** Hide the free-form note field on compact forms. */
    showNote?: boolean;
}

/**
 * Editor for the identity and address of a company.
 *
 * Shared by the company registry, the supplier settings and the per-invoice
 * supplier override, so the three never drift apart. It is generic over the
 * party type so a `SupplierProfile` keeps its extra fields when edited here.
 */
export default function PartyFieldset<T extends Party>({
    value,
    onChange,
    showNote = true,
}: PartyFieldsetProps<T>): ReactElement {
    const { t } = useTranslation();

    const update = (patch: Partial<Party>): void => {
        onChange({ ...value, ...patch });
    };

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
                label={t('invoices.company.name')}
                className="sm:col-span-2"
            >
                <Input
                    value={value.name}
                    onChange={event => update({ name: event.target.value })}
                />
            </FormField>

            <FormField label={t('invoices.company.legalForm')}>
                <Input
                    value={value.legalForm}
                    onChange={event =>
                        update({ legalForm: event.target.value })
                    }
                />
            </FormField>

            <FormField label={t('invoices.company.street')}>
                <Input
                    value={value.street}
                    onChange={event => update({ street: event.target.value })}
                />
            </FormField>

            <FormField label={t('invoices.company.postalCode')}>
                <Input
                    value={value.postalCode}
                    onChange={event =>
                        update({ postalCode: event.target.value })
                    }
                />
            </FormField>

            <FormField label={t('invoices.company.city')}>
                <Input
                    value={value.city}
                    onChange={event => update({ city: event.target.value })}
                />
            </FormField>

            <FormField
                label={t('invoices.company.country')}
                className="sm:col-span-2"
                hint={
                    value.countryCode ? undefined : value.country || undefined
                }
            >
                <SelectField
                    value={value.countryCode || null}
                    options={countryOptions}
                    placeholder={t('invoices.company.selectCountry')}
                    onChange={countryCode => update({ countryCode })}
                />
            </FormField>

            <FormField label={t('invoices.company.registrationNumber')}>
                <Input
                    value={value.registrationNumber}
                    onChange={event =>
                        update({ registrationNumber: event.target.value })
                    }
                />
            </FormField>

            <FormField label={t('invoices.company.taxNumber')}>
                <Input
                    value={value.taxNumber}
                    onChange={event =>
                        update({ taxNumber: event.target.value })
                    }
                />
            </FormField>

            <FormField label={t('invoices.company.vatNumber')}>
                <Input
                    value={value.vatNumber}
                    onChange={event =>
                        update({ vatNumber: event.target.value })
                    }
                />
            </FormField>

            <FormField label={t('invoices.company.commercialRegister')}>
                <Input
                    value={value.commercialRegister}
                    onChange={event =>
                        update({ commercialRegister: event.target.value })
                    }
                />
            </FormField>

            <FormField label={t('invoices.company.email')}>
                <Input
                    type="email"
                    value={value.email}
                    onChange={event => update({ email: event.target.value })}
                />
            </FormField>

            <FormField label={t('invoices.company.phone')}>
                <Input
                    value={value.phone}
                    onChange={event => update({ phone: event.target.value })}
                />
            </FormField>

            {showNote && (
                <FormField
                    label={t('invoices.company.note')}
                    className="sm:col-span-2"
                >
                    <Textarea
                        rows={2}
                        value={value.note}
                        onChange={event => update({ note: event.target.value })}
                    />
                </FormField>
            )}
        </div>
    );
}
