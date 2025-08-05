import { useNotifications } from '@/contexts/NotificationContext';
import { type Notification as AppNotification } from '@/types/notifications';

export function useNotify() {
  const { addNotification } = useNotifications();

  const notify = {
    success: (title: string, message: string, options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'type' | 'title' | 'message'>>) => {
      addNotification({
        title,
        message,
        type: 'success',
        ...options,
      });
    },

    error: (title: string, message: string, options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'type' | 'title' | 'message'>>) => {
      addNotification({
        title,
        message,
        type: 'error',
        ...options,
      });
    },

    warning: (title: string, message: string, options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'type' | 'title' | 'message'>>) => {
      addNotification({
        title,
        message,
        type: 'warning',
        ...options,
      });
    },

    info: (title: string, message: string, options?: Partial<Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'type' | 'title' | 'message'>>) => {
      addNotification({
        title,
        message,
        type: 'info',
        ...options,
      });
    },

    transaction: {
      deposit: (amount: number, status: 'pending' | 'approved' | 'rejected' = 'pending') => {
        const messages = {
          pending: `Votre dépôt de ${amount} FCFA est en cours de traitement`,
          approved: `Votre dépôt de ${amount} FCFA a été approuvé`,
          rejected: `Votre dépôt de ${amount} FCFA a été rejeté`,
        };
        
        addNotification({
          title: 'Dépôt',
          message: messages[status],
          type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
          category: 'transaction',
        });
      },

      withdrawal: (amount: number, status: 'pending' | 'approved' | 'rejected' = 'pending') => {
        const messages = {
          pending: `Votre demande de retrait de ${amount} FCFA est en cours de traitement`,
          approved: `Votre retrait de ${amount} FCFA a été approuvé`,
          rejected: `Votre retrait de ${amount} FCFA a été rejeté`,
        };
        
        addNotification({
          title: 'Retrait',
          message: messages[status],
          type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
          category: 'transaction',
        });
      },

      purchase: (lotName: string, amount: number) => {
        addNotification({
          title: 'Achat de lot',
          message: `Vous avez acheté le lot ${lotName} pour ${amount} FCFA`,
          type: 'success',
          category: 'transaction',
        });
      },
    },

    earning: {
      daily: (amount: number, lotName: string) => {
        addNotification({
          title: 'Gain quotidien',
          message: `Vous avez gagné ${amount} FCFA avec le lot ${lotName}`,
          type: 'success',
          category: 'earning',
        });
      },
    },

    system: {
      maintenance: (message: string) => {
        addNotification({
          title: 'Maintenance système',
          message,
          type: 'warning',
          category: 'system',
        });
      },

      update: (message: string) => {
        addNotification({
          title: 'Mise à jour',
          message,
          type: 'info',
          category: 'system',
        });
      },

      security: (message: string) => {
        addNotification({
          title: 'Sécurité',
          message,
          type: 'warning',
          category: 'system',
        });
      },
    },

    agent: {
      newRequest: (type: 'deposit' | 'withdrawal', amount: number, userId: number) => {
        const typeText = type === 'deposit' ? 'dépôt' : 'retrait';
        addNotification({
          title: `Nouvelle demande de ${typeText}`,
          message: `Demande de ${typeText} de ${amount} FCFA de l'utilisateur #${userId}`,
          type: 'info',
          category: 'agent',
          action: {
            label: 'Voir',
            onClick: () => {
              // Navigation vers la page des demandes
              window.location.href = type === 'deposit' ? '/agent/deposits' : '/agent/withdrawals';
            },
          },
        });
      },
    },
  };

  return notify;
}

// Hook pour les notifications liées aux erreurs API
export function useApiNotifications() {
  const notify = useNotify();

  return {
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'Une erreur est survenue';
      notify.error('Erreur', message);
    },

    onSuccess: (message: string) => {
      notify.success('Succès', message);
    },

    onLoading: (message: string = 'Chargement en cours...') => {
      notify.info('Information', message);
    },
  };
}
