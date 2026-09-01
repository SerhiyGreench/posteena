import { StorageKeys } from '@/constants/StorageKeys';
import type {
    InvoiceRegistry,
    InvoicesStorageAdapter,
} from '@/features/invoices/types';
import { Storage } from '@/lib/Storage';

const DISCOVERY_DOC =
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

/**
 * `drive.file` only exposes files this application created, which is exactly
 * what we want: the app can never read the rest of the user's Drive.
 */
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const ROOT_FOLDER_NAME = 'Posteena Invoices';
const REGISTRY_FILENAME = 'invoices.json';
const REGISTRY_MIME_TYPE = 'application/json';

interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
}

interface TokenClient {
    callback: (response: TokenResponse) => void;
    error_callback: (error: { message?: string }) => void;
    requestAccessToken: (args: { prompt: string }) => void;
}

interface StoredSession {
    accessToken: string;
    expiresAt: number;
}

interface DriveFile {
    id?: string;
    name?: string;
    webViewLink?: string;
}

interface DriveFileList {
    result: { files?: DriveFile[] };
}

interface GapiDrive {
    files: {
        list: (args: {
            q: string;
            spaces?: string;
            fields: string;
            pageSize?: number;
        }) => Promise<DriveFileList>;
        create: (args: {
            resource: { name: string; mimeType?: string; parents?: string[] };
            fields: string;
        }) => Promise<{ result: DriveFile }>;
    };
    about: {
        get: (args: { fields: string }) => Promise<{
            result: { user: { permissionId?: string; displayName?: string } };
        }>;
    };
}

interface Gapi {
    load: (name: string, callback: () => void) => void;
    client: {
        init: (args: { discoveryDocs: string[] }) => Promise<void>;
        setToken: (args: { access_token: string }) => void;
        drive: GapiDrive;
    };
}

interface GoogleIdentity {
    accounts: {
        oauth2: {
            initTokenClient: (args: {
                client_id: string;
                scope: string;
                callback: (response: TokenResponse) => void;
            }) => TokenClient;
            revoke: (token: string, callback: () => void) => void;
        };
    };
}

declare const gapi: Gapi;
declare const google: GoogleIdentity;

/** Escapes a value for interpolation into a Drive query string. */
function escapeQueryValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Loads a script tag once and resolves when it has finished executing. */
function loadScript(src: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${src}"]`,
        );

        if (existing) {
            resolve();

            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
    });
}

/**
 * Stores the invoice registry and the generated documents in the user's own
 * Google Drive.
 *
 * The registry lives in a single JSON file so the whole dataset is read and
 * written atomically, while rendered PDFs and DOCX files are written to the
 * folder path configured in settings.
 */
export class GoogleDriveInvoicesAdapter implements InvoicesStorageAdapter {
    private tokenClient: TokenClient | null = null;
    private accessToken: string | null = null;
    private expiresAt: number | null = null;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    constructor(private clientId: string) {}

    private async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (!this.initPromise) {
            this.initPromise = this.performInit().catch(error => {
                // Let a later attempt retry instead of reusing a rejected promise.
                this.initPromise = null;

                throw error;
            });
        }

        await this.initPromise;
    }

    private async performInit(): Promise<void> {
        if (!this.clientId) {
            throw new Error(
                'Google sign-in is not configured: set VITE_GOOGLE_CLIENT_ID in your .env file and restart the dev server.',
            );
        }

        await loadScript('https://apis.google.com/js/api.js');

        await new Promise<void>(resolve => {
            gapi.load('client', () => {
                void gapi.client
                    .init({ discoveryDocs: [DISCOVERY_DOC] })
                    .then(() => resolve());
            });
        });

        await loadScript('https://accounts.google.com/gsi/client');

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: SCOPES,
            callback: (response: TokenResponse) => {
                if (!response.error) {
                    this.setSession(response);
                }
            },
        });

        const stored = Storage.get<StoredSession | null>(
            StorageKeys.DriveFileToken,
            null,
        );

        if (stored) {
            this.accessToken = stored.accessToken;
            this.expiresAt = stored.expiresAt;
            gapi.client.setToken({ access_token: this.accessToken });
        }

        this.isInitialized = true;
    }

    private setSession(response: TokenResponse): void {
        this.accessToken = response.access_token;
        this.expiresAt = Date.now() + response.expires_in * 1000;

        Storage.set<StoredSession>(StorageKeys.DriveFileToken, {
            accessToken: this.accessToken,
            expiresAt: this.expiresAt,
        });
        gapi.client.setToken({ access_token: this.accessToken });
    }

    /**
     * Whether a Drive session exists at all.
     *
     * An expired token still counts: `requireToken` refreshes it silently and
     * only clears the session when that fails. Reporting expiry as "signed out"
     * here would make writes skip Drive without telling anyone.
     */
    public isAuthenticated(): boolean {
        const stored = Storage.get<StoredSession | null>(
            StorageKeys.DriveFileToken,
            null,
        );

        if (!stored) {
            this.accessToken = null;
            this.expiresAt = null;

            return false;
        }

        this.accessToken = stored.accessToken;
        this.expiresAt = stored.expiresAt;

        return true;
    }

    private async loginWithPrompt(prompt: string): Promise<void> {
        await this.init();

        return new Promise<void>((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Google Identity Services failed to load'));

                return;
            }

            this.tokenClient.callback = (response: TokenResponse) => {
                if (response.error) {
                    reject(new Error(response.error));

                    return;
                }

                this.setSession(response);
                resolve();
            };

            this.tokenClient.error_callback = (error): void => {
                reject(new Error(error.message ?? 'Google sign-in failed'));
            };

            this.tokenClient.requestAccessToken({ prompt });
        });
    }

    public async login(): Promise<void> {
        await this.loginWithPrompt('consent');
    }

    public async logout(): Promise<void> {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {});
        }

        this.accessToken = null;
        this.expiresAt = null;
        Storage.set<StoredSession | null>(StorageKeys.DriveFileToken, null);
    }

    /**
     * Ensures a usable token before every API call, refreshing silently when
     * the current one is about to expire.
     */
    private async requireToken(): Promise<string> {
        await this.init();

        if (
            this.accessToken &&
            this.expiresAt &&
            Date.now() < this.expiresAt - 60_000
        ) {
            return this.accessToken;
        }

        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }

        try {
            await this.loginWithPrompt('');
        } catch {
            this.accessToken = null;
            this.expiresAt = null;
            Storage.set<StoredSession | null>(StorageKeys.DriveFileToken, null);

            throw new Error('Session expired, please sign in again');
        }

        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }

        return this.accessToken;
    }

    public async getUserIdentifier(): Promise<string | null> {
        try {
            await this.requireToken();

            const response = await gapi.client.drive.about.get({
                fields: 'user(permissionId,displayName)',
            });

            return (
                response.result.user.displayName ??
                response.result.user.permissionId ??
                null
            );
        } catch (error) {
            console.error('Failed to read Drive user:', error);

            return null;
        }
    }

    /**
     * Finds a folder by name under a parent, creating it when missing.
     *
     * Takes a token first: `gapi.client.drive` only exists once the discovery
     * document has loaded, and reading it earlier throws.
     */
    private async ensureFolder(
        name: string,
        parentId: string,
    ): Promise<string> {
        await this.requireToken();

        const response = await gapi.client.drive.files.list({
            q:
                `name = '${escapeQueryValue(name)}' and ` +
                `mimeType = '${FOLDER_MIME_TYPE}' and ` +
                `'${escapeQueryValue(parentId)}' in parents and trashed = false`,
            fields: 'files(id)',
            pageSize: 1,
        });

        const existing = response.result?.files?.[0]?.id;

        if (existing) {
            return existing;
        }

        const created = await gapi.client.drive.files.create({
            resource: {
                name,
                mimeType: FOLDER_MIME_TYPE,
                parents: [parentId],
            },
            fields: 'id',
        });

        const id = created.result.id;

        if (!id) {
            throw new Error(`Failed to create Drive folder "${name}"`);
        }

        return id;
    }

    /**
     * Walks a folder path from the Drive root, creating any missing level.
     *
     * Under the `drive.file` scope only folders this app created are visible,
     * so the whole chain is app-owned by construction.
     */
    private async ensureFolderPath(segments: string[]): Promise<string> {
        let parentId = 'root';

        for (const segment of segments) {
            parentId = await this.ensureFolder(segment, parentId);
        }

        return parentId;
    }

    /** Finds a file by exact name inside a folder. */
    private async findFile(
        name: string,
        parentId: string,
    ): Promise<string | null> {
        await this.requireToken();

        const response = await gapi.client.drive.files.list({
            q:
                `name = '${escapeQueryValue(name)}' and ` +
                `'${escapeQueryValue(parentId)}' in parents and trashed = false`,
            fields: 'files(id)',
            pageSize: 1,
        });

        return response.result?.files?.[0]?.id ?? null;
    }

    /**
     * Creates or overwrites a file, returning its id and shareable link.
     * Overwriting keeps regenerated documents from piling up as duplicates.
     */
    private async writeFile(args: {
        parentId: string;
        fileName: string;
        mimeType: string;
        content: Blob;
    }): Promise<{ driveFileId: string; webViewLink: string }> {
        const token = await this.requireToken();
        const existingId = await this.findFile(args.fileName, args.parentId);
        const fields = 'id,webViewLink';

        const url = existingId
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart&fields=${fields}`
            : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${fields}`;

        const metadata = existingId
            ? { name: args.fileName }
            : { name: args.fileName, parents: [args.parentId] };

        const form = new FormData();
        form.append(
            'metadata',
            new Blob([JSON.stringify(metadata)], {
                type: 'application/json',
            }),
        );
        form.append('file', new Blob([args.content], { type: args.mimeType }));

        const response = await fetch(url, {
            method: existingId ? 'PATCH' : 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
        });

        if (!response.ok) {
            throw new Error(
                `Drive upload failed (${response.status} ${response.statusText})`,
            );
        }

        const result = (await response.json()) as DriveFile;

        if (!result.id) {
            throw new Error('Drive upload returned no file id');
        }

        return {
            driveFileId: result.id,
            webViewLink: result.webViewLink ?? '',
        };
    }

    public async fetchRegistry(): Promise<InvoiceRegistry | null> {
        const token = await this.requireToken();
        const folderId = await this.ensureFolderPath([ROOT_FOLDER_NAME]);
        const fileId = await this.findFile(REGISTRY_FILENAME, folderId);

        if (!fileId) {
            return null;
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!response.ok) {
            throw new Error('Failed to download the invoice registry');
        }

        try {
            return (await response.json()) as InvoiceRegistry;
        } catch (error) {
            console.error('Invoice registry is not valid JSON:', error);

            return null;
        }
    }

    public async saveRegistry(registry: InvoiceRegistry): Promise<void> {
        await this.requireToken();

        const folderId = await this.ensureFolderPath([ROOT_FOLDER_NAME]);

        await this.writeFile({
            parentId: folderId,
            fileName: REGISTRY_FILENAME,
            mimeType: REGISTRY_MIME_TYPE,
            content: new Blob([JSON.stringify(registry, null, 2)], {
                type: REGISTRY_MIME_TYPE,
            }),
        });
    }

    public async uploadDocument(args: {
        folderPath: string;
        fileName: string;
        mimeType: string;
        content: Blob;
    }): Promise<{ driveFileId: string; webViewLink: string }> {
        await this.requireToken();

        const segments = args.folderPath
            .split('/')
            .map(segment => segment.trim())
            .filter(segment => segment.length > 0);

        const parentId = await this.ensureFolderPath(
            segments.length > 0 ? segments : [ROOT_FOLDER_NAME],
        );

        return this.writeFile({
            parentId,
            fileName: args.fileName,
            mimeType: args.mimeType,
            content: args.content,
        });
    }
}
