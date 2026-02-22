import type { AppConfig } from './types';

const config: AppConfig = {
    googleClientId:
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        '513161988542-taeq0o716q0hl3o6r3bqprqf1leh699m.apps.googleusercontent.com',
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
};

export default config;
