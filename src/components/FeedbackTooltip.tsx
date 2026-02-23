import { type ReactElement } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip';

interface FeedbackTooltipProps {
    children: ReactElement;
    show: boolean;
    message: string;
}

export function FeedbackTooltip({
    children,
    show,
    message,
}: FeedbackTooltipProps): ReactElement {
    return (
        <Tooltip open={show}>
            <TooltipTrigger render={children} />
            <TooltipContent
                side="top"
                sideOffset={8}
                className="rounded-md border border-white/10 bg-black px-2.5 py-1 text-xs text-white shadow-lg"
            >
                <div className="font-medium">
                    <span>{message}</span>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
