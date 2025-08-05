// Types TypeScript pour l'application Investment Platform

export interface User {
  id: string;
  phone: string;
  fullName: string;
  password: string;
  email?: string;
  sponsorCode?: string;
  referredBy?: string;
  role: 'user' | 'agent' | 'admin';
  balance: number;
  totalEarned: number;
  dailyEarnings: number;
  accountStatus: 'active' | 'inactive' | 'blocked';
  createdAt: string;
  lastActive: string;
  referralCode: string;
  activeLotId?: string; // Ajout pour le lot actif
  agentNumber?: string; // Ajout pour les agents (numéro d'agent)
  operator?: 'moov' | 'orange' | 'wave'; // Ajout pour l'opérateur de paiement des agents
}

export interface InvestmentLot {
  id: string;
  name: string;
  price: number;
  dailyReturn: number;
  duration: number;
  color: string;
  active: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'commission'| 'purchase' | 'transfer_sent' | 'transfer_received';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  lotId?: string;
  paymentMethod?: string;
  paymentProof?: string;
  agentId?: string; // Ajouté pour lier la transaction à un agent
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  reason?: string;
  agentNumber?: string; // Ajout de la propriété agentNumber
}

export interface UserLot {
  id: string;
  userId: string;
  lotId: string;
  purchasedAt: string;
  active: boolean;
  lastEarningDate?: string;
}
