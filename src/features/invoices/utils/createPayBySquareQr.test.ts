// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { DefaultInvoiceSettings } from '@/features/invoices/constants/DefaultInvoiceSettings';
import type { Invoice } from '@/features/invoices/types';
import { calculateInvoiceTotals } from '@/features/invoices/utils/calculateInvoiceTotals';
import {
    createEmptyParty,
    createInvoiceDraft,
} from '@/features/invoices/utils/createInvoiceDraft';
import {
    canCreatePayBySquare,
    createPayBySquareQr,
    encodePayBySquare,
} from '@/features/invoices/utils/createPayBySquareQr';

function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
    const supplier = {
        ...DefaultInvoiceSettings.supplier,
        name: 'Example Supplier s. r. o.',
        street: 'Testovacia 1',
        city: 'Bratislava',
        bank: {
            accountHolder: 'Example Supplier s. r. o.',
            bankName: 'Example Bank, a. s.',
            // Stored with spaces, as it is displayed.
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
        dueDate: '2026-09-15',
        symbols: { ...draft.symbols, variableSymbol: '20260009' },
        payBySquare: true,
        ...overrides,
    };
}

describe('canCreatePayBySquare', () => {
    it('accepts an invoice with an IBAN and an amount', () => {
        expect(canCreatePayBySquare(buildInvoice())).toBe(true);
    });

    it('declines when the feature is switched off', () => {
        expect(canCreatePayBySquare(buildInvoice({ payBySquare: false }))).toBe(
            false,
        );
    });

    it('declines a zero amount, which would scan into a useless order', () => {
        const invoice = buildInvoice();

        expect(
            canCreatePayBySquare({
                ...invoice,
                totals: { ...invoice.totals, amountDue: 0 },
            }),
        ).toBe(false);
    });

    it('declines when there is no IBAN', () => {
        const invoice = buildInvoice();

        expect(
            canCreatePayBySquare({
                ...invoice,
                supplier: {
                    ...invoice.supplier,
                    bank: { ...invoice.supplier.bank, iban: '' },
                },
            }),
        ).toBe(false);
    });
});

describe('encodePayBySquare', () => {
    it('round-trips through the bysquare decoder', async () => {
        const encoded = await encodePayBySquare(buildInvoice());
        const { decode } = await import('bysquare/pay');
        const decoded = decode(encoded);
        const payment = decoded.payments[0];

        expect(decoded.invoiceId).toBe('20260009');
        expect(payment.amount).toBe(6500);
        expect(payment.currencyCode).toBe('EUR');
        // Spaces must be stripped or banking apps reject the account.
        expect(payment.bankAccounts[0].iban).toBe('SK2499990000000000001234');
        expect(payment.bankAccounts[0].bic).toBe('TESTSKBX');
        expect(payment.variableSymbol).toBe('20260009');
        // The standard wants YYYYMMDD, not the ISO date we store.
        expect(payment.paymentDueDate).toBe('20260915');
    });

    it('declares format version 1.0.0, as real invoices do', async () => {
        const encoded = await encodePayBySquare(buildInvoice());

        // Verified against the QR codes decoded from two real Slovak invoices,
        // both of which start "00". The library default of 1.2.0 ("08") is
        // what banking apps reject as an unsupported code.
        expect(encoded.slice(0, 2)).toBe('00');
    });

    it('keeps the invoice id within the ten character limit', async () => {
        const encoded = await encodePayBySquare(
            buildInvoice({ number: 'FA-2026-000000123' }),
        );
        const { decode } = await import('bysquare/pay');

        expect(decode(encoded).invoiceId).toHaveLength(10);
    });
});

describe('createPayBySquareQr', () => {
    it('renders a PNG data URL', async () => {
        const qr = await createPayBySquareQr(buildInvoice());

        expect(qr?.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
        expect(qr?.caption).toBe('PAY by square');
    });

    it('returns nothing when the invoice cannot produce a code', async () => {
        expect(
            await createPayBySquareQr(buildInvoice({ payBySquare: false })),
        ).toBeNull();
    });
});
