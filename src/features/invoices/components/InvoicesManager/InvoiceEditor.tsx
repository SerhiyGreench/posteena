import { type ReactElement, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from 'ui/accordion';
import { Button } from 'ui/button';
import { Input } from 'ui/input';
import { Label } from 'ui/label';
import { Separator } from 'ui/separator';
import { Switch } from 'ui/switch';
import { Textarea } from 'ui/textarea';

import AsyncButton from '@/features/invoices/components/InvoicesManager/AsyncButton';
import FormField from '@/features/invoices/components/InvoicesManager/FormField';
import InvoiceItemsEditor from '@/features/invoices/components/InvoicesManager/InvoiceItemsEditor';
import MultiSelectField from '@/features/invoices/components/InvoicesManager/MultiSelectField';
import PartyFieldset from '@/features/invoices/components/InvoicesManager/PartyFieldset';
import SelectField from '@/features/invoices/components/InvoicesManager/SelectField';
import type { CurrencyType } from '@/features/invoices/constants/Currencies';
import type { DocumentLanguageType } from '@/features/invoices/constants/DocumentLanguages';
import { InvoiceStatuses } from '@/features/invoices/constants/InvoiceStatuses';
import type { PaymentMethodType } from '@/features/invoices/constants/PaymentMethods';
import type {
    Invoice,
    InvoiceSettings,
    Party,
    SupplierProfile,
} from '@/features/invoices/types';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import { formatInvoiceMoney } from '@/features/invoices/utils/invoiceFormatters';
import {
    currencyOptions,
    languageOptions,
    paymentMethodOptions,
} from '@/features/invoices/utils/invoiceSelectOptions';
import { resolveDueDateFor } from '@/features/invoices/utils/resolveScheduledDates';

export interface InvoiceEditorProps {
    invoice: Invoice;
    companies: Party[];
    settings: InvoiceSettings;
    onSave: (invoice: Invoice) => Promise<void>;
    onIssue: (invoice: Invoice) => Promise<void>;
    onCancel: () => void;
}

/**
 * Create and edit form for a single invoice.
 *
 * The top section holds the only things that genuinely change per invoice —
 * who it is for and what is being billed. Everything else is inherited from the
 * global settings and only surfaces under "Advanced", where it can be
 * overridden for this invoice alone without touching the defaults.
 */
export default function InvoiceEditor({
    invoice,
    companies,
    settings,
    onSave,
    onIssue,
    onCancel,
}: InvoiceEditorProps): ReactElement {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<Invoice>(invoice);

    const isDraft = draft.status === InvoiceStatuses.Draft;
    const totals = useMemo(
        () => calculateInvoiceTotals(draft.items, draft.totals.paidInAdvance),
        [draft.items, draft.totals.paidInAdvance],
    );

    const companyOptions = useMemo(
        () =>
            companies.map(company => ({
                value: company.id,
                label: company.name,
            })),
        [companies],
    );

    const update = (patch: Partial<Invoice>): void => {
        setDraft(previous => ({ ...previous, ...patch }));
    };

    const selectCustomer = (customerId: string): void => {
        const company = companies.find(item => item.id === customerId);

        if (!company) {
            return;
        }

        update({
            customerId: company.id,
            customer: structuredClone(company),
        });
    };

    const changeIssueDate = (issueDate: string): void => {
        update({
            issueDate,
            supplyDate:
                draft.supplyDate === draft.issueDate
                    ? issueDate
                    : draft.supplyDate,
            dueDate: resolveDueDateFor(
                settings.defaults.schedule,
                settings.defaults.dueDays,
                issueDate,
            ),
        });
    };

    const submit = (action: 'save' | 'issue'): Promise<void> => {
        const next: Invoice = { ...draft, totals };

        return action === 'issue' ? onIssue(next) : onSave(next);
    };

    return (
        <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-4">
                {companies.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        {t('invoices.form.noCustomers')}
                    </p>
                ) : (
                    <FormField label={t('invoices.form.customer')}>
                        <SelectField
                            value={draft.customerId}
                            options={companyOptions}
                            placeholder={t('invoices.form.selectCustomer')}
                            disabled={!isDraft}
                            onChange={selectCustomer}
                        />
                    </FormField>
                )}

                <div>
                    <Label className="mb-2 block text-xs font-medium">
                        {t('invoices.form.items')}
                    </Label>
                    <InvoiceItemsEditor
                        items={draft.items}
                        currency={draft.currency}
                        languages={draft.languages}
                        onChange={items => update({ items })}
                    />
                </div>

                <div className="bg-muted/40 flex flex-col gap-1 rounded-lg border p-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            {t('invoices.form.subtotal')}
                        </span>
                        <span className="tabular-nums">
                            {formatInvoiceMoney(
                                totals.subtotal,
                                draft.languages,
                            )}{' '}
                            {draft.currency}
                        </span>
                    </div>
                    {totals.vatAmount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                {t('invoices.form.vat')}
                            </span>
                            <span className="tabular-nums">
                                {formatInvoiceMoney(
                                    totals.vatAmount,
                                    draft.languages,
                                )}{' '}
                                {draft.currency}
                            </span>
                        </div>
                    )}
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold">
                        <span>{t('invoices.form.amountDue')}</span>
                        <span className="tabular-nums">
                            {formatInvoiceMoney(
                                totals.amountDue,
                                draft.languages,
                            )}{' '}
                            {draft.currency}
                        </span>
                    </div>
                </div>
            </section>

            <Accordion className="w-full">
                <AccordionItem value="advanced">
                    <AccordionTrigger>
                        {t('invoices.form.advanced')}
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="flex flex-col gap-5 pt-1">
                            <p className="text-muted-foreground text-xs">
                                {t('invoices.form.advancedHint')}
                            </p>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <FormField label={t('invoices.form.language')}>
                                    <MultiSelectField<DocumentLanguageType>
                                        value={draft.languages}
                                        options={languageOptions()}
                                        minSelected={1}
                                        onChange={languages =>
                                            update({ languages })
                                        }
                                    />
                                </FormField>

                                <FormField label={t('invoices.form.currency')}>
                                    <SelectField<CurrencyType>
                                        value={draft.currency}
                                        options={currencyOptions}
                                        onChange={currency =>
                                            update({ currency })
                                        }
                                    />
                                </FormField>

                                <FormField
                                    label={t('invoices.form.paymentMethod')}
                                >
                                    <SelectField<PaymentMethodType>
                                        value={draft.paymentMethod}
                                        options={paymentMethodOptions(t)}
                                        onChange={paymentMethod =>
                                            update({ paymentMethod })
                                        }
                                    />
                                </FormField>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={draft.numberIsManual}
                                        disabled={!isDraft}
                                        onCheckedChange={checked =>
                                            update({ numberIsManual: checked })
                                        }
                                    />
                                    <Label className="text-xs font-medium">
                                        {t('invoices.form.manualNumber')}
                                    </Label>
                                </div>

                                <FormField
                                    label={t('invoices.form.number')}
                                    hint={
                                        draft.numberIsManual
                                            ? undefined
                                            : t('invoices.form.numberAuto')
                                    }
                                >
                                    <Input
                                        value={draft.number}
                                        disabled={
                                            !draft.numberIsManual || !isDraft
                                        }
                                        onChange={event =>
                                            update({
                                                number: event.target.value,
                                            })
                                        }
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <FormField label={t('invoices.form.issueDate')}>
                                    <Input
                                        type="date"
                                        value={draft.issueDate}
                                        onChange={event =>
                                            changeIssueDate(event.target.value)
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label={t('invoices.form.supplyDate')}
                                >
                                    <Input
                                        type="date"
                                        value={draft.supplyDate}
                                        onChange={event =>
                                            update({
                                                supplyDate: event.target.value,
                                            })
                                        }
                                    />
                                </FormField>
                                <FormField label={t('invoices.form.dueDate')}>
                                    <Input
                                        type="date"
                                        value={draft.dueDate}
                                        onChange={event =>
                                            update({
                                                dueDate: event.target.value,
                                            })
                                        }
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FormField
                                    label={t('invoices.form.orderNumber')}
                                >
                                    <Input
                                        value={draft.orderNumber}
                                        onChange={event =>
                                            update({
                                                orderNumber: event.target.value,
                                            })
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label={t('invoices.form.paidInAdvance')}
                                >
                                    <Input
                                        inputMode="decimal"
                                        value={String(
                                            draft.totals.paidInAdvance,
                                        )}
                                        onChange={event => {
                                            const parsed = Number.parseFloat(
                                                event.target.value.replace(
                                                    ',',
                                                    '.',
                                                ),
                                            );

                                            update({
                                                totals: {
                                                    ...draft.totals,
                                                    paidInAdvance:
                                                        Number.isFinite(parsed)
                                                            ? parsed
                                                            : 0,
                                                },
                                            });
                                        }}
                                    />
                                </FormField>
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-medium">
                                    {t('invoices.form.symbols')}
                                </Label>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <FormField
                                        label={t(
                                            'invoices.form.variableSymbol',
                                        )}
                                    >
                                        <Input
                                            value={draft.symbols.variableSymbol}
                                            onChange={event =>
                                                update({
                                                    symbols: {
                                                        ...draft.symbols,
                                                        variableSymbol:
                                                            event.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label={t(
                                            'invoices.form.constantSymbol',
                                        )}
                                    >
                                        <Input
                                            value={draft.symbols.constantSymbol}
                                            onChange={event =>
                                                update({
                                                    symbols: {
                                                        ...draft.symbols,
                                                        constantSymbol:
                                                            event.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label={t(
                                            'invoices.form.specificSymbol',
                                        )}
                                    >
                                        <Input
                                            value={draft.symbols.specificSymbol}
                                            onChange={event =>
                                                update({
                                                    symbols: {
                                                        ...draft.symbols,
                                                        specificSymbol:
                                                            event.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </FormField>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={draft.barcode}
                                    onCheckedChange={checked =>
                                        update({ barcode: checked })
                                    }
                                />
                                <Label className="text-xs font-medium">
                                    {t('invoices.settings.barcode')}
                                </Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={draft.payBySquare}
                                    onCheckedChange={checked =>
                                        update({ payBySquare: checked })
                                    }
                                />
                                <Label className="text-xs font-medium">
                                    {t('invoices.settings.payBySquare')}
                                </Label>
                            </div>

                            <FormField
                                label={t('invoices.form.notes')}
                                hint={t('invoices.form.notesHint')}
                            >
                                <Textarea
                                    rows={3}
                                    value={draft.notes.join('\n')}
                                    onChange={event =>
                                        update({
                                            notes: event.target.value.split(
                                                '\n',
                                            ),
                                        })
                                    }
                                />
                            </FormField>

                            <div>
                                <Label className="mb-2 block text-xs font-medium">
                                    {t('invoices.form.customer')}
                                </Label>
                                <PartyFieldset
                                    value={draft.customer}
                                    onChange={customer => update({ customer })}
                                    showNote={false}
                                />
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-medium">
                                    {t('invoices.form.supplierOverride')}
                                </Label>
                                <PartyFieldset<SupplierProfile>
                                    value={draft.supplier}
                                    onChange={supplier => update({ supplier })}
                                    showNote={false}
                                />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={onCancel}>
                    {t('invoices.actions.close')}
                </Button>
                <AsyncButton variant="outline" onClick={() => submit('save')}>
                    {t('invoices.actions.save')}
                </AsyncButton>
                {isDraft && (
                    <AsyncButton onClick={() => submit('issue')}>
                        {t('invoices.actions.issue')}
                    </AsyncButton>
                )}
            </div>
        </div>
    );
}
