import { type PropsWithChildren, type ReactElement } from 'react';
import { Toggle } from 'ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip';

export interface MenuButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    tooltip: string;
}

const MenuButton = ({
    onClick,
    isActive = false,
    disabled = false,
    tooltip,
    children,
}: PropsWithChildren<MenuButtonProps>): ReactElement => (
    <Tooltip>
        <TooltipTrigger
            render={
                <Toggle
                    size="sm"
                    pressed={isActive}
                    onPressedChange={onClick}
                    disabled={disabled}
                    className="size-8 p-0"
                />
            }
        >
            {children}
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
);

export default MenuButton;
