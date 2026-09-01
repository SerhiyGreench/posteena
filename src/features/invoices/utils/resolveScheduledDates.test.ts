import { describe, expect, it } from 'vitest';

import { DueDateModes } from '@/features/invoices/constants/DueDateModes';
import { InvoiceDateAnchors } from '@/features/invoices/constants/InvoiceDateAnchors';
import { InvoiceSchedulePeriods } from '@/features/invoices/constants/InvoiceSchedulePeriods';
import type { InvoiceSchedule } from '@/features/invoices/types';
import {
    resolveDueDateFor,
    resolveScheduledDates,
} from '@/features/invoices/utils/resolveScheduledDates';

function schedule(overrides: Partial<InvoiceSchedule> = {}): InvoiceSchedule {
    return {
        period: InvoiceSchedulePeriods.Monthly,
        billPreviousPeriod: false,
        issueOn: InvoiceDateAnchors.Today,
        issueDayOfMonth: 25,
        supplyOn: InvoiceDateAnchors.PeriodEnd,
        supplyDayOfMonth: 1,
        dueMode: DueDateModes.Days,
        dueDayOfMonth: 15,
        ...overrides,
    };
}

/** Mid-month, so period ends are clearly distinct from "today". */
const today = new Date(2026, 8, 10);

describe('resolveScheduledDates', () => {
    it('keeps every date on today when no period is set', () => {
        const dates = resolveScheduledDates(
            schedule({
                period: InvoiceSchedulePeriods.None,
                supplyOn: InvoiceDateAnchors.PeriodEnd,
            }),
            14,
            today,
        );

        expect(dates.issueDate).toBe('2026-09-10');
        expect(dates.supplyDate).toBe('2026-09-10');
        expect(dates.dueDate).toBe('2026-09-24');
    });

    it('supplies on the last day of the current month', () => {
        const dates = resolveScheduledDates(schedule(), 14, today);

        expect(dates.issueDate).toBe('2026-09-10');
        expect(dates.supplyDate).toBe('2026-09-30');
        expect(dates.periodStart).toBe('2026-09-01');
    });

    it('bills the month that just ended', () => {
        const dates = resolveScheduledDates(
            schedule({
                billPreviousPeriod: true,
                issueOn: InvoiceDateAnchors.PeriodEnd,
            }),
            14,
            today,
        );

        expect(dates.periodStart).toBe('2026-08-01');
        expect(dates.issueDate).toBe('2026-08-31');
        expect(dates.supplyDate).toBe('2026-08-31');
        expect(dates.dueDate).toBe('2026-09-14');
    });

    it('handles quarters', () => {
        const dates = resolveScheduledDates(
            schedule({
                period: InvoiceSchedulePeriods.Quarterly,
                billPreviousPeriod: true,
                issueOn: InvoiceDateAnchors.PeriodEnd,
            }),
            30,
            today,
        );

        expect(dates.periodStart).toBe('2026-04-01');
        expect(dates.issueDate).toBe('2026-06-30');
    });

    it('supports a fixed day of the following month', () => {
        const dates = resolveScheduledDates(
            schedule({
                dueMode: DueDateModes.DayOfNextMonth,
                dueDayOfMonth: 15,
            }),
            14,
            today,
        );

        expect(dates.dueDate).toBe('2026-10-15');
    });

    it('clamps a day that the target month does not have', () => {
        // The 31st in a 30-day month must not spill into the next one.
        const dates = resolveScheduledDates(
            schedule({
                dueMode: DueDateModes.DayOfNextMonth,
                dueDayOfMonth: 31,
            }),
            14,
            new Date(2026, 2, 10),
        );

        expect(dates.dueDate).toBe('2026-04-30');
    });
});

describe('a fixed day of the month', () => {
    it('issues on that day within the billing period', () => {
        const dates = resolveScheduledDates(
            schedule({ issueOn: InvoiceDateAnchors.DayOfMonth }),
            14,
            today,
        );

        expect(dates.issueDate).toBe('2026-09-25');
        expect(dates.dueDate).toBe('2026-10-09');
    });

    it('uses the billed period, not today, when billing the past month', () => {
        const dates = resolveScheduledDates(
            schedule({
                issueOn: InvoiceDateAnchors.DayOfMonth,
                billPreviousPeriod: true,
            }),
            14,
            today,
        );

        // Billing August: the 25th of August, not of September.
        expect(dates.issueDate).toBe('2026-08-25');
    });

    it('clamps to a short month', () => {
        const dates = resolveScheduledDates(
            schedule({
                issueOn: InvoiceDateAnchors.DayOfMonth,
                issueDayOfMonth: 31,
            }),
            14,
            new Date(2026, 3, 10),
        );

        expect(dates.issueDate).toBe('2026-04-30');
    });

    it('anchors the supply date independently', () => {
        const dates = resolveScheduledDates(
            schedule({
                issueOn: InvoiceDateAnchors.DayOfMonth,
                issueDayOfMonth: 25,
                supplyOn: InvoiceDateAnchors.DayOfMonth,
                supplyDayOfMonth: 1,
            }),
            14,
            today,
        );

        expect(dates.issueDate).toBe('2026-09-25');
        expect(dates.supplyDate).toBe('2026-09-01');
    });
});

describe('resolveDueDateFor', () => {
    it('re-derives the due date after the issue date is edited', () => {
        expect(resolveDueDateFor(schedule(), 14, '2026-09-01')).toBe(
            '2026-09-15',
        );
    });

    it('follows the fixed-day rule too', () => {
        expect(
            resolveDueDateFor(
                schedule({
                    dueMode: DueDateModes.DayOfNextMonth,
                    dueDayOfMonth: 5,
                }),
                14,
                '2026-09-20',
            ),
        ).toBe('2026-10-05');
    });

    it('returns nothing for an empty issue date', () => {
        expect(resolveDueDateFor(schedule(), 14, '')).toBe('');
    });
});
