/**
 * Proportions the PDF and DOCX renderers must agree on.
 *
 * Kept in one place because the two renderers express widths differently —
 * percentages in pdfmake, twips in OOXML — and a ratio that drifts between
 * them shows up as two documents that no longer look alike.
 */

/**
 * Column split inside the totals block.
 *
 * The value column gets the larger share: an amount and its currency are held
 * together by a no-break space, so "1 260,00 EUR" is a single token that has
 * to fit — a column too narrow for it is broken mid-word into "EU" and "R".
 * The labels beside it stack one line per language and wrap without harm.
 */
export const SummaryColumns = {
    label: 0.4,
    value: 0.6,
} as const;
