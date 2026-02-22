export const Routes = {
    Home: '/',
    CreatePost: '/create-post',
    PostPreview: '/post',
} as const;

export type RoutesType = (typeof Routes)[keyof typeof Routes];
