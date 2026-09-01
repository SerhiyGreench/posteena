/**
 * Saves a blob to the user's machine under the given file name.
 *
 * The object URL is revoked on the next tick, which is late enough for every
 * browser to have started the download and early enough not to leak.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 0);
}
