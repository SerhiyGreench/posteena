import { StorageKeys } from '@/constants/StorageKeys';
import {
    buildMimeMessage,
    type MimeMessage,
    toBase64Url,
} from '@/features/invoices/utils/buildMimeMessage';
import { Storage } from '@/lib/Storage';

/**
 * Creating a draft is the narrowest Gmail scope that still allows an
 * attachment. It is a Google "restricted" scope, so it is requested only when
 * the user actually sends an invoice — signing in for ordinary invoice work
 * stays on `drive.file` alone.
 */
const SCOPE = 'https://www.googleapis.com/auth/gmail.compose';

const DraftsEndpoint = 'https://gmail.googleapis.com/gmail/v1/users/me/drafts';

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

interface GoogleIdentity {
    accounts: {
        oauth2: {
            initTokenClient: (args: {
                client_id: string;
                scope: string;
                callback: (response: TokenResponse) => void;
            }) => TokenClient;
        };
    };
}

declare const google: GoogleIdentity;

/** The created draft, and where to open it in the Gmail interface. */
export interface GmailDraft {
    draftId: string;
    messageId: string;
    url: string;
}

/** The shape Google returns for a failed API call. */
interface GoogleApiError {
    error?: { code?: number; message?: string; status?: string };
}

/**
 * Turns a Google error response into something a person can act on.
 *
 * The common first-run failure is the Gmail API simply not being enabled on
 * the Cloud project, which Google reports as a 403 with a long message; the
 * useful part is the console link, so it is surfaced directly.
 */
async function describeFailure(response: Response): Promise<string> {
    const body = await response.text();
    let message = body.slice(0, 300);

    try {
        const parsed = JSON.parse(body) as GoogleApiError;

        message = parsed.error?.message ?? message;
    } catch {
        // Not JSON; the raw text is the best available detail.
    }

    if (
        response.status === 403 &&
        /has not been used|disabled/i.test(message)
    ) {
        return `The Gmail API is not enabled for your Google Cloud project. Enable it in the Google Cloud console, wait a minute, then try again. (${message})`;
    }

    if (response.status === 401 || response.status === 403) {
        return `Gmail refused the request (${response.status}). Check that the Gmail API is enabled and that you granted permission to manage drafts. (${message})`;
    }

    return `Gmail rejected the draft (${response.status}): ${message}`;
}

/** Loads a script once, resolving immediately if it is already present. */
function loadScript(src: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)) {
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
 * Creates Gmail drafts carrying the invoice as a real attachment.
 *
 * Kept separate from the Drive adapter because it needs its own, more
 * sensitive scope and its own consent step.
 */
export class GoogleGmailAdapter {
    private tokenClient: TokenClient | null = null;

    constructor(private clientId: string) {}

    private async init(): Promise<void> {
        if (this.tokenClient) {
            return;
        }

        if (!this.clientId) {
            throw new Error(
                'Google sign-in is not configured: set VITE_GOOGLE_CLIENT_ID in your .env file.',
            );
        }

        await loadScript('https://accounts.google.com/gsi/client');

        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.clientId,
            scope: SCOPE,
            callback: () => {},
        });
    }

    /** Whether the Gmail scope has already been granted and is still valid. */
    public hasAccess(): boolean {
        const stored = Storage.get<StoredSession | null>(
            StorageKeys.GmailComposeToken,
            null,
        );

        return Boolean(stored && Date.now() < stored.expiresAt - 60_000);
    }

    /**
     * Returns a Gmail token, prompting for consent the first time.
     *
     * Incremental authorisation: this asks only for the Gmail scope, and
     * Google adds it to what the user has already granted.
     */
    private async requireToken(): Promise<string> {
        const stored = Storage.get<StoredSession | null>(
            StorageKeys.GmailComposeToken,
            null,
        );

        if (stored && Date.now() < stored.expiresAt - 60_000) {
            return stored.accessToken;
        }

        await this.init();

        return new Promise<string>((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Google Identity Services failed to load'));

                return;
            }

            this.tokenClient.callback = (response: TokenResponse): void => {
                if (response.error || !response.access_token) {
                    reject(
                        new Error(
                            response.error ?? 'Gmail access was not granted',
                        ),
                    );

                    return;
                }

                Storage.set<StoredSession>(StorageKeys.GmailComposeToken, {
                    accessToken: response.access_token,
                    expiresAt: Date.now() + response.expires_in * 1000,
                });
                resolve(response.access_token);
            };

            this.tokenClient.error_callback = (error): void => {
                reject(new Error(error.message ?? 'Gmail access was declined'));
            };

            this.tokenClient.requestAccessToken({
                prompt: stored ? '' : 'consent',
            });
        });
    }

    /**
     * Creates a draft and returns a link that opens it in Gmail's composer.
     */
    public async createDraft(message: MimeMessage): Promise<GmailDraft> {
        const token = await this.requireToken();
        const response = await fetch(DraftsEndpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: { raw: toBase64Url(buildMimeMessage(message)) },
            }),
        });

        if (!response.ok) {
            throw new Error(await describeFailure(response));
        }

        const created = (await response.json()) as {
            id?: string;
            message?: { id?: string };
        };
        const draftId = created.id ?? '';
        const messageId = created.message?.id ?? '';

        return {
            draftId,
            messageId,
            // Gmail opens a specific draft in the composer by message id.
            url: `https://mail.google.com/mail/u/0/#drafts?compose=${messageId}`,
        };
    }
}
