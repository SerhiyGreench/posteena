import type {
    Knowledge,
    KnowledgeArticle,
    KnowledgeStorageAdapter,
} from '@/features/knowledge/types';
import { Storage } from '@/lib/Storage';

const DISCOVERY_DOC =
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const KNOWLEDGE_FOLDER_NAME = 'Posteena Knowledge';
const COLLECTION_INDEX_FILENAME = 'knowledge.json';
const GDRIVE_TOKEN_KEY = 'posteena-gdrive-token';

interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
}

interface TokenClient {
    callback: (response: TokenResponse) => void;
    error_callback: (err: unknown) => void;
    requestAccessToken: (args: { prompt: string }) => void;
}

interface StoredSession {
    accessToken: string;
    expiresAt: number;
}

/* oxlint-disable typescript/no-explicit-any */
declare const gapi: any;
declare const google: any;

export class GoogleDriveKnowledgeAdapter implements KnowledgeStorageAdapter {
    private tokenClient: TokenClient | null = null;
    private accessToken: string | null = null;
    private expiresAt: number | null = null;
    private isGapiInitialized = false;

    constructor(private clientId: string) {}

    public async init(): Promise<void> {
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
        const stored = Storage.get<StoredSession | null>(
            GDRIVE_TOKEN_KEY,
            null,
        );

        if (!stored) {
            this.accessToken = null;
            this.expiresAt = null;
            return false;
        }

        if (this.accessToken && this.expiresAt && Date.now() < this.expiresAt) {
            return true;
        }

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
        }
    }

    private async loginWithPrompt(prompt: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const finish = (fn: (arg: any) => void, arg: any) => {
                fn(arg);
                resolve();
            };

            this.tokenClient!.callback = (response: TokenResponse) => {
                if (response.error !== undefined) {
                    return reject(response);
                }
                finish(this.setSession.bind(this), response);
            };
            this.tokenClient!.error_callback = (err: unknown) => {
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
                fields: 'user(permissionId,displayName)',
            });
            return (
                response.result.user.displayName ||
                response.result.user.permissionId ||
                null
            );
        } catch (error) {
            console.error('Error getting user identifier:', error);
            return null;
        }
    }

    private async getFolderId(): Promise<string | null> {
        const response = await gapi.client.drive.files.list({
            q: `name = '${KNOWLEDGE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
        });
        const files = response.result.files || [];
        if (files.length > 0) {
            return files[0].id;
        }

        // Create folder if not found
        const createResponse = await gapi.client.drive.files.create({
            resource: {
                name: KNOWLEDGE_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
        });
        return createResponse.result.id;
    }

    private async getIndexFileId(folderId: string): Promise<string | null> {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name = '${COLLECTION_INDEX_FILENAME}' and trashed = false`,
            fields: 'files(id)',
        });
        const files = response.result.files || [];
        return files.length > 0 ? files[0].id : null;
    }

    public async fetchKnowledge(): Promise<Knowledge> {
        await this.checkAndRefreshToken();
        const folderId = await this.getFolderId();
        if (!folderId) {
            return { chapters: [], articles: [] };
        }

        const indexFileId = await this.getIndexFileId(folderId);
        if (!indexFileId) {
            return { chapters: [], articles: [] };
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${indexFileId}?alt=media`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            },
        );

        if (!response.ok) {
            throw new Error('Failed to download knowledge index');
        }

        const knowledge: Knowledge = await response.json();

        // Fetch each article's content from .md files
        const articlesWithContent = await Promise.all(
            knowledge.articles.map(async article => {
                try {
                    const articleFileId = await this.getArticleFileId(
                        folderId,
                        article.id,
                    );
                    if (!articleFileId) {
                        return article;
                    }
                    const contentResponse = await fetch(
                        `https://www.googleapis.com/drive/v3/files/${articleFileId}?alt=media`,
                        {
                            headers: {
                                Authorization: `Bearer ${this.accessToken}`,
                            },
                        },
                    );
                    if (contentResponse.ok) {
                        const content = await contentResponse.text();
                        return { ...article, content };
                    }
                } catch (e) {
                    console.error(
                        `Failed to fetch content for article ${article.id}:`,
                        e,
                    );
                }
                return article;
            }),
        );

        return {
            ...knowledge,
            articles: articlesWithContent,
        };
    }

    private async getArticleFileId(
        folderId: string,
        articleId: string,
    ): Promise<string | null> {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name = '${articleId}.md' and trashed = false`,
            fields: 'files(id)',
        });
        const files = response.result.files || [];
        return files.length > 0 ? files[0].id : null;
    }

    public async saveKnowledge(knowledge: Knowledge): Promise<void> {
        await this.checkAndRefreshToken();
        const folderId = await this.getFolderId();
        if (!folderId) {
            throw new Error('Failed to get or create knowledge folder');
        }

        // 1. Save index file (without content to keep it light)
        const indexKnowledge: Knowledge = {
            chapters: knowledge.chapters,
            articles: knowledge.articles.map(a => ({ ...a, content: '' })),
        };
        await this.saveIndexFile(folderId, indexKnowledge);

        // 2. Save each article as a separate .md file
        for (const article of knowledge.articles) {
            await this.saveArticleFile(folderId, article);
        }

        // TODO: Handle deletion of removed articles/files if necessary
    }

    private async saveIndexFile(
        folderId: string,
        knowledge: Knowledge,
    ): Promise<void> {
        const indexFileId = await this.getIndexFileId(folderId);
        const content = JSON.stringify(knowledge);

        if (!indexFileId) {
            const metadata = {
                name: COLLECTION_INDEX_FILENAME,
                parents: [folderId],
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
            await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${indexFileId}?uploadType=media`,
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

    private async saveArticleFile(
        folderId: string,
        article: KnowledgeArticle,
    ): Promise<void> {
        const articleFileId = await this.getArticleFileId(folderId, article.id);
        const content = article.content;
        const filename = `${article.id}.md`;

        if (!articleFileId) {
            const metadata = {
                name: filename,
                parents: [folderId],
                description: article.title, // Use description to store title for visibility in Drive
            };
            const form = new FormData();
            form.append(
                'metadata',
                new Blob([JSON.stringify(metadata)], {
                    type: 'application/json',
                }),
            );
            form.append('file', new Blob([content], { type: 'text/markdown' }));

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
            // Update existing file
            await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${articleFileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'text/markdown',
                    },
                    body: content,
                },
            );

            // Also update metadata if title changed
            await gapi.client.drive.files.update({
                fileId: articleFileId,
                resource: {
                    description: article.title,
                },
            });
        }
    }
}
