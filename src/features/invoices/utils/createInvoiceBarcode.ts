import {
    encodeGrayscalePng,
    toPngDataUrl,
} from '@/features/invoices/utils/encodeGrayscalePng';

/** Rendered Code 128 barcode, printed above the invoice header. */
export interface InvoiceBarcode {
    dataUrl: string;
    /** The encoded value, so callers can print it under the bars. */
    text: string;
    /** Aspect ratio, so each renderer can size it consistently. */
    widthToHeight: number;
}

/** Pixels per narrow module. */
const ModuleWidth = 2;
/** Bar height, in millimetres as bwip-js measures it. */
const BarHeightMillimetres = 8;
/** Quiet zone either side, as the symbology requires. */
const QuietModules = 10;

const Black = 0;
const White = 255;

/**
 * Renders the invoice number as a Code 128 barcode.
 *
 * bwip-js only rasterises through a canvas, which would tie document
 * generation to a browser, so the bar/space widths are taken from its `raw`
 * output and painted into a PNG directly. That way the PDF and the DOCX embed
 * the exact same image.
 */
export async function createInvoiceBarcode(
    value: string,
): Promise<InvoiceBarcode | null> {
    const text = value.trim();

    if (!text) {
        return null;
    }

    try {
        const bwip = await import('bwip-js/browser');

        // bwip-js only ships canvas and SVG backends; a canvas would tie
        // document generation to a browser, so the bars are painted straight
        // into a pixel buffer here. The PDF and the DOCX then embed the exact
        // same image.
        let pixels = new Uint8Array(0);
        let width = 0;
        let height = 0;

        const drawing = {
            scale: (sx: number, sy: number): [number, number] => [sx, sy],
            measure: (): {
                width: number;
                ascent: number;
                descent: number;
            } => ({
                width: 0,
                ascent: 0,
                descent: 0,
            }),
            init: (canvasWidth: number, canvasHeight: number): void => {
                width = Math.max(1, Math.round(canvasWidth));
                height = Math.max(1, Math.round(canvasHeight));
                pixels = new Uint8Array(width * height).fill(White);
            },
            line: (
                x0: number,
                y0: number,
                x1: number,
                y1: number,
                lineWidth: number,
            ): void => {
                // Linear symbologies are drawn as vertical strokes centred on x.
                const left = Math.round(Math.min(x0, x1) - lineWidth / 2);
                const right = Math.round(Math.max(x0, x1) + lineWidth / 2);
                const top = Math.max(0, Math.round(Math.min(y0, y1)));
                const bottom = Math.min(height, Math.round(Math.max(y0, y1)));

                for (let row = top; row < bottom; row += 1) {
                    const from = Math.max(0, left);
                    const to = Math.min(width, right);

                    pixels.fill(Black, row * width + from, row * width + to);
                }
            },
            polygon: (): void => {},
            hexagon: (): void => {},
            ellipse: (): void => {},
            fill: (): void => {},
            text: (): void => {},
            end: (): void => {},
        };

        bwip.render(
            {
                bcid: 'code128',
                text,
                scale: ModuleWidth,
                height: BarHeightMillimetres,
                includetext: false,
                paddingwidth: QuietModules,
            },
            drawing,
        );

        if (width === 0 || height === 0) {
            return null;
        }

        return {
            dataUrl: toPngDataUrl(
                await encodeGrayscalePng(pixels, width, height),
            ),
            text,
            widthToHeight: width / height,
        };
    } catch (error) {
        // A barcode is decoration; never let it stop the invoice generating.
        console.error('Failed to build the invoice barcode:', error);

        return null;
    }
}
