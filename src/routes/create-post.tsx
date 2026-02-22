import { type ReactElement, useSyncExternalStore } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import RichTextEditor from '@/components/RichTextEditor';
import { Messages } from '@/constants/Messages';
import { Routes } from '@/constants/Routes';
import { Storage } from '@/lib/Storage';

export const Route = createFileRoute(Routes.CreatePost)({
    component: CreatePost,
});

const EDITOR_CACHE_KEY = 'rich-text-editor-content';

function CreatePost(): ReactElement {
    const { t } = useTranslation();

    const storage = useSyncExternalStore(
        Storage.subscribe,
        Storage.getSnapshot,
    );
    const content =
        (storage[EDITOR_CACHE_KEY] as string) ||
        `<h1>${t(Messages.ExampleArticleTitle)}</h1>${t(Messages.ExampleArticleContent)}`;

    const handleUpdate = (newContent: string): void => {
        Storage.set(EDITOR_CACHE_KEY, newContent);
    };

    return (
        <main className="container mx-auto max-w-4xl p-4">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    {t(Messages.CreateNewPost)}
                </h1>
                <Link to={Routes.PostPreview}>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="size-4" />
                        {t(Messages.Preview)}
                    </Button>
                </Link>
            </div>
            <div className="bg-card rounded-lg border p-1 shadow-sm">
                <RichTextEditor content={content} onUpdate={handleUpdate} />
            </div>
        </main>
    );
}
