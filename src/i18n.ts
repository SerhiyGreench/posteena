import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { Translations } from '@/constants/Translations';

const resources = Object.fromEntries(
    Object.entries(Translations).map(([lang, messages]) => [
        lang,
        { translation: messages },
    ]),
);

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
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
