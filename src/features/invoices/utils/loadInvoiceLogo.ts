import type { InvoiceLogo } from '@/features/invoices/types';

/**
 * The stored logo's longest side, in pixels.
 *
 * Printed at 46pt the logo is about 61px across, so 320 leaves plenty for a
 * high-resolution screen and for print, while keeping the data URL small
 * enough to sit in the registry JSON without bloating it.
 */
const MaxSide = 320;

/** Anything the file picker can hand us that a canvas can draw. */
const AcceptedTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/gif',
];

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('The file could not be read'));
        reader.readAsDataURL(file);
    });
}

function decode(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () =>
            reject(new Error('The file is not an image the browser can read'));
        image.src = dataUrl;
    });
}

/**
 * Turns an attached file into a logo the documents can print.
 *
 * Everything is rasterised to PNG, an SVG included: the DOCX can only embed a
 * raster, and pdfmake wants one too, so converting once here means the three
 * renderings all draw the same pixels rather than each interpreting the file
 * their own way. The image is scaled down if it is larger than it needs to be
 * and kept as it is if it is smaller.
 */
export async function loadInvoiceLogo(file: File): Promise<InvoiceLogo> {
    if (!AcceptedTypes.includes(file.type)) {
        throw new Error(
            'Attach a PNG, JPEG, WebP, GIF or SVG image as the logo',
        );
    }

    const image = await decode(await readAsDataUrl(file));
    // An SVG with no intrinsic size decodes as 0x0; fall back to the box it
    // would be drawn in rather than dividing by zero.
    const naturalWidth = image.naturalWidth || MaxSide;
    const naturalHeight = image.naturalHeight || MaxSide;
    const scale = Math.min(1, MaxSide / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));
    const canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('The image could not be prepared for printing');
    }

    context.drawImage(image, 0, 0, width, height);

    return { dataUrl: canvas.toDataURL('image/png'), width, height };
}
