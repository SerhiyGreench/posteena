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
export const FieldLabelShare = 0.32;

/**
 * Type scale in points, shared by all three renderings.
 *
 * The PDF takes points directly, the DOCX doubles them into half-points, and
 * the preview converts them to CSS pixels. Kept here because the preview
 * exists to show what will be generated: a size that only lives in one of
 * them is a size the preview quietly lies about.
 */
export const DocumentFontSizes = {
    title: 22,
    number: 18,
    blockHeading: 8,
    partyName: 12,
    body: 9,
    label: 8,
    totalDueLabel: 10,
    totalDueValue: 13,
} as const;

/** Page metrics in points. */
export const DocumentMetrics = {
    pageMargin: 40,
    /** Gap between the two columns of a paired block. */
    columnGap: 24,
    /** Gap between the title and the invoice number. */
    headingGap: 16,
    ruleWidth: 2,
    ruleSpaceAbove: 6,
    ruleSpaceBelow: 12,
    /** Space above the dates and payment block. */
    fieldsSpaceAbove: 16,
    /** Space above the line items heading. */
    itemsSpaceAbove: 18,
    /** Space above the totals row. */
    totalsSpaceAbove: 14,
    /** Space above the notes, and above the payment code under them. */
    footerSpaceAbove: 20,
    barcodeWidth: 150,
    barcodeSpaceBelow: 8,
    payBySquareWidth: 90,
} as const;

/**
 * CSS pixels per point. The preview lays the page out at 96dpi, which is what
 * `Page.width` in the preview is derived from, so a point is 4/3 of a pixel.
 */
export const PointToPixel = 96 / 72;

/** A point measurement as a CSS length, for the on-screen preview. */
export function points(value: number): string {
    return `${value * PointToPixel}px`;
}

/**
 * Height of the supplier logo in the top right corner, in points.
 *
 * Only the height is fixed; the width follows the image's own proportions.
 * The logo is drawn outside the flow of the page, so it never moves anything
 * — which is also why it has to stay short enough to sit in the band the
 * barcode occupies.
 */
export const LogoHeightPt = 46;
