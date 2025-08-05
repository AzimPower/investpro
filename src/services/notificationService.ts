import { apiCall } from '@/lib/api';
import { type Notification as AppNotification } from '@/types/notifications';

const API_URL = '/backend';

// Helper pour créer les requêtes API
const api = {
  get: (url: string) => apiCall(`${API_URL}${url}`),
  post: (url: string, data: any) => apiCall(`${API_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }),
  put: (url: string, data?: any) => apiCall(`${API_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  }),
  delete: (url: string) => apiCall(`${API_URL}${url}`, {
    method: 'DELETE',
  }),
};

export interface BackendNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  category: 'transaction' | 'system' | 'earning' | 'agent' | 'general';
  read: boolean;
  relatedId?: number;
  createdAt: string;
  readAt?: string;
}

// Convertir une notification backend en notification frontend
function mapBackendNotification(backendNotif: BackendNotification): AppNotification {
  return {
    id: backendNotif.id.toString(),
    title: backendNotif.title,
    message: backendNotif.message,
    type: backendNotif.type,
    category: backendNotif.category,
    read: backendNotif.read,
    timestamp: new Date(backendNotif.createdAt),
    userId: backendNotif.userId,
    relatedId: backendNotif.relatedId,
  };
}

export const notificationService = {
  // Récupérer les notifications de l'utilisateur
  async getNotifications(userId: number): Promise<AppNotification[]> {
    try {
      const response = await api.get(`/notifications/${userId}`);
      return response.data.map(mapBackendNotification);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      return [];
    }
  },

  // Marquer une notification comme lue
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.put(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  },

  // Marquer toutes les notifications comme lues
  async markAllAsRead(userId: number): Promise<void> {
    try {
      await api.put(`/notifications/user/${userId}/read-all`);
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error);
    }
  },

  // Supprimer une notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
    }
  },

  // Créer une nouvelle notification (utilisé par le backend)
  async createNotification(notification: Omit<BackendNotification, 'id' | 'createdAt' | 'readAt'>): Promise<BackendNotification> {
    try {
      const response = await api.post('/notifications', notification);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
      throw error;
    }
  },

  // Obtenir le nombre de notifications non lues
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const response = await api.get(`/notifications/${userId}/unread-count`);
      return response.data.count;
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre non lu:', error);
      return 0;
    }
  },

  // WebSocket pour les notifications en temps réel
  subscribeToNotifications(userId: number, callback: (notification: AppNotification) => void): (() => void) | null {
    if (typeof window !== 'undefined' && 'WebSocket' in window) {
      try {
        const wsUrl = `ws://localhost:8080/notifications/${userId}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const backendNotif: BackendNotification = JSON.parse(event.data);
            const frontendNotif = mapBackendNotification(backendNotif);
            callback(frontendNotif);
          } catch (error) {
            console.error('Erreur lors du parsing de la notification WebSocket:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('Erreur WebSocket notifications:', error);
        };

        // Retourner une fonction de nettoyage
        return () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (error) {
        console.error('Erreur lors de la création de la connexion WebSocket:', error);
        return null;
      }
    }
    return null;
  },
};

// Hook pour utiliser les notifications avec synchronisation backend
export function useBackendNotifications(userId?: number) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchNotifications = async (): Promise<AppNotification[]> => {
    if (!userId) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const notifications = await notificationService.getNotifications(userId);
      return notifications;
    } catch (err) {
      setError('Erreur lors du chargement des notifications');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (err) {
      setError('Erreur lors du marquage comme lu');
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      await notificationService.markAllAsRead(userId);
    } catch (err) {
      setError('Erreur lors du marquage de toutes comme lues');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  return {
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isLoading,
    error,
  };
}

// Import React pour le hook
import React from 'react';
