import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { Translations } from '@/constants/Translations';

export type TranslationKeys = keyof typeof Translations.en;

const resources = {
    en: {
        translation: Translations.en,
    },
    uk: {
        translation: Translations.uk,
    },
};

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        detection: {
            order: [
                'querystring',
                'cookie',
                'localStorage',
                'navigator',
                'path',
                'subdomain',
            ],
            caches: ['localStorage', 'cookie'],
        },
    });

export default i18n;
