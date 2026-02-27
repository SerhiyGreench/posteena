export async function encrypt(text: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const passwordData = encoder.encode(password);
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data,
    );

    const result = new Uint8Array(
        salt.length + iv.length + encrypted.byteLength,
    );
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...result));
}

export async function decrypt(
    encryptedBase64: string,
    password: string,
): Promise<string> {
    const encryptedData = new Uint8Array(
        atob(encryptedBase64)
            .split('')
            .map(c => c.charCodeAt(0)),
    );

    const salt = encryptedData.slice(0, 16);
    const iv = encryptedData.slice(16, 28);
    const data = encryptedData.slice(28);

    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256',
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
    );

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data,
    );

    return new TextDecoder().decode(decrypted);
}

export interface PasswordGeneratorSettings {
    length: number;
    includeLetters: boolean;
    includeDigits: boolean;
    includeSymbols: boolean;
    customAlphabet?: string;
}

export const DEFAULT_PASSWORD_SETTINGS: PasswordGeneratorSettings = {
    length: 16,
    includeLetters: true,
    includeDigits: true,
    includeSymbols: false,
};

export const ALPHABETS = {
    letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
};

export function generatePassword(
    settings: PasswordGeneratorSettings = DEFAULT_PASSWORD_SETTINGS,
): string {
    let charset = '';

    if (settings.customAlphabet && settings.customAlphabet.length > 0) {
        charset = settings.customAlphabet;
    } else {
        if (settings.includeLetters) {
            charset += ALPHABETS.letters;
        }
        if (settings.includeDigits) {
            charset += ALPHABETS.digits;
        }
        if (settings.includeSymbols) {
            charset += ALPHABETS.symbols;
        }
    }

    if (charset.length === 0) {
        charset = ALPHABETS.letters + ALPHABETS.digits;
    }

    let retVal = '';
    for (let i = 0, n = charset.length; i < settings.length; ++i) {
        retVal += charset.charAt(
            Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % n),
        );
    }
    return retVal;
}
