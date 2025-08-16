import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetNotifications, apiMarkNotificationAsRead, apiDeleteNotification, apiMarkAllNotificationsAsRead, apiDeleteAllNotifications } from '@/lib/api';

export interface BackendNotification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  category: 'transaction' | 'system' | 'earning' | 'agent' | 'general';
  isRead: boolean;
  relatedId: number | null;
  createdAt: string;
  readAt: string | null;
}

// Hook pour récupérer les notifications depuis le backend
export function useBackendNotifications(userId: number | null) {
  const queryClient = useQueryClient();
  
  const queryResult = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => userId ? apiGetNotifications(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 10000, // 10 secondes - réduire pour plus de fraîcheur
    refetchInterval: 30000, // Actualiser toutes les 30 secondes
    refetchOnWindowFocus: true, // Actualiser quand la fenêtre reprend le focus
    refetchOnMount: true, // Actualiser au montage du composant
  });

  // Fonction personnalisée pour forcer l'actualisation
  const forceRefresh = async () => {
    try {
      console.log('ForceRefresh: Début de l\'actualisation forcée pour userId:', userId);
      
      // Invalider d'abord le cache
      await queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      console.log('ForceRefresh: Cache invalidé');
      
      // Puis refetch avec un appel direct à l'API sans cache
      if (userId) {
        const freshData = await apiGetNotifications(userId, false);
        console.log('ForceRefresh: Nouvelles données récupérées:', freshData?.length || 0, 'notifications');
        
        // Forcer la mise à jour du cache avec les nouvelles données
        queryClient.setQueryData(['notifications', userId], freshData || []);
        console.log('ForceRefresh: Cache mis à jour avec les nouvelles données');
      }
    } catch (error) {
      console.error('ForceRefresh: Erreur lors de l\'actualisation forcée:', error);
      // En cas d'erreur, essayer un refetch normal
      try {
        await queryResult.refetch();
        console.log('ForceRefresh: Refetch normal réussi en fallback');
      } catch (refetchError) {
        console.error('ForceRefresh: Échec du refetch de fallback:', refetchError);
      }
    }
  };

  return {
    ...queryResult,
    forceRefresh
  };
}

// Hook pour marquer une notification comme lue
export function useMarkAsRead() {
  type MarkAsReadArgs = { notificationId: number, userId?: number };
  const queryClient = useQueryClient();

  return useMutation<unknown, unknown, MarkAsReadArgs>({
    mutationFn: ({ notificationId, userId }) => apiMarkNotificationAsRead(notificationId, userId),
    onMutate: async ({ notificationId }) => {
      // Mise à jour optimiste immédiate
      queryClient.setQueriesData(
        { queryKey: ['notifications'] },
        (oldData: BackendNotification[] | undefined) => {
          return oldData?.map(notif =>
            notif.id === notificationId
              ? { ...notif, isRead: true, readAt: new Date().toISOString() }
              : notif
          ) || [];
        }
      );
    },
    onError: (err, variables) => {
      console.error('Erreur lors du marquage comme lu:', err);
    }
  });
}

// Hook pour supprimer une notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  type DeleteArgs = { notificationId: number, userId?: number };
  return useMutation<unknown, unknown, DeleteArgs>({
    mutationFn: ({ notificationId, userId }) => apiDeleteNotification(notificationId, userId),
    onMutate: async ({ notificationId }) => {
      queryClient.setQueriesData(
        { queryKey: ['notifications'] },
        (oldData: BackendNotification[] | undefined) => {
          return oldData?.filter(notif => notif.id !== notificationId) || [];
        }
      );
    },
    onError: (err, variables) => {
      console.error('Erreur lors de la suppression:', err);
    }
  });
}

// Hook pour marquer toutes les notifications comme lues
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: number) => {
      console.log('API Call: markAllAsRead pour userId:', userId);
      const result = await apiMarkAllNotificationsAsRead(userId);
      console.log('API Response: markAllAsRead result:', result);
      return result;
    },
    onMutate: async (userId) => {
      console.log('Mutation onMutate: markAllAsRead pour userId:', userId);
      // Mise à jour optimiste immédiate
      queryClient.setQueryData(['notifications', userId], (oldData: BackendNotification[] | undefined) => {
        const updatedData = oldData?.map(notif => ({ 
          ...notif, 
          isRead: true, 
          readAt: new Date().toISOString() 
        })) || [];
        console.log('Mise à jour optimiste: notifications marquées comme lues:', updatedData.length);
        return updatedData;
      });
    },
    onSuccess: (data, userId) => {
      console.log('Mutation onSuccess: markAllAsRead pour userId:', userId, 'result:', data);
    },
    onError: (err, userId) => {
      console.error('Mutation onError: markAllAsRead pour userId:', userId, 'error:', err);
    }
  });
}

// Hook pour supprimer toutes les notifications
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: number) => {
      console.log('API Call: deleteAllNotifications pour userId:', userId);
      const result = await apiDeleteAllNotifications(userId);
      console.log('API Response: deleteAllNotifications result:', result);
      return result;
    },
    onMutate: async (userId) => {
      console.log('Mutation onMutate: deleteAllNotifications pour userId:', userId);
      // Mise à jour optimiste immédiate
      queryClient.setQueryData(['notifications', userId], []);
      console.log('Mise à jour optimiste: toutes les notifications supprimées');
    },
    onSuccess: (data, userId) => {
      console.log('Mutation onSuccess: deleteAllNotifications pour userId:', userId, 'result:', data);
    },
    onError: (err, userId) => {
      console.error('Mutation onError: deleteAllNotifications pour userId:', userId, 'error:', err);
    }
  });
}
