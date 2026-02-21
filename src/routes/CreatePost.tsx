import { type ReactElement } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import RichTextEditor from '@/components/RichTextEditor';
import { Messages } from '@/constants/Messages';
import { Routes } from '@/constants/Routes';

export const Route = createFileRoute(Routes.CreatePost)({
    component: CreatePost,
});

function CreatePost(): ReactElement {
    const { t } = useTranslation();

    return (
        <main className="container mx-auto max-w-4xl p-4">
            <h1 className="mb-6 text-2xl font-bold tracking-tight lowercase">
                {t(Messages.CreateNewPost)}
            </h1>
            <div className="bg-card rounded-lg border p-1 shadow-sm">
                <RichTextEditor />
            </div>
        </main>
    );
}
