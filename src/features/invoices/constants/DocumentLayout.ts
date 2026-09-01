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

/**
 * Leading for the blocks that stack one line per language — the spelled-out
 * amount and the totals labels.
 *
 * Those lines are translations of each other, not running prose, so they read
 * as one item when they sit close together and as separate items when they do
 * not. Expressed as a multiple of single spacing; the DOCX turns it into
 * twentieths of a line, which is how OOXML measures line spacing.
 */
export const StackedLineHeight = 0.85;

/**
 * The same leading for Word, in the units OOXML uses for a line-spacing
 * multiple: 240ths of a line, with `lineRule="auto"`.
 *
 * Not an exact height in points. Word honours an exact height literally and
 * crops whatever does not fit, so a value below the font's own line height
 * chops the tops and bottoms off the letters — a multiple scales the line
 * box instead, which is what the PDF's `lineHeight` does too.
 */
export const StackedLineSpacing = Math.round(240 * StackedLineHeight);

/** Gap between the last totals row and the filled band, in points. */
export const BandGapPt = 8;

/**
 * Share of a field grid taken by its label column.
 *
 * Deliberately small: the labels are slash-joined and wrap over as many lines
 * as they need, while the values beside them must not — an IBAN belongs on
 * one line.
 */
export const FieldLabelShare = 0.26;
