import { type ChangeEvent, type ReactElement } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Checkbox } from 'ui/checkbox';
import { CollapsibleContent } from 'ui/collapsible';
import { Field, FieldContent, FieldLabel } from 'ui/field';
import { Input } from 'ui/input';
import { type PasswordGeneratorSettings } from '@/features/passwords/utils/crypto';

interface PasswordSettingsProps {
    settings: PasswordGeneratorSettings;
    onUpdateSettings: (settings: Partial<PasswordGeneratorSettings>) => void;
    onUpdateAlphabet: (
        includeLetters: boolean,
        includeDigits: boolean,
        includeSymbols: boolean,
    ) => void;
}

export function PasswordSettings({
    settings,
    onUpdateSettings,
    onUpdateAlphabet,
}: PasswordSettingsProps): ReactElement {
    const { t } = useTranslation();

    const handleLengthChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            onUpdateSettings({ length: Math.max(4, Math.min(64, val)) });
        }
    };

    const handleAlphabetChange = (e: ChangeEvent<HTMLInputElement>): void => {
        onUpdateSettings({ customAlphabet: e.target.value });
    };

    return (
        <CollapsibleContent className="flex h-[var(--collapsible-panel-height)] flex-col justify-end overflow-hidden transition-all duration-150 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0">
            <div className="bg-muted/30 mt-4 space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                    <Field
                        orientation="horizontal"
                        className="items-center justify-between"
                    >
                        <FieldLabel
                            htmlFor="passwordLength"
                            className="text-sm font-medium"
                        >
                            {t('passwordGenerator.length')}
                        </FieldLabel>
                        <FieldContent className="flex-none">
                            <div className="flex items-center">
                                <Button
                                    variant="outline"
                                    size="icon-xs"
                                    className="rounded-r-none"
                                    onClick={() =>
                                        onUpdateSettings({
                                            length: Math.max(
                                                4,
                                                settings.length - 1,
                                            ),
                                        })
                                    }
                                    disabled={settings.length <= 4}
                                >
                                    <Minus className="size-3" />
                                </Button>
                                <Input
                                    id="passwordLength"
                                    type="number"
                                    min={4}
                                    max={64}
                                    value={settings.length}
                                    onChange={handleLengthChange}
                                    className="h-6 w-12 [appearance:textfield] rounded-none border-x-0 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                    variant="outline"
                                    size="icon-xs"
                                    className="rounded-l-none"
                                    onClick={() =>
                                        onUpdateSettings({
                                            length: Math.min(
                                                64,
                                                settings.length + 1,
                                            ),
                                        })
                                    }
                                    disabled={settings.length >= 64}
                                >
                                    <Plus className="size-3" />
                                </Button>
                            </div>
                        </FieldContent>
                    </Field>
                </div>

                <div className="flex flex-wrap gap-4">
                    <Field orientation="horizontal">
                        <Checkbox
                            id="includeLetters"
                            checked={settings.includeLetters}
                            onCheckedChange={checked =>
                                onUpdateAlphabet(
                                    !!checked,
                                    settings.includeDigits,
                                    settings.includeSymbols,
                                )
                            }
                            disabled={
                                settings.includeLetters &&
                                !settings.includeDigits &&
                                !settings.includeSymbols &&
                                !settings.customAlphabet
                            }
                        />
                        <FieldLabel
                            htmlFor="includeLetters"
                            className="shrink-0 text-sm"
                        >
                            {t('passwordGenerator.letters')}
                        </FieldLabel>
                    </Field>

                    <Field orientation="horizontal">
                        <Checkbox
                            id="includeDigits"
                            checked={settings.includeDigits}
                            onCheckedChange={checked =>
                                onUpdateAlphabet(
                                    settings.includeLetters,
                                    !!checked,
                                    settings.includeSymbols,
                                )
                            }
                            disabled={
                                settings.includeDigits &&
                                !settings.includeLetters &&
                                !settings.includeSymbols &&
                                !settings.customAlphabet
                            }
                        />
                        <FieldLabel
                            htmlFor="includeDigits"
                            className="shrink-0 text-sm"
                        >
                            {t('passwordGenerator.digits')}
                        </FieldLabel>
                    </Field>

                    <Field orientation="horizontal">
                        <Checkbox
                            id="includeSymbols"
                            checked={settings.includeSymbols}
                            onCheckedChange={checked =>
                                onUpdateAlphabet(
                                    settings.includeLetters,
                                    settings.includeDigits,
                                    !!checked,
                                )
                            }
                            disabled={
                                settings.includeSymbols &&
                                !settings.includeLetters &&
                                !settings.includeDigits &&
                                !settings.customAlphabet
                            }
                        />
                        <FieldLabel
                            htmlFor="includeSymbols"
                            className="shrink-0 text-sm"
                        >
                            {t('passwordGenerator.symbols')}
                        </FieldLabel>
                    </Field>
                </div>

                <div className="space-y-2">
                    <Field>
                        <FieldLabel
                            htmlFor="customAlphabet"
                            className="text-sm"
                        >
                            {t('passwordGenerator.customAlphabet')}
                        </FieldLabel>
                        <FieldContent>
                            <Input
                                id="customAlphabet"
                                value={settings.customAlphabet || ''}
                                onChange={handleAlphabetChange}
                                placeholder="e.g. ABC123!"
                            />
                        </FieldContent>
                    </Field>
                </div>
            </div>
        </CollapsibleContent>
    );
}
