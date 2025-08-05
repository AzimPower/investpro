import { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const { settings, updateSettings } = useNotifications();

  useEffect(() => {
    // Vérifier si les notifications push sont supportées
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Les notifications push ne sont pas supportées par ce navigateur');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        updateSettings({ pushNotifications: true });
        return true;
      } else {
        updateSettings({ pushNotifications: false });
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      return false;
    }
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted' && settings.pushNotifications) {
      try {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });

        // Auto-fermer après 5 secondes
        setTimeout(() => {
          notification.close();
        }, 5000);

        return notification;
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
      }
    }
    return null;
  };

  return {
    isSupported,
    permission,
    hasPermission: permission === 'granted',
    requestPermission,
    sendNotification,
  };
}

// Hook pour les notifications Service Worker (PWA)
export function useServiceWorkerNotifications() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
      });
    }
  }, []);

  const subscribe = async (): Promise<PushSubscription | null> => {
    if (!registration || !isSupported) {
      return null;
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY, // Clé VAPID publique
      });

      // Envoyer l'abonnement au serveur
      await fetch('/backend/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userId: getCurrentUserId(), // Fonction à implémenter
        }),
      });

      return subscription;
    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux notifications push:', error);
      return null;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!registration) {
      return false;
    }

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // Informer le serveur de la désinscription
        await fetch('/backend/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: getCurrentUserId(),
          }),
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de la désinscription:', error);
      return false;
    }
  };

  return {
    isSupported,
    registration,
    subscribe,
    unsubscribe,
  };
}

// Fonction utilitaire pour obtenir l'ID utilisateur actuel
function getCurrentUserId(): number | null {
  try {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return user.id || null;
  } catch {
    return null;
  }
}

// Hook combiné pour toutes les fonctionnalités de notification
export function useNotificationFeatures() {
  const push = usePushNotifications();
  const sw = useServiceWorkerNotifications();
  const { settings, updateSettings } = useNotifications();

  const enableAllNotifications = async () => {
    const pushGranted = await push.requestPermission();
    
    if (pushGranted && sw.isSupported) {
      await sw.subscribe();
    }

    updateSettings({
      pushNotifications: pushGranted,
      emailNotifications: true,
      transactionNotifications: true,
      earningNotifications: true,
      systemNotifications: true,
      agentNotifications: true,
    });
  };

  const disableAllNotifications = async () => {
    if (sw.isSupported) {
      await sw.unsubscribe();
    }

    updateSettings({
      pushNotifications: false,
      emailNotifications: false,
      transactionNotifications: false,
      earningNotifications: false,
      systemNotifications: false,
      agentNotifications: false,
    });
  };

  return {
    ...push,
    serviceWorker: sw,
    settings,
    enableAllNotifications,
    disableAllNotifications,
  };
}
