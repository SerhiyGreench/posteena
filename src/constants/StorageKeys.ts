/**
 * Keys used with the reactive `Storage` utility.
 *
 * Google Drive sessions are grouped by OAuth scope, because a token issued for
 * one scope cannot be replayed against another:
 *
 * - `DriveFileToken` — `drive.file` scope, shared by every feature that writes
 *   real, user-visible files (knowledge base, invoices).
 * - `DriveAppDataToken` — `drive.appdata` scope, used by features that keep
 *   their data in the hidden application folder (notes, passwords).
 */
export const StorageKeys = {
    DriveFileToken: 'posteena-gdrive-token',
    DriveAppDataToken: 'gdrive_access_token',
    /**
     * `gmail.compose` scope, kept apart from the Drive token: it is granted
     * separately and only when an invoice is actually e-mailed.
     */
    GmailComposeToken: 'posteena-gmail-token',
    InvoicesCache: 'posteena_invoices_cache',
} as const;

export type StorageKeysType = (typeof StorageKeys)[keyof typeof StorageKeys];
