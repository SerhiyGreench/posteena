export const Routes = {
    Home: '/',
    CreatePost: '/CreatePost',
} as const;

export type RoutesType = (typeof Routes)[keyof typeof Routes];
