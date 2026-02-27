export const Routes = {
    Home: '/',
    CreatePost: '/create-post',
    PostPreview: '/post',
    Passwords: '/password-manager',
    DigitalFootprint: '/digital-footprint',
    Notes: '/notes',
} as const;

export type RoutesType = (typeof Routes)[keyof typeof Routes];
