import { useEffect, useState } from 'react';
import { type Locale, getLocale, setLocale } from '#/paraglide/runtime';

/**
 * React hook to read and update the current Paraglide locale.
 * Syncs the <html lang> attribute and uses Paraglide's URL strategy.
 */
export function useLocale(): readonly [string, (next: Locale) => void] {
    const [locale, setLocaleState] = useState(getLocale());

    useEffect((): void => {
        // Keep <html lang> in sync
        if (typeof document !== 'undefined') {
            const currentLocale = getLocale();
            document.documentElement.setAttribute('lang', currentLocale);
            setLocaleState(currentLocale);
        }
    }, []);

    const update = (next: Locale): void => {
        // With URL strategy, this will trigger a page reload/navigation to the new URL
        setLocale(next);
    };

    return [locale, update] as const;
}
