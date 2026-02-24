import type { Note, NotesStorageAdapter } from '@/features/notes/types';
import { Storage } from '@/lib/Storage';

const DISCOVERY_DOC =
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const NOTES_FILENAME = 'posteena_notes.json';
const GDRIVE_TOKEN_KEY = 'gdrive_access_token';

interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: unknown;
}

interface TokenClient {
    callback: (response: TokenResponse) => void;
    error_callback: (err: { message: string }) => void;
    requestAccessToken: (args: { prompt: string }) => void;
}

interface StoredSession {
    accessToken: string;
    expiresAt: number;
}

declare const gapi: {
    load: (name: string, callback: () => void) => void;
    client: {
        init: (args: { discoveryDocs: string[] }) => Promise<void>;
        setToken: (args: { access_token: string }) => void;
        drive: {
            files: {
                list: (args: {
                    q: string;
                    spaces?: string;
                    fields: string;
                }) => Promise<{
                    result: {
                        files: {
                            id?: string;
                            name?: string;
                        }[];
                    };
                }>;
                get: (args: {
                    fileId: string;
                    alt?: string;
                    fields?: string;
                }) => Promise<{
                    body: string;
                    result: unknown;
                }>;
            };
            about: {
                get: (args: { fields: string }) => Promise<{
                    result: {
                        user: {
                            permissionId?: string;
                        };
                    };
                }>;
            };
        };
    };
};
declare const google: {
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
};

export class GoogleDriveNotesAdapter implements NotesStorageAdapter {
    private tokenClient: TokenClient | null = null;
    private accessToken: string | null = null;
    private expiresAt: number | null = null;
    private isGapiInitialized = false;

    constructor(private clientId: string) {}

    private async init(): Promise<void> {
        if (this.isGapiInitialized) {
            return;
        }

        await new Promise<void>(resolve => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                gapi.load('client', async () => {
                    await gapi.client.init({
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    this.isGapiInitialized = true;
                    resolve();
                });
            };
            document.body.appendChild(script);
        });

        await new Promise<void>(resolve => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.clientId,
                    scope: SCOPES,
                    callback: (response: TokenResponse) => {
                        if (response.error !== undefined) {
                            throw response;
                        }
                        this.setSession(response);
                    },
                });
                resolve();
            };
            document.body.appendChild(script);
        });

        const stored = Storage.get<StoredSession | null>(
            GDRIVE_TOKEN_KEY,
            null,
        );
        if (stored) {
            this.accessToken = stored.accessToken;
            this.expiresAt = stored.expiresAt;
            gapi.client.setToken({ access_token: this.accessToken });
        }
    }

    private setSession(response: TokenResponse): void {
        this.accessToken = response.access_token;
        this.expiresAt = Date.now() + response.expires_in * 1000;
        Storage.set(GDRIVE_TOKEN_KEY, {
            accessToken: this.accessToken,
            expiresAt: this.expiresAt,
        } as StoredSession);
        gapi.client.setToken({ access_token: this.accessToken });
    }

    public isAuthenticated(): boolean {
        // Always check storage for reactivity to external logout
        const stored = Storage.get<StoredSession | null>(
            GDRIVE_TOKEN_KEY,
            null,
        );

        if (!stored) {
            this.accessToken = null;
            this.expiresAt = null;
            return false;
        }

        // Return true if we have a token that's not expired
        if (this.accessToken && this.expiresAt && Date.now() < this.expiresAt) {
            return true;
        }

        // Sync local state if storage has it
        this.accessToken = stored.accessToken;
        this.expiresAt = stored.expiresAt;
        return true;
    }

    private async checkAndRefreshToken(): Promise<void> {
        await this.init();
        if (
            this.accessToken &&
            this.expiresAt &&
            Date.now() < this.expiresAt - 60000
        ) {
            return;
        }

        if (this.accessToken) {
            try {
                await this.loginWithPrompt('');
            } catch (err) {
                console.error('Silent refresh failed:', err);
                this.accessToken = null;
                this.expiresAt = null;
                Storage.set(GDRIVE_TOKEN_KEY, null);
                throw new Error('Session expired, please login again');
            }
        } else {
            throw new Error('Not authenticated');
        }
    }

    private async loginWithPrompt(prompt: string): Promise<void> {
        if (!this.tokenClient) {
            await this.init();
        }
        return new Promise((resolve, reject) => {
            const finish = (fn: (arg: unknown) => void, arg: unknown): void => {
                try {
                    fn(arg);
                } catch (e) {
                    console.error(e);
                }
            };

            const originalCallback = this.tokenClient!.callback;
            this.tokenClient!.callback = (response: TokenResponse) => {
                finish(originalCallback as (arg: unknown) => void, response);
                if (response.error) {
                    reject(response);
                } else {
                    resolve();
                }
            };
            this.tokenClient!.error_callback = (err: { message: string }) => {
                reject(err);
            };
            this.tokenClient!.requestAccessToken({ prompt });
        });
    }

    public async login(): Promise<void> {
        await this.loginWithPrompt('consent');
    }

    public async logout(): Promise<void> {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {});
            this.accessToken = null;
            this.expiresAt = null;
            Storage.set(GDRIVE_TOKEN_KEY, null);
        }
    }

    public async getUserIdentifier(): Promise<string | null> {
        try {
            await this.checkAndRefreshToken();
            const response = await gapi.client.drive.about.get({
                fields: 'user(permissionId)',
            });
            return response.result.user.permissionId || null;
        } catch (error) {
            console.error('Error getting user identifier:', error);
            return null;
        }
    }

    private async getFileId(): Promise<string | null> {
        const response = await gapi.client.drive.files.list({
            q: `name = '${NOTES_FILENAME}' and trashed = false`,
            spaces: 'appDataFolder',
            fields: 'files(id)',
        });
        const files = response.result.files || [];
        return files.length > 0 ? (files[0].id ?? null) : null;
    }

    public async list(): Promise<Note[]> {
        await this.checkAndRefreshToken();
        const fileId = await this.getFileId();
        if (!fileId) {
            return [];
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            },
        );

        if (!response.ok) {
            throw new Error('Failed to download notes');
        }

        try {
            const data = await response.json();
            return data.notes || [];
        } catch (e) {
            console.error('Failed to parse notes file:', e);
            return [];
        }
    }

    public async save(notes: Note[]): Promise<void> {
        await this.checkAndRefreshToken();
        let fileId = await this.getFileId();
        const content = JSON.stringify({ notes });

        if (!fileId) {
            // Create file
            const metadata = {
                name: NOTES_FILENAME,
                parents: ['appDataFolder'],
            };

            const form = new FormData();
            form.append(
                'metadata',
                new Blob([JSON.stringify(metadata)], {
                    type: 'application/json',
                }),
            );
            form.append(
                'file',
                new Blob([content], { type: 'application/json' }),
            );

            await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                    body: form,
                },
            );
        } else {
            // Update file
            await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: content,
                },
            );
        }
    }
}
