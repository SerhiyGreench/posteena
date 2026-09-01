/**
 * Direction of a column sort.
 */
export const SortDirections = {
    Ascending: 'asc',
    Descending: 'desc',
} as const;

export type SortDirectionType =
    (typeof SortDirections)[keyof typeof SortDirections];
