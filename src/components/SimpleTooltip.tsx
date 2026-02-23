import { type ReactElement, type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip';

interface SimpleTooltipProps {
    children: ReactElement;
    content: ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
}

export function SimpleTooltip({
    children,
    content,
    side = 'top',
}: SimpleTooltipProps): ReactElement {
    return (
        <Tooltip>
            <TooltipTrigger render={children} />
            <TooltipContent
                side={side}
                sideOffset={8}
                className="border-white/10 bg-black px-2.5 py-1 text-white"
            >
                {content}
            </TooltipContent>
        </Tooltip>
    );
}
