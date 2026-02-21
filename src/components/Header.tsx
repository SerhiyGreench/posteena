import { type ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import { Languages, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from 'ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from 'ui/dropdown-menu';
import { m } from '#/paraglide/messages';
import { locales } from '#/paraglide/runtime';
import ClientOnly from '@/components/ClientOnly';
import { useLocale } from '@/hooks/useLocale';

export default function Header(): ReactElement {
    const { theme, setTheme } = useTheme();
    const [currentLocale, updateLocale] = useLocale();

    return (
        <header>
            <div className="flex h-18 items-center justify-between gap-5 px-7.5 py-5">
                <Link
                    to="/"
                    className="text-2xl font-bold tracking-tight lowercase @lg:text-4xl"
                >
                    {m.projectName()}
                </Link>

                <ClientOnly>
                    <div className="flex gap-2.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon" />}
                            >
                                <Languages className="size-5" />
                                <span className="sr-only">Switch language</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuRadioGroup
                                    value={currentLocale}
                                    onValueChange={(value: string): void =>
                                        updateLocale(
                                            value as (typeof locales)[number],
                                        )
                                    }
                                >
                                    {locales.map(
                                        (locale: (typeof locales)[number]) => {
                                            const languageNames =
                                                new Intl.DisplayNames(
                                                    [locale],
                                                    {
                                                        type: 'language',
                                                    },
                                                );
                                            const label =
                                                languageNames.of(locale) ??
                                                locale.toUpperCase();

                                            return (
                                                <DropdownMenuRadioItem
                                                    key={locale}
                                                    value={locale}
                                                >
                                                    {label}
                                                </DropdownMenuRadioItem>
                                            );
                                        },
                                    )}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={<Button variant="ghost" size="icon" />}
                            >
                                <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                                <Moon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                                <span className="sr-only">Toggle theme</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuRadioGroup
                                    value={theme}
                                    onValueChange={setTheme}
                                >
                                    <DropdownMenuRadioItem value="light">
                                        {m.themeLight()}
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="dark">
                                        {m.themeDark()}
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="system">
                                        {m.themeSystem()}
                                    </DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </ClientOnly>
            </div>
        </header>
    );
}
