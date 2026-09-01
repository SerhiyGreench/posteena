import {
    type ReactElement,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';

export interface ScaledPageProps {
    /** Width the child is laid out at, in CSS pixels. */
    width: number;
    children: ReactNode;
}

/**
 * Shows a fixed-width page at whatever size the surrounding column allows.
 *
 * The invoice is a paper document, so it is laid out once at page width and
 * then scaled down as a whole. Letting it reflow into a phone-width column
 * would rearrange the very layout the preview exists to verify.
 *
 * Scaling never goes above 1: a wide screen shows the page at its natural
 * size rather than blowing it up.
 */
export default function ScaledPage({
    width,
    children,
}: ScaledPageProps): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [height, setHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        const container = containerRef.current;
        const content = contentRef.current;

        if (!container || !content) {
            return;
        }

        const measure = (): void => {
            const next = Math.min(1, container.clientWidth / width);

            setScale(next);
            // `transform` leaves the layout box alone, so the wrapper has to
            // carry the scaled height or the dialog would scroll past the page.
            setHeight(content.offsetHeight * next);
        };

        measure();

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver(measure);

        observer.observe(container);
        observer.observe(content);

        return (): void => observer.disconnect();
    }, [width, children]);

    return (
        <div ref={containerRef} className="w-full overflow-hidden">
            <div style={{ height }}>
                <div
                    ref={contentRef}
                    style={{
                        width,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
