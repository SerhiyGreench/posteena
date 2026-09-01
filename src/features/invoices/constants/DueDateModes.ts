/**
 * How the due date is derived.
 *
 * - `Days` — a payment term counted from the issue date.
 * - `DayOfNextMonth` — a fixed calendar day, for customers who pay on a set
 *   date each month.
 */
export const DueDateModes = {
    Days: 'days',
    DayOfNextMonth: 'dayOfNextMonth',
} as const;

export type DueDateModeType = (typeof DueDateModes)[keyof typeof DueDateModes];
