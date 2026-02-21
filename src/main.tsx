import React, { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';
import { useTranslation } from 'react-i18next';
import './i18n';
import { router } from './router';
import './styles.css';

function App() {
    const { i18n } = useTranslation();

    useEffect(() => {
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    return <RouterProvider router={router} />;
}

const rootElement = document.getElementById('root')!;

if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    );
}
