// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { createInvoiceBarcode } from '@/features/invoices/utils/createInvoiceBarcode';
import {
    encodeGrayscalePng,
    toPngDataUrl,
} from '@/features/invoices/utils/encodeGrayscalePng';

function decodeDataUrl(dataUrl: string): Uint8Array {
    const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

describe('encodeGrayscalePng', () => {
    it('writes a valid PNG signature and header', async () => {
        const png = await encodeGrayscalePng(
            new Uint8Array([0, 255, 255, 0]),
            2,
            2,
        );

        expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        expect(String.fromCharCode(...png.slice(12, 16))).toBe('IHDR');
        // Width and height are big-endian 32-bit values in the header.
        expect([...png.slice(16, 24)]).toEqual([0, 0, 0, 2, 0, 0, 0, 2]);
        expect(png[24]).toBe(8); // bit depth
        expect(png[25]).toBe(0); // grayscale
    });

    it('ends with an IEND chunk', async () => {
        const png = await encodeGrayscalePng(new Uint8Array([0]), 1, 1);

        expect(String.fromCharCode(...png.slice(-8, -4))).toBe('IEND');
    });

    it('produces a usable data URL', async () => {
        const png = await encodeGrayscalePng(new Uint8Array([0]), 1, 1);
        const url = toPngDataUrl(png);

        expect(url.startsWith('data:image/png;base64,')).toBe(true);
        expect(decodeDataUrl(url)).toEqual(png);
    });
});

describe('createInvoiceBarcode', () => {
    it('renders the invoice number as a PNG', async () => {
        const barcode = await createInvoiceBarcode('20260009');

        expect(barcode?.text).toBe('20260009');
        expect(barcode?.dataUrl.startsWith('data:image/png;base64,')).toBe(
            true,
        );
        // A linear barcode is far wider than it is tall.
        expect(barcode?.widthToHeight).toBeGreaterThan(2);
    });

    it('encodes different numbers to different images', async () => {
        const [first, second] = await Promise.all([
            createInvoiceBarcode('20260009'),
            createInvoiceBarcode('20260010'),
        ]);

        expect(first?.dataUrl).not.toBe(second?.dataUrl);
    });

    it('handles a number with letters and separators', async () => {
        const barcode = await createInvoiceBarcode('FA-2026-007');

        expect(barcode?.dataUrl.startsWith('data:image/png')).toBe(true);
    });

    it('returns nothing for an empty number', async () => {
        expect(await createInvoiceBarcode('   ')).toBeNull();
    });
});
