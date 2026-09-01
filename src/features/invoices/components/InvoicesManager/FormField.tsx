import { type PropsWithChildren, type ReactElement } from 'react';
import { Label } from 'ui/label';
import { cn } from 'ui/lib/utils';

export interface FormFieldProps {
    label: string;
    /** Explanatory text rendered under the control. */
    hint?: string;
    htmlFor?: string;
    className?: string;
}

/**
 * Label, control and optional hint stacked together.
 *
 * Used by every form in the invoices feature so spacing and typography stay
 * consistent without repeating the same three elements dozens of times.
 */
export default function FormField({
    label,
    hint,
    htmlFor,
    className,
    children,
}: PropsWithChildren<FormFieldProps>): ReactElement {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <Label htmlFor={htmlFor} className="text-xs font-medium">
                {label}
            </Label>
            {children}
            {hint && (
                <p className="text-muted-foreground text-xs leading-snug">
                    {hint}
                </p>
            )}
        </div>
    );
}
