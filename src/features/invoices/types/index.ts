import type { CurrencyType } from '@/features/invoices/constants/Currencies';
import type { DocumentLanguageType } from '@/features/invoices/constants/DocumentLanguages';
import type { DueDateModeType } from '@/features/invoices/constants/DueDateModes';
import type { EmailDeliveryModeType } from '@/features/invoices/constants/EmailDeliveryModes';
import type { InvoiceDateAnchorType } from '@/features/invoices/constants/InvoiceDateAnchors';
import type { InvoiceSchedulePeriodType } from '@/features/invoices/constants/InvoiceSchedulePeriods';
import type { InvoiceStatusType } from '@/features/invoices/constants/InvoiceStatuses';
import type { PaymentMethodType } from '@/features/invoices/constants/PaymentMethods';
import type { InvoiceBarcode } from '@/features/invoices/utils/createInvoiceBarcode';
import type { PayBySquareQr } from '@/features/invoices/utils/createPayBySquareQr';

/**
 * A legal entity taking part in an invoice (supplier or customer).
 * Every field is optional except the name so that foreign customers,
 * which rarely carry Slovak-style identifiers, can be described too.
 */
export interface Party {
    id: string;
    name: string;
    /** e.g. "Limited Company", "Spoločnosť s ručením obmedzeným". */
    legalForm: string;
    street: string;
    city: string;
    postalCode: string;
    /** ISO 3166-1 alpha-2 code; the printed name comes from `Intl`. */
    countryCode: string;
    /**
     * Free-text country, kept only for records saved before countries were
     * picked from a list. Used when `countryCode` is empty.
     */
    country: string;
    /** IČO in Slovakia, Registration Number elsewhere. */
    registrationNumber: string;
    /** DIČ — Slovak income tax identifier. */
    taxNumber: string;
    /** IČ DPH / EU VAT ID. Empty when the party is not VAT registered. */
    vatNumber: string;
    /** Court and section the entity is recorded in. */
    commercialRegister: string;
    email: string;
    phone: string;
    /** Free-form remark shown under the party block. */
    note: string;
    /**
     * The customer preselected on a new invoice. At most one company carries
     * this flag; setting it on another clears the previous one.
     */
    isPrimary: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * Bank coordinates printed in the payment block of the invoice.
 */
export interface BankAccount {
    accountHolder: string;
    bankName: string;
    iban: string;
    swift: string;
    /** Domestic account number, optional next to the IBAN. */
    accountNumber: string;
}

/**
 * The issuing company. Extends a party with the data only a supplier needs.
 */
export interface SupplierProfile extends Party {
    bank: BankAccount;
    /** Income tax registration decision reference. */
    incomeTaxRegistration: string;
    /** When false a "not registered for VAT" note is printed. */
    vatRegistered: boolean;
}

/**
 * A single billable row of the invoice.
 */
export interface InvoiceLineItem {
    id: string;
    /**
     * Description per language. A language with no entry falls back to any
     * other, so a half-translated line still prints something.
     */
    descriptions: Partial<Record<DocumentLanguageType, string>>;
    quantity: number;
    /**
     * Unit of measure per language ("ks" / "pcs" / "шт"). Free text, because
     * the abbreviations differ per language and per trade.
     */
    units: Partial<Record<DocumentLanguageType, string>>;
    unitPrice: number;
    /** VAT percentage applied to this row, 0 for non-VAT payers. */
    vatRate: number;
}

/**
 * Monetary summary of an invoice. Always recalculated from the line items,
 * but stored on the invoice so a reissued document stays byte-identical.
 */
export interface InvoiceTotals {
    subtotal: number;
    vatAmount: number;
    total: number;
    paidInAdvance: number;
    amountDue: number;
}

/**
 * Reference to a document that was rendered and uploaded to Google Drive.
 */
export interface GeneratedFileRef {
    id: string;
    format: InvoiceFileFormatType;
    fileName: string;
    /** Drive file id, null when the file was only downloaded locally. */
    driveFileId: string | null;
    /** Drive folder path the file was written to. */
    folderPath: string;
    webViewLink: string;
    generatedAt: string;
}

export const InvoiceFileFormats = {
    Pdf: 'pdf',
    Docx: 'docx',
} as const;

export type InvoiceFileFormatType =
    (typeof InvoiceFileFormats)[keyof typeof InvoiceFileFormats];

/**
 * Payment identifiers used by Slovak and Czech banking.
 */
export interface PaymentSymbols {
    variableSymbol: string;
    constantSymbol: string;
    specificSymbol: string;
}

/**
 * A fully self-contained invoice record.
 *
 * Supplier, customer and bank data are deliberately stored as snapshots
 * rather than references: editing the global settings or deleting a company
 * must never change a document that has already been issued.
 */
export interface Invoice {
    id: string;
    number: string;
    /** Sequence counter the number was produced from. */
    sequenceNumber: number;
    /** Period key (usually the year) the sequence belongs to. */
    sequencePeriod: string;
    /**
     * True when the user typed the number by hand in the advanced settings.
     * Manual numbers never consume the automatic sequence.
     */
    numberIsManual: boolean;
    status: InvoiceStatusType;
    /** Languages printed on the document, in the order they appear. */
    languages: DocumentLanguageType[];
    currency: CurrencyType;
    paymentMethod: PaymentMethodType;
    /** ISO date (yyyy-MM-dd). */
    issueDate: string;
    supplyDate: string;
    dueDate: string;
    orderNumber: string;
    symbols: PaymentSymbols;
    items: InvoiceLineItem[];
    totals: InvoiceTotals;
    /** Footer notes, e.g. reverse charge statements. */
    notes: string[];
    /**
     * Print a PAY by square code. Snapshotted per invoice so changing the
     * setting never alters an already issued document.
     */
    payBySquare: boolean;
    /**
     * Print the formal state name ("Slovak Republic") instead of the common
     * one ("Slovakia"). Snapshotted per invoice like every other choice.
     */
    officialCountryNames: boolean;
    /** Print a Code 128 barcode of the invoice number at the top. */
    barcode: boolean;
    supplier: SupplierProfile;
    customer: Party;
    /** Link back to the company registry; null when that entry was removed. */
    customerId: string | null;
    files: GeneratedFileRef[];
    createdAt: string;
    updatedAt: string;
    issuedAt: string | null;
    /** Id of the invoice this one was cloned from, if any. */
    clonedFromId: string | null;
}

/**
 * Invoice number generation rules.
 */
export interface InvoiceNumbering {
    /** Supports {YYYY}, {YY}, {MM}, {DD} and {N...N} placeholders. */
    pattern: string;
    nextSequence: number;
    /** Restart the counter when the period key changes. */
    resetYearly: boolean;
    /** Period the current `nextSequence` belongs to. */
    currentPeriod: string;
}

/**
 * Rules that decide the dates on a new invoice.
 */
export interface InvoiceSchedule {
    /** Calendar period the invoice covers. */
    period: InvoiceSchedulePeriodType;
    /** Bill the period that just ended rather than the current one. */
    billPreviousPeriod: boolean;
    issueOn: InvoiceDateAnchorType;
    /** Day used when `issueOn` is `DayOfMonth`; clamped to the month's length. */
    issueDayOfMonth: number;
    supplyOn: InvoiceDateAnchorType;
    /** Day used when `supplyOn` is `DayOfMonth`. */
    supplyDayOfMonth: number;
    dueMode: DueDateModeType;
    /** Day of the following month, when `dueMode` is `DayOfNextMonth`. */
    dueDayOfMonth: number;
}

/**
 * Values pre-filled into every new invoice.
 */
export interface InvoiceDefaults {
    languages: DocumentLanguageType[];
    currency: CurrencyType;
    paymentMethod: PaymentMethodType;
    /** Days added to the issue date to obtain the due date. */
    dueDays: number;
    /** How the issue, supply and due dates are chosen. */
    schedule: InvoiceSchedule;
    /** Unit of measure a new line starts with, per language. */
    units: Partial<Record<DocumentLanguageType, string>>;
    vatRate: number;
    /**
     * Line items copied onto every new invoice. Each gets a fresh id at draft
     * time so editing an invoice never writes back into the settings.
     */
    items: InvoiceLineItem[];
    notes: string[];
    constantSymbol: string;
    /** Print a PAY by square payment code on new invoices. */
    payBySquare: boolean;
    /** Print formal state names rather than the common ones. */
    officialCountryNames: boolean;
    /** Print a Code 128 barcode of the invoice number at the top. */
    barcode: boolean;
}

/**
 * Where generated documents are written in Google Drive.
 */
export interface DriveOutputSettings {
    /** Slash separated path from the Drive root. Supports {YYYY} and {MM}. */
    folderPath: string;
    /** Supports {number}, {customer}, {date} and {supplier}. */
    fileNamePattern: string;
    /** Upload generated documents to Drive in addition to downloading them. */
    autoUpload: boolean;
}

/**
 * Templates for the Gmail draft an invoice can be sent with.
 *
 * Both support `{number}`, `{customer}`, `{supplier}`, `{amount}`,
 * `{currency}`, `{dueDate}` and `{link}`.
 */
export interface EmailSettings {
    subject: string;
    body: string;
    /**
     * Verified send-as alias to put in `From:`. Empty uses the account's
     * default address. Only honoured when the invoice is attached, since a
     * compose link cannot set the sender at all.
     */
    from: string;
    /** Always copied in, e.g. the accountant. Comma separated. */
    cc: string;
    /** Whether the PDF is attached to a draft or linked from Drive. */
    mode: EmailDeliveryModeType;
}

/**
 * Global, rarely changing configuration stored in Google Drive.
 */
export interface InvoiceSettings {
    supplier: SupplierProfile;
    numbering: InvoiceNumbering;
    defaults: InvoiceDefaults;
    drive: DriveOutputSettings;
    email: EmailSettings;
}

/**
 * Per-invoice overrides of the global settings. Every field is optional;
 * an absent field means "inherit from settings".
 */
export interface InvoiceOverrides {
    supplier?: Partial<SupplierProfile>;
    bank?: Partial<BankAccount>;
    numberOverride?: string;
    notes?: string[];
}

/**
 * The single document persisted to Google Drive.
 */
export interface InvoiceRegistry {
    version: number;
    settings: InvoiceSettings;
    companies: Party[];
    invoices: Invoice[];
    updatedAt: string;
}

/**
 * A resolved `label: value` pair ready to be printed.
 */
export interface InvoiceDocumentField {
    label: string;
    value: string;
    /** Render the value in bold — used for the due date and the amount due. */
    strong?: boolean;
}

/**
 * A row of the totals block, including the amount due in its filled band.
 *
 * The label carries one line per language rather than a slash-joined string:
 * the block is narrow, and "Celková suma bez DPH / Total amount excl. VAT /
 * Загальна сума без ПДВ" does not fit on one line there.
 */
export interface InvoiceDocumentTotal {
    labelLines: string[];
    value: string;
}

/**
 * One of the two address blocks at the top of the document.
 */
export interface InvoiceDocumentParty {
    heading: string;
    /** Name and address, one entry per printed line. */
    addressLines: string[];
    /** Identifiers such as IČO, DIČ and IČ DPH. */
    fields: InvoiceDocumentField[];
}

export type InvoiceDocumentAlignType = 'left' | 'right' | 'center';

/**
 * The line items table, already formatted into strings.
 */
export interface InvoiceDocumentTable {
    /** One entry per column, each holding a line per language. */
    headers: string[][];
    rows: string[][];
    aligns: InvoiceDocumentAlignType[];
    /** Relative column widths, summing to 1. */
    widths: number[];
}

/**
 * A fully resolved, renderer-agnostic invoice document.
 *
 * `buildInvoiceDocument` turns an `Invoice` into this shape once — resolving
 * labels, languages, number and date formats — and the PDF and DOCX renderers
 * then only lay it out. Layout changes therefore never fork between formats.
 */
export interface InvoiceDocumentModel {
    title: string;
    numberLabel: string;
    number: string;
    supplier: InvoiceDocumentParty;
    customer: InvoiceDocumentParty;
    dates: InvoiceDocumentField[];
    payment: InvoiceDocumentField[];
    itemsHeading: string;
    items: InvoiceDocumentTable;
    summary: InvoiceDocumentTotal[];
    totalDue: InvoiceDocumentTotal;
    /** One entry per language: that language's label and the spelled amount. */
    amountInWords: InvoiceDocumentField[];
    notes: string[];
    /** Rendered payment QR, or null when the invoice cannot produce one. */
    payBySquare: PayBySquareQr | null;
    /** Code 128 of the invoice number, printed above the header. */
    barcode: InvoiceBarcode | null;
}

/**
 * Storage backend contract. Mirrors the notes and knowledge adapters so
 * alternative drives can be added without touching the hook or the UI.
 */
export interface InvoicesStorageAdapter {
    login(): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getUserIdentifier(): Promise<string | null>;
    fetchRegistry(): Promise<InvoiceRegistry | null>;
    saveRegistry(registry: InvoiceRegistry): Promise<void>;
    uploadDocument(args: {
        folderPath: string;
        fileName: string;
        mimeType: string;
        content: Blob;
    }): Promise<{ driveFileId: string; webViewLink: string }>;
}
