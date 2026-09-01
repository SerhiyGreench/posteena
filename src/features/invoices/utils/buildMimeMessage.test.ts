// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
    buildMimeMessage,
    toBase64Url,
} from '@/features/invoices/utils/buildMimeMessage';

const attachment = {
    fileName: 'invoice.pdf',
    mimeType: 'application/pdf',
    bytes: new Uint8Array([37, 80, 68, 70, 45]), // "%PDF-"
};

describe('buildMimeMessage', () => {
    it('writes a plain text mail when nothing is attached', () => {
        const mime = buildMimeMessage({
            to: 'billing@example.com',
            subject: 'Invoice 20260009',
            body: 'Hello',
        });

        expect(mime).toContain('To: billing@example.com');
        expect(mime).toContain('Subject: Invoice 20260009');
        expect(mime).toContain('Content-Type: text/plain; charset="UTF-8"');
        expect(mime).not.toContain('multipart/mixed');
        // Body is base64 so line endings and Unicode survive intact.
        expect(mime).toContain(btoa('Hello'));
    });

    it('builds a multipart message with the attachment', () => {
        const mime = buildMimeMessage({
            to: 'billing@example.com',
            subject: 'Invoice',
            body: 'Attached.',
            attachment,
        });
        const boundary = /boundary="([^"]+)"/.exec(mime)?.[1] ?? '';

        expect(boundary).not.toBe('');
        expect(mime).toContain(
            'Content-Disposition: attachment; filename="invoice.pdf"',
        );
        expect(mime).toContain('Content-Type: application/pdf');
        expect(mime).toContain(btoa('%PDF-'));
        // Opening part, attachment part, and the closing delimiter.
        expect(mime.split(`--${boundary}`)).toHaveLength(4);
        expect(mime.trimEnd().endsWith(`--${boundary}--`)).toBe(true);
    });

    it('includes Cc only when one is given', () => {
        expect(
            buildMimeMessage({
                to: 'a@example.com',
                cc: 'accountant@example.com',
                subject: 'x',
                body: 'y',
            }),
        ).toContain('Cc: accountant@example.com');

        expect(
            buildMimeMessage({
                to: 'a@example.com',
                cc: '   ',
                subject: 'x',
                body: 'y',
            }),
        ).not.toContain('Cc:');
    });

    it('omits From unless an alias is given', () => {
        expect(
            buildMimeMessage({ to: 'a@example.com', subject: 'x', body: 'y' }),
        ).not.toContain('From:');

        expect(
            buildMimeMessage({
                from: 'sender@example.com',
                to: 'a@example.com',
                subject: 'x',
                body: 'y',
            }),
        ).toContain('From: sender@example.com');
    });

    it('encodes a subject that is not plain ASCII', () => {
        const mime = buildMimeMessage({
            to: 'a@example.com',
            subject: 'Faktúra 20260009 — Рахунок',
            body: 'x',
        });

        // Headers are ASCII only, so Slovak and Ukrainian must be encoded.
        expect(mime).toContain('Subject: =?UTF-8?B?');
        expect(mime).not.toContain('Faktúra');
    });

    it('separates headers and parts with CRLF, as RFC 2822 requires', () => {
        const mime = buildMimeMessage({
            to: 'a@example.com',
            subject: 'x',
            body: 'y',
            attachment,
        });

        expect(mime).toContain('\r\n');
        expect(
            mime.split('\n').every(line => line.endsWith('\r') || line === ''),
        ).toBe(true);
    });
});

describe('toBase64Url', () => {
    it('produces URL-safe base64 without padding', () => {
        const encoded = toBase64Url('subjects?? with ~~ padding>>');

        expect(encoded).not.toContain('+');
        expect(encoded).not.toContain('/');
        expect(encoded).not.toContain('=');
    });

    it('round-trips through the standard decoder', () => {
        const value = 'Faktúra — Рахунок';
        const encoded = toBase64Url(value);
        const standard = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(standard), char =>
            char.charCodeAt(0),
        );

        expect(new TextDecoder().decode(bytes)).toBe(value);
    });
});
