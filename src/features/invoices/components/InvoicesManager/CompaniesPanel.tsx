import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from 'ui/badge';
import { Button } from 'ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'ui/card';
import { Dialog, DialogContent, DialogFooter } from 'ui/dialog';
import { Label } from 'ui/label';
import { Switch } from 'ui/switch';

import AsyncButton from '@/features/invoices/components/InvoicesManager/AsyncButton';
import DialogTopBar from '@/features/invoices/components/InvoicesManager/DialogTopBar';
import PartyFieldset from '@/features/invoices/components/InvoicesManager/PartyFieldset';
import type { Party } from '@/features/invoices/types';
import { createEmptyParty } from '@/features/invoices/utils/createInvoiceDraft';

export interface CompaniesPanelProps {
    companies: Party[];
    onSave: (company: Party) => Promise<void>;
    onRemove: (id: string) => Promise<void>;
}

/**
 * Registry of the companies invoices are issued to.
 *
 * Selecting one on an invoice copies its data onto that invoice as a snapshot,
 * so editing or deleting an entry here never rewrites history.
 */
export default function CompaniesPanel({
    companies,
    onSave,
    onRemove,
}: CompaniesPanelProps): ReactElement {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<Party | null>(null);

    const close = (): void => setEditing(null);

    const save = async (): Promise<void> => {
        if (!editing) {
            return;
        }

        await onSave(editing);
        close();
    };

    // The primary company leads the list — it is the one most invoices go to.
    const ordered = [...companies].sort(
        (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
    );

    const togglePrimary = (company: Party): Promise<void> =>
        onSave({ ...company, isPrimary: !company.isPrimary });

    const confirmRemove = async (company: Party): Promise<void> => {
        if (
            !window.confirm(
                t('invoices.company.confirmDelete', { name: company.name }),
            )
        ) {
            return;
        }

        await onRemove(company.id);
    };

    return (
        <div className="flex flex-col gap-4">
            <Button
                className="w-fit gap-2"
                size="sm"
                onClick={() => setEditing(createEmptyParty())}
            >
                <Plus className="size-4" />
                {t('invoices.actions.addCompany')}
            </Button>

            {companies.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center text-sm">
                    {t('invoices.company.empty')}
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {ordered.map(company => (
                        <Card key={company.id}>
                            <CardHeader className="flex flex-row items-start justify-between gap-2">
                                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                                    {company.name}
                                    {company.isPrimary && (
                                        <Badge variant="secondary">
                                            {t('invoices.company.primary')}
                                        </Badge>
                                    )}
                                </CardTitle>
                                <div className="flex gap-1">
                                    <AsyncButton
                                        variant="ghost"
                                        size="icon-sm"
                                        spinnerOnly
                                        title={t(
                                            'invoices.company.makePrimary',
                                        )}
                                        className={
                                            company.isPrimary
                                                ? 'text-primary'
                                                : undefined
                                        }
                                        onClick={() => togglePrimary(company)}
                                    >
                                        <Star
                                            className="size-4"
                                            fill={
                                                company.isPrimary
                                                    ? 'currentColor'
                                                    : 'none'
                                            }
                                        />
                                    </AsyncButton>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        title={t(
                                            'invoices.actions.editCompany',
                                        )}
                                        onClick={() =>
                                            setEditing(structuredClone(company))
                                        }
                                    >
                                        <Pencil className="size-4" />
                                    </Button>
                                    <AsyncButton
                                        variant="ghost"
                                        size="icon-sm"
                                        spinnerOnly
                                        className="text-destructive"
                                        title={t('invoices.actions.delete')}
                                        onClick={() => confirmRemove(company)}
                                    >
                                        <Trash2 className="size-4" />
                                    </AsyncButton>
                                </div>
                            </CardHeader>
                            <CardContent className="text-muted-foreground flex flex-col gap-0.5 text-sm">
                                {company.legalForm && (
                                    <span>{company.legalForm}</span>
                                )}
                                <span>{company.street}</span>
                                <span>
                                    {[company.postalCode, company.city]
                                        .filter(Boolean)
                                        .join(' ')}
                                </span>
                                <span>{company.country}</span>
                                {company.registrationNumber && (
                                    <span className="mt-1">
                                        {t(
                                            'invoices.company.registrationNumber',
                                        )}
                                        : {company.registrationNumber}
                                    </span>
                                )}
                                {company.vatNumber && (
                                    <span>
                                        {t('invoices.company.vatNumber')}:{' '}
                                        {company.vatNumber}
                                    </span>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog
                open={editing !== null}
                onOpenChange={open => {
                    if (!open) {
                        close();
                    }
                }}
            >
                <DialogContent
                    className="overflow-y-auto sm:max-w-2xl"
                    showCloseButton={false}
                >
                    <DialogTopBar>
                        {t('invoices.actions.editCompany')}
                    </DialogTopBar>

                    {editing && (
                        <>
                            <PartyFieldset
                                value={editing}
                                onChange={setEditing}
                            />
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={editing.isPrimary}
                                    onCheckedChange={checked =>
                                        setEditing({
                                            ...editing,
                                            isPrimary: checked,
                                        })
                                    }
                                />
                                <Label className="text-xs font-medium">
                                    {t('invoices.company.makePrimary')}
                                </Label>
                            </div>
                        </>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={close}>
                            {t('invoices.actions.close')}
                        </Button>
                        <AsyncButton onClick={save}>
                            {t('invoices.actions.save')}
                        </AsyncButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
