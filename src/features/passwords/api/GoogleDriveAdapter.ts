import type {
    GroupMetadata,
    PasswordGroup,
    StorageAdapter,
} from '@/features/passwords/types';
import { Storage } from '@/lib/Storage';

declare const gapi: {
    load: (name: string, callback: () => void) => void;
    client: {
        init: (args: { discoveryDocs: string[] }) => Promise<void>;
        setToken: (args: { access_token: string }) => void;
        drive: {
            files: {
                list: (args: { q: string; fields: string }) => Promise<{
                    result: {
                        files: {
                            id?: string;
                            name?: string;
                            modifiedTime?: string;
                            lastModifyingUser?: { displayName: string };
                            appProperties?: Record<string, string>;
                        }[];
                    };
                }>;
                update: (args: {
                    fileId: string;
                    resource: {
                        appProperties: Record<string, string>;
                    };
                }) => Promise<void>;
                delete: (args: { fileId: string }) => Promise<void>;
            };
            about: {
                get: (args: { fields: string }) => Promise<{
                    result: {
                        user: {
                            emailAddress?: string;
                            permissionId?: string;
                        };
                    };
                }>;
            };
        };
    };
};

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

const DISCOVERY_DOC =
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_PROPERTY_KEY = 'posteena_password_group';
const APP_PROPERTY_VERSION = '2';
const GDRIVE_TOKEN_KEY = 'gdrive_access_token';

export class GoogleDriveAdapter implements StorageAdapter {
    private tokenClient: TokenClient | null = null;
    private accessToken: string | null = null;
    private expiresAt: number | null = null;
    private isGapiInitialized = false;

    constructor(private clientId: string) {}

    async init(): Promise<void> {
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

    isAuthenticated(): boolean {
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
            Date.now() < this.expiresAt - 60000 // Refresh if within 1 minute of expiration
        ) {
            return;
        }

        // Attempt silent refresh if we have an access token (even if expired)
        if (this.accessToken) {
            try {
                await this.loginWithPrompt('');
            } catch (err) {
                console.error('Silent refresh failed:', err);
                // If silent refresh fails, we clear the session to force login
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
            throw new Error('Token client not initialized');
        }

        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (
                fn: (arg?: unknown) => void,
                arg?: unknown,
            ): void => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                fn(arg);
            };

            const timer = window.setTimeout(() => {
                finish(reject, new Error('Login was cancelled or timed out'));
            }, 60000);

            this.tokenClient!.callback = (response: TokenResponse) => {
                if (response?.error) {
                    return finish(reject, response);
                }
                this.setSession(response);
                finish(resolve as (arg?: unknown) => void);
            };

            this.tokenClient!.error_callback = (err: { message: string }) => {
                finish(reject, err);
            };

            this.tokenClient!.requestAccessToken({ prompt });
        });
    }

    async login(): Promise<void> {
        await this.init();

        if (this.accessToken && this.expiresAt && Date.now() < this.expiresAt) {
            return; // Already have a valid session
        }

        // Try silent first if we have a token
        if (this.accessToken) {
            try {
                await this.loginWithPrompt('');
                return;
            } catch {
                // Ignore silent failure and fall through to consent
            }
        }

        await this.loginWithPrompt('consent');
    }

    async logout(): Promise<void> {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {});
            this.accessToken = null;
            this.expiresAt = null;
            Storage.set(GDRIVE_TOKEN_KEY, null);
        }
    }

    async getGroups(): Promise<GroupMetadata[]> {
        await this.checkAndRefreshToken();
        const response = await gapi.client.drive.files.list({
            q: `appProperties has { key='${APP_PROPERTY_KEY}' and value='${APP_PROPERTY_VERSION}' } and trashed = false`,
            fields: 'files(id, name, modifiedTime, lastModifyingUser(displayName), appProperties)',
        });

        const files = response.result.files || [];
        return files.map(file => ({
            id: file.appProperties?.group_id || '',
            name: file.appProperties?.group_name || '',
            fileId: file.id || '',
            modifiedTime: file.modifiedTime,
            lastModifyingUser: file.lastModifyingUser?.displayName,
        }));
    }

    async createGroup(name: string): Promise<GroupMetadata> {
        await this.checkAndRefreshToken();
        const id = crypto.randomUUID();
        const filename = `posteena_group_${id}.dat`; // Use .dat for encrypted content

        const fileMetadata = {
            name: filename,
            mimeType: 'application/octet-stream',
            appProperties: {
                [APP_PROPERTY_KEY]: APP_PROPERTY_VERSION,
                group_id: id,
                group_name: name,
            },
        };

        const initialContent: PasswordGroup = {
            id,
            name,
            items: [],
        };

        const form = new FormData();
        form.append(
            'metadata',
            new Blob([JSON.stringify(fileMetadata)], {
                type: 'application/json',
            }),
        );
        // Initially, the file will be saved in plain JSON format via createGroup, but saveGroup will encrypt it.
        // Or we can leave it to the hook to call saveGroup after create.
        // Actually, the hook does not call saveGroup after createGroup.
        // Let's make createGroup just create the file, and then the hook should probably call saveGroup if it wants it encrypted.
        // But createGroup is used to get the initial metadata.
        form.append(
            'file',
            new Blob([JSON.stringify(initialContent)], {
                type: 'application/json',
            }),
        );

        const createResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime,lastModifyingUser(displayName),appProperties',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
                body: form,
            },
        );

        const result = (await createResponse.json()) as {
            id: string;
            modifiedTime?: string;
            lastModifyingUser?: { displayName: string };
        };
        const fileId = result.id;
        return {
            id,
            name,
            fileId,
            modifiedTime: result.modifiedTime,
            lastModifyingUser: result.lastModifyingUser?.displayName,
        };
    }

    async saveGroup(
        group: PasswordGroup & { encryptedContent?: string },
    ): Promise<void> {
        await this.checkAndRefreshToken();
        const response = await gapi.client.drive.files.list({
            q: `appProperties has { key='group_id' and value='${group.id}' } and trashed = false`,
            fields: 'files(id)',
        });
        const files = response.result.files;
        if (!files || files.length === 0) {
            throw new Error('Group file not found');
        }
        const fileId = files[0].id!;

        await gapi.client.drive.files.update({
            fileId: fileId,
            resource: {
                appProperties: {
                    group_name: group.name,
                },
            },
        });

        const content = group.encryptedContent || JSON.stringify(group);
        await this.updateFileContent(fileId, content);
    }

    async loadGroup(fileId: string): Promise<PasswordGroup | string> {
        await this.checkAndRefreshToken();
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            },
        );

        if (!response.ok) {
            throw new Error(`Failed to load group: ${response.statusText}`);
        }

        const text = await response.text();
        try {
            return JSON.parse(text) as PasswordGroup;
        } catch {
            return text; // Return as string if not JSON (it's encrypted)
        }
    }

    async deleteGroup(fileId: string): Promise<void> {
        await this.checkAndRefreshToken();
        await gapi.client.drive.files.delete({ fileId });
    }

    async getUserIdentifier(): Promise<string | null> {
        await this.checkAndRefreshToken();
        try {
            const response = await gapi.client.drive.about.get({
                fields: 'user(emailAddress, permissionId)',
            });
            const user = response.result.user;
            if (!user) {
                return null;
            }
            return user.permissionId || user.emailAddress || null;
        } catch (err) {
            console.error('Error getting user identifier:', err);
            return null;
        }
    }

    private async updateFileContent(
        fileId: string,
        content: string,
    ): Promise<void> {
        const response = await fetch(
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

        if (!response.ok) {
            const error = await response.text();
            throw new Error(
                `Failed to update file content: ${response.statusText} - ${error}`,
            );
        }
    }
}
