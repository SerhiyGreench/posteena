/**
 * Builds the RFC 2822 message Gmail's draft API expects.
 *
 * A compose URL cannot carry an attachment, so sending the invoice as a file
 * means handing Gmail a complete MIME message instead.
 */

export interface EmailAttachment {
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
}

export interface MimeMessage {
    /** Verified send-as alias; omitted to use the account's default. */
    from?: string;
    to: string;
    /** Additional recipients, e.g. the accountant. */
    cc?: string;
    subject: string;
    body: string;
    attachment?: EmailAttachment;
}

/** Base64 of raw bytes, in 76-character lines as MIME requires. */
function toBase64Lines(bytes: Uint8Array): string {
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return (btoa(binary).match(/.{1,76}/g) ?? []).join('\r\n');
}

/** Base64 of text, as a single unbroken run. */
function toBase64(value: string): string {
    return toBase64Lines(new TextEncoder().encode(value)).replace(/\r\n/g, '');
}

/**
 * Encodes a header value that is not plain ASCII, per RFC 2047.
 *
 * Headers are ASCII only, so a Slovak or Ukrainian subject would otherwise
 * arrive mangled.
 */
function encodeHeader(value: string): string {
    const isPrintableAscii = /^[ -~]*$/.test(value);

    return isPrintableAscii ? value : `=?UTF-8?B?${toBase64(value)}?=`;
}

/** A boundary that cannot occur inside base64 or the text body. */
function createBoundary(): string {
    return `posteena_${crypto.randomUUID().replace(/-/g, '')}`;
}

/**
 * Assembles the message. Without an attachment it is a plain text mail; with
 * one it becomes `multipart/mixed`.
 */
export function buildMimeMessage(message: MimeMessage): string {
    const headers = [
        ...(message.from ? [`From: ${encodeHeader(message.from)}`] : []),
        `To: ${message.to}`,
        ...(message.cc?.trim() ? [`Cc: ${message.cc.trim()}`] : []),
        `Subject: ${encodeHeader(message.subject)}`,
        'MIME-Version: 1.0',
    ];

    if (!message.attachment) {
        return [
            ...headers,
            'Content-Type: text/plain; charset="UTF-8"',
            'Content-Transfer-Encoding: base64',
            '',
            toBase64Lines(new TextEncoder().encode(message.body)),
        ].join('\r\n');
    }

    const boundary = createBoundary();
    const { attachment } = message;

    return [
        ...headers,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: base64',
        '',
        toBase64Lines(new TextEncoder().encode(message.body)),
        '',
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${attachment.fileName}"`,
        `Content-Disposition: attachment; filename="${attachment.fileName}"`,
        'Content-Transfer-Encoding: base64',
        '',
        toBase64Lines(attachment.bytes),
        '',
        `--${boundary}--`,
        '',
    ].join('\r\n');
}

/**
 * URL-safe base64 without padding, which is the encoding Gmail wants for the
 * raw message.
 */
export function toBase64Url(value: string): string {
    return toBase64(value)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
