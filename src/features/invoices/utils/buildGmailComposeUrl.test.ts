import { describe, expect, it } from 'vitest';

import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import type { Invoice } from '@/features/invoices/types';
import {
    buildEmailValues,
    buildGmailAppUrl,
    buildGmailComposeUrl,
    buildMailtoUrl,
    expandEmailTemplate,
} from '@/features/invoices/utils/buildGmailComposeUrl';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createEmptyParty,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';

const Link = 'https://drive.google.com/file/d/abc123/view';

function buildInvoice(): Invoice {
    const supplier = {
        ...DefaultInvoiceSettings.supplier,
        name: 'Example Supplier s. r. o.',
    };
    const draft = createInvoiceDraft(
        { ...DefaultInvoiceSettings, supplier },
        {
            ...createEmptyParty(),
            name: 'Example Customer Ltd',
            email: 'customer@example.com',
        },
    );
    const items = draft.items.map(item => ({ ...item, unitPrice: 6500 }));

    return {
        ...draft,
        items,
        totals: calculateInvoiceTotals(items),
        number: '20260009',
        dueDate: '2026-09-15',
    };
}

describe('expandEmailTemplate', () => {
    const values = buildEmailValues(buildInvoice(), Link);

    it('substitutes every placeholder', () => {
        expect(
            expandEmailTemplate(
                '{number} {customer} {supplier} {amount} {currency} {dueDate} {link}',
                values,
            ),
        ).toBe(
            `20260009 Example Customer Ltd Example Supplier s. r. o. ${values.amount} EUR 15.09.2026 ${Link}`,
        );
    });

    it('leaves an unknown placeholder visible rather than dropping it', () => {
        expect(expandEmailTemplate('{number} {nope}', values)).toBe(
            '20260009 {nope}',
        );
    });
});

describe('buildGmailComposeUrl', () => {
    const url = buildGmailComposeUrl({
        invoice: buildInvoice(),
        link: Link,
        subjectTemplate: 'Invoice {number} — {supplier}',
        bodyTemplate: 'Hello {customer},\nSee {link}',
    });
    const params = new URL(url).searchParams;

    it('opens the Gmail composer', () => {
        expect(
            url.startsWith('https://mail.google.com/mail/?view=cm&fs=1'),
        ).toBe(true);
    });

    it('addresses the customer from the company registry', () => {
        expect(params.get('to')).toBe('customer@example.com');
    });

    it('fills the subject and body from the templates', () => {
        expect(params.get('su')).toBe(
            'Invoice 20260009 — Example Supplier s. r. o.',
        );
        expect(params.get('body')).toBe(
            `Hello Example Customer Ltd,\nSee ${Link}`,
        );
    });

    it('adds Cc only when one is configured', () => {
        expect(params.get('cc')).toBeNull();

        const withCc = new URL(
            buildGmailComposeUrl({
                invoice: buildInvoice(),
                link: Link,
                cc: 'accountant@example.com',
                subjectTemplate: '{number}',
                bodyTemplate: '{link}',
            }),
        ).searchParams;

        expect(withCc.get('cc')).toBe('accountant@example.com');
    });

    it('encodes characters that would otherwise break the query', () => {
        // The em dash and newline must survive the round trip.
        expect(url).not.toContain('\n');
        expect(url).toContain('%E2%80%94');
    });
});

describe('buildMailtoUrl', () => {
    const url = buildMailtoUrl({
        invoice: buildInvoice(),
        link: Link,
        cc: 'accountant@example.com',
        subjectTemplate: 'Invoice {number} — {supplier}',
        bodyTemplate: 'Hello {customer},\nSee {link}',
    });
    const [recipient, query] = url.replace('mailto:', '').split('?');
    const params = new URLSearchParams(query);

    it('is a mailto link, so Android opens the mail app', () => {
        expect(url.startsWith('mailto:')).toBe(true);
    });

    it('addresses the customer', () => {
        expect(recipient).toBe('customer%40example.com');
    });

    it('carries the same subject, body and Cc as the compose URL', () => {
        expect(params.get('subject')).toBe(
            'Invoice 20260009 — Example Supplier s. r. o.',
        );
        expect(params.get('body')).toBe(
            `Hello Example Customer Ltd,\nSee ${Link}`,
        );
        expect(params.get('cc')).toBe('accountant@example.com');
    });

    it('encodes a space as %20 rather than +', () => {
        // Mail apps show a literal "+" in the subject line otherwise.
        expect(url).toContain('Invoice%2020260009');
        expect(url).not.toContain('+');
    });

    it('omits Cc when none is configured', () => {
        expect(
            buildMailtoUrl({
                invoice: buildInvoice(),
                link: Link,
                subjectTemplate: '{number}',
                bodyTemplate: '{link}',
            }),
        ).not.toContain('cc=');
    });
});

describe('buildGmailAppUrl', () => {
    const draft = 'https://mail.google.com/mail/u/0/#drafts?compose=msg-1';
    const url = buildGmailAppUrl(draft);

    it('names the Gmail package, so Android does not need a verified app link', () => {
        expect(url.startsWith('intent://mail.google.com/mail/u/0/')).toBe(true);
        expect(url).toContain(';package=com.google.android.gm;');
        expect(url).toContain(';scheme=https;');
        expect(url.endsWith(';end')).toBe(true);
    });

    it('falls back to the web link when Gmail is not installed', () => {
        expect(url).toContain(
            `S.browser_fallback_url=${encodeURIComponent(draft)}`,
        );
    });

    it('drops the fragment, which an intent URL cannot carry', () => {
        // Everything up to `#Intent` is the target; no second `#` may appear.
        expect(url.split('#')).toHaveLength(2);
    });
});
