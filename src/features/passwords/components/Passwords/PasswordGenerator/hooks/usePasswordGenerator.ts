import { useEffect, useState } from 'react';
import {
    ALPHABETS,
    DEFAULT_PASSWORD_SETTINGS,
    type PasswordGeneratorSettings,
    generatePassword,
} from '@/features/passwords/utils/crypto';
import { Storage } from '@/lib/Storage';

interface UsePasswordGeneratorProps {
    defaultValue?: string;
    onPasswordGenerate?: (password: string) => void;
}

interface UsePasswordGeneratorReturn {
    password: string | undefined;
    settings: PasswordGeneratorSettings;
    copied: boolean;
    showSettings: boolean;
    setShowSettings: (
        value: ((prevState: boolean) => boolean) | boolean,
    ) => void;
    handleGenerate: () => void;
    handleCopy: () => Promise<void>;
    handlePasswordChange: (newValue: string) => void;
    updateSettings: (newSettings: Partial<PasswordGeneratorSettings>) => void;
    updateAlphabet: (
        includeLetters: boolean,
        includeDigits: boolean,
        includeSymbols: boolean,
    ) => void;
}

export function usePasswordGenerator({
    defaultValue = '',
    onPasswordGenerate,
}: UsePasswordGeneratorProps = {}): UsePasswordGeneratorReturn {
    const [settings, setSettings] = useState<PasswordGeneratorSettings>(() =>
        Storage.get(
            'posteena_password_generator_settings',
            DEFAULT_PASSWORD_SETTINGS,
        ),
    );
    const [password, setPassword] = useState(defaultValue);
    const [copied, setCopied] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (defaultValue && !password) {
            setPassword(defaultValue);
        }
    }, [defaultValue]);

    const handleGenerate = (): void => {
        const newPassword = generatePassword(settings);
        setPassword(newPassword);
        onPasswordGenerate?.(newPassword);
    };

    const handleCopy = async (): Promise<void> => {
        if (!password) {
            return;
        }
        await navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePasswordChange = (newValue: string): void => {
        setPassword(newValue);
        onPasswordGenerate?.(newValue);
    };

    useEffect(() => {
        if (!settings.customAlphabet) {
            let alphabet = '';

            if (settings.includeLetters) {
                alphabet += ALPHABETS.letters;
            }

            if (settings.includeDigits) {
                alphabet += ALPHABETS.digits;
            }

            if (settings.includeSymbols) {
                alphabet += ALPHABETS.symbols;
            }

            if (alphabet) {
                setSettings(prev => ({ ...prev, customAlphabet: alphabet }));
            }
        }
    }, []);

    useEffect(() => {
        Storage.set('posteena_password_generator_settings', settings);
    }, [settings]);

    const updateSettings = (
        newSettings: Partial<PasswordGeneratorSettings>,
    ): void => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const updateAlphabet = (
        includeLetters: boolean,
        includeDigits: boolean,
        includeSymbols: boolean,
    ): void => {
        let alphabet = '';
        if (includeLetters) {
            alphabet += ALPHABETS.letters;
        }
        if (includeDigits) {
            alphabet += ALPHABETS.digits;
        }
        if (includeSymbols) {
            alphabet += ALPHABETS.symbols;
        }

        setSettings(prev => ({
            ...prev,
            includeLetters,
            includeDigits,
            includeSymbols,
            customAlphabet: alphabet,
        }));
    };

    return {
        password,
        settings,
        copied,
        showSettings,
        setShowSettings,
        handleGenerate,
        handleCopy,
        handlePasswordChange,
        updateSettings,
        updateAlphabet,
    };
}
