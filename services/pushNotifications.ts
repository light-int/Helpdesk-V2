import { ApiService } from './apiService';

let swRegistration: ServiceWorkerRegistration | null = null;

const getRegistration = (): Promise<ServiceWorkerRegistration> => {
  if (swRegistration) return Promise.resolve(swRegistration);
  return navigator.serviceWorker.ready.then((reg) => {
    swRegistration = reg;
    return reg;
  });
};

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    swRegistration = reg;
  });
}

export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('[Push] Notification API not supported');
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const subscribeToPush = async (userId: string, vapidPublicKey: string): Promise<boolean> => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    const reg = await getRegistration();
    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub) {
      await ApiService.pushSubscriptions.save(userId, existingSub);
      return true;
    }

    const key = urlBase64ToUint8Array(vapidPublicKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key.buffer as ArrayBuffer
    });

    await ApiService.pushSubscriptions.save(userId, subscription);
    return true;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return false;
  }
};

export const unsubscribeFromPush = async (userId: string): Promise<boolean> => {
  try {
    const reg = await getRegistration();
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    await ApiService.pushSubscriptions.remove(userId);
    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
};

export const getPushPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};
