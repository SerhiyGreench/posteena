// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isAndroid } from '@/lib/platform';

/** Presents a user agent with no `userAgentData` behind it. */
function withUserAgent(value: string): void {
    vi.stubGlobal('navigator', { userAgent: value });
}

describe('isAndroid', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('recognises Chrome on a phone', () => {
        withUserAgent(
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
        );

        expect(isAndroid()).toBe(true);
    });

    it('does not mistake desktop Linux for Android', () => {
        withUserAgent(
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        );

        expect(isAndroid()).toBe(false);
    });

    it('prefers userAgentData where the browser exposes it', () => {
        vi.stubGlobal('navigator', {
            userAgent: 'anything at all',
            userAgentData: { platform: 'Android' },
        });

        expect(isAndroid()).toBe(true);
    });
});
