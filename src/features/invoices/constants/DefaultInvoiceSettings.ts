import { Currencies } from '@/features/invoices/constants/Currencies';
import { DocumentLanguages } from '@/features/invoices/constants/DocumentLanguages';
import { DueDateModes } from '@/features/invoices/constants/DueDateModes';
import { EmailDeliveryModes } from '@/features/invoices/constants/EmailDeliveryModes';
import { InvoiceDateAnchors } from '@/features/invoices/constants/InvoiceDateAnchors';
import { InvoiceSchedulePeriods } from '@/features/invoices/constants/InvoiceSchedulePeriods';
import { PaymentMethods } from '@/features/invoices/constants/PaymentMethods';
import type { InvoiceSettings } from '@/features/invoices/types';

/**
 * Timestamp stamped on seeded records so the defaults stay deterministic
 * across reloads instead of drifting with every import.
 */
export const SeedTimestamp = '2026-01-01T00:00:00.000Z';

/**
 * Settings a brand new registry starts from.
 *
 * Deliberately free of content: no company, bank, customer, wording or
 * amounts. Only the structural choices an invoice cannot work without are
 * pre-set — the number pattern, currency and where files go — and every one
 * of them is editable in Settings.
 */
export const DefaultInvoiceSettings: InvoiceSettings = {
    supplier: {
        id: '',
        name: '',
        legalForm: '',
        street: '',
        city: '',
        postalCode: '',
        countryCode: '',
        country: '',
        registrationNumber: '',
        taxNumber: '',
        vatNumber: '',
        vatRegistered: false,
        commercialRegister: '',
        incomeTaxRegistration: '',
        email: '',
        phone: '',
        note: '',
        isPrimary: false,
        bank: {
            accountHolder: '',
            bankName: '',
            iban: '',
            swift: '',
            accountNumber: '',
        },
        createdAt: SeedTimestamp,
        updatedAt: SeedTimestamp,
    },
    numbering: {
        // A format, not content: without it invoices have no number at all.
        pattern: '{YYYY}{NNNN}',
        nextSequence: 1,
        resetYearly: true,
        currentPeriod: '',
    },
    defaults: {
        languages: [DocumentLanguages.Slovak, DocumentLanguages.English],
        currency: Currencies.Eur,
        paymentMethod: PaymentMethods.BankTransfer,
        dueDays: 14,
        schedule: {
            period: InvoiceSchedulePeriods.None,
            billPreviousPeriod: false,
            issueOn: InvoiceDateAnchors.Today,
            issueDayOfMonth: 1,
            supplyOn: InvoiceDateAnchors.Today,
            supplyDayOfMonth: 1,
            dueMode: DueDateModes.Days,
            dueDayOfMonth: 15,
        },
        units: {},
        vatRate: 0,
        items: [],
        notes: [],
        constantSymbol: '',
        payBySquare: true,
        officialCountryNames: true,
        barcode: true,
    },
    email: {
        subject: '',
        body: '',
        from: '',
        cc: '',
        mode: EmailDeliveryModes.Attachment,
    },
    drive: {
        folderPath: 'Invoices/{YYYY}',
        fileNamePattern: '{number}_{customer}',
        autoUpload: true,
    },
};
