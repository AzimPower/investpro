// Types pour le système de notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  category?: 'transaction' | 'system' | 'earning' | 'agent' | 'general';
  userId?: number;
  relatedId?: number; // ID de la transaction, lot, etc.
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  transactionNotifications: boolean;
  earningNotifications: boolean;
  systemNotifications: boolean;
  agentNotifications: boolean;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
}
