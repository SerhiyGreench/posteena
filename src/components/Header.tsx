import { type ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import { Languages, Menu, Moon, Sun } from 'lucide-react';
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
    SheetTrigger,
} from 'ui/sheet';
import { Messages } from '@/constants/Messages';
import { Routes } from '@/constants/Routes';
import { Themes } from '@/constants/Themes';
import { Translations } from '@/constants/Translations';

const availableLocales = Object.keys(
    Translations,
) as (keyof typeof Translations)[];

interface HeaderProps {
    scrolled: boolean;
}

export default function Header({ scrolled }: HeaderProps): ReactElement {
    const { theme, setTheme } = useTheme();
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string): void => {
        void i18n.changeLanguage(lng);
    };

    const renderLanguageSwitcher = (
        align: 'start' | 'end' = 'start',
    ): ReactElement => (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                <Languages className="size-5" />
                <span className="sr-only">Switch language</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align}>
                <DropdownMenuRadioGroup
                    value={i18n.language}
                    onValueChange={changeLanguage}
                >
                    {availableLocales.map((locale: string) => {
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
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
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
                'bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full backdrop-blur transition-all duration-200',
                scrolled && 'border-b',
            )}
        >
            <div className="flex h-18 items-center justify-between gap-5 px-4 py-5">
                <Link
                    to={Routes.Home}
                    className="text-2xl font-bold tracking-tight sm:text-4xl lowercase"
                >
                    {t(Messages.ProjectName)}
                </Link>

                <div className="hidden items-center gap-2.5 sm:flex">
                    {renderLanguageSwitcher('start')}
                    {renderThemeSwitcher('end')}
                </div>

                <div className="flex items-center sm:hidden">
                    <Sheet>
                        <SheetTrigger
                            render={<Button variant="ghost" size="icon" />}
                        >
                            <Menu className="size-5" />
                        </SheetTrigger>
                        <SheetContent side="right">
                            <SheetHeader>
                                <SheetTitle>{t(Messages.ProjectName)}</SheetTitle>
                                <SheetDescription className="sr-only">
                                    Navigation menu
                                </SheetDescription>
                            </SheetHeader>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        Language
                                    </span>
                                    {renderLanguageSwitcher('end')}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        Theme
                                    </span>
                                    {renderThemeSwitcher('end')}
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
