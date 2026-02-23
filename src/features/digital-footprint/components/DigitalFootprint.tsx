import {
    type ComponentType,
    type ReactElement,
    useEffect,
    useState,
} from 'react';
import {
    Activity,
    Battery,
    BatteryCharging,
    Layout as BrowserIcon,
    Copy,
    Cpu,
    Fingerprint,
    Globe,
    HardDrive,
    Info,
    Loader2,
    type LucideProps,
    Monitor,
    Palette,
    ShieldCheck,
    Smartphone,
    Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from 'ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from 'ui/card';
import { Skeleton } from 'ui/skeleton';
import { FeedbackTooltip } from '@/components/FeedbackTooltip';

interface FootprintData {
    ip: string | null;
    isOnline: boolean;
    userAgent: string;
    languages: string[];
    timezone: string;
    screenResolution: string;
    platform: string;
    doNotTrack: string | null;
    hardwareConcurrency: number;
    deviceMemory?: number;
    battery?: {
        level: number;
        charging: boolean;
    } | null;
    touchSupport: {
        supported: boolean;
        maxTouchPoints: number;
    };
    preferences: {
        colorScheme: string;
        reducedMotion: boolean;
    };
    capabilities: {
        canvas: boolean;
        webgl: boolean;
    };
    location?: {
        latitude: number;
        longitude: number;
        permission: 'granted' | 'denied' | 'prompt' | 'loading';
        error?: string;
    };
}

export default function DigitalFootprint(): ReactElement {
    const { t } = useTranslation();
    const [data, setData] = useState<FootprintData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [requestingLocation, setRequestingLocation] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const startLocationWatching = (): void => {
        if (!('geolocation' in navigator)) {
            return;
        }

        navigator.geolocation.watchPosition(
            position => {
                setData(prev =>
                    prev
                        ? {
                              ...prev,
                              location: {
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                  permission: 'granted',
                              },
                          }
                        : null,
                );
            },
            error => {
                let permission: 'denied' | 'prompt' = 'prompt';
                if (error.code === error.PERMISSION_DENIED) {
                    permission = 'denied';
                }
                setData(prev =>
                    prev
                        ? {
                              ...prev,
                              location: prev.location
                                  ? {
                                        ...prev.location,
                                        permission,
                                        error: error.message,
                                    }
                                  : {
                                        latitude: 0,
                                        longitude: 0,
                                        permission,
                                        error: error.message,
                                    },
                          }
                        : null,
                );
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0,
            },
        );
    };

    const requestLocation = (): void => {
        if (!('geolocation' in navigator)) {
            toast.error(t('digitalFootprint.locationNotSupported'));
            return;
        }

        setRequestingLocation(true);
        navigator.geolocation.getCurrentPosition(
            position => {
                setData(prev =>
                    prev
                        ? {
                              ...prev,
                              location: {
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                  permission: 'granted',
                              },
                          }
                        : null,
                );
                setRequestingLocation(false);
                startLocationWatching();
            },
            error => {
                let permission: 'denied' | 'prompt' = 'prompt';
                if (error.code === error.PERMISSION_DENIED) {
                    permission = 'denied';
                }
                setData(prev =>
                    prev
                        ? {
                              ...prev,
                              location: prev.location
                                  ? {
                                        ...prev.location,
                                        permission,
                                        error: error.message,
                                    }
                                  : {
                                        latitude: 0,
                                        longitude: 0,
                                        permission,
                                        error: error.message,
                                    },
                          }
                        : null,
                );
                setRequestingLocation(false);
                if (error.code === error.PERMISSION_DENIED) {
                    toast.error(t('digitalFootprint.locationDenied'));
                }
            },
        );
    };

    useEffect(() => {
        interface BatteryManager extends EventTarget {
            level: number;
            charging: boolean;
            addEventListener(
                type: 'levelchange' | 'chargingchange',
                listener: (this: BatteryManager, ev: Event) => void,
                options?: boolean | AddEventListenerOptions,
            ): void;
            removeEventListener(
                type: 'levelchange' | 'chargingchange',
                listener: (this: BatteryManager, ev: Event) => void,
                options?: boolean | EventListenerOptions,
            ): void;
        }

        let batteryManager: BatteryManager | null = null;

        const handleBatteryChange = (): void => {
            if (!batteryManager) {
                return;
            }
            const b = batteryManager;
            setData(prev => {
                if (!prev) {
                    return null;
                }
                return {
                    ...prev,
                    battery: {
                        level: Math.round(b.level * 100),
                        charging: b.charging,
                    },
                };
            });
        };

        const fetchIp = async (): Promise<string> => {
            try {
                const response = await fetch(
                    'https://api.ipify.org?format=json',
                );
                const json = (await response.json()) as { ip: string };
                return json.ip;
            } catch (error) {
                console.error('Failed to fetch IP:', error);
                return 'Unknown';
            }
        };

        const fetchData = async (): Promise<void> => {
            const initialData: FootprintData = {
                ip: null,
                isOnline: navigator.onLine,
                userAgent: navigator.userAgent,
                languages: [...navigator.languages],
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                screenResolution: `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x ${t('digitalFootprint.screenDpi')})`,
                platform: (navigator as unknown as { platform: string })
                    .platform,
                doNotTrack: navigator.doNotTrack,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: (
                    navigator as unknown as { deviceMemory?: number }
                ).deviceMemory,
                battery: undefined,
                touchSupport: {
                    supported:
                        'ontouchstart' in window ||
                        navigator.maxTouchPoints > 0,
                    maxTouchPoints: navigator.maxTouchPoints,
                },
                preferences: {
                    colorScheme: window.matchMedia(
                        '(prefers-color-scheme: dark)',
                    ).matches
                        ? 'dark'
                        : 'light',
                    reducedMotion: window.matchMedia(
                        '(prefers-reduced-motion: reduce)',
                    ).matches,
                },
                capabilities: {
                    canvas: false,
                    webgl: false,
                },
                location: {
                    latitude: 0,
                    longitude: 0,
                    permission: 'loading',
                },
            };

            setData(initialData);
            setLoading(false);

            const ip = await fetchIp();

            // Connection info (not supported in all browsers)
            const nav = navigator as unknown as {
                connection?: { effectiveType?: string; type?: string };
                mozConnection?: { effectiveType?: string; type?: string };
                webkitConnection?: { effectiveType?: string; type?: string };
                platform: string;
                deviceMemory?: number;
                getBattery?: () => Promise<BatteryManager>;
            };

            let batteryData: { level: number; charging: boolean } | null = null;
            if (nav.getBattery) {
                try {
                    batteryManager = await nav.getBattery();
                    batteryData = {
                        level: Math.round(batteryManager.level * 100),
                        charging: batteryManager.charging,
                    };

                    batteryManager.addEventListener(
                        'levelchange',
                        handleBatteryChange,
                    );
                    batteryManager.addEventListener(
                        'chargingchange',
                        handleBatteryChange,
                    );
                } catch (e) {
                    console.error('Battery API error:', e);
                }
            }

            const canvas = document.createElement('canvas');
            const webgl =
                !!window.WebGLRenderingContext &&
                (!!canvas.getContext('webgl') ||
                    !!canvas.getContext('experimental-webgl'));

            setData(prev =>
                prev
                    ? {
                          ...prev,
                          ip,
                          battery: batteryData,
                          capabilities: {
                              canvas: !!canvas.getContext('2d'),
                              webgl,
                          },
                      }
                    : null,
            );

            // Try to check geolocation permission status if available
            if ('permissions' in navigator) {
                try {
                    const status = await navigator.permissions.query({
                        name: 'geolocation' as PermissionName,
                    });

                    setData(prev =>
                        prev
                            ? {
                                  ...prev,
                                  location: {
                                      latitude: prev.location?.latitude ?? 0,
                                      longitude: prev.location?.longitude ?? 0,
                                      permission: status.state,
                                  },
                              }
                            : null,
                    );

                    status.addEventListener('change', () => {
                        setData(prev =>
                            prev
                                ? {
                                      ...prev,
                                      location: prev.location
                                          ? {
                                                ...prev.location,
                                                permission: status.state,
                                            }
                                          : {
                                                latitude: 0,
                                                longitude: 0,
                                                permission: status.state,
                                            },
                                  }
                                : null,
                        );
                    });

                    if (status.state === 'granted') {
                        startLocationWatching();
                    }
                } catch (e) {
                    console.error('Permissions API error:', e);
                }
            } else {
                // Fallback for browsers that don't support Permissions API
                startLocationWatching();
            }
        };

        void fetchData();

        const handleOnlineStatus = (): void => {
            const isOnline = navigator.onLine;
            setData(prev => (prev ? { ...prev, isOnline } : null));

            if (isOnline) {
                void fetchIp().then(ip => {
                    setData(prev => (prev ? { ...prev, ip } : null));
                });
            }
        };

        window.addEventListener('online', handleOnlineStatus);
        window.addEventListener('offline', handleOnlineStatus);

        return () => {
            window.removeEventListener('online', handleOnlineStatus);
            window.removeEventListener('offline', handleOnlineStatus);
            if (batteryManager) {
                batteryManager.removeEventListener(
                    'levelchange',
                    handleBatteryChange,
                );
                batteryManager.removeEventListener(
                    'chargingchange',
                    handleBatteryChange,
                );
            }
        };
    }, []);

    if (loading || !data) {
        return <></>;
    }

    const copyToClipboard = (): void => {
        if (!data) {
            return;
        }

        const report = `
${t('digitalFootprint.reportHeader')}
${t('digitalFootprint.reportGenerated')}: ${new Date().toLocaleString()}

[${t('digitalFootprint.connection')}]
${t('digitalFootprint.ipAddress')}: ${data.ip}
${t('digitalFootprint.onlineStatus')}: ${data.isOnline ? t('digitalFootprint.online') : t('digitalFootprint.offline')}
${t('digitalFootprint.timezone')}: ${data.timezone}

[${t('digitalFootprint.software')}]
${t('digitalFootprint.userAgent')}: ${data.userAgent}
${t('digitalFootprint.languages')}: ${data.languages.join(', ')}
${t('digitalFootprint.doNotTrack')}: ${data.doNotTrack === '1' ? t('digitalFootprint.enabled') : t('digitalFootprint.disabled') + '/' + t('digitalFootprint.notSet')}
${t('digitalFootprint.colorScheme')}: ${data.preferences.colorScheme}
${t('digitalFootprint.reducedMotion')}: ${data.preferences.reducedMotion ? t('digitalFootprint.yes') : t('digitalFootprint.no')}

[${t('digitalFootprint.hardware')}]
${t('digitalFootprint.platform')}: ${data.platform}
${t('digitalFootprint.screenResolution')}: ${data.screenResolution}
${t('digitalFootprint.hardwareConcurrency')}: ${data.hardwareConcurrency}
${t('digitalFootprint.deviceMemory')}: ${data.deviceMemory ? `~${data.deviceMemory} GB` : t('digitalFootprint.unknown')}
${t('digitalFootprint.touchSupport')}: ${data.touchSupport.supported ? `${t('digitalFootprint.yes')} (${data.touchSupport.maxTouchPoints} ${t('digitalFootprint.points')})` : t('digitalFootprint.no')}
${t('digitalFootprint.battery')}: ${data.battery ? `${data.battery.level}% (${data.battery.charging ? t('digitalFootprint.charging') : t('digitalFootprint.discharging')})` : t('digitalFootprint.unknown')}

[${t('digitalFootprint.capabilities')}]
${t('digitalFootprint.canvasSupport')}: ${data.capabilities.canvas ? t('digitalFootprint.supported') : t('digitalFootprint.notSupported')}
${t('digitalFootprint.webglSupport')}: ${data.capabilities.webgl ? t('digitalFootprint.supported') : t('digitalFootprint.notSupported')}
${
    data.location && data.location.permission === 'granted'
        ? `
[${t('digitalFootprint.location')}]
${t('digitalFootprint.latitude')}: ${data.location.latitude}
${t('digitalFootprint.longitude')}: ${data.location.longitude}
`
        : ''
}
        `.trim();

        void navigator.clipboard.writeText(report);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.success(t('digitalFootprint.reportCopied'));
    };

    const InfoItem = ({
        label,
        value,
        icon: Icon,
        subValue,
        isLoading = false,
    }: {
        label: string;
        value: string | number | boolean | ReactElement;
        icon: ComponentType<LucideProps>;
        subValue?: string;
        isLoading?: boolean;
    }): ReactElement => (
        <div className="group flex items-start gap-3 px-1.5 py-3 sm:gap-4 sm:px-2">
            <div className="text-primary mt-1 flex size-9 shrink-0 items-center justify-center">
                <Icon className="size-5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-muted-foreground text-[11px] font-bold tracking-widest uppercase">
                    {label}
                </span>
                <div className="mt-1.5 min-w-0">
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            {subValue && <Skeleton className="h-3 w-1/2" />}
                        </div>
                    ) : (
                        <>
                            <span className="text-lg leading-tight font-bold break-words">
                                {value}
                            </span>
                            {subValue && (
                                <div className="text-muted-foreground mt-0.5 text-xs">
                                    {subValue}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="mx-auto max-w-6xl space-y-8 p-4 pb-20 md:p-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
                <div className="flex-1 space-y-2 text-center md:text-left">
                    <div className="flex flex-col items-center gap-3 md:flex-row md:gap-4">
                        <Fingerprint className="text-primary size-8 shrink-0 md:size-10" />
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                            {t('digitalFootprint.title')}
                        </h1>
                    </div>
                    <p className="text-muted-foreground max-w-lg text-lg">
                        {t('features.digitalFootprint.description')}
                    </p>
                </div>
                <FeedbackTooltip
                    show={isCopied}
                    message={t('digitalFootprint.reportCopied')}
                >
                    <Button
                        onClick={copyToClipboard}
                        className="gap-2 px-5 py-5 text-base font-bold transition-colors"
                    >
                        <Copy className="size-5" />
                        {t('digitalFootprint.copyReport')}
                    </Button>
                </FeedbackTooltip>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Connection Section */}
                <Card className="group relative overflow-hidden border-none transition-colors md:col-span-2 lg:col-span-1 dark:bg-black">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <Globe className="size-5 shrink-0 text-blue-500" />
                            <div>
                                <CardTitle className="text-xl">
                                    {t('digitalFootprint.connection')}
                                </CardTitle>
                                <CardDescription>
                                    {t('digitalFootprint.connectionDesc')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-0">
                        <InfoItem
                            label={t('digitalFootprint.ipAddress')}
                            value={data.ip ?? ''}
                            icon={Globe}
                            subValue={t('digitalFootprint.publicIp')}
                            isLoading={data.ip === null}
                        />
                        <InfoItem
                            label={t('digitalFootprint.onlineStatus')}
                            value={
                                <span
                                    className={`inline-flex items-center gap-2 rounded-4xl px-3 py-1.5 text-sm font-bold ${data.isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                                >
                                    <span
                                        className={`${data.isOnline ? 'animate-pulse bg-emerald-500' : 'bg-red-500'} size-2 rounded-full`}
                                    />
                                    {data.isOnline
                                        ? t('digitalFootprint.online')
                                        : t('digitalFootprint.offline')}
                                </span>
                            }
                            icon={Activity}
                        />
                        <InfoItem
                            label={t('digitalFootprint.timezone')}
                            value={data.timezone}
                            icon={Globe}
                            subValue={currentTime.toLocaleTimeString(
                                undefined,
                                {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    timeZoneName: 'short',
                                },
                            )}
                        />
                        <InfoItem
                            label={t('digitalFootprint.location')}
                            value={
                                data.location?.permission === 'granted' ? (
                                    <div className="flex flex-col gap-0.5">
                                        <span>
                                            {data.location.latitude.toFixed(4)},{' '}
                                            {data.location.longitude.toFixed(4)}
                                        </span>
                                    </div>
                                ) : data.location?.permission === 'denied' ? (
                                    <span className="text-red-500">
                                        {t('digitalFootprint.locationDenied')}
                                    </span>
                                ) : data.location?.permission === 'prompt' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">
                                            {t(
                                                'digitalFootprint.locationPrompt',
                                            )}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-[10px]"
                                            onClick={requestLocation}
                                            disabled={requestingLocation}
                                        >
                                            {requestingLocation ? (
                                                <Loader2 className="size-3 animate-spin" />
                                            ) : (
                                                t(
                                                    'digitalFootprint.requestLocation',
                                                )
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <Skeleton className="h-5 w-32" />
                                )
                            }
                            icon={Globe}
                        />
                    </CardContent>
                </Card>

                {/* Software Section */}
                <Card className="group relative overflow-hidden border-none transition-colors dark:bg-black">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <BrowserIcon className="size-5 shrink-0 text-purple-500" />
                            <div>
                                <CardTitle className="text-xl">
                                    {t('digitalFootprint.software')}
                                </CardTitle>
                                <CardDescription>
                                    {t('digitalFootprint.softwareDesc')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-0">
                        <InfoItem
                            label={t('digitalFootprint.userAgent')}
                            value={
                                <span className="font-mono text-[11px] leading-tight">
                                    {data.userAgent}
                                </span>
                            }
                            icon={Info}
                        />
                        <InfoItem
                            label={t('digitalFootprint.languages')}
                            value={data.languages[0]}
                            icon={Globe}
                            subValue={
                                t('digitalFootprint.languageFull') +
                                ': ' +
                                data.languages.join(', ')
                            }
                        />
                        <InfoItem
                            label={t('digitalFootprint.doNotTrack')}
                            value={
                                data.doNotTrack === '1'
                                    ? t('digitalFootprint.enabled')
                                    : t('digitalFootprint.disabled') +
                                      '/' +
                                      t('digitalFootprint.notSet')
                            }
                            icon={ShieldCheck}
                        />
                    </CardContent>
                </Card>

                {/* Hardware Section */}
                <Card className="group relative overflow-hidden border-none transition-colors dark:bg-black">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <Cpu className="size-5 shrink-0 text-orange-500" />
                            <div>
                                <CardTitle className="text-xl">
                                    {t('digitalFootprint.hardware')}
                                </CardTitle>
                                <CardDescription>
                                    {t('digitalFootprint.hardwareDesc')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-0">
                        <InfoItem
                            label={t('digitalFootprint.screenResolution')}
                            value={data.screenResolution}
                            icon={Monitor}
                        />
                        <InfoItem
                            label={t('digitalFootprint.platform')}
                            value={data.platform}
                            icon={Cpu}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <InfoItem
                                label={t(
                                    'digitalFootprint.hardwareConcurrency',
                                )}
                                value={data.hardwareConcurrency}
                                icon={Cpu}
                            />
                            {data.deviceMemory && (
                                <InfoItem
                                    label={t('digitalFootprint.deviceMemory')}
                                    value={`~${data.deviceMemory} GB`}
                                    icon={HardDrive}
                                />
                            )}
                        </div>
                        {data.battery !== null && (
                            <InfoItem
                                label={t('digitalFootprint.battery')}
                                value={
                                    data.battery ? (
                                        `${data.battery.level}%`
                                    ) : (
                                        <Skeleton className="h-5 w-16" />
                                    )
                                }
                                icon={
                                    data.battery?.charging
                                        ? BatteryCharging
                                        : Battery
                                }
                                subValue={
                                    data.battery?.charging
                                        ? t('digitalFootprint.charging')
                                        : undefined
                                }
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Preferences & Capabilities */}
                <Card className="group relative overflow-hidden border-none transition-colors md:col-span-2 lg:col-span-3 dark:bg-black">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <Zap className="size-5 shrink-0 text-green-500" />
                            <div>
                                <CardTitle className="text-xl">
                                    {t('digitalFootprint.preferences')} &{' '}
                                    {t('digitalFootprint.capabilities')}
                                </CardTitle>
                                <CardDescription>
                                    {t('digitalFootprint.capabilitiesDesc')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        <InfoItem
                            label={t('digitalFootprint.colorScheme')}
                            value={data.preferences.colorScheme.toUpperCase()}
                            icon={Palette}
                        />
                        <InfoItem
                            label={t('digitalFootprint.reducedMotion')}
                            value={
                                data.preferences.reducedMotion
                                    ? t('digitalFootprint.yes')
                                    : t('digitalFootprint.no')
                            }
                            icon={Activity}
                        />
                        <InfoItem
                            label={t('digitalFootprint.touchSupport')}
                            value={
                                data.touchSupport.supported
                                    ? t('digitalFootprint.yes')
                                    : t('digitalFootprint.no')
                            }
                            icon={Smartphone}
                            subValue={
                                data.touchSupport.supported
                                    ? `${data.touchSupport.maxTouchPoints} ${t('digitalFootprint.points')}`
                                    : undefined
                            }
                        />
                        <InfoItem
                            label={t('digitalFootprint.canvasSupport')}
                            value={
                                data.capabilities.canvas
                                    ? t('digitalFootprint.supported')
                                    : t('digitalFootprint.notSupported')
                            }
                            icon={Palette}
                        />
                        <InfoItem
                            label={t('digitalFootprint.webglSupport')}
                            value={
                                data.capabilities.webgl
                                    ? t('digitalFootprint.supported')
                                    : t('digitalFootprint.notSupported')
                            }
                            icon={Zap}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
