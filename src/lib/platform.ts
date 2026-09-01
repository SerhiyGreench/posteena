interface UserAgentData {
    platform?: string;
}

/**
 * Whether the app is running on Android.
 *
 * Used to hand e-mail off to the installed mail app rather than opening
 * Gmail's web composer, which on a phone is a poor substitute for the app.
 * `userAgentData` is preferred where available; the user-agent string is the
 * fallback, since Android does not spoof that token.
 */
export function isAndroid(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const data = (navigator as Navigator & { userAgentData?: UserAgentData })
        .userAgentData;

    if (data?.platform) {
        return data.platform.toLowerCase() === 'android';
    }

    return /android/i.test(navigator.userAgent);
}
