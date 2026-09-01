import { describe, expect, it } from 'vitest';

import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import type { Invoice } from '@/features/invoices/types';
import {
    buildEmailValues,
    buildGmailComposeUrl,
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
