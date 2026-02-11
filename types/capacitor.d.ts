export interface CapacitorPlugin {
  requestPermissions?: () => Promise<{ value: string }>;
  register?: () => Promise<void>;
  addListener?: (
    event: string,
    callback: (data: { value: string }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        PushNotifications?: CapacitorPlugin;
      };
    };
  }
}
