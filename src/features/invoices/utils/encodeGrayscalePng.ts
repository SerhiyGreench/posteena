/**
 * Minimal grayscale PNG encoder.
 *
 * The barcode has to be embedded as the same raster image in both the PDF and
 * the DOCX. Rasterising through a `<canvas>` would tie generation to a browser,
 * so the few bytes of PNG are assembled here instead: `CompressionStream`
 * provides the zlib stream in browsers and in Node alike.
 */

const PngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/** Standard PNG CRC-32 table, built once. */
const crcTable = (() => {
    const table = new Uint32Array(256);

    for (let index = 0; index < 256; index += 1) {
        let value = index;

        for (let bit = 0; bit < 8; bit += 1) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }

        table[index] = value >>> 0;
    }

    return table;
})();

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;

    for (const byte of bytes) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
    target[offset] = (value >>> 24) & 0xff;
    target[offset + 1] = (value >>> 16) & 0xff;
    target[offset + 2] = (value >>> 8) & 0xff;
    target[offset + 3] = value & 0xff;
}

/** Length + type + data + CRC, as every PNG chunk is laid out. */
function buildChunk(type: string, data: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(12 + data.length);
    const typed = new Uint8Array(4 + data.length);

    for (let index = 0; index < 4; index += 1) {
        typed[index] = type.charCodeAt(index);
    }

    typed.set(data, 4);
    writeUint32(chunk, 0, data.length);
    chunk.set(typed, 4);
    writeUint32(chunk, 8 + data.length, crc32(typed));

    return chunk;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
    // Written straight into the stream rather than via `Blob.stream()`, which
    // jsdom does not implement.
    const compression = new CompressionStream('deflate');
    const writer = compression.writable.getWriter();

    // Copied into a buffer the stream types accept as a plain ArrayBuffer view.
    const input = new Uint8Array(bytes.byteLength);

    input.set(bytes);
    void writer.write(input);
    void writer.close();

    const chunks: Uint8Array[] = [];
    const reader = compression.readable.getReader();

    for (;;) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        chunks.push(value);
    }

    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const output = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.length;
    }

    return output;
}

/**
 * Encodes 8-bit grayscale pixels (0 black, 255 white) as a PNG.
 */
export async function encodeGrayscalePng(
    pixels: Uint8Array,
    width: number,
    height: number,
): Promise<Uint8Array> {
    // Each scanline is prefixed with its filter type; 0 means "no filter".
    const raw = new Uint8Array((width + 1) * height);

    for (let row = 0; row < height; row += 1) {
        raw[row * (width + 1)] = 0;
        raw.set(
            pixels.subarray(row * width, (row + 1) * width),
            row * (width + 1) + 1,
        );
    }

    const header = new Uint8Array(13);

    writeUint32(header, 0, width);
    writeUint32(header, 4, height);
    header[8] = 8; // bit depth
    header[9] = 0; // colour type: grayscale
    header[10] = 0; // compression
    header[11] = 0; // filter
    header[12] = 0; // interlace

    const chunks = [
        PngSignature,
        buildChunk('IHDR', header),
        buildChunk('IDAT', await deflate(raw)),
        buildChunk('IEND', new Uint8Array(0)),
    ];
    const total = chunks.reduce((sum, part) => sum + part.length, 0);
    const png = new Uint8Array(total);
    let offset = 0;

    for (const part of chunks) {
        png.set(part, offset);
        offset += part.length;
    }

    return png;
}

/** Wraps encoded bytes as a `data:` URL for embedding. */
export function toPngDataUrl(png: Uint8Array): string {
    let binary = '';

    for (const byte of png) {
        binary += String.fromCharCode(byte);
    }

    return `data:image/png;base64,${btoa(binary)}`;
}
