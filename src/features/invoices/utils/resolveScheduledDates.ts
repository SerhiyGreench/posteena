import {
    addDays,
    addMonths,
    endOfMonth,
    endOfQuarter,
    format,
    getDaysInMonth,
    parseISO,
    setDate,
    startOfMonth,
    startOfQuarter,
    subMonths,
    subQuarters,
} from 'date-fns';

import {
    type DueDateModeType,
    DueDateModes,
} from '@/features/invoices/constants/DueDateModes';
import {
    type InvoiceDateAnchorType,
    InvoiceDateAnchors,
} from '@/features/invoices/constants/InvoiceDateAnchors';
import { InvoiceSchedulePeriods } from '@/features/invoices/constants/InvoiceSchedulePeriods';
import type { InvoiceSchedule } from '@/features/invoices/types';

/** ISO date format used for every stored date field. */
const IsoDate = 'yyyy-MM-dd';

export interface ScheduledDates {
    issueDate: string;
    supplyDate: string;
    dueDate: string;
    /** Bounds of the billing period, for reference by the caller. */
    periodStart: string;
    periodEnd: string;
}

/** First and last day of the period an invoice created today covers. */
function resolvePeriodBounds(
    schedule: InvoiceSchedule,
    today: Date,
): { start: Date; end: Date } {
    if (schedule.period === InvoiceSchedulePeriods.Monthly) {
        const base = schedule.billPreviousPeriod ? subMonths(today, 1) : today;

        return { start: startOfMonth(base), end: endOfMonth(base) };
    }

    if (schedule.period === InvoiceSchedulePeriods.Quarterly) {
        const base = schedule.billPreviousPeriod
            ? subQuarters(today, 1)
            : today;

        return { start: startOfQuarter(base), end: endOfQuarter(base) };
    }

    // No period: every anchor collapses onto today, which is how a one-off
    // invoice behaves.
    return { start: today, end: today };
}

/** Clamps a day number to a month that may be shorter than it. */
function clampDayOfMonth(day: number, month: Date): number {
    return Math.min(Math.max(day, 1), getDaysInMonth(month));
}

function resolveAnchor(
    anchor: InvoiceDateAnchorType,
    dayOfMonth: number,
    today: Date,
    bounds: { start: Date; end: Date },
): Date {
    if (anchor === InvoiceDateAnchors.PeriodStart) {
        return bounds.start;
    }

    if (anchor === InvoiceDateAnchors.PeriodEnd) {
        return bounds.end;
    }

    if (anchor === InvoiceDateAnchors.DayOfMonth) {
        // Taken within the billing period's month, so a monthly schedule
        // invoicing August lands on the 25th of August, not of today's month.
        const month = bounds.end;

        return setDate(month, clampDayOfMonth(dayOfMonth, month));
    }

    return today;
}

/**
 * The due date for a given issue date.
 *
 * `DayOfNextMonth` is clamped to the length of the target month, so a 31st
 * falls on the 30th in a short month rather than spilling into the next one.
 */
function resolveDue(
    mode: DueDateModeType,
    dueDays: number,
    dueDayOfMonth: number,
    issueDate: Date,
): Date {
    if (mode === DueDateModes.DayOfNextMonth) {
        const target = addMonths(issueDate, 1);

        return setDate(target, clampDayOfMonth(dueDayOfMonth, target));
    }

    return addDays(issueDate, dueDays);
}

/**
 * Picks the issue, supply and due dates for a new invoice.
 *
 * Services delivered across a month are supplied on its last day even though
 * the invoice itself is written later, so each date is anchored independently
 * rather than all defaulting to today.
 */
export function resolveScheduledDates(
    schedule: InvoiceSchedule,
    dueDays: number,
    today: Date = new Date(),
): ScheduledDates {
    const bounds = resolvePeriodBounds(schedule, today);
    const issueDate = resolveAnchor(
        schedule.issueOn,
        schedule.issueDayOfMonth,
        today,
        bounds,
    );
    const supplyDate = resolveAnchor(
        schedule.supplyOn,
        schedule.supplyDayOfMonth,
        today,
        bounds,
    );
    const dueDate = resolveDue(
        schedule.dueMode,
        dueDays,
        schedule.dueDayOfMonth,
        issueDate,
    );

    return {
        issueDate: format(issueDate, IsoDate),
        supplyDate: format(supplyDate, IsoDate),
        dueDate: format(dueDate, IsoDate),
        periodStart: format(bounds.start, IsoDate),
        periodEnd: format(bounds.end, IsoDate),
    };
}

/**
 * Recomputes the due date after the user edits the issue date by hand,
 * following the same rule the schedule uses.
 */
export function resolveDueDateFor(
    schedule: InvoiceSchedule,
    dueDays: number,
    issueDate: string,
): string {
    if (!issueDate) {
        return '';
    }

    const parsed = parseISO(issueDate);

    if (Number.isNaN(parsed.getTime())) {
        return issueDate;
    }

    return format(
        resolveDue(schedule.dueMode, dueDays, schedule.dueDayOfMonth, parsed),
        IsoDate,
    );
}
