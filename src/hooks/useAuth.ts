import { useCallback, useEffect, useState } from 'react';
import { Storage } from '@/lib/Storage';

const GDRIVE_TOKEN_KEY = 'gdrive_access_token';
const DISCOVERY_DOC =
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

interface GapiClient {
    drive: {
        about: {
            get: (args: { fields: string }) => Promise<{
                result: {
                    user: {
                        emailAddress: string;
                        displayName: string;
                        photoLink?: string;
                    };
                };
            }>;
        };
    };
    init: (args: { discoveryDocs: string[] }) => Promise<void>;
    setToken: (args: { access_token: string }) => void;
}

interface Gapi {
    client: GapiClient;
    load: (api: string, callback: () => void) => void;
}

interface Google {
    accounts: {
        oauth2: {
            revoke: (token: string, callback: () => void) => void;
        };
    };
}

declare const gapi: Gapi;
declare const google: Google;

interface UserInfo {
    email: string;
    name: string;
    picture?: string;
    provider: {
        name: string;
        id: string;
    };
}

interface StoredSession {
    accessToken: string;
    expiresAt: number;
}

export function useAuth(): {
    isAuthenticated: boolean;
    user: UserInfo | null;
    loading: boolean;
    logout: () => Promise<void>;
} {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(async (): Promise<void> => {
        const stored = Storage.get<StoredSession | null>(
            GDRIVE_TOKEN_KEY,
            null,
        );
        if (stored && typeof google !== 'undefined') {
            google.accounts.oauth2.revoke(stored.accessToken, () => {});
        }
        Storage.set(GDRIVE_TOKEN_KEY, null);
        setIsAuthenticated(false);
        setUser(null);
    }, []);

    const fetchUserInfo = useCallback(async (): Promise<void> => {
        try {
            const response = await gapi.client.drive.about.get({
                fields: 'user(emailAddress, displayName, photoLink)',
            });
            const userData = response.result.user;
            if (userData) {
                setUser({
                    email: userData.emailAddress,
                    name: userData.displayName,
                    picture: userData.photoLink,
                    provider: {
                        name: 'Google',
                        id: 'google',
                    },
                });
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            // If fetching user info fails, the token might be invalid
            Storage.set(GDRIVE_TOKEN_KEY, null);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        const checkAuth = async (): Promise<void> => {
            const stored = Storage.get<StoredSession | null>(
                GDRIVE_TOKEN_KEY,
                null,
            );
            if (!stored) {
                if (mounted) {
                    setIsAuthenticated(false);
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            const token = stored.accessToken;

            // Ensure GAPI is loaded
            if (typeof gapi === 'undefined' || !gapi.client) {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = () => {
                    gapi.load('client', async () => {
                        await gapi.client.init({
                            discoveryDocs: [DISCOVERY_DOC],
                        });
                        gapi.client.setToken({ access_token: token });
                        if (mounted) {
                            void fetchUserInfo();
                        }
                    });
                };
                document.body.appendChild(script);
            } else {
                gapi.client.setToken({ access_token: token });
                void fetchUserInfo();
            }
        };

        void checkAuth();

        const unsub = Storage.subscribe(() => {
            const stored = Storage.get<StoredSession | null>(
                GDRIVE_TOKEN_KEY,
                null,
            );
            if (!stored) {
                setIsAuthenticated(false);
                setUser(null);
            } else if (!isAuthenticated) {
                void checkAuth();
            }
        });

        return () => {
            mounted = false;
            unsub();
        };
    }, [fetchUserInfo, isAuthenticated]);

    return {
        isAuthenticated,
        user,
        loading,
        logout,
    };
}
