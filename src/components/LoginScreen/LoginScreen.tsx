import { type ReactElement, type ReactNode } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'ui/card';

export interface LoginScreenProps {
    title: string;
    description?: string;
    icon: ReactNode;
    loading?: boolean;
    onLogin: () => void;
    showShield?: boolean;
    shieldTitle?: string;
    shieldDescription?: string;
}

export default function LoginScreen({
    title,
    description,
    icon,
    loading = false,
    onLogin,
    showShield = false,
    shieldTitle,
    shieldDescription,
}: LoginScreenProps): ReactElement {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-[70vh] items-center justify-center p-4">
            <Card className="w-full max-w-md border-none shadow-lg dark:bg-black/50">
                <CardHeader className="space-y-1 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="bg-primary/10 rounded-full p-4">
                            {icon}
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        {title}
                    </CardTitle>
                    {description && (
                        <p className="text-muted-foreground mt-2">
                            {description}
                        </p>
                    )}
                </CardHeader>
                <CardContent className="grid gap-6 pt-6">
                    <div className="flex flex-col gap-4">
                        {showShield && (
                            <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3 text-sm">
                                <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                                <div className="space-y-1 text-left">
                                    {shieldTitle && (
                                        <p className="font-medium">
                                            {shieldTitle}
                                        </p>
                                    )}
                                    {shieldDescription && (
                                        <p className="text-muted-foreground leading-snug">
                                            {shieldDescription}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <Button
                            className="h-12 w-full text-lg font-medium transition-all hover:scale-[1.02]"
                            onClick={onLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <svg
                                        className="mr-2 h-5 w-5"
                                        aria-hidden="true"
                                        focusable="false"
                                        data-prefix="fab"
                                        data-icon="google"
                                        role="img"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 488 512"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                                        ></path>
                                    </svg>
                                    {t('loginWithGoogle')}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
