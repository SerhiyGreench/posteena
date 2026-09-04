import { type ReactElement, useState } from 'react';
import { Input } from 'ui/input';

import { parseDecimal } from '@/features/invoices/utils/parseDecimal';

export interface NumberFieldProps {
    value: number;
    onChange: (value: number) => void;
    id?: string;
    className?: string;
}

/**
 * A numeric input that can actually be typed into.
 *
 * Showing `String(value)` while parsing every keystroke makes a decimal
 * impossible to enter: typing the separator in "6500," parses to 6500, which
 * re-renders as "6500" and swallows the character — so the field could only
 * ever hold whole numbers. While it is being edited the text belongs to the
 * user; the parsed number still goes to the model on every keystroke, and the
 * field falls back to the model's own formatting once it loses focus.
 */
export default function NumberField({
    value,
    onChange,
    id,
    className,
}: NumberFieldProps): ReactElement {
    const [draft, setDraft] = useState<string | null>(null);

    return (
        <Input
            id={id}
            className={className}
            inputMode="decimal"
            value={draft ?? String(value)}
            onChange={event => {
                setDraft(event.target.value);
                onChange(parseDecimal(event.target.value));
            }}
            onBlur={() => setDraft(null)}
        />
    );
}
