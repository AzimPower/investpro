import { useQuery } from '@tanstack/react-query';

// API functions optimisées
async function fetchLots() {
  const response = await fetch('/backend/lots.php');
  if (!response.ok) throw new Error('Failed to fetch lots');
  return response.json();
}

async function fetchUserLots(userId: number) {
  const response = await fetch(`/backend/user_lots.php?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user lots');
  return response.json();
}

async function fetchTransactions(userId: number) {
  const response = await fetch(`/backend/transactions.php?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

async function fetchSettings() {
  const response = await fetch('/backend/settings.php');
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

async function fetchAgents() {
  const response = await fetch('/backend/users.php');
  if (!response.ok) throw new Error('Failed to fetch users');
  const users = await response.json();
  return Array.isArray(users) 
    ? users.filter((u) => u.role === 'agent' && u.accountStatus === 'active' && u.agentNumber)
    : [];
}

// Hooks optimisés
export function useLots() {
  return useQuery({
    queryKey: ['lots'],
    queryFn: fetchLots,
    staleTime: 10 * 60 * 1000, // 10 minutes - les lots changent rarement
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUserLots(userId: number | null) {
  return useQuery({
    queryKey: ['userLots', userId],
    queryFn: () => fetchUserLots(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useTransactions(userId: number | null) {
  return useQuery({
    queryKey: ['transactions', userId],
    queryFn: () => fetchTransactions(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 secondes
    select: (data) => Array.isArray(data) ? data.slice(0, 5) : [], // Limiter à 5 transactions
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
