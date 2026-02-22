import { type ReactElement, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Languages, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Button } from 'ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from 'ui/dropdown-menu';
import { cn } from 'ui/lib/utils';
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

type Language = keyof typeof Translations;

const availableLocales = Object.keys(Translations) as Language[];

interface HeaderProps {
    scrolled: boolean;
}

export default function Header({ scrolled }: HeaderProps): ReactElement {
    const { theme, setTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);

    const changeLanguage = (lang: Language): void => {
        void i18n.changeLanguage(lang);
    };

    const renderLanguageSwitcher = (
        align: 'start' | 'end' = 'start',
    ): ReactElement => (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" />}
            >
                <Languages className="size-5" />
                <span className="sr-only">Switch language</span>
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
                render={<Button variant="ghost" size="icon" />}
            >
                <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                <Moon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                <span className="sr-only">Toggle theme</span>
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
                'bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-100 w-full backdrop-blur transition-all duration-200',
                scrolled && 'border-b',
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
                    <div className="hidden items-center gap-2.5 sm:flex">
                        {renderLanguageSwitcher('start')}
                        {renderThemeSwitcher('end')}
                    </div>

                    <div className="flex items-center">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <div className="relative z-60">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setOpen(!open);
                                    }}
                                    className="extend-touch-target h-8 touch-manipulation items-center justify-start gap-2.5 p-0! pt-3! hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent sm:pt-1! dark:hover:bg-transparent"
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
                                            Toggle Menu
                                        </span>
                                    </div>
                                    <span className="hidden h-8 items-center text-lg leading-none font-medium sm:flex">
                                        Menu
                                    </span>
                                </Button>
                            </div>
                            <SheetContent
                                side="bottom"
                                showCloseButton={false}
                                className="bg-background/70 no-scrollbar fixed inset-0 z-50 h-dvh w-screen overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur-xl duration-100 data-open:animate-none!"
                            >
                                <SheetHeader className="sr-only">
                                    <SheetTitle>
                                        {t(Messages.ProjectName)}
                                    </SheetTitle>
                                    <SheetDescription>
                                        Navigation menu
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="mx-auto flex w-full max-w-full flex-col gap-12 overflow-x-hidden px-6 pt-24 pb-12">
                                    <div className="flex flex-col gap-4">
                                        <div className="text-muted-foreground text-sm font-medium">
                                            Menu
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <MobileLink
                                                to={Routes.Home}
                                                onOpenChange={setOpen}
                                            >
                                                Home
                                            </MobileLink>
                                            <MobileLink
                                                to={Routes.CreatePost}
                                                onOpenChange={setOpen}
                                            >
                                                {t(Messages.CreatePost)}
                                            </MobileLink>
                                            <MobileLink
                                                to={Routes.PasswordManager}
                                                onOpenChange={setOpen}
                                            >
                                                {t(Messages.PasswordManager)}
                                            </MobileLink>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4 sm:hidden">
                                        <div className="text-muted-foreground text-sm font-medium">
                                            Settings
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <span className="shrink-0 text-2xl font-medium">
                                                    Language
                                                </span>
                                                <div className="flex-1" />
                                                {renderLanguageSwitcher('end')}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="shrink-0 text-2xl font-medium">
                                                    Theme
                                                </span>
                                                <div className="flex-1" />
                                                {renderThemeSwitcher('end')}
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
