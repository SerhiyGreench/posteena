import { type ReactElement } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { BookOpen, Fingerprint, Key, NotebookPen, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import FeatureCard from '@/components/Home/FeatureCard';
import { Messages } from '@/constants/Messages';
import { Routes } from '@/constants/Routes';

export const Route = createFileRoute(Routes.Home)({ component: App });

function App(): ReactElement {
    const { t } = useTranslation();

    const features = [
        {
            name: t('features.passwordManager.name'),
            description: t('features.passwordManager.description'),
            icon: <Key className="size-6" />,
            to: Routes.PasswordManager,
            isUnderConstruction: false,
        },
        {
            name: t('features.postSharing.name'),
            description: t('features.postSharing.description'),
            icon: <Share2 className="size-6" />,
            to: Routes.CreatePost,
            isUnderConstruction: true,
        },
        {
            name: t('features.notes.name'),
            description: t('features.notes.description'),
            icon: <NotebookPen className="size-6" />,
            isUnderConstruction: true,
        },
        {
            name: t('features.knowledgeCollections.name'),
            description: t('features.knowledgeCollections.description'),
            icon: <BookOpen className="size-6" />,
            isUnderConstruction: true,
        },
        {
            name: t('features.digitalFootprint.name'),
            description: t('features.digitalFootprint.description'),
            icon: <Fingerprint className="size-6" />,
            to: Routes.DigitalFootprint,
            isUnderConstruction: false,
        },
    ];

    return (
        <main className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center p-6 md:p-12">
            <div className="mb-16 max-w-2xl text-center">
                <p className="text-muted-foreground text-lg leading-relaxed">
                    {t(Messages.Description)}
                </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {features.map(feature => (
                    <FeatureCard
                        key={feature.name}
                        name={feature.name}
                        description={feature.description}
                        icon={feature.icon}
                        to={feature.to}
                        isUnderConstruction={feature.isUnderConstruction}
                        underConstructionLabel={t('features.underConstruction')}
                    />
                ))}
            </div>
        </main>
    );
}
