import { describe, expect, it } from 'vitest';

import { DocumentLanguages } from '@/features/invoices/constants/DocumentLanguages';
import {
    listCountryCodes,
    listCountryOptions,
    resolveCountryLabel,
    resolveCountryName,
} from '@/features/invoices/utils/resolveCountry';

describe('country list', () => {
    it('derives the ISO regions from Intl', () => {
        const codes = listCountryCodes();

        expect(codes.length).toBeGreaterThan(200);
        expect(codes).toContain('SK');
        expect(codes).toContain('CY');
        expect(codes).toContain('UA');
        // Two-letter combinations Intl cannot name are discarded.
        expect(codes).not.toContain('XX');
    });

    it('sorts options by name in the requested language', () => {
        const options = listCountryOptions(DocumentLanguages.English);
        const labels = options.map(option => option.label);

        expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    });
});

describe('country names', () => {
    it('translates a code per language', () => {
        expect(resolveCountryName('SK', DocumentLanguages.Slovak)).toBe(
            'Slovensko',
        );
        expect(resolveCountryName('SK', DocumentLanguages.English)).toBe(
            'Slovakia',
        );
        expect(resolveCountryName('SK', DocumentLanguages.Ukrainian)).toBe(
            'Словаччина',
        );
    });

    it('joins the selected languages', () => {
        expect(
            resolveCountryLabel('SK', [
                DocumentLanguages.Slovak,
                DocumentLanguages.English,
            ]),
        ).toBe('Slovensko / Slovakia');
    });

    it('collapses languages that spell it identically', () => {
        expect(
            resolveCountryLabel('CY', [
                DocumentLanguages.Slovak,
                DocumentLanguages.English,
            ]),
        ).toBe('Cyprus');
    });

    it('falls back to free text when no code is set', () => {
        expect(
            resolveCountryLabel('', [DocumentLanguages.English], 'Neverland'),
        ).toBe('Neverland');
    });
});
