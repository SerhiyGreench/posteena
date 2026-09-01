/**
 * Loads a third-party script once, no matter how many callers ask for it.
 *
 * Several features need the same two Google scripts, and each of them used to
 * append its own tag — or, worse, resolve straight away on finding a tag some
 * other feature had *just* inserted and was still downloading. The caller then
 * touched `gapi` before `api.js` had executed and got a bare
 * "gapi is not defined". On a warm desktop cache the script almost always won
 * that race; on a phone over mobile data it did not.
 *
 * A single promise per source removes the race: whoever asks first starts the
 * download, and everyone else waits on the same promise.
 */

const loading = new Map<string, Promise<void>>();

/** Marks tags this module has seen through to execution. */
export const ScriptLoadedAttribute = 'data-loaded';

function attach(script: HTMLScriptElement, src: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        script.addEventListener(
            'load',
            () => {
                script.setAttribute(ScriptLoadedAttribute, 'true');
                resolve();
            },
            { once: true },
        );
        script.addEventListener(
            'error',
            () => reject(new Error(`Failed to load ${src}`)),
            { once: true },
        );
    });
}

/**
 * Resolves once the script at `src` has finished executing.
 *
 * A failed load is not cached, so a later attempt can retry it — a phone that
 * drops off the network mid-request should not be stuck until reload.
 */
export function loadScript(src: string): Promise<void> {
    const started = loading.get(src);

    if (started) {
        return started;
    }

    const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${src}"]`,
    );
    let promise: Promise<void>;

    if (existing) {
        // A tag from a previous build of this app, or from index.html. If it
        // already ran, it carries the marker; otherwise wait for it to finish
        // rather than assuming presence means readiness.
        promise =
            existing.getAttribute(ScriptLoadedAttribute) === 'true'
                ? Promise.resolve()
                : attach(existing, src);
    } else {
        const script = document.createElement('script');

        script.src = src;
        script.async = true;
        promise = attach(script, src);
        document.head.appendChild(script);
    }

    loading.set(src, promise);
    promise.catch(() => loading.delete(src));

    return promise;
}

/** Forgets every cached load. Exists for tests. */
export function resetLoadedScripts(): void {
    loading.clear();
}
