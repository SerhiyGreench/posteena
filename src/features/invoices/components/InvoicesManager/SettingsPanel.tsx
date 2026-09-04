import { Download, ImagePlus, Trash2, Upload } from 'lucide-react';
import {
    type ChangeEvent,
    type ReactElement,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'ui/card';
import { Input } from 'ui/input';
import { Label } from 'ui/label';
import { Switch } from 'ui/switch';
import { Textarea } from 'ui/textarea';

import AsyncButton from '@/features/invoices/components/InvoicesManager/AsyncButton';
import CompaniesPanel from '@/features/invoices/components/InvoicesManager/CompaniesPanel';
import FormField from '@/features/invoices/components/InvoicesManager/FormField';
import InvoiceItemsEditor from '@/features/invoices/components/InvoicesManager/InvoiceItemsEditor';
import MultiSelectField from '@/features/invoices/components/InvoicesManager/MultiSelectField';
import NumberField from '@/features/invoices/components/InvoicesManager/NumberField';
import PartyFieldset from '@/features/invoices/components/InvoicesManager/PartyFieldset';
import SelectField from '@/features/invoices/components/InvoicesManager/SelectField';
import type { CurrencyType } from '@/features/invoices/constants/Currencies';
import type { DocumentLanguageType } from '@/features/invoices/constants/DocumentLanguages';
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
import type { InvoiceSchedulePeriodType } from '@/features/invoices/constants/InvoiceSchedulePeriods';
import type { PaymentMethodType } from '@/features/invoices/constants/PaymentMethods';
import type {
    BankAccount,
    InvoiceSettings,
    Party,
    SupplierProfile,
} from '@/features/invoices/types';
import { EmailPlaceholders } from '@/features/invoices/utils/buildGmailComposeUrl';
import { peekNextInvoiceNumber } from '@/features/invoices/utils/formatInvoiceNumber';
import { formatInvoiceDate } from '@/features/invoices/utils/invoiceFormatters';
import {
    currencyOptions,
    emailDeliveryOptions,
    languageLabels,
    dateAnchorOptions,
    dueDateModeOptions,
    languageOptions,
    paymentMethodOptions,
    schedulePeriodOptions,
} from '@/features/invoices/utils/invoiceSelectOptions';
import { loadInvoiceLogo } from '@/features/invoices/utils/loadInvoiceLogo';
import { resolveScheduledDates } from '@/features/invoices/utils/resolveScheduledDates';

export interface SettingsPanelProps {
    settings: InvoiceSettings;
    companies: Party[];
    onSave: (settings: InvoiceSettings) => Promise<void>;
    onSaveCompany: (company: Party) => Promise<void>;
    onRemoveCompany: (id: string) => Promise<void>;
    onExport: () => void;
    onImport: (content: string) => Promise<void>;
}

/**
 * Global configuration: the issuing company, its bank, how invoice numbers are
 * built, what every new invoice defaults to, and where documents are written
 * in Google Drive.
 *
 * These values are copied onto each invoice at issue time, so changing them
 * only affects invoices created afterwards.
 */
export default function SettingsPanel({
    settings,
    companies,
    onSave,
    onSaveCompany,
    onRemoveCompany,
    onExport,
    onImport,
}: SettingsPanelProps): ReactElement {
    const { t } = useTranslation();
    const [draft, setDraft] = useState<InvoiceSettings>(settings);
    const fileInput = useRef<HTMLInputElement>(null);
    const logoInput = useRef<HTMLInputElement>(null);
    const [logoError, setLogoError] = useState<string | null>(null);

    /** Rasterises the chosen image and keeps it with the rest of the settings. */
    const handleLogo = async (
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const file = event.target.files?.[0];

        event.target.value = '';
        setLogoError(null);

        if (!file) {
            return;
        }

        try {
            setDraft({ ...draft, logo: await loadInvoiceLogo(file) });
        } catch (error) {
            setLogoError(
                error instanceof Error ? error.message : String(error),
            );
        }
    };

    /** Reads the chosen file, then clears the input so the same file can be re-picked. */
    const handleFile = async (
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const file = event.target.files?.[0];

        event.target.value = '';

        if (!file) {
            return;
        }

        await onImport(await file.text());
    };

    // Shows the dates a new invoice would get with the current rules.
    const previewDates = useMemo(
        () =>
            resolveScheduledDates(
                draft.defaults.schedule,
                draft.defaults.dueDays,
            ),
        [draft.defaults.schedule, draft.defaults.dueDays],
    );

    const numberPreview = useMemo(
        () => peekNextInvoiceNumber(draft.numbering, new Date()).number,
        [draft.numbering],
    );

    const updateSupplier = (supplier: SupplierProfile): void => {
        setDraft(previous => ({ ...previous, supplier }));
    };

    const updateBank = (patch: Partial<BankAccount>): void => {
        setDraft(previous => ({
            ...previous,
            supplier: {
                ...previous.supplier,
                bank: { ...previous.supplier.bank, ...patch },
            },
        }));
    };

    const updateNumbering = (
        patch: Partial<InvoiceSettings['numbering']>,
    ): void => {
        setDraft(previous => ({
            ...previous,
            numbering: { ...previous.numbering, ...patch },
        }));
    };

    const updateDefaults = (
        patch: Partial<InvoiceSettings['defaults']>,
    ): void => {
        setDraft(previous => ({
            ...previous,
            defaults: { ...previous.defaults, ...patch },
        }));
    };

    /** Whole-number input; blank or malformed input falls back to `fallback`. */
    const numberField = (
        label: string,
        value: number,
        onChange: (next: number) => void,
        fallback = 1,
    ): ReactElement => (
        <FormField label={label}>
            <Input
                inputMode="numeric"
                value={String(value)}
                onChange={event => {
                    const parsed = Number.parseInt(event.target.value, 10);

                    onChange(Number.isFinite(parsed) ? parsed : fallback);
                }}
            />
        </FormField>
    );

    const updateSchedule = (
        patch: Partial<InvoiceSettings['defaults']['schedule']>,
    ): void => {
        setDraft(previous => ({
            ...previous,
            defaults: {
                ...previous.defaults,
                schedule: { ...previous.defaults.schedule, ...patch },
            },
        }));
    };

    const updateEmail = (patch: Partial<InvoiceSettings['email']>): void => {
        setDraft(previous => ({
            ...previous,
            email: { ...previous.email, ...patch },
        }));
    };

    const updateDrive = (patch: Partial<InvoiceSettings['drive']>): void => {
        setDraft(previous => ({
            ...previous,
            drive: { ...previous.drive, ...patch },
        }));
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.settings.supplier')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <PartyFieldset<SupplierProfile>
                        value={draft.supplier}
                        onChange={updateSupplier}
                        showNote={false}
                    />

                    <FormField
                        label={t('invoices.settings.incomeTaxRegistration')}
                    >
                        <Input
                            value={draft.supplier.incomeTaxRegistration}
                            onChange={event =>
                                updateSupplier({
                                    ...draft.supplier,
                                    incomeTaxRegistration: event.target.value,
                                })
                            }
                        />
                    </FormField>

                    <div className="flex items-center gap-3">
                        <Switch
                            checked={draft.supplier.vatRegistered}
                            onCheckedChange={checked =>
                                updateSupplier({
                                    ...draft.supplier,
                                    vatRegistered: checked,
                                })
                            }
                        />
                        <Label className="text-xs font-medium">
                            {t('invoices.settings.vatRegistered')}
                        </Label>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.settings.bank')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label={t('invoices.settings.accountHolder')}>
                        <Input
                            value={draft.supplier.bank.accountHolder}
                            onChange={event =>
                                updateBank({
                                    accountHolder: event.target.value,
                                })
                            }
                        />
                    </FormField>
                    <FormField label={t('invoices.settings.bankName')}>
                        <Input
                            value={draft.supplier.bank.bankName}
                            onChange={event =>
                                updateBank({ bankName: event.target.value })
                            }
                        />
                    </FormField>
                    <FormField label={t('invoices.settings.iban')}>
                        <Input
                            value={draft.supplier.bank.iban}
                            onChange={event =>
                                updateBank({ iban: event.target.value })
                            }
                        />
                    </FormField>
                    <FormField label={t('invoices.settings.swift')}>
                        <Input
                            value={draft.supplier.bank.swift}
                            onChange={event =>
                                updateBank({ swift: event.target.value })
                            }
                        />
                    </FormField>
                    <FormField label={t('invoices.settings.accountNumber')}>
                        <Input
                            value={draft.supplier.bank.accountNumber}
                            onChange={event =>
                                updateBank({
                                    accountNumber: event.target.value,
                                })
                            }
                        />
                    </FormField>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.settings.numbering')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormField
                            label={t('invoices.settings.pattern')}
                            hint={t('invoices.settings.patternHint')}
                            className="sm:col-span-2"
                        >
                            <Input
                                value={draft.numbering.pattern}
                                onChange={event =>
                                    updateNumbering({
                                        pattern: event.target.value,
                                    })
                                }
                            />
                        </FormField>
                        <FormField label={t('invoices.settings.nextSequence')}>
                            <Input
                                inputMode="numeric"
                                value={String(draft.numbering.nextSequence)}
                                onChange={event => {
                                    const parsed = Number.parseInt(
                                        event.target.value,
                                        10,
                                    );

                                    updateNumbering({
                                        nextSequence: Number.isFinite(parsed)
                                            ? parsed
                                            : 1,
                                    });
                                }}
                            />
                        </FormField>
                    </div>

                    <div className="flex items-center gap-3">
                        <Switch
                            checked={draft.numbering.resetYearly}
                            onCheckedChange={checked =>
                                updateNumbering({ resetYearly: checked })
                            }
                        />
                        <Label className="text-xs font-medium">
                            {t('invoices.settings.resetYearly')}
                        </Label>
                    </div>

                    <p className="text-muted-foreground text-sm">
                        {t('invoices.settings.numberPreview')}:{' '}
                        <span className="text-foreground font-mono font-medium">
                            {numberPreview}
                        </span>
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.settings.defaults')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormField label={t('invoices.form.language')}>
                            <MultiSelectField<DocumentLanguageType>
                                value={draft.defaults.languages}
                                options={languageOptions()}
                                minSelected={1}
                                onChange={languages =>
                                    updateDefaults({ languages })
                                }
                            />
                        </FormField>

                        <FormField label={t('invoices.form.currency')}>
                            <SelectField<CurrencyType>
                                value={draft.defaults.currency}
                                options={currencyOptions}
                                onChange={currency =>
                                    updateDefaults({ currency })
                                }
                            />
                        </FormField>

                        <FormField label={t('invoices.form.paymentMethod')}>
                            <SelectField<PaymentMethodType>
                                value={draft.defaults.paymentMethod}
                                options={paymentMethodOptions(t)}
                                onChange={paymentMethod =>
                                    updateDefaults({ paymentMethod })
                                }
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormField label={t('invoices.form.vatRate')}>
                            <NumberField
                                value={draft.defaults.vatRate}
                                onChange={vatRate =>
                                    updateDefaults({ vatRate })
                                }
                            />
                        </FormField>

                        <FormField label={t('invoices.form.constantSymbol')}>
                            <Input
                                value={draft.defaults.constantSymbol}
                                onChange={event =>
                                    updateDefaults({
                                        constantSymbol: event.target.value,
                                    })
                                }
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {draft.defaults.languages.map(language => (
                            <FormField
                                key={language}
                                label={`${t('invoices.form.unit')} (${languageLabels[language] ?? language})`}
                            >
                                <Input
                                    value={draft.defaults.units[language] ?? ''}
                                    onChange={event =>
                                        updateDefaults({
                                            units: {
                                                ...draft.defaults.units,
                                                [language]: event.target.value,
                                            },
                                        })
                                    }
                                />
                            </FormField>
                        ))}
                    </div>

                    <div>
                        <Label className="mb-1 block text-xs font-medium">
                            {t('invoices.settings.defaultItems')}
                        </Label>
                        <p className="text-muted-foreground mb-2 text-xs">
                            {t('invoices.settings.defaultItemsHint')}
                        </p>
                        <InvoiceItemsEditor
                            items={draft.defaults.items}
                            currency={draft.defaults.currency}
                            languages={draft.defaults.languages}
                            onChange={items => updateDefaults({ items })}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Switch
                            checked={draft.defaults.payBySquare}
                            onCheckedChange={checked =>
                                updateDefaults({ payBySquare: checked })
                            }
                        />
                        <Label className="text-xs font-medium">
                            {t('invoices.settings.payBySquare')}
                        </Label>
                    </div>
                    <p className="text-muted-foreground -mt-2 text-xs">
                        {t('invoices.settings.payBySquareHint')}
                    </p>

                    <div className="flex items-center gap-3">
                        <Switch
                            checked={draft.defaults.barcode}
                            onCheckedChange={checked =>
                                updateDefaults({ barcode: checked })
                            }
                        />
                        <Label className="text-xs font-medium">
                            {t('invoices.settings.barcode')}
                        </Label>
                    </div>
                    <p className="text-muted-foreground -mt-2 text-xs">
                        {t('invoices.settings.barcodeHint')}
                    </p>

                    <div className="flex items-center gap-3">
                        <Switch
                            checked={draft.defaults.officialCountryNames}
                            onCheckedChange={checked =>
                                updateDefaults({
                                    officialCountryNames: checked,
                                })
                            }
                        />
                        <Label className="text-xs font-medium">
                            {t('invoices.settings.officialCountryNames')}
                        </Label>
                    </div>
                    <p className="text-muted-foreground -mt-2 text-xs">
                        {t('invoices.settings.officialCountryNamesHint')}
                    </p>

                    <FormField
                        label={t('invoices.settings.defaultNotes')}
                        hint={t('invoices.form.notesHint')}
                    >
                        <Textarea
                            rows={3}
                            value={draft.defaults.notes.join('\n')}
                            onChange={event =>
                                updateDefaults({
                                    notes: event.target.value.split('\n'),
                                })
                            }
                        />
                    </FormField>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.schedule.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-muted-foreground text-xs">
                        {t('invoices.schedule.hint')}
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormField label={t('invoices.schedule.periodLabel')}>
                            <SelectField<InvoiceSchedulePeriodType>
                                value={draft.defaults.schedule.period}
                                options={schedulePeriodOptions(t)}
                                onChange={period => updateSchedule({ period })}
                            />
                        </FormField>
                        <FormField label={t('invoices.schedule.issueOn')}>
                            <SelectField<InvoiceDateAnchorType>
                                value={draft.defaults.schedule.issueOn}
                                options={dateAnchorOptions(t)}
                                onChange={issueOn =>
                                    updateSchedule({ issueOn })
                                }
                            />
                        </FormField>
                        {draft.defaults.schedule.issueOn ===
                            InvoiceDateAnchors.DayOfMonth &&
                            numberField(
                                t('invoices.schedule.issueDayOfMonth'),
                                draft.defaults.schedule.issueDayOfMonth,
                                issueDayOfMonth =>
                                    updateSchedule({ issueDayOfMonth }),
                            )}
                        <FormField label={t('invoices.schedule.supplyOn')}>
                            <SelectField<InvoiceDateAnchorType>
                                value={draft.defaults.schedule.supplyOn}
                                options={dateAnchorOptions(t)}
                                onChange={supplyOn =>
                                    updateSchedule({ supplyOn })
                                }
                            />
                        </FormField>
                        {draft.defaults.schedule.supplyOn ===
                            InvoiceDateAnchors.DayOfMonth &&
                            numberField(
                                t('invoices.schedule.supplyDayOfMonth'),
                                draft.defaults.schedule.supplyDayOfMonth,
                                supplyDayOfMonth =>
                                    updateSchedule({ supplyDayOfMonth }),
                            )}
                    </div>

                    <div className="flex items-center gap-3">
                        <Switch
                            checked={draft.defaults.schedule.billPreviousPeriod}
                            onCheckedChange={checked =>
                                updateSchedule({ billPreviousPeriod: checked })
                            }
                        />
                        <Label className="text-xs font-medium">
                            {t('invoices.schedule.billPreviousPeriod')}
                        </Label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label={t('invoices.schedule.dueModeLabel')}>
                            <SelectField<DueDateModeType>
                                value={draft.defaults.schedule.dueMode}
                                options={dueDateModeOptions(t)}
                                onChange={dueMode =>
                                    updateSchedule({ dueMode })
                                }
                            />
                        </FormField>
                        {draft.defaults.schedule.dueMode ===
                        DueDateModes.DayOfNextMonth
                            ? numberField(
                                  t('invoices.schedule.dueDayOfMonth'),
                                  draft.defaults.schedule.dueDayOfMonth,
                                  dueDayOfMonth =>
                                      updateSchedule({ dueDayOfMonth }),
                              )
                            : numberField(
                                  t('invoices.schedule.daysToPay'),
                                  draft.defaults.dueDays,
                                  dueDays => updateDefaults({ dueDays }),
                                  0,
                              )}
                    </div>

                    <p className="text-muted-foreground text-xs">
                        {t('invoices.schedule.preview', {
                            issueDate: formatInvoiceDate(
                                previewDates.issueDate,
                            ),
                            supplyDate: formatInvoiceDate(
                                previewDates.supplyDate,
                            ),
                            dueDate: formatInvoiceDate(previewDates.dueDate),
                        })}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.settings.drive')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <FormField
                        label={t('invoices.settings.folderPath')}
                        hint={t('invoices.settings.folderPathHint')}
                    >
                        <Input
                            value={draft.drive.folderPath}
                            onChange={event =>
                                updateDrive({ folderPath: event.target.value })
                            }
                        />
                    </FormField>

                    <FormField
                        label={t('invoices.settings.fileNamePattern')}
                        hint={t('invoices.settings.fileNameHint')}
                    >
                        <Input
                            value={draft.drive.fileNamePattern}
                            onChange={event =>
                                updateDrive({
                                    fileNamePattern: event.target.value,
                                })
                            }
                        />
                    </FormField>

                    <div className="flex items-center gap-3">
                        <Switch
                            checked={draft.drive.autoUpload}
                            onCheckedChange={checked =>
                                updateDrive({ autoUpload: checked })
                            }
                        />
                        <Label className="text-xs font-medium">
                            {t('invoices.settings.autoUpload')}
                        </Label>
                    </div>
                    <p className="text-muted-foreground -mt-2 text-xs">
                        {t('invoices.settings.autoUploadHint')}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.email.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-muted-foreground text-xs">
                        {t('invoices.email.hint', {
                            placeholders: EmailPlaceholders.map(
                                name => `{${name}}`,
                            ).join(', '),
                        })}
                    </p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormField
                            label={t('invoices.email.modeLabel')}
                            hint={t(
                                draft.email.mode ===
                                    EmailDeliveryModes.Attachment
                                    ? 'invoices.email.attachmentHint'
                                    : 'invoices.email.linkHint',
                            )}
                        >
                            <SelectField<EmailDeliveryModeType>
                                value={draft.email.mode}
                                options={emailDeliveryOptions(t)}
                                onChange={mode => updateEmail({ mode })}
                            />
                        </FormField>
                        <FormField
                            label={t('invoices.email.from')}
                            hint={t('invoices.email.fromHint')}
                        >
                            <Input
                                value={draft.email.from}
                                disabled={
                                    draft.email.mode === EmailDeliveryModes.Link
                                }
                                onChange={event =>
                                    updateEmail({ from: event.target.value })
                                }
                            />
                        </FormField>
                        <FormField
                            label={t('invoices.email.cc')}
                            hint={t('invoices.email.ccHint')}
                        >
                            <Input
                                value={draft.email.cc}
                                onChange={event =>
                                    updateEmail({ cc: event.target.value })
                                }
                            />
                        </FormField>
                    </div>

                    <FormField label={t('invoices.email.subject')}>
                        <Input
                            value={draft.email.subject}
                            onChange={event =>
                                updateEmail({ subject: event.target.value })
                            }
                        />
                    </FormField>

                    <FormField label={t('invoices.email.body')}>
                        <Textarea
                            rows={8}
                            value={draft.email.body}
                            onChange={event =>
                                updateEmail({ body: event.target.value })
                            }
                        />
                    </FormField>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.tabs.companies')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CompaniesPanel
                        companies={companies}
                        onSave={onSaveCompany}
                        onRemove={onRemoveCompany}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.settings.logo')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-xs">
                        {t('invoices.settings.logoHint')}
                    </p>

                    {draft.logo && (
                        <div className="flex w-fit items-center justify-center rounded-md border p-3">
                            <img
                                src={draft.logo.dataUrl}
                                alt=""
                                className="h-16 w-auto"
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => logoInput.current?.click()}
                        >
                            <ImagePlus className="size-4" />
                            {draft.logo
                                ? t('invoices.settings.logoReplace')
                                : t('invoices.settings.logoAttach')}
                        </Button>
                        {draft.logo && (
                            <Button
                                variant="ghost"
                                className="gap-2"
                                onClick={() =>
                                    setDraft({ ...draft, logo: null })
                                }
                            >
                                <Trash2 className="size-4" />
                                {t('invoices.settings.logoRemove')}
                            </Button>
                        )}
                        <input
                            ref={logoInput}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            className="hidden"
                            onChange={event => void handleLogo(event)}
                        />
                    </div>

                    {logoError && (
                        <p className="text-destructive text-xs" role="alert">
                            {logoError}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        {t('invoices.settings.transfer')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-xs">
                        {t('invoices.settings.transferHint')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={onExport}
                        >
                            <Download className="size-4" />
                            {t('invoices.settings.export')}
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => fileInput.current?.click()}
                        >
                            <Upload className="size-4" />
                            {t('invoices.settings.import')}
                        </Button>
                        <input
                            ref={fileInput}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={event => void handleFile(event)}
                        />
                    </div>
                </CardContent>
            </Card>

            <AsyncButton className="w-fit" onClick={() => onSave(draft)}>
                {t('invoices.settings.save')}
            </AsyncButton>
        </div>
    );
}
