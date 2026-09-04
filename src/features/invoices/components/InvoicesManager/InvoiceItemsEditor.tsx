import { Plus, Trash2 } from 'lucide-react';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Input } from 'ui/input';

import FormField from '@/features/invoices/components/InvoicesManager/FormField';
import NumberField from '@/features/invoices/components/InvoicesManager/NumberField';
import type { CurrencyType } from '@/features/invoices/constants/Currencies';
import type { DocumentLanguageType } from '@/features/invoices/constants/DocumentLanguages';
import type { InvoiceLineItem } from '@/features/invoices/types';
import { calculateLineNet } from '@/features/invoices/utils/calculateInvoiceTotals';
import { formatInvoiceMoney } from '@/features/invoices/utils/invoiceFormatters';
import { languageLabels } from '@/features/invoices/utils/invoiceSelectOptions';

export interface InvoiceItemsEditorProps {
    items: InvoiceLineItem[];
    currency: CurrencyType;
    languages: DocumentLanguageType[];
    onChange: (items: InvoiceLineItem[]) => void;
}

/**
 * Editable list of invoice line items.
 *
 * Each line carries an English and a Slovak description so a bilingual
 * document can print both; the Slovak one falls back to the English text when
 * left empty.
 */
export default function InvoiceItemsEditor({
    items,
    currency,
    languages,
    onChange,
}: InvoiceItemsEditorProps): ReactElement {
    const { t } = useTranslation();

    const updateItem = (id: string, patch: Partial<InvoiceLineItem>): void => {
        onChange(
            items.map(item => (item.id === id ? { ...item, ...patch } : item)),
        );
    };

    const addItem = (): void => {
        const last = items[items.length - 1];

        onChange([
            ...items,
            {
                id: crypto.randomUUID(),
                descriptions: {},
                quantity: 1,
                units: { ...(last?.units ?? {}) },
                unitPrice: 0,
                vatRate: last?.vatRate ?? 0,
            },
        ]);
    };

    const removeItem = (id: string): void => {
        onChange(items.filter(item => item.id !== id));
    };

    return (
        <div className="flex flex-col gap-3">
            {items.map((item, index) => (
                <div
                    key={item.id}
                    className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">
                            #{index + 1}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            disabled={items.length === 1}
                            onClick={() => removeItem(item.id)}
                        >
                            <Trash2 className="size-4" />
                            <span className="sr-only">
                                {t('invoices.actions.removeItem')}
                            </span>
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {languages.map(language => (
                            <FormField
                                key={language}
                                label={`${t('invoices.form.description')} (${languageLabels[language] ?? language})`}
                            >
                                <Input
                                    value={item.descriptions[language] ?? ''}
                                    onChange={event =>
                                        updateItem(item.id, {
                                            descriptions: {
                                                ...item.descriptions,
                                                [language]: event.target.value,
                                            },
                                        })
                                    }
                                />
                            </FormField>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {languages.map(language => (
                            <FormField
                                key={language}
                                label={`${t('invoices.form.unit')} (${languageLabels[language] ?? language})`}
                            >
                                <Input
                                    value={item.units[language] ?? ''}
                                    onChange={event =>
                                        updateItem(item.id, {
                                            units: {
                                                ...item.units,
                                                [language]: event.target.value,
                                            },
                                        })
                                    }
                                />
                            </FormField>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <FormField label={t('invoices.form.quantity')}>
                            <NumberField
                                value={item.quantity}
                                onChange={quantity =>
                                    updateItem(item.id, { quantity })
                                }
                            />
                        </FormField>

                        <FormField label={t('invoices.form.unitPrice')}>
                            <NumberField
                                value={item.unitPrice}
                                onChange={unitPrice =>
                                    updateItem(item.id, { unitPrice })
                                }
                            />
                        </FormField>

                        <FormField label={t('invoices.form.vatRate')}>
                            <NumberField
                                value={item.vatRate}
                                onChange={vatRate =>
                                    updateItem(item.id, { vatRate })
                                }
                            />
                        </FormField>

                        <FormField label={t('invoices.form.lineTotal')}>
                            <div className="flex h-8 items-center text-sm font-medium tabular-nums">
                                {formatInvoiceMoney(
                                    calculateLineNet(item),
                                    languages,
                                )}{' '}
                                {currency}
                            </div>
                        </FormField>
                    </div>
                </div>
            ))}

            <Button
                variant="outline"
                size="sm"
                className="w-fit gap-2"
                onClick={addItem}
            >
                <Plus className="size-4" />
                {t('invoices.actions.addItem')}
            </Button>
        </div>
    );
}
