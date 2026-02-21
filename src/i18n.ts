import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            projectName: 'posteena',
            description:
                'This project is a web application multitool for sharing posts, managing personal notes, and storing passwords — focused on anonymity and user-controlled storage. It supports adapters for saving data to various cloud drive services.',
            createPost: 'create a post',
            themeLight: 'Light',
            themeDark: 'Dark',
            themeSystem: 'System',
            notFound: 'page not found',
        },
    },
    uk: {
        translation: {
            projectName: 'posteena',
            description:
                'Цей проєкт — це багатофункціональний вебзастосунок для публікації дописів, ведення особистих нотаток і зберігання паролів, орієнтований на анонімність та контроль користувача над власним сховищем. Підтримує адаптери для збереження даних у різних хмарних сервісах зберігання.',
            createPost: 'створити пост',
            themeLight: 'Світла',
            themeDark: 'Темна',
            themeSystem: 'Системна',
            notFound: 'сторінку не знайдено',
        },
    },
};

i18n.use(LanguageDetector)
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
