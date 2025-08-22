// --- AGENT STATS ---
/**
 * Récupère les statistiques d'un ou de tous les agents sur une période donnée
 * @param startDate format YYYY-MM-DD
 * @param endDate format YYYY-MM-DD
 * @param agentId facultatif (pour filtrer un seul agent)
 */
export async function apiGetAgentStats(startDate: string, endDate: string, agentId?: number) {
  let url = `/backend/agent_stats.php?startDate=${startDate}&endDate=${endDate}`;
  if (agentId) url += `&agentId=${agentId}`;
  return apiCall(url);
}
// --- AGENT APPLICATIONS ---
/**
 * Crée une demande pour devenir agent
 */
export async function apiCreateAgentApplication(data: {
  userId: number;
  fullName: string;
  phone: string;
  operator: string;
  agentNumber: string;
}) {
  return apiCall(`${API_URL}/agent_applications.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

/**
 * Récupère les demandes agent (toutes ou par userId)
 */
export async function apiGetAgentApplications(userId?: number) {
  let url = `${API_URL}/agent_applications.php`;
  if (userId) url += `?userId=${userId}`;
  return apiCall(url);
}
// src/lib/api.ts
// Centralise tous les appels à l'API PHP backend avec optimisations

//const API_URL = '/backend'; // Adapter si besoin
const API_URL = 'https://app-investpro.site/backend'; // Adapter si besoin

// Cache pour éviter les appels redondants
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Fonction utilitaire pour la gestion du cache
function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any, ttl: number = 60000): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

// Fonction utilitaire pour les appels API avec retry
export async function apiCall(url: string, options?: RequestInit, useCache = false, cacheTtl = 60000): Promise<any> {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  
  // Vérifier le cache
  if (useCache) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }
  
  let lastError: Error;
  
  // Retry logic
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      
      // Mettre en cache si demandé
      if (useCache && data) {
        setCachedData(cacheKey, data, cacheTtl);
      }
      
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < 3) {
        // Attendre avant de retry (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError!;
}

// --- USERS ---
export async function apiLogin(phone: string, password: string) {
  return apiCall(`${API_URL}/users.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', phone, password })
  });
}

export async function apiRegister(user: any) {
  return apiCall(`${API_URL}/users.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
}

export async function apiGetUserById(id: number) {
  const user = await apiCall(`${API_URL}/users.php?id=${id}`, undefined, true, 30000);
  
  // Normaliser les données numériques de l'utilisateur
  if (user) {
    return {
      ...user,
      balance: parseFloat(user.balance || 0),
      totalEarned: parseFloat(user.totalEarned || 0)
    };
  }
  
  return user;
}

// --- GET ALL USERS ---
export async function apiGetUsers() {
  return apiCall(`${API_URL}/users.php?action=list`, undefined, true, 120000); // Cache 2 minutes
}

export async function apiUpdateUser(user: any) {
  try {
    console.log('Données avant envoi:', user);
    
    // Préparation des données à envoyer
    const dataToSend: any = {
      id: user.id
    };

    // Ajouter tous les champs fournis
    if (user.fullName !== undefined) dataToSend.fullName = user.fullName;
    if (user.phone !== undefined) dataToSend.phone = user.phone;
    if (user.email !== undefined) dataToSend.email = user.email;
    if (user.agentNumber !== undefined) dataToSend.agentNumber = user.agentNumber;
    if (user.accountStatus !== undefined) dataToSend.accountStatus = user.accountStatus;
    if (user.role !== undefined) dataToSend.role = user.role;
    if (user.operator !== undefined) dataToSend.operator = user.operator;

    // Gestion spéciale du solde
    if (user.balance !== undefined) {
      // Convertir en nombre et formater avec 2 décimales
      const balance = Number(user.balance);
      if (isNaN(balance)) {
        throw new Error('Le solde doit être un nombre valide');
      }
      dataToSend.balance = balance.toFixed(2);
    }

    // Gestion du totalEarned
    if (user.totalEarned !== undefined) {
      const totalEarned = Number(user.totalEarned);
      if (isNaN(totalEarned)) {
        throw new Error('Le total gagné doit être un nombre valide');
      }
      dataToSend.totalEarned = totalEarned.toFixed(2);
    }
    
    console.log('Données après conversion:', dataToSend);

    const res = await fetch(`${API_URL}/users.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend)
    });

    const text = await res.text();
    console.log('Réponse brute du serveur:', text);

    if (!res.ok) {
      throw new Error(`Erreur HTTP: ${res.status} ${text}`);
    }

    const data = text ? JSON.parse(text) : null;
    console.log('Réponse parsée:', data);
    return data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour utilisateur:', error);
    throw error;
  }
}

// --- LOTS ---
export async function apiGetLots() {
  const res = await fetch(`${API_URL}/lots.php`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiCreateLot(lot: any) {
  const res = await fetch(`${API_URL}/lots.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lot)
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiUpdateLot(lot: any) {
  // S'assurer que duration est bien un nombre
  const payload = { ...lot, duration: Number(lot.duration) };
  const res = await fetch(`${API_URL}/lots.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// --- TRANSACTIONS ---
export async function apiGetTransactions(userId?: number, lastSyncTime?: string) {
  let url = userId ? `${API_URL}/transactions.php?userId=${userId}` : `${API_URL}/transactions.php`;
  if (lastSyncTime) {
    url += `${url.includes('?') ? '&' : '?'}since=${lastSyncTime}`;
  }
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  
  // Normaliser les données pour s'assurer que les montants sont des nombres
  if (Array.isArray(data)) {
    return data.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount || 0)
    }));
  }
  
  return data;
}

export async function apiCreateTransaction(tx: any) {
  const res = await fetch(`${API_URL}/transactions.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx)
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiUpdateTransaction(data: any) {
  console.log("Mise à jour de la transaction:", data);
  const res = await fetch(`${API_URL}/transactions.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const text = await res.text();
  console.log("Réponse de l'API:", text);
  return text ? JSON.parse(text) : null;
}

// --- USER LOTS ---
export async function apiGetUserLots(userId?: number) {
  const url = userId ? `${API_URL}/user_lots.php?userId=${userId}` : `${API_URL}/user_lots.php`;
  const res = await fetch(url);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiCreateUserLot(userLot: any) {
  try {
    // 1. Vérifier d'abord si l'achat est possible
    const checkRes = await fetch(`${API_URL}/lots.php?action=check_purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userLot.userId,
        lotId: userLot.lotId
      })
    });
    
    const checkResult = await checkRes.json();
    if (!checkResult.allowed) {
      throw new Error(checkResult.message || "L'achat n'est pas autorisé");
    }

    // 2. Si la vérification passe, procéder à l'achat
    const res = await fetch(`${API_URL}/user_lots.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userLot)
    });
    
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error('Erreur lors de la création du lot utilisateur:', error);
    throw error;
  }
}

export async function apiUpdateUserLot(userLot: any) {
  const res = await fetch(`${API_URL}/user_lots.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userLot)
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// --- AGENTS ---
export async function apiGetAgents() {
  return apiCall(`${API_URL}/users.php?action=list&role=agent`, undefined, true, 120000); // Cache 2 minutes
}

export async function apiCreateAgent(agentData: any) {
  return apiCall(`${API_URL}/users.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...agentData,
      action: 'register',
      role: 'agent'
    })
  });
}

export async function apiUpdateAgentStatus(agentId: string, status: 'active' | 'inactive' | 'blocked') {
  return apiUpdateUser({ id: agentId, accountStatus: status });
}

export async function apiRemoveAgentRole(agentId: string) {
  return apiUpdateUser({ id: agentId, role: 'user' });
}

// --- SETTINGS ---
export async function apiGetSettings() {
  const res = await fetch(`${API_URL}/settings.php`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiUpdateSetting(key: string, value: any) {
  const res = await fetch(`${API_URL}/settings.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// --- NOTIFICATIONS ---
export async function apiGetNotifications(userId: number, useCache: boolean = true) {
  return apiCall(`${API_URL}/notifications.php?userId=${userId}`, undefined, useCache, 30000);
}

export async function apiMarkNotificationAsRead(notificationId: number, userId?: number) {
  // Utiliser notifications.php directement avec JSON dans le body
  const body: any = { id: notificationId, isRead: true };
  if (userId !== undefined) body.userId = userId;
  return apiCall(`${API_URL}/notifications.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function apiCreateNotification(userId: number, title: string, message: string, type: 'success' | 'error' | 'warning' | 'info', category?: string) {
  return apiCall(`${API_URL}/notifications.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, message, type, category })
  });
}

export async function apiDeleteNotification(notificationId: number, userId?: number) {
  const body: any = { id: notificationId };
  if (userId !== undefined) body.userId = userId;
  return apiCall(`${API_URL}/notifications.php`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// Fonction pour marquer toutes les notifications d'un utilisateur comme lues
export async function apiMarkAllNotificationsAsRead(userId: number) {
  console.log('API: apiMarkAllNotificationsAsRead appelée avec userId:', userId);
  const requestBody = { userId: userId, markAllAsRead: true };
  console.log('API: Corps de la requête:', requestBody);
  
  // Utiliser notifications.php directement avec JSON dans le body
  const result = await apiCall(`${API_URL}/notifications.php`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  console.log('API: Réponse reçue pour markAllAsRead:', result);
  return result;
}

// Fonction pour supprimer toutes les notifications d'un utilisateur
export async function apiDeleteAllNotifications(userId: number) {
  console.log('API: apiDeleteAllNotifications appelée avec userId:', userId);
  const requestBody = { userId: userId, deleteAll: true };
  console.log('API: Corps de la requête:', requestBody);
  
  // Utiliser notifications.php directement avec JSON dans le body
  const result = await apiCall(`${API_URL}/notifications.php`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  console.log('API: Réponse reçue pour deleteAllNotifications:', result);
  return result;
}
