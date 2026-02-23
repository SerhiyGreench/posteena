export const Routes = {
    Home: '/',
    CreatePost: '/create-post',
    PostPreview: '/post',
    PasswordManager: '/password-manager',
    DigitalFootprint: '/digital-footprint',
} as const;

export type RoutesType = (typeof Routes)[keyof typeof Routes];
