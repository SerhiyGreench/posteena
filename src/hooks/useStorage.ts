import { useEffect, useState, useSyncExternalStore } from 'react';
import { Storage } from '@/lib/Storage';

/**
 * React hook to use a value from storage with reactive updates.
 * Safe for SSR: returns defaultValue during server-side rendering and initial hydration.
 */
export function useStorage<T>(
    key: string,
    defaultValue: T,
): readonly [T, (value: T) => void] {
    const [isMounted, setIsMounted] = useState(false);

    useEffect((): void => {
        setIsMounted(true);
    }, []);

    const state = useSyncExternalStore(
        Storage.subscribe,
        Storage.getSnapshot,
        (): Record<string, unknown> => ({}), // Server snapshot
    );

    const value = (state[key] as T) ?? defaultValue;
    const returnValue = isMounted ? value : defaultValue;

    const setValue = (newValue: T): void => {
        Storage.set(key, newValue);
    };

    return [returnValue, setValue] as const;
}
