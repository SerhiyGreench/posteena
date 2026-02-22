import type { PropsWithChildren, ReactElement } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
import { cn } from 'ui/lib/utils';

export interface MobileLinkProps {
    to: string;
    onOpenChange?: (open: boolean) => void;
    className?: string;
}

export default function MobileLink({
    to,
    onOpenChange,
    className,
    children,
    ...props
}: PropsWithChildren<MobileLinkProps>): ReactElement {
    const router = useRouter();
    return (
        <Link
            to={to}
            onClick={() => {
                void router.navigate({ to });
                onOpenChange?.(false);
            }}
            className={cn(
                'flex items-center gap-2 text-2xl font-medium',
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
}
