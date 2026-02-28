import { type ReactElement, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Languages, LogOut, Moon, Sun, User as UserIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from 'ui/avatar';
import { Button } from 'ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from 'ui/dropdown-menu';
import { cn } from 'ui/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from 'ui/sheet';
import MobileLink from '@/components/MobileLink';
import { Messages } from '@/constants/Messages';
import { Routes } from '@/constants/Routes';
import { Themes } from '@/constants/Themes';
import { Translations } from '@/constants/Translations';
import { useAuth } from '@/hooks/useAuth';

type Language = keyof typeof Translations;

const availableLocales = Object.keys(Translations) as Language[];

interface HeaderProps {
    scrolled: boolean;
}

export default function Header({ scrolled }: HeaderProps): ReactElement {
    const { theme, setTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const { isAuthenticated, user, logout } = useAuth();

    const renderGoogleIcon = (className?: string): ReactElement => (
        <svg
            className={className}
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
    );

    const changeLanguage = (lang: Language): void => {
        void i18n.changeLanguage(lang);
    };

    const renderLanguageSwitcher = (
        align: 'start' | 'end' = 'start',
    ): ReactElement => (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="extend-touch-target"
                    />
                }
            >
                <Languages className="size-5" />
                <span className="sr-only">{t('switchLanguage')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align}>
                <DropdownMenuRadioGroup
                    value={i18n.language}
                    onValueChange={changeLanguage}
                >
                    {availableLocales.map(locale => {
                        const languageNames = new Intl.DisplayNames([locale], {
                            type: 'language',
                        });
                        const label =
                            languageNames.of(locale) ?? locale.toUpperCase();

                        return (
                            <DropdownMenuRadioItem key={locale} value={locale}>
                                {label}
                            </DropdownMenuRadioItem>
                        );
                    })}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const renderThemeSwitcher = (
        align: 'start' | 'end' = 'end',
    ): ReactElement => (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="extend-touch-target relative flex items-center justify-center"
                    />
                }
            >
                <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">{t('toggleTheme')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align}>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                    <DropdownMenuRadioItem value={Themes.Light}>
                        {t(Messages.ThemeLight)}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value={Themes.Dark}>
                        {t(Messages.ThemeDark)}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value={Themes.System}>
                        {t(Messages.ThemeSystem)}
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <header
            className={cn(
                'supports-backdrop-filter:bg-background/60 sticky top-0 z-52 w-full backdrop-blur transition-all duration-200',
                open ? 'bg-background/70 backdrop-blur-xl' : 'bg-background/95',
                scrolled && !open && 'border-b',
            )}
        >
            <div className="flex h-18 items-center justify-between gap-5 px-4 py-5">
                <Link
                    to={Routes.Home}
                    className="min-w-0 flex-1 truncate text-4xl font-bold lowercase sm:flex-none"
                >
                    {t(Messages.ProjectName)}
                </Link>

                <div className="flex items-center gap-5">
                    {isAuthenticated && user && !open && (
                        <div className="flex items-center gap-5">
                            <Popover>
                                <PopoverTrigger
                                    render={
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="bg-muted/50 hover:bg-muted h-9 gap-2 rounded-full px-2"
                                        />
                                    }
                                >
                                    <div className="flex items-center gap-1.5">
                                        {user.provider.id === 'google' && (
                                            <div className="flex items-center justify-center">
                                                {renderGoogleIcon('size-3.5')}
                                            </div>
                                        )}
                                        <Avatar
                                            size="sm"
                                            className="ring-border ring-1"
                                        >
                                            {user.picture && (
                                                <AvatarImage
                                                    src={user.picture}
                                                    alt={user.name}
                                                    referrerPolicy="no-referrer"
                                                />
                                            )}
                                            {!user.picture && (
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    <UserIcon className="size-3.5" />
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="end"
                                    className="mt-4 w-64"
                                >
                                    <div className="flex flex-col gap-4">
                                        {user.provider.id === 'google' && (
                                            <div className="bg-muted/50 flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-bold tracking-wider uppercase opacity-80">
                                                {renderGoogleIcon('size-4')}
                                                {user.provider.name}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <Avatar className="ring-border size-12 ring-1">
                                                {user.picture && (
                                                    <AvatarImage
                                                        src={user.picture}
                                                        alt={user.name}
                                                        referrerPolicy="no-referrer"
                                                    />
                                                )}
                                                {!user.picture && (
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        <UserIcon className="size-6" />
                                                    </AvatarFallback>
                                                )}
                                            </Avatar>
                                            <div className="flex flex-col gap-1 overflow-hidden">
                                                <div className="text-muted-foreground text-xs font-medium">
                                                    {t('loggedInAs')}
                                                </div>
                                                <div className="truncate text-sm font-bold">
                                                    {user.name}
                                                </div>
                                                <div className="text-muted-foreground truncate text-xs">
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive w-fit justify-start gap-2 hover:bg-transparent"
                                            onClick={() => void logout()}
                                        >
                                            <LogOut className="size-4" />
                                            {t('logout')}
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    {!open && (
                        <div className="hidden items-center gap-2.5 sm:flex">
                            {renderLanguageSwitcher('start')}
                            {renderThemeSwitcher('end')}
                        </div>
                    )}

                    <div className="flex items-center">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setOpen(!open);
                                    }}
                                    className="extend-touch-target h-8 touch-manipulation items-center justify-start gap-2.5 p-0! hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent sm:pt-1! dark:hover:bg-transparent"
                                >
                                    <div className="relative flex h-8 w-5 items-center justify-center">
                                        <div className="relative size-5">
                                            <span
                                                className={cn(
                                                    'bg-foreground absolute left-0 block h-0.5 w-5 transition-all duration-100',
                                                    open
                                                        ? 'top-[0.55rem] -rotate-45'
                                                        : 'top-1.5',
                                                )}
                                            />
                                            <span
                                                className={cn(
                                                    'bg-foreground absolute left-0 block h-0.5 w-5 transition-all duration-100',
                                                    open
                                                        ? 'top-[0.55rem] rotate-45'
                                                        : 'top-3.5',
                                                )}
                                            />
                                        </div>
                                        <span className="sr-only">
                                            {t('navigationMenu')}
                                        </span>
                                    </div>
                                    <span className="hidden h-8 items-center text-lg leading-none font-medium sm:flex">
                                        {t('menu')}
                                    </span>
                                </Button>
                            </div>
                            <SheetContent
                                side="bottom"
                                showCloseButton={false}
                                className="bg-background/70 no-scrollbar fixed inset-0 h-dvh w-screen overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur-xl duration-100 data-open:animate-none!"
                            >
                                <SheetHeader className="sr-only">
                                    <SheetTitle>
                                        {t(Messages.ProjectName)}
                                    </SheetTitle>
                                    <SheetDescription>
                                        {t('navigationMenu')}
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="mx-auto flex w-full max-w-full flex-col gap-12 overflow-x-hidden px-6 pt-24 pb-12">
                                    <div className="flex flex-col gap-4">
                                        <div className="text-muted-foreground text-sm font-medium">
                                            {t('menu')}
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <MobileLink
                                                to={Routes.Home}
                                                onOpenChange={setOpen}
                                            >
                                                {t('home')}
                                            </MobileLink>
                                            <MobileLink
                                                to={Routes.Notes}
                                                onOpenChange={setOpen}
                                            >
                                                {t('features.notes.name')}
                                            </MobileLink>
                                            <MobileLink
                                                to={Routes.Passwords}
                                                onOpenChange={setOpen}
                                            >
                                                {t('features.passwords.name')}
                                            </MobileLink>
                                            <MobileLink
                                                to={Routes.Knowledge}
                                                onOpenChange={setOpen}
                                            >
                                                {t('knowledge.title')}
                                            </MobileLink>
                                            <MobileLink
                                                to={Routes.DigitalFootprint}
                                                onOpenChange={setOpen}
                                            >
                                                {t('digitalFootprint.title')}
                                            </MobileLink>

                                            {isAuthenticated && user && (
                                                <div className="mt-4 flex flex-col gap-4">
                                                    <div className="flex flex-col gap-3 px-3">
                                                        {user.provider.id ===
                                                            'google' && (
                                                            <div className="bg-muted/50 flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-bold tracking-wider uppercase opacity-80">
                                                                {renderGoogleIcon(
                                                                    'size-4',
                                                                )}
                                                                {
                                                                    user
                                                                        .provider
                                                                        .name
                                                                }
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="ring-border size-12 ring-1">
                                                                {user.picture && (
                                                                    <AvatarImage
                                                                        src={
                                                                            user.picture
                                                                        }
                                                                        alt={
                                                                            user.name
                                                                        }
                                                                        referrerPolicy="no-referrer"
                                                                    />
                                                                )}
                                                                {!user.picture && (
                                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                                        <UserIcon className="size-6" />
                                                                    </AvatarFallback>
                                                                )}
                                                            </Avatar>
                                                            <div className="flex flex-col gap-1 overflow-hidden">
                                                                <div className="text-muted-foreground text-xs font-medium">
                                                                    {t(
                                                                        'loggedInAs',
                                                                    )}
                                                                </div>
                                                                <div className="truncate text-lg font-bold">
                                                                    {user.name}
                                                                </div>
                                                                <div className="text-muted-foreground truncate text-sm">
                                                                    {user.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="lg"
                                                        className="text-destructive hover:bg-destructive/10 h-auto w-fit justify-start px-3 py-1 text-2xl font-medium"
                                                        onClick={() => {
                                                            void logout();
                                                            setOpen(false);
                                                        }}
                                                    >
                                                        <LogOut className="mr-3 size-6" />
                                                        {t('logout')}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div className="text-muted-foreground text-sm font-medium">
                                            {t('settings')}
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-5">
                                                {renderLanguageSwitcher(
                                                    'start',
                                                )}
                                                <span className="shrink-0 text-2xl font-medium">
                                                    {t('language')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                {renderThemeSwitcher('start')}
                                                <span className="shrink-0 text-2xl font-medium">
                                                    {t('themeTitle')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
}
