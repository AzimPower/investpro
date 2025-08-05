# 🔔 Système de Notifications - Guide d'Utilisation

## Vue d'ensemble

Le système de notifications de votre application offre une expérience utilisateur riche avec plusieurs types de notifications :

- **Toasts** (notifications temporaires avec Sonner)
- **Centre de notifications** (persistent avec historique)
- **Notifications push** (PWA/Browser)
- **Synchronisation backend** (optionnel)

## 🚀 Installation et Configuration

### 1. Composants déjà installés

✅ Contexte de notifications (`NotificationProvider`)
✅ Hook personnalisé (`useNotify`)
✅ Centre de notifications UI (`NotificationCenter`)
✅ Service backend (`notificationService`)
✅ Types TypeScript (`types/notifications.ts`)

### 2. Intégration dans l'application

Le système est déjà intégré dans votre `App.tsx` avec le `NotificationProvider` et le centre de notifications est disponible dans la barre de navigation.

## 📚 Utilisation

### Hook `useNotify` - Usage simple

```tsx
import { useNotify } from '@/hooks/useNotify';

function MonComposant() {
  const notify = useNotify();

  const handleSuccess = () => {
    notify.success(
      'Opération réussie',
      'Votre action a été effectuée avec succès'
    );
  };

  const handleError = () => {
    notify.error(
      'Erreur système',
      'Une erreur est survenue lors du traitement',
      {
        category: 'system',
        action: {
          label: 'Réessayer',
          onClick: () => console.log('Retry action')
        }
      }
    );
  };

  return (
    <div>
      <button onClick={handleSuccess}>Succès</button>
      <button onClick={handleError}>Erreur</button>
    </div>
  );
}
```

### Notifications spécialisées

```tsx
const notify = useNotify();

// Notifications de transaction
notify.transaction.deposit(50000, 'approved');
notify.transaction.withdrawal(25000, 'pending');
notify.transaction.purchase('Lot Premium', 100000);

// Notifications de gains
notify.earning.daily(2500, 'Lot Standard');
notify.earning.commission(1000, 2);

// Notifications système
notify.system.maintenance('Maintenance prévue le 15 août');
notify.system.security('Connexion depuis un nouvel appareil');

// Notifications pour agents
notify.agent.newRequest('deposit', 75000, 123);
```

### Hook `useNotifications` - Gestion avancée

```tsx
import { useNotifications } from '@/contexts/NotificationContext';

function NotificationManager() {
  const {
    notifications,
    unreadCount,
    settings,
    markAsRead,
    markAllAsRead,
    clearAll,
    updateSettings
  } = useNotifications();

  return (
    <div>
      <p>Notifications non lues: {unreadCount}</p>
      
      <button onClick={markAllAsRead}>
        Marquer tout comme lu
      </button>
      
      <button onClick={clearAll}>
        Effacer tout
      </button>
      
      <button onClick={() => updateSettings({ pushNotifications: true })}>
        Activer les notifications push
      </button>
    </div>
  );
}
```

## 🔧 Paramètres de notifications

```tsx
import { useNotifications } from '@/contexts/NotificationContext';

function NotificationSettings() {
  const { settings, updateSettings } = useNotifications();

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={settings.pushNotifications}
          onChange={(e) => updateSettings({ pushNotifications: e.target.checked })}
        />
        Notifications push
      </label>
      
      <label>
        <input
          type="checkbox"
          checked={settings.transactionNotifications}
          onChange={(e) => updateSettings({ transactionNotifications: e.target.checked })}
        />
        Notifications de transaction
      </label>
      
      {/* Autres paramètres... */}
    </div>
  );
}
```

## 📱 Notifications Push

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';

function PushNotificationSetup() {
  const { isSupported, hasPermission, requestPermission } = usePushNotifications();

  const enablePush = async () => {
    if (isSupported && !hasPermission) {
      const granted = await requestPermission();
      if (granted) {
        console.log('Notifications push activées !');
      }
    }
  };

  return (
    <div>
      {isSupported ? (
        <button onClick={enablePush} disabled={hasPermission}>
          {hasPermission ? 'Notifications activées' : 'Activer les notifications push'}
        </button>
      ) : (
        <p>Notifications push non supportées</p>
      )}
    </div>
  );
}
```

## 🔄 Synchronisation Backend

### API Endpoints disponibles

- `GET /backend/notifications/{userId}` - Récupérer les notifications
- `POST /backend/notifications` - Créer une notification
- `PUT /backend/notifications/{id}/read` - Marquer comme lu
- `PUT /backend/notifications/user/{userId}/read-all` - Tout marquer comme lu
- `DELETE /backend/notifications/{id}` - Supprimer une notification

### Utilisation du service backend

```tsx
import { useBackendNotifications } from '@/services/notificationService';

function NotificationsWithBackend() {
  const userId = getCurrentUserId();
  const { fetchNotifications, markAsRead, isLoading, error } = useBackendNotifications(userId);

  useEffect(() => {
    if (userId) {
      fetchNotifications().then(notifications => {
        // Charger les notifications depuis le backend
        console.log('Notifications chargées:', notifications);
      });
    }
  }, [userId]);

  // ... reste du composant
}
```

## 🎨 Personnalisation

### Types de notifications

- `success` - Couleur verte, icône CheckCircle
- `error` - Couleur rouge, icône AlertCircle  
- `warning` - Couleur jaune, icône AlertTriangle
- `info` - Couleur bleue, icône Info

### Catégories

- `transaction` - Dépôts, retraits, achats
- `earning` - Gains quotidiens, commissions
- `system` - Messages système, maintenance
- `agent` - Notifications pour les agents
- `general` - Notifications générales

### Personnaliser l'apparence

Vous pouvez modifier le style dans `NotificationCenter.tsx` :

```tsx
// Modifier les couleurs des catégories
const getCategoryColor = (category?: string) => {
  switch (category) {
    case 'transaction':
      return 'bg-blue-100 text-blue-800';
    case 'earning':
      return 'bg-green-100 text-green-800';
    // Ajouter vos couleurs personnalisées
    case 'custom':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
```

## 🔧 Intégration avec les actions existantes

### Dans vos hooks/mutations existants

```tsx
// Exemple d'intégration dans useClaimDailyEarning
import { useNotify } from '@/hooks/useNotify';

export function useClaimDailyEarning() {
  const notify = useNotify();
  
  const claimEarning = async (lotId: string, amount: number) => {
    try {
      const result = await apiClaimEarning(lotId);
      
      // Notification de succès
      notify.earning.daily(amount, result.lotName);
      
      return result;
    } catch (error) {
      // Notification d'erreur
      notify.error(
        'Erreur de réclamation',
        'Impossible de récupérer vos gains. Réessayez plus tard.'
      );
      throw error;
    }
  };
  
  return { claimEarning };
}
```

### Dans vos composants de transaction

```tsx
// Exemple pour un dépôt
const handleDeposit = async (amount: number, method: string) => {
  try {
    const result = await apiCreateDeposit({ amount, method });
    
    notify.transaction.deposit(amount, 'pending');
    
    return result;
  } catch (error) {
    notify.error('Erreur de dépôt', 'Impossible de traiter votre dépôt');
  }
};
```

## 🚀 Fonctionnalités avancées

### WebSocket pour notifications temps réel

```tsx
import { notificationService } from '@/services/notificationService';

useEffect(() => {
  const userId = getCurrentUserId();
  if (userId) {
    const unsubscribe = notificationService.subscribeToNotifications(
      userId,
      (notification) => {
        // Nouvelle notification reçue en temps réel
        console.log('Nouvelle notification:', notification);
      }
    );

    return unsubscribe; // Nettoyage
  }
}, []);
```

### Persistance locale

Les notifications sont automatiquement sauvegardées dans `localStorage` et restaurées au redémarrage de l'application.

### Gestion des erreurs API

```tsx
import { useApiNotifications } from '@/hooks/useNotify';

function MonComposantAvecAPI() {
  const { onError, onSuccess } = useApiNotifications();
  
  const fetchData = async () => {
    try {
      const data = await apiCall();
      onSuccess('Données chargées avec succès');
      return data;
    } catch (error) {
      onError(error); // Affiche automatiquement l'erreur
    }
  };
}
```

## 📊 Exemple complet

Voir le composant `NotificationDemo.tsx` pour un exemple complet de toutes les fonctionnalités.

## 🐛 Debugging

```tsx
// Pour déboguer les notifications
import { useNotifications } from '@/contexts/NotificationContext';

function DebugNotifications() {
  const { notifications } = useNotifications();
  
  console.log('Toutes les notifications:', notifications);
  console.log('Notifications non lues:', notifications.filter(n => !n.read));
  
  return null;
}
```

## ⚡ Performance

- Les notifications sont limitées à 50 par utilisateur (côté backend)
- Cache automatique des requêtes API
- Debouncing pour éviter les notifications en double
- Nettoyage automatique des notifications anciennes

---

🎉 **Votre système de notifications est maintenant prêt à l'emploi !**

Testez-le en visitant votre Dashboard où un composant de démonstration est disponible.
