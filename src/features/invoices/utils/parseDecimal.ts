/**
 * Reads a number the way a person types one.
 *
 * Slovak and Ukrainian keyboards put a comma where the decimal point goes, so
 * both separators are accepted. Anything that is not a number at all — an
 * empty field mid-edit, a stray minus — reads as zero rather than NaN, which
 * would otherwise spread through every total on the invoice.
 */
export function parseDecimal(value: string): number {
    const parsed = Number.parseFloat(value.replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : 0;
}
