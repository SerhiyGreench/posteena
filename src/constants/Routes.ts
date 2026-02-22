export const Routes = {
    Home: '/',
    CreatePost: '/create-post',
    PostPreview: '/post',
    PasswordManager: '/password-manager',
} as const;

export type RoutesType = (typeof Routes)[keyof typeof Routes];
