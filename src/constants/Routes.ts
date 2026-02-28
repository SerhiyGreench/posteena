export const Routes = {
    Home: '/',
    CreatePost: '/create-post',
    PostPreview: '/post',
    Passwords: '/password-manager',
    DigitalFootprint: '/digital-footprint',
    Notes: '/notes',
    Knowledge: '/knowledge',
} as const;

export type RoutesType = (typeof Routes)[keyof typeof Routes];
