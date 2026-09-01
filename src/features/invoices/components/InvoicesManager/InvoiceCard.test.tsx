// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Initialises i18n so `t()` returns real labels rather than the keys.
import '@/i18n';
import InvoiceCard from '@/features/invoices/components/InvoicesManager/InvoiceCard';
import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import { InvoiceStatuses } from '@/features/invoices/constants/InvoiceStatuses';
import type { Invoice } from '@/features/invoices/types';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createEmptyParty,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';

function buildInvoice(): Invoice {
    const draft = createInvoiceDraft(DefaultInvoiceSettings, {
        ...createEmptyParty(),
        name: 'Example Customer Ltd',
    });
    const items = draft.items.map(item => ({ ...item, unitPrice: 100 }));

    return {
        ...draft,
        items,
        totals: calculateInvoiceTotals(items),
        number: '20260009',
        status: InvoiceStatuses.Issued,
    };
}

function renderCard() {
    const handlers = {
        onEdit: vi.fn(),
        onPreview: vi.fn(),
        onClone: vi.fn(),
        onDelete: vi.fn(async () => {}),
        onStatusChange: vi.fn(async () => {}),
        onGenerate: vi.fn(async () => {}),
        onEmail: vi.fn(async () => {}),
    };

    render(<InvoiceCard invoice={buildInvoice()} {...handlers} />);

    return handlers;
}

// Auto-cleanup only runs with vitest globals enabled, which this project
// does not use, so the DOM is torn down explicitly.
afterEach(cleanup);

describe('InvoiceCard on narrow screens', () => {
    it('hides the actions behind a single menu button', () => {
        renderCard();

        // One trigger, not a row of nine buttons.
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(screen.queryByText('Preview')).toBeNull();
    });

    it('offers every action once the menu is opened', async () => {
        const user = userEvent.setup();

        renderCard();
        await user.click(screen.getByRole('button'));

        await waitFor(() => expect(screen.getByText('Preview')).toBeDefined());

        for (const label of [
            'Preview',
            'Edit',
            'PDF',
            'DOCX',
            'E-mail to customer',
            'Clone',
            'Mark as paid',
            'Delete',
        ]) {
            expect(screen.getByText(label)).toBeDefined();
        }
    });

    it('invokes the handler for the chosen action', async () => {
        const user = userEvent.setup();
        const handlers = renderCard();

        await user.click(screen.getByRole('button'));
        await waitFor(() => expect(screen.getByText('Edit')).toBeDefined());
        await user.click(screen.getByText('Edit'));

        expect(handlers.onEdit).toHaveBeenCalledOnce();
    });
});
