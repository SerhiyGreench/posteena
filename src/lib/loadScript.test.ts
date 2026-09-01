// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { loadScript, resetLoadedScripts } from '@/lib/loadScript';

const Src = 'https://apis.google.com/js/api.js';

/** The tag the loader appended, so a test can decide when it "runs". */
function appended(): HTMLScriptElement {
    const script = document.querySelector<HTMLScriptElement>(
        `script[src="${Src}"]`,
    );

    if (!script) {
        throw new Error('no script tag was appended');
    }

    return script;
}

describe('loadScript', () => {
    afterEach(() => {
        resetLoadedScripts();
        document.querySelectorAll('script').forEach(node => node.remove());
    });

    it('appends the script once for concurrent callers', async () => {
        const first = loadScript(Src);
        const second = loadScript(Src);

        expect(document.querySelectorAll(`script[src="${Src}"]`)).toHaveLength(
            1,
        );

        appended().dispatchEvent(new Event('load'));

        await expect(Promise.all([first, second])).resolves.toBeDefined();
    });

    it('waits for a tag that has not executed yet', async () => {
        // The regression: a second caller used to resolve on merely seeing the
        // tag, then touched `gapi` before api.js had run.
        document.head.appendChild(
            Object.assign(document.createElement('script'), { src: Src }),
        );

        let loaded = false;
        const promise = loadScript(Src).then(() => {
            loaded = true;
        });

        await Promise.resolve();
        expect(loaded).toBe(false);

        appended().dispatchEvent(new Event('load'));
        await promise;
        expect(loaded).toBe(true);
    });

    it('resolves immediately for a script it has already loaded', async () => {
        const first = loadScript(Src);

        appended().dispatchEvent(new Event('load'));
        await first;

        resetLoadedScripts();

        // No new load event is dispatched: the marker on the tag is enough.
        await expect(loadScript(Src)).resolves.toBeUndefined();
        expect(document.querySelectorAll(`script[src="${Src}"]`)).toHaveLength(
            1,
        );
    });

    it('lets a failed load be retried', async () => {
        const first = loadScript(Src);

        appended().dispatchEvent(new Event('error'));
        await expect(first).rejects.toThrow(/Failed to load/);

        appended().remove();

        const retry = loadScript(Src);

        appended().dispatchEvent(new Event('load'));
        await expect(retry).resolves.toBeUndefined();
    });
});
