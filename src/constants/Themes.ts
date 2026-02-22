export const Themes = {
    System: 'system',
    Light: 'light',
    Dark: 'dark',
} as const;

export type ThemesType = (typeof Themes)[keyof typeof Themes];
