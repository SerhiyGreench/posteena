import { Check, ChevronDown } from 'lucide-react';
import { type ReactElement } from 'react';
import { Button } from 'ui/button';
import { cn } from 'ui/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover';

import type { SelectFieldOption } from '@/features/invoices/components/InvoicesManager/SelectField';

export interface MultiSelectFieldProps<T extends string> {
    value: T[];
    options: SelectFieldOption<T>[];
    onChange: (value: T[]) => void;
    placeholder?: string;
    /** Keep at least this many selected; the last one cannot be removed. */
    minSelected?: number;
    className?: string;
}

/**
 * Multiple-choice dropdown built from the design system's popover and button.
 *
 * Selection order is preserved, because for document languages it decides
 * which variant is printed first and which locale formats the numbers.
 */
export default function MultiSelectField<T extends string>({
    value,
    options,
    onChange,
    placeholder,
    minSelected = 0,
    className,
}: MultiSelectFieldProps<T>): ReactElement {
    const toggle = (option: T): void => {
        if (value.includes(option)) {
            if (value.length <= minSelected) {
                return;
            }

            onChange(value.filter(entry => entry !== option));

            return;
        }

        // Append rather than reorder, so the user controls the printed order.
        onChange([...value, option]);
    };

    const summary = value
        .map(entry => options.find(option => option.value === entry)?.label)
        .filter(Boolean)
        .join(', ');

    return (
        <Popover>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        className={cn(
                            'w-full justify-between font-normal',
                            className,
                        )}
                    />
                }
            >
                <span
                    className={cn(
                        'truncate',
                        !summary && 'text-muted-foreground',
                    )}
                >
                    {summary || placeholder}
                </span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
                <div className="flex flex-col">
                    {options.map(option => {
                        const checked = value.includes(option.value);
                        const locked = checked && value.length <= minSelected;

                        return (
                            <Button
                                key={option.value}
                                variant="ghost"
                                size="sm"
                                disabled={locked}
                                className="justify-start gap-2 font-normal"
                                onClick={() => toggle(option.value)}
                            >
                                <Check
                                    className={cn(
                                        'size-4 shrink-0',
                                        !checked && 'opacity-0',
                                    )}
                                />
                                {option.label}
                            </Button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
