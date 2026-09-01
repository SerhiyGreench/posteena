import { parseISO } from 'date-fns';

import {
    type Invoice,
    type InvoiceFileFormatType,
    InvoiceFileFormats,
} from '@/features/invoices/types';

/**
 * Characters Google Drive tolerates but that make file names awkward to work
 * with locally. Replaced with a hyphen.
 */
const UnsafeFileNameCharacters = /[\\/:*?"<>|#%{}$!'`@+=]+/g;

/**
 * Trims a name segment down to something safe to use as a Drive file or folder
 * name, collapsing runs of separators and capping the length.
 */
export function sanitiseDriveName(value: string): string {
    return value
        .replace(UnsafeFileNameCharacters, '-')
        .replace(/\s+/g, ' ')
        .replace(/-{2,}/g, '-')
        .replace(/^[-\s.]+|[-\s.]+$/g, '')
        .slice(0, 120);
}

/** Expands the date placeholders shared by the folder and file name patterns. */
function expandDatePlaceholders(pattern: string, date: Date): string {
    return pattern
        .replace(/\{YYYY\}/g, String(date.getFullYear()))
        .replace(/\{YY\}/g, String(date.getFullYear()).slice(-2))
        .replace(/\{MM\}/g, String(date.getMonth() + 1).padStart(2, '0'))
        .replace(/\{DD\}/g, String(date.getDate()).padStart(2, '0'));
}

/** Parses an ISO date, falling back to today for empty or malformed input. */
function toDate(isoDate: string): Date {
    if (!isoDate) {
        return new Date();
    }

    const parsed = parseISO(isoDate);

    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Expands a configured Drive folder path into concrete segments.
 *
 * `Posteena Invoices/{YYYY}` becomes `['Posteena Invoices', '2026']`. Empty
 * segments are dropped so stray or trailing slashes are harmless.
 */
export function resolveDriveFolderSegments(
    folderPathPattern: string,
    issueDate: string,
): string[] {
    return expandDatePlaceholders(folderPathPattern, toDate(issueDate))
        .split('/')
        .map(segment => sanitiseDriveName(segment))
        .filter(segment => segment.length > 0);
}

/**
 * Expands the configured file name pattern for an invoice.
 *
 * Supported placeholders: `{number}`, `{customer}`, `{supplier}`, `{date}`
 * plus the date placeholders above. The extension is appended here so callers
 * never assemble it themselves.
 */
export function resolveDriveFileName(
    fileNamePattern: string,
    invoice: Invoice,
    format: InvoiceFileFormatType,
): string {
    const issued = toDate(invoice.issueDate);

    const expanded = expandDatePlaceholders(fileNamePattern, issued)
        .replace(/\{number\}/g, invoice.number)
        .replace(/\{customer\}/g, invoice.customer.name)
        .replace(/\{supplier\}/g, invoice.supplier.name)
        .replace(/\{date\}/g, invoice.issueDate);

    const safe = sanitiseDriveName(expanded) || invoice.number || 'invoice';

    return `${safe}.${format}`;
}

/** MIME type to upload a generated document with. */
export function resolveDocumentMimeType(format: InvoiceFileFormatType): string {
    return format === InvoiceFileFormats.Pdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
