/**
 * How the customer is expected to settle the invoice.
 */
export const PaymentMethods = {
    BankTransfer: 'bankTransfer',
    Cash: 'cash',
    Card: 'card',
} as const;

export type PaymentMethodType =
    (typeof PaymentMethods)[keyof typeof PaymentMethods];
