/**
 * Proportions the PDF and DOCX renderers must agree on.
 *
 * Kept in one place because the two renderers express widths differently —
 * percentages in pdfmake, twips in OOXML — and a ratio that drifts between
 * them shows up as two documents that no longer look alike.
 */

/**
 * Column split inside the totals block, for the DOCX only.
 *
 * OOXML writes a table's grid as fixed twips, so the DOCX needs a starting
 * ratio where the PDF can simply say "as wide as the content" — Word grows a
 * column that overflows and never hyphenates, so the amount stays intact
 * either way. The value column gets the larger share because it holds an
 * amount and its currency as one unbreakable token.
 */
export const SummaryColumns = {
    label: 0.45,
    value: 0.55,
} as const;

/**
 * Split of the row under the line items, between the amount in words and the
 * totals block that ends in the filled band.
 *
 * The totals block takes the larger half: it has to hold a stacked label and
 * a whole amount side by side, and the words beside it are prose that wraps
 * over as many lines as it needs.
 */
export const TotalsRow = {
    words: 0.4,
    totals: 0.6,
} as const;
