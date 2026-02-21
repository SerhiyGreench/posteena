const STORAGE_KEY = 'posteena-storage';

/**
 * Internal state for the storage manager.
 */
let storageState: Record<string, unknown> = {};

/**
 * Event emitter for storage changes.
 */
const listeners = new Set<() => void>();

function emit(): void {
    listeners.forEach(listener => listener());
}

/**
 * Helper to initialize state from localStorage.
 */
function initialize(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored) {
            storageState = JSON.parse(stored) as Record<string, unknown>;
        }
    } catch (error) {
        console.error('Failed to initialize storage:', error);
    }
}

// Initial initialization
initialize();

/**
 * Persist current state to localStorage.
 */
function persist(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageState));
    } catch (error) {
        console.error('Failed to persist storage:', error);
    }
}

/**
 * Listen for changes from other tabs.
 */
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event: StorageEvent): void => {
        if (event.key === STORAGE_KEY && event.newValue) {
            try {
                storageState = JSON.parse(event.newValue) as Record<
                    string,
                    unknown
                >;
                emit();
            } catch (error) {
                console.error('Failed to sync storage from other tab:', error);
            }
        }
    });
}

/**
 * Public imperative storage API.
 */
export const Storage = {
    get: <T>(key: string, defaultValue: T): T => {
        return (storageState[key] as T) ?? defaultValue;
    },
    set: <T>(key: string, value: T): void => {
        storageState = {
            ...storageState,
            [key]: value,
        };
        persist();
        emit();
    },
    subscribe: (callback: () => void): (() => void) => {
        listeners.add(callback);

        return (): void => {
            listeners.delete(callback);
        };
    },
    getSnapshot: (): Record<string, unknown> => storageState,
};
