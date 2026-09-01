import { describe, expect, it } from 'vitest';

import type { InvoiceRegistry } from '@/features/invoices/types';
import { normaliseRegistry } from '@/features/invoices/utils/normaliseRegistry';

/** A registry as written before languages became a list. */
function legacyRegistry(): unknown {
    return {
        version: 1,
        settings: {
            defaults: {
                language: 'bilingual',
                itemDescription: 'Consulting',
                itemDescriptionSk: 'Poradenstvo',
            },
        },
        companies: [{ id: 'c1', name: 'Acme', country: 'Cyprus' }],
        invoices: [
            {
                id: 'i1',
                language: 'sk',
                items: [
                    {
                        id: 'l1',
                        description: 'Work',
                        descriptionSk: 'Práca',
                        unit: 'hod',
                    },
                ],
                supplier: { id: 's', name: 'Me', country: 'Slovensko' },
                customer: { id: 'c1', name: 'Acme', country: 'Cyprus' },
            },
        ],
        updatedAt: '2026-01-01T00:00:00.000Z',
    };
}

describe('normaliseRegistry migration', () => {
    const result = normaliseRegistry(legacyRegistry() as InvoiceRegistry);

    it('turns the old "bilingual" default into a language list', () => {
        expect(result.settings.defaults.languages).toEqual(['sk', 'en']);
    });

    it('keeps a single stored language', () => {
        expect(result.invoices[0].languages).toEqual(['sk']);
    });

    it('migrates line item descriptions into the per-language map', () => {
        expect(result.invoices[0].items[0].descriptions).toEqual({
            en: 'Work',
            sk: 'Práca',
        });
    });

    it('migrates a single unit under the language it was written in', () => {
        // The old presets were Slovak abbreviations, so the value stays
        // readable and other languages can be filled in later.
        expect(result.invoices[0].items[0].units).toEqual({ sk: 'hod' });
    });

    it('keeps free-text countries as a fallback and adds the code field', () => {
        expect(result.companies[0].countryCode).toBe('');
        expect(result.companies[0].country).toBe('Cyprus');
    });

    it('defaults isPrimary rather than leaving it undefined', () => {
        expect(result.companies[0].isPrimary).toBe(false);
    });

    it('starts a fresh registry when there is nothing stored', () => {
        expect(normaliseRegistry(null).invoices).toEqual([]);
    });
});
