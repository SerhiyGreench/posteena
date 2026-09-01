// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import InvoicePreview from '@/features/invoices/components/InvoicesManager/InvoicePreview';
import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import type { Invoice } from '@/features/invoices/types';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createEmptyParty,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';

const Note = 'Not a VAT payer.';

function buildInvoice(): Invoice {
    const supplier = {
        ...DefaultInvoiceSettings.supplier,
        name: 'Example Supplier s. r. o.',
        bank: {
            accountHolder: 'Example Supplier s. r. o.',
            bankName: 'Example Bank, a. s.',
            iban: 'SK24 9999 0000 0000 0000 1234',
            swift: 'TESTSKBX',
            accountNumber: '',
        },
    };
    const draft = createInvoiceDraft(
        { ...DefaultInvoiceSettings, supplier },
        { ...createEmptyParty(), name: 'Example Customer Ltd' },
    );
    const items = draft.items.map(item => ({ ...item, unitPrice: 6500 }));

    return {
        ...draft,
        items,
        totals: calculateInvoiceTotals(items),
        number: '20260009',
        notes: [Note],
        payBySquare: true,
    };
}

afterEach(cleanup);

describe('InvoicePreview layout', () => {
    it('places the footer notes above the payment code', async () => {
        const { container } = render(
            <InvoicePreview invoice={buildInvoice()} />,
        );

        // The QR is rasterised asynchronously, so wait for it to appear.
        await waitFor(() =>
            expect(
                container.querySelector('img[alt="PAY by square"]'),
            ).not.toBeNull(),
        );

        const qr = container.querySelector('img[alt="PAY by square"]');
        const note = screen.getByText(Note);
        // The preview must match the order the PDF and DOCX print in.
        expect(
            note.compareDocumentPosition(qr as Node) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    }, 30_000);
});
