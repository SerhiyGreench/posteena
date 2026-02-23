import { type ComponentType, type ReactElement } from 'react';
import { type LucideProps } from 'lucide-react';
import { Skeleton } from 'ui/skeleton';

interface InfoItemProps {
    label: string;
    value: string | number | boolean | ReactElement;
    icon: ComponentType<LucideProps>;
    subValue?: string;
    isLoading?: boolean;
}

export default function InfoItem({
    label,
    value,
    icon: Icon,
    subValue,
    isLoading = false,
}: InfoItemProps): ReactElement {
    return (
        <div className="group flex items-start gap-3 px-1.5 py-3 sm:gap-4 sm:px-2">
            <div className="text-primary mt-1 flex size-9 shrink-0 items-center justify-center">
                <Icon className="size-5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                    {label}
                </span>
                <div className="mt-1.5 min-w-0">
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            {subValue && <Skeleton className="h-3 w-1/2" />}
                        </div>
                    ) : (
                        <>
                            <span className="text-lg leading-tight font-bold break-words">
                                {value}
                            </span>
                            {subValue && (
                                <div className="text-muted-foreground mt-0.5 text-xs">
                                    {subValue}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
