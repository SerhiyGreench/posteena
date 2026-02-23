import { type PropsWithChildren, type ReactElement } from 'react';
import { Toggle } from 'ui/toggle';
import { SimpleTooltip } from '@/components/SimpleTooltip';

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
    <SimpleTooltip content={tooltip}>
        <Toggle
            size="sm"
            pressed={isActive}
            onPressedChange={onClick}
            disabled={disabled}
            className="size-8 p-0"
        >
            {children}
        </Toggle>
    </SimpleTooltip>
);

export default MenuButton;
