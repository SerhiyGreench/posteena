// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKeys } from '@/constants/StorageKeys';
import { GoogleGmailAdapter } from '@/features/invoices/api/GoogleGmailAdapter';
import { Storage } from '@/lib/Storage';

const message = {
    to: 'billing@example.com',
    subject: 'Invoice 20260009',
    body: 'Attached.',
};

/** Replies to the drafts endpoint with the given status and body. */
function stubFetch(status: number, body: unknown): void {
    vi.stubGlobal(
        'fetch',
        vi.fn(
            async () =>
                new Response(JSON.stringify(body), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                }),
        ),
    );
}

describe('GoogleGmailAdapter', () => {
    beforeEach(() => {
        // A granted, still-valid Gmail scope.
        Storage.set(StorageKeys.GmailComposeToken, {
            accessToken: 'token',
            expiresAt: Date.now() + 3_600_000,
        });
    });

    it('returns a link that opens the created draft', async () => {
        stubFetch(200, { id: 'draft-1', message: { id: 'msg-1' } });

        const draft = await new GoogleGmailAdapter('client').createDraft(
            message,
        );

        expect(draft.draftId).toBe('draft-1');
        expect(draft.url).toBe(
            'https://mail.google.com/mail/u/0/#drafts?compose=msg-1',
        );
    });

    it('explains a disabled Gmail API rather than dumping raw JSON', async () => {
        stubFetch(403, {
            error: {
                code: 403,
                message:
                    'Gmail API has not been used in project 000000000000 before or it is disabled.',
            },
        });

        await expect(
            new GoogleGmailAdapter('client').createDraft(message),
        ).rejects.toThrow(/Gmail API is not enabled for your Google Cloud/);
    });

    it('reports other refusals with the reason Google gave', async () => {
        stubFetch(403, {
            error: { code: 403, message: 'Request had insufficient scopes.' },
        });

        await expect(
            new GoogleGmailAdapter('client').createDraft(message),
        ).rejects.toThrow(/insufficient scopes/);
    });

    it('survives an error body that is not JSON', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(
                async () =>
                    new Response('<html>gateway error</html>', {
                        status: 502,
                    }),
            ),
        );

        await expect(
            new GoogleGmailAdapter('client').createDraft(message),
        ).rejects.toThrow(/502/);
    });
});
