import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { type Notification as AppNotification, NotificationSettings, NotificationContextType } from '@/types/notifications';
import { toast } from 'sonner';

// Actions pour le reducer
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Omit<AppNotification, 'id' | 'timestamp' | 'read'> }
  | { type: 'MARK_AS_READ'; payload: string }
  | { type: 'MARK_ALL_AS_READ' }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<NotificationSettings> }
  | { type: 'LOAD_NOTIFICATIONS'; payload: AppNotification[] }
  | { type: 'LOAD_SETTINGS'; payload: NotificationSettings };

interface NotificationState {
  notifications: AppNotification[];
  settings: NotificationSettings;
}

const initialSettings: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  transactionNotifications: true,
  earningNotifications: true,
  systemNotifications: true,
  agentNotifications: true,
};

const initialState: NotificationState = {
  notifications: [],
  settings: initialSettings,
};

// Reducer pour gérer l'état des notifications
function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const newNotification: AppNotification = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        read: false,
      };
      return {
        ...state,
        notifications: [newNotification, ...state.notifications],
      };
    }
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload ? { ...notif, read: true } : notif
        ),
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => ({ ...notif, read: true })),
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notif => notif.id !== action.payload),
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: [],
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'LOAD_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
      };
    case 'LOAD_SETTINGS':
      return {
        ...state,
        settings: action.payload,
      };
    default:
      return state;
  }
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Charger les notifications depuis le localStorage au démarrage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    const savedSettings = localStorage.getItem('notificationSettings');

    if (savedNotifications) {
      try {
        const notifications = JSON.parse(savedNotifications).map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp),
        }));
        dispatch({ type: 'LOAD_NOTIFICATIONS', payload: notifications });
      } catch (error) {
        console.error('Erreur lors du chargement des notifications:', error);
      }
    }

    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: 'LOAD_SETTINGS', payload: settings });
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
      }
    }
  }, []);

  // Sauvegarder les notifications dans le localStorage
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(state.notifications));
  }, [state.notifications]);

  // Sauvegarder les paramètres dans le localStorage
  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(state.settings));
  }, [state.settings]);

  const addNotification = (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    // Vérifier si le type de notification est activé
    const shouldShow = checkNotificationPermission(notification.category, state.settings);
    
    if (shouldShow) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      
      // Afficher le toast
      const toastConfig = {
        description: notification.message,
        action: notification.action ? {
          label: notification.action.label,
          onClick: notification.action.onClick,
        } : undefined,
      };

      switch (notification.type) {
        case 'success':
          toast.success(notification.title, toastConfig);
          break;
        case 'error':
          toast.error(notification.title, toastConfig);
          break;
        case 'warning':
          toast.warning(notification.title, toastConfig);
          break;
        case 'info':
        default:
          toast.info(notification.title, toastConfig);
          break;
      }

      // Notification push si supportée et activée
      if (state.settings.pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
    }
  };

  const markAsRead = (id: string) => {
    dispatch({ type: 'MARK_AS_READ', payload: id });
  };

  const markAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  const updateSettings = (settings: Partial<NotificationSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const unreadCount = state.notifications.filter(notif => !notif.read).length;

  const value: NotificationContextType = {
    notifications: state.notifications,
    unreadCount,
    settings: state.settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateSettings,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Fonction helper pour vérifier les permissions de notification
function checkNotificationPermission(category: string | undefined, settings: NotificationSettings): boolean {
  switch (category) {
    case 'transaction':
      return settings.transactionNotifications;
    case 'earning':
      return settings.earningNotifications;
    case 'system':
      return settings.systemNotifications;
    case 'agent':
      return settings.agentNotifications;
    default:
      return true;
  }
}
