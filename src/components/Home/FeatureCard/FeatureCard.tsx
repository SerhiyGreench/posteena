import { type ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import { Badge } from 'ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from 'ui/card';
import { cn } from 'ui/lib/utils';

interface FeatureCardProps {
    name: string;
    description: string;
    icon: ReactElement;
    to?: string;
    isUnderConstruction?: boolean;
    underConstructionLabel: string;
}

export default function FeatureCard({
    name,
    description,
    icon,
    to,
    isUnderConstruction,
    underConstructionLabel,
}: FeatureCardProps): ReactElement {
    const content = (
        <Card
            className={cn(
                'group relative h-full transition-all duration-300 hover:shadow-lg',
                isUnderConstruction
                    ? 'opacity-60 grayscale-[0.5]'
                    : 'hover:border-primary/50 hover:-translate-y-1',
            )}
        >
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div
                        className={cn(
                            'rounded-lg p-2 transition-colors',
                            isUnderConstruction
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
                        )}
                    >
                        {icon}
                    </div>
                    {isUnderConstruction && (
                        <Badge variant="secondary" className="font-normal">
                            {underConstructionLabel}
                        </Badge>
                    )}
                </div>
                <CardTitle className="mt-4 text-xl">{name}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                    {description}
                </CardDescription>
            </CardContent>
            {!isUnderConstruction && (
                <div className="absolute right-4 bottom-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-primary text-2xl">→</span>
                </div>
            )}
        </Card>
    );

    if (isUnderConstruction || !to) {
        return <div className="h-full cursor-not-allowed">{content}</div>;
    }

    return (
        <Link to={to} className="block h-full transition-none">
            {content}
        </Link>
    );
}
