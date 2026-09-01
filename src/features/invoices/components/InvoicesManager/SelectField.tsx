import { type ReactElement } from 'react';
import { cn } from 'ui/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from 'ui/select';

export interface SelectFieldOption<T extends string> {
    value: T;
    label: string;
}

export interface SelectFieldProps<T extends string> {
    value: T | null;
    options: SelectFieldOption<T>[];
    onChange: (value: T) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * A single-choice dropdown built on the design system's `Select`.
 *
 * Wrapping the five Select parts here keeps every dropdown in the feature
 * consistent and typed to its own value union, instead of repeating the same
 * trigger/content markup at each call site.
 */
export default function SelectField<T extends string>({
    value,
    options,
    onChange,
    placeholder,
    disabled = false,
    className,
}: SelectFieldProps<T>): ReactElement {
    return (
        <Select
            value={value}
            disabled={disabled}
            onValueChange={(next: unknown) => onChange(next as T)}
        >
            <SelectTrigger className={cn('w-full', className)}>
                <SelectValue placeholder={placeholder}>
                    {(selected: unknown) =>
                        options.find(option => option.value === selected)
                            ?.label ??
                        placeholder ??
                        ''
                    }
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
