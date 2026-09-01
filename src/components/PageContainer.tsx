import React from 'react';
import { cn } from 'ui/lib/utils';

import { useLayout } from '@/hooks/useLayout';

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
    const { isFullWidth } = useLayout();

    return (
        <div
            className={cn(
                'w-full',
                !isFullWidth && 'mx-auto max-w-7xl',
                className,
            )}
        >
            {children}
        </div>
    );
}
