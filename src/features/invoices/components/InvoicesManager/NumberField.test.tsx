// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactElement, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import NumberField from '@/features/invoices/components/InvoicesManager/NumberField';

/** Wired the way the editors wire it: the model owns the number. */
function Harness({ initial }: { initial: number }): ReactElement {
    const [value, setValue] = useState(initial);

    return (
        <>
            <NumberField value={value} onChange={setValue} />
            <output>{value}</output>
        </>
    );
}

describe('NumberField', () => {
    afterEach(cleanup);

    it('lets a decimal be typed one character at a time', () => {
        render(<Harness initial={0} />);

        const field = screen.getByRole<HTMLInputElement>('textbox');

        // The regression: parsing "6500." back to 6500 used to erase the
        // separator as soon as it was typed, so no price could have cents.
        for (const text of ['6', '65', '650', '6500', '6500.', '6500.5']) {
            fireEvent.change(field, { target: { value: text } });
        }

        expect(field.value).toBe('6500.5');
        expect(screen.getByText('6500.5')).toBeDefined();
    });

    it('accepts a comma as the decimal separator', () => {
        render(<Harness initial={0} />);

        const field = screen.getByRole<HTMLInputElement>('textbox');

        fireEvent.change(field, { target: { value: '6500,5' } });

        expect(field.value).toBe('6500,5');
        expect(screen.getByText('6500.5')).toBeDefined();
    });

    it('can be cleared without snapping back to zero mid-edit', () => {
        render(<Harness initial={12} />);

        const field = screen.getByRole<HTMLInputElement>('textbox');

        fireEvent.change(field, { target: { value: '' } });

        expect(field.value).toBe('');
        expect(screen.getByText('0')).toBeDefined();
    });

    it('shows the model’s own formatting again once it loses focus', () => {
        render(<Harness initial={0} />);

        const field = screen.getByRole<HTMLInputElement>('textbox');

        fireEvent.change(field, { target: { value: '6500,50' } });
        fireEvent.blur(field);

        expect(field.value).toBe('6500.5');
    });
});
