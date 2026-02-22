import { type ReactElement, useSyncExternalStore } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Messages } from '@/constants/Messages';
import { Routes } from '@/constants/Routes';
import { Storage } from '@/lib/Storage';

export const Route = createFileRoute(Routes.PostPreview)({
    component: PostPreview,
});

const EDITOR_CACHE_KEY = 'rich-text-editor-content';

function PostPreview(): ReactElement {
    const { t } = useTranslation();

    const storage = useSyncExternalStore(
        Storage.subscribe,
        Storage.getSnapshot,
    );
    const content =
        (storage[EDITOR_CACHE_KEY] as string) ||
        `<h1>${t(Messages.ExampleArticleTitle)}</h1>${t(Messages.ExampleArticleContent)}`;

    return (
        <main className="container mx-auto max-w-4xl p-4">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    {t(Messages.Preview)}
                </h1>
                <Link to={Routes.CreatePost}>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Edit2 className="size-4" />
                        {t(Messages.Edit)}
                    </Button>
                </Link>
            </div>
            <article className="prose prose-sm dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: content }} />
            </article>
        </main>
    );
}

export default PostPreview;
