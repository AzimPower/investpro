// Gestionnaire de notifications avec sauvegarde automatique en base de données
import { apiCall } from './api';
import { useNotifications } from '@/contexts/NotificationContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationData {
  userId: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  category: 'transaction' | 'earning' | 'system' | 'agent' | 'general';
  relatedId?: number;
}

class NotificationManager {
  private static instance: NotificationManager;
  private recentNotifications: Map<string, number> = new Map(); // Cache pour éviter les doublons

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Générer une clé unique pour une notification
  private generateNotificationKey(userId: number, title: string, message: string): string {
    return `${userId}-${title}-${message}`;
  }

  // Vérifier si une notification similaire a été envoyée récemment (dans les 5 dernières secondes)
  private isDuplicate(notificationKey: string): boolean {
    const now = Date.now();
    const lastSent = this.recentNotifications.get(notificationKey);
    
    if (lastSent && (now - lastSent) < 5000) { // 5 secondes
      return true;
    }
    
    // Nettoyer les anciennes entrées (plus de 30 secondes)
    for (const [key, timestamp] of this.recentNotifications.entries()) {
      if (now - timestamp > 30000) {
        this.recentNotifications.delete(key);
      }
    }
    
    return false;
  }

  // Enregistrer qu'une notification a été envoyée
  private markAsSent(notificationKey: string): void {
    this.recentNotifications.set(notificationKey, Date.now());
  }

  // Sauvegarder la notification en base de données
  private async saveToDatabase(notificationData: NotificationData): Promise<boolean> {
    try {
      // Utiliser fetch directement pour éviter les retries automatiques de apiCall
      const response = await fetch('/backend/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};
      
      // Vérifier si c'était un doublon ignoré
      if (result.message === 'Duplicate notification ignored') {
        console.warn(`⚠️ Notification dupliquée ignorée côté serveur pour l'utilisateur ${notificationData.userId}`);
        return false; // Considérer comme non sauvegardée pour éviter les actions côté client
      }

      return result.success !== false;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la notification:', error);
      return false;
    }
  }

  // Créer et sauvegarder une notification
  async createNotification(
    userId: number, 
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    category: 'transaction' | 'earning' | 'system' | 'agent' | 'general' = 'general',
    relatedId?: number
  ): Promise<boolean> {
    // Vérifier les doublons
    const notificationKey = this.generateNotificationKey(userId, title, message);
    if (this.isDuplicate(notificationKey)) {
      console.warn(`⚠️ Notification dupliquée ignorée pour l'utilisateur ${userId}: ${title}`);
      return false;
    }

    const notificationData: NotificationData = {
      userId,
      title,
      message,
      type,
      category,
      relatedId,
    };

    // Sauvegarder en base de données
    const saved = await this.saveToDatabase(notificationData);
    
    if (saved) {
      // Marquer comme envoyée seulement si la sauvegarde a réussi
      this.markAsSent(notificationKey);
      console.log(`✅ Notification sauvegardée pour l'utilisateur ${userId}: ${title}`);
    } else {
      console.error(`❌ Échec de sauvegarde de la notification pour l'utilisateur ${userId}: ${title}`);
    }

    return saved;
  }

  // Notifications spécifiques pour les transactions
  async notifyTransaction(
    userId: number,
    transactionType: 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'purchase',
    amount: number,
    status: 'pending' | 'approved' | 'rejected' | 'completed' = 'pending',
    additionalInfo?: string
  ): Promise<boolean> {
    const messages = {
      deposit: {
        pending: `Votre dépôt de ${this.formatCurrency(amount)} est en cours de traitement`,
        approved: `Votre dépôt de ${this.formatCurrency(amount)} a été approuvé`,
        rejected: `Votre dépôt de ${this.formatCurrency(amount)} a été rejeté`,
      },
      withdrawal: {
        pending: `Votre demande de retrait de ${this.formatCurrency(amount)} est en cours de traitement`,
        approved: `Votre retrait de ${this.formatCurrency(amount)} a été approuvé`,
        rejected: `Votre retrait de ${this.formatCurrency(amount)} a été rejeté`,
      },
      transfer_sent: {
        completed: `Transfert de ${this.formatCurrency(amount)} envoyé avec succès${additionalInfo ? ' vers ' + additionalInfo : ''}`,
      },
      transfer_received: {
        completed: `Transfert de ${this.formatCurrency(amount)} reçu${additionalInfo ? ' de ' + additionalInfo : ''}`,
      },
      purchase: {
        completed: `Achat de lot réussi pour ${this.formatCurrency(amount)}${additionalInfo ? ' - ' + additionalInfo : ''}`,
      },
    };

    const typeText = {
      deposit: 'Dépôt',
      withdrawal: 'Retrait',
      transfer_sent: 'Transfert envoyé',
      transfer_received: 'Transfert reçu',
      purchase: 'Achat de lot',
    };

    const notificationType = status === 'approved' || status === 'completed' ? 'success' : 
                           status === 'rejected' ? 'error' : 'info';

    const message = messages[transactionType]?.[status] || `Transaction ${transactionType} - ${status}`;

    return await this.createNotification(
      userId,
      typeText[transactionType],
      message,
      notificationType,
      'transaction'
    );
  }

  // Notifications pour les gains
  async notifyEarning(
    userId: number,
    earningType: 'daily' | 'commission',
    amount: number,
    additionalInfo?: string
  ): Promise<boolean> {
    const titles = {
      daily: 'Gain quotidien',
      commission: 'Commission de parrainage',
    };

    const messages = {
      daily: `Vous avez gagné ${this.formatCurrency(amount)}${additionalInfo ? ' avec ' + additionalInfo : ''}`,
      commission: `Vous avez gagné ${this.formatCurrency(amount)} de commission${additionalInfo ? ' - ' + additionalInfo : ''}`,
    };

    return await this.createNotification(
      userId,
      titles[earningType],
      messages[earningType],
      'success',
      'earning'
    );
  }

  // Notifications système
  async notifySystem(
    userId: number,
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' = 'info'
  ): Promise<boolean> {
    return await this.createNotification(userId, title, message, type, 'system');
  }

  // Notifications pour les agents
  async notifyAgent(
    agentId: number,
    requestType: 'deposit' | 'withdrawal',
    amount: number,
    userId: number
  ): Promise<boolean> {
    const typeText = requestType === 'deposit' ? 'dépôt' : 'retrait';
    const title = `Nouvelle demande de ${typeText}`;
    const message = `Demande de ${typeText} de ${this.formatCurrency(amount)} de l'utilisateur #${userId}`;

    return await this.createNotification(
      agentId,
      title,
      message,
      'info',
      'agent',
      userId
    );
  }

  // Notification de bienvenue
  async notifyWelcome(userId: number, userName: string): Promise<boolean> {
    const title = 'Bienvenue sur InvestPro !';
    const message = `Bienvenue ${userName} ! Votre compte a été créé avec succès. Explorez nos lots d'investissement pour commencer à gagner.`;

    return await this.createNotification(userId, title, message, 'success', 'system');
  }

  // Notification de solde faible
  async notifyLowBalance(userId: number, balance: number): Promise<boolean> {
    if (balance < 10000) {
      const title = 'Solde faible';
      const message = `Votre solde est de ${this.formatCurrency(balance)}. Pensez à recharger votre compte pour continuer à investir.`;

      return await this.createNotification(userId, title, message, 'warning', 'system');
    }
    return false;
  }

  // Utilitaire pour formater la monnaie
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  }
}

// Export de l'instance singleton
export const notificationManager = NotificationManager.getInstance();

// Hook pour utiliser le gestionnaire de notifications avec intégration complète
export function useNotificationManager() {
  const { addNotification } = useNotifications();
  const { sendNotification, hasPermission } = usePushNotifications();

  const notify = {
    // Créer une notification complète (base de données + locale + push)
    create: async (
      userId: number,
      title: string,
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
      category: 'transaction' | 'earning' | 'system' | 'agent' | 'general' = 'general',
      relatedId?: number
    ) => {
      // 1. Sauvegarder en base de données
      const saved = await notificationManager.createNotification(userId, title, message, type, category, relatedId);
      
      // Seulement ajouter à l'interface locale et envoyer push si la sauvegarde a réussi
      if (saved) {
        // 2. Ajouter à l'interface locale
        addNotification({
          title,
          message,
          type,
          category,
          relatedId,
        });

        // 3. Envoyer notification push native si autorisée
        if (hasPermission) {
          sendNotification(title, {
            body: message,
            icon: '/favicon.ico',
            tag: `${category}-${Date.now()}`,
          });
        }
      }
    },

    // Notifications de transaction avec sauvegarde automatique
    transaction: {
      deposit: async (userId: number, amount: number, status: 'pending' | 'approved' | 'rejected' = 'pending') => {
        // Utiliser uniquement la méthode centralisée pour éviter les doublons
        const saved = await notificationManager.notifyTransaction(userId, 'deposit', amount, status);
        
        // Seulement ajouter à l'interface locale si la sauvegarde a réussi
        if (saved) {
          const messages = {
            pending: `Votre dépôt de ${notificationManager['formatCurrency'](amount)} est en cours de traitement`,
            approved: `Votre dépôt de ${notificationManager['formatCurrency'](amount)} a été approuvé`,
            rejected: `Votre dépôt de ${notificationManager['formatCurrency'](amount)} a été rejeté`,
          };
          
          addNotification({
            title: 'Dépôt',
            message: messages[status],
            type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
            category: 'transaction',
          });
        }
      },

      withdrawal: async (userId: number, amount: number, status: 'pending' | 'approved' | 'rejected' = 'pending') => {
        // Utiliser uniquement la méthode centralisée pour éviter les doublons
        const saved = await notificationManager.notifyTransaction(userId, 'withdrawal', amount, status);
        
        // Seulement ajouter à l'interface locale si la sauvegarde a réussi
        if (saved) {
          const messages = {
            pending: `Votre demande de retrait de ${notificationManager['formatCurrency'](amount)} est en cours de traitement`,
            approved: `Votre retrait de ${notificationManager['formatCurrency'](amount)} a été approuvé`,
            rejected: `Votre retrait de ${notificationManager['formatCurrency'](amount)} a été rejeté`,
          };
          
          addNotification({
            title: 'Retrait',
            message: messages[status],
            type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
            category: 'transaction',
          });
        }
      },

      transfer: async (userId: number, amount: number, type: 'sent' | 'received', recipientName?: string) => {
        const transactionType = type === 'sent' ? 'transfer_sent' : 'transfer_received';
        const saved = await notificationManager.notifyTransaction(userId, transactionType, amount, 'completed', recipientName);
        
        if (saved) {
          const title = type === 'sent' ? 'Transfert envoyé' : 'Transfert reçu';
          const message = type === 'sent' 
            ? `Transfert de ${notificationManager['formatCurrency'](amount)} envoyé avec succès${recipientName ? ' vers ' + recipientName : ''}`
            : `Transfert de ${notificationManager['formatCurrency'](amount)} reçu${recipientName ? ' de ' + recipientName : ''}`;
          
          addNotification({
            title,
            message,
            type: 'success',
            category: 'transaction',
          });
        }
      },

      purchase: async (userId: number, amount: number, lotName: string) => {
        const saved = await notificationManager.notifyTransaction(userId, 'purchase', amount, 'completed', lotName);
        
        if (saved) {
          addNotification({
            title: 'Achat de lot',
            message: `Vous avez acheté le lot ${lotName} pour ${notificationManager['formatCurrency'](amount)}`,
            type: 'success',
            category: 'transaction',
          });
        }
      },
    },

    // Notifications de gains avec sauvegarde automatique
    earning: {
      daily: async (userId: number, amount: number, lotName: string) => {
        const saved = await notificationManager.notifyEarning(userId, 'daily', amount, lotName);
        
        if (saved) {
          addNotification({
            title: 'Gain quotidien',
            message: `Vous avez gagné ${notificationManager['formatCurrency'](amount)} avec le lot ${lotName}`,
            type: 'success',
            category: 'earning',
          });

          if (hasPermission) {
            sendNotification('Gain quotidien', {
              body: `Vous avez gagné ${notificationManager['formatCurrency'](amount)} avec le lot ${lotName}`,
              icon: '/favicon.ico',
            });
          }
        }
      },

      commission: async (userId: number, amount: number, level: number) => {
        const saved = await notificationManager.notifyEarning(userId, 'commission', amount, `niveau ${level}`);
        
        if (saved) {
          addNotification({
            title: 'Commission de parrainage',
            message: `Vous avez gagné ${notificationManager['formatCurrency'](amount)} de commission niveau ${level}`,
            type: 'success',
            category: 'earning',
          });
        }
      },
    },

    // Notifications système avec sauvegarde automatique
    system: {
      welcome: async (userId: number, userName: string) => {
        const saved = await notificationManager.notifyWelcome(userId, userName);
        
        if (saved) {
          addNotification({
            title: 'Bienvenue sur InvestPro !',
            message: `Bienvenue ${userName} ! Explorez nos lots d'investissement pour commencer à gagner.`,
            type: 'success',
            category: 'system',
          });
        }
      },

      lowBalance: async (userId: number, balance: number) => {
        const sent = await notificationManager.notifyLowBalance(userId, balance);
        
        if (sent) {
          addNotification({
            title: 'Solde faible',
            message: `Votre solde est de ${notificationManager['formatCurrency'](balance)}. Pensez à recharger votre compte.`,
            type: 'warning',
            category: 'system',
          });
        }
      },
    },

    // Notifications pour agents avec sauvegarde automatique
    agent: {
      newRequest: async (agentId: number, type: 'deposit' | 'withdrawal', amount: number, userId: number) => {
        const saved = await notificationManager.notifyAgent(agentId, type, amount, userId);
        
        if (saved) {
          const typeText = type === 'deposit' ? 'dépôt' : 'retrait';
          addNotification({
            title: `Nouvelle demande de ${typeText}`,
            message: `Demande de ${typeText} de ${notificationManager['formatCurrency'](amount)} de l'utilisateur #${userId}`,
            type: 'info',
            category: 'agent',
            action: {
              label: 'Voir',
              onClick: () => {
                window.location.href = type === 'deposit' ? '/agent/deposits' : '/agent/withdrawals';
              },
            },
          });
        }
      },
    },
  };

  return notify;
}
