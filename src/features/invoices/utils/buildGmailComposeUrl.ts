import type { CurrencyType } from '@/features/invoices/constants/Currencies';
import type { Invoice } from '@/features/invoices/types';
import {
    formatInvoiceDate,
    formatInvoiceMoney,
} from '@/features/invoices/utils/invoiceFormatters';

/**
 * Gmail's compose deep link.
 *
 * `view=cm` opens the composer, `fs=1` makes it a full window. Recipient,
 * subject and body are the only fields a URL can carry — there is no
 * attachment parameter in Gmail's compose link or in `mailto:`, which is why
 * the invoice travels as a Drive link rather than a file.
 */
const ComposeUrl = 'https://mail.google.com/mail/?view=cm&fs=1';

/** Placeholders available in the subject and body templates. */
export const EmailPlaceholders = [
    'number',
    'customer',
    'supplier',
    'amount',
    'currency',
    'dueDate',
    'link',
] as const;

export interface EmailTemplateValues {
    number: string;
    customer: string;
    supplier: string;
    amount: string;
    currency: string;
    dueDate: string;
    link: string;
}

/** Values a template can reference, taken from the invoice snapshot. */
export function buildEmailValues(
    invoice: Invoice,
    link: string,
): EmailTemplateValues {
    return {
        number: invoice.number,
        customer: invoice.customer.name,
        supplier: invoice.supplier.name,
        amount: formatInvoiceMoney(invoice.totals.amountDue, invoice.languages),
        currency: invoice.currency as CurrencyType,
        dueDate: formatInvoiceDate(invoice.dueDate),
        link,
    };
}

/**
 * Replaces `{placeholder}` tokens. Unknown tokens are left as written, so a
 * typo is visible in the draft rather than silently disappearing.
 */
export function expandEmailTemplate(
    template: string,
    values: EmailTemplateValues,
): string {
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
        key in values ? values[key as keyof EmailTemplateValues] : match,
    );
}

/**
 * Builds the Gmail compose URL for an invoice.
 *
 * The signed-in Gmail account is always the sender: a URL cannot set `From`,
 * and Gmail only permits an alternative sender for a verified send-as alias.
 */
export function buildGmailComposeUrl(args: {
    invoice: Invoice;
    link: string;
    cc?: string;
    subjectTemplate: string;
    bodyTemplate: string;
}): string {
    const values = buildEmailValues(args.invoice, args.link);
    const params = new URLSearchParams({
        to: args.invoice.customer.email,
        su: expandEmailTemplate(args.subjectTemplate, values),
        body: expandEmailTemplate(args.bodyTemplate, values),
    });

    if (args.cc?.trim()) {
        params.set('cc', args.cc.trim());
    }

    return `${ComposeUrl}&${params.toString()}`;
}

/**
 * Builds a `mailto:` link for the same message.
 *
 * On Android the OS hands `mailto:` to the installed mail app, so the invoice
 * opens in Gmail itself rather than in Gmail's mobile web composer. The fields
 * a mailto can carry are the same ones the compose URL carries, so nothing is
 * lost by taking this route on a phone.
 *
 * Percent-encoding is done by hand rather than with `URLSearchParams`, which
 * encodes a space as `+`; mail apps show that literally in the subject line.
 */
export function buildMailtoUrl(args: {
    invoice: Invoice;
    link: string;
    cc?: string;
    subjectTemplate: string;
    bodyTemplate: string;
}): string {
    const values = buildEmailValues(args.invoice, args.link);
    const params = [
        ['subject', expandEmailTemplate(args.subjectTemplate, values)],
        ['body', expandEmailTemplate(args.bodyTemplate, values)],
    ];

    if (args.cc?.trim()) {
        params.push(['cc', args.cc.trim()]);
    }

    const query = params
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

    return `mailto:${encodeURIComponent(args.invoice.customer.email)}?${query}`;
}

/** Gmail's Android package name. */
const GmailAndroidPackage = 'com.google.android.gm';

/**
 * Rewrites a Gmail web link as an Android intent that launches the Gmail app.
 *
 * A plain https link only reaches the app if Android has verified Gmail as the
 * handler for mail.google.com, which it often has not — so the draft opens in
 * a browser tab instead. Naming the package explicitly leaves nothing to that
 * verification, and `browser_fallback_url` keeps the web link working on a
 * device with no Gmail app installed.
 *
 * The fragment is dropped: an intent URL has no room for one, and Gmail
 * publishes no deep link to an individual draft. The app therefore opens on
 * the mail list, with the freshly created draft at the top of Drafts.
 */
export function buildGmailAppUrl(webUrl: string): string {
    const url = new URL(webUrl);

    return [
        `intent://${url.host}${url.pathname}${url.search}`,
        '#Intent',
        'scheme=https',
        `package=${GmailAndroidPackage}`,
        `S.browser_fallback_url=${encodeURIComponent(webUrl)}`,
        'end',
    ].join(';');
}
