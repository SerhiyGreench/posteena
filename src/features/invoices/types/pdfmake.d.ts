/**
 * Minimal, self-contained typings for the slice of pdfmake this feature uses.
 *
 * pdfmake ships no types of its own and the community `@types/pdfmake` package
 * tracks its API loosely. Declaring the surface we actually call keeps the
 * project's "no `any`" rule intact without taking on that dependency.
 */
declare module 'pdfmake/build/pdfmake' {
    export type PdfAlignment = 'left' | 'right' | 'center' | 'justify';

    export interface PdfTextContent {
        text: string | PdfContent[];
        style?: string | string[];
        bold?: boolean;
        italics?: boolean;
        fontSize?: number;
        color?: string;
        alignment?: PdfAlignment;
        margin?: [number, number, number, number];
        lineHeight?: number;
        characterSpacing?: number;
    }

    export interface PdfColumnsContent {
        columns: PdfContent[];
        columnGap?: number;
        margin?: [number, number, number, number];
    }

    export interface PdfStackContent {
        stack: PdfContent[];
        style?: string | string[];
        width?: number | string;
        margin?: [number, number, number, number];
        alignment?: PdfAlignment;
    }

    export interface PdfTableCell {
        text?: string;
        style?: string | string[];
        bold?: boolean;
        fontSize?: number;
        color?: string;
        fillColor?: string;
        alignment?: PdfAlignment;
        colSpan?: number;
        rowSpan?: number;
        margin?: [number, number, number, number];
        border?: [boolean, boolean, boolean, boolean];
        /** Keeps the text on one line, overflowing rather than breaking it. */
        noWrap?: boolean;
    }

    export interface PdfTableDefinition {
        headerRows?: number;
        widths?: (number | string)[];
        body: (PdfTableCell | string)[][];
        dontBreakRows?: boolean;
    }

    export interface PdfTableLayout {
        hLineWidth?: (index: number, node: unknown) => number;
        vLineWidth?: (index: number, node: unknown) => number;
        hLineColor?: (index: number, node: unknown) => string;
        vLineColor?: (index: number, node: unknown) => string;
        paddingLeft?: (index: number, node: unknown) => number;
        paddingRight?: (index: number, node: unknown) => number;
        paddingTop?: (index: number, node: unknown) => number;
        paddingBottom?: (index: number, node: unknown) => number;
        fillColor?: (
            rowIndex: number,
            node: unknown,
            columnIndex: number,
        ) => string | null;
    }

    export interface PdfTableContent {
        table: PdfTableDefinition;
        layout?: string | PdfTableLayout;
        style?: string | string[];
        width?: number | string;
        margin?: [number, number, number, number];
    }

    export interface PdfCanvasLine {
        type: 'line';
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        lineWidth: number;
        lineColor?: string;
    }

    export interface PdfImageContent {
        /** Data URI or a name registered in the virtual file system. */
        image: string;
        width?: number;
        height?: number;
        margin?: [number, number, number, number];
        alignment?: PdfAlignment;
    }

    export interface PdfCanvasContent {
        canvas: PdfCanvasLine[];
        margin?: [number, number, number, number];
    }

    export type PdfContent =
        | string
        | PdfTextContent
        | PdfColumnsContent
        | PdfStackContent
        | PdfTableContent
        | PdfImageContent
        | PdfCanvasContent;

    export interface PdfStyle {
        fontSize?: number;
        bold?: boolean;
        italics?: boolean;
        color?: string;
        alignment?: PdfAlignment;
        margin?: [number, number, number, number];
        lineHeight?: number;
        characterSpacing?: number;
        fillColor?: string;
    }

    export interface PdfDocumentDefinition {
        pageSize?: string;
        pageMargins?: [number, number, number, number];
        content: PdfContent[];
        styles?: Record<string, PdfStyle>;
        defaultStyle?: PdfStyle;
        footer?: (
            currentPage: number,
            pageCount: number,
        ) => PdfContent | PdfContent[];
        info?: {
            title?: string;
            author?: string;
            subject?: string;
        };
    }

    export interface PdfDocumentHandle {
        /** Async since 0.3 — earlier releases took a callback instead. */
        getBlob: () => Promise<Blob>;
        download: (fileName?: string) => Promise<void>;
        open: () => void;
    }

    export interface PdfMakeStatic {
        vfs?: Record<string, string>;
        fonts?: Record<
            string,
            {
                normal: string;
                bold: string;
                italics: string;
                bolditalics: string;
            }
        >;
        /** Preferred way to register fonts from 0.3 onwards. */
        addVirtualFileSystem?: (vfs: Record<string, string>) => void;
        createPdf: (definition: PdfDocumentDefinition) => PdfDocumentHandle;
    }

    const pdfMake: PdfMakeStatic;

    export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
    /**
     * The virtual file system holding the bundled Roboto faces, which cover the
     * full Latin Extended-A range Slovak needs (č, ď, ť, ľ, ň, ŕ, š, ž, ô).
     *
     * The export shape moved across releases — `{ pdfMake: { vfs } }`, then
     * `{ vfs }`, and since 0.3 the font map itself — so this is deliberately
     * untyped and narrowed at runtime by `resolveVirtualFileSystem`.
     */
    const vfsFonts: unknown;

    export default vfsFonts;
}
