import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { cn } from 'ui/lib/utils';

function EnhancedScrollArea({
    className,
    viewportClassName,
    children,
    ...props
}: ScrollAreaPrimitive.Root.Props & { viewportClassName?: string }) {
    return (
        <ScrollAreaPrimitive.Root
            data-slot="scroll-area"
            className={cn('relative overflow-hidden', className)}
            {...props}
        >
            <EnhancedScrollAreaViewport
                data-slot="scroll-area-viewport"
                className={cn(
                    'focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1',
                    viewportClassName,
                )}
            >
                {children}
            </EnhancedScrollAreaViewport>
            <EnhancedScrollBar />
            <EnhancedScrollAreaCorner />
        </ScrollAreaPrimitive.Root>
    );
}

const EnhancedScrollAreaRoot = ScrollAreaPrimitive.Root;
const EnhancedScrollAreaViewport = ScrollAreaPrimitive.Viewport;
const EnhancedScrollAreaContent = ScrollAreaPrimitive.Content;
const EnhancedScrollBar = ({
    className,
    orientation = 'vertical',
    ...props
}: ScrollAreaPrimitive.Scrollbar.Props) => {
    return (
        <ScrollAreaPrimitive.Scrollbar
            data-slot="scroll-area-scrollbar"
            data-orientation={orientation}
            orientation={orientation}
            className={cn(
                'z-20 flex touch-none p-0 select-none data-horizontal:h-1 data-horizontal:flex-col data-vertical:w-1',
                'bg-transparent',
                className,
            )}
            {...props}
        >
            <ScrollAreaPrimitive.Thumb
                data-slot="scroll-area-thumb"
                className="bg-border hover:bg-border/80 relative min-h-[40px] flex-1 rounded-full transition-colors"
            />
        </ScrollAreaPrimitive.Scrollbar>
    );
};
const EnhancedScrollAreaCorner = ScrollAreaPrimitive.Corner;

export {
    EnhancedScrollArea as ScrollArea,
    EnhancedScrollBar as ScrollBar,
    EnhancedScrollAreaRoot as ScrollAreaRoot,
    EnhancedScrollAreaViewport as ScrollAreaViewport,
    EnhancedScrollAreaContent as ScrollAreaContent,
    EnhancedScrollAreaCorner as ScrollAreaCorner,
};
