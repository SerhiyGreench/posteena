import type { AppConfig } from './types';

const config: AppConfig = {
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};

export default config;
