import { isValidPhoneNumber } from 'libphonenumber-js';
import { useState, useEffect, useMemo, useCallback } from "react";
import { MuiTelInput } from 'mui-tel-input';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { User, InvestmentLot } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, Gift, Clock, ArrowUpRight, ArrowDownRight, Users, Star, Send, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUserData, useUpdateUser } from "@/hooks/useUserData";
import { useLots, useUserLots, useTransactions, useSettings, useAgents } from "@/hooks/useAppData";
import { useClaimDailyEarning } from "@/hooks/useClaimDailyEarning";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

// Type local pour les transactions (MySQL)
interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'earning' | 'commission' | 'purchase' | 'lot_purchase';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  lotId?: string;
  lotName?: string; // Enrichi depuis les données des lots
  paymentMethod?: string;
  paymentProof?: string;
  agentId?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  reason?: string;
  agentNumber?: string;
}

export const Dashboard = () => {
  // États simplifiés - la plupart des données viennent de React Query
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeLot, setActiveLot] = useState<InvestmentLot | null>(null);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [depositMethod, setDepositMethod] = useState("");
  const [depositProof, setDepositProof] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [activeUserLot, setActiveUserLot] = useState<any>(null);
  const [isLotExpired, setIsLotExpired] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [transferPhone, setTransferPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<{id: string, name: string, phone: string} | null>(null);
  const [isVerifyingUser, setIsVerifyingUser] = useState(false);
  const [phoneVerificationTimeout, setPhoneVerificationTimeout] = useState<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateUser = useUpdateUser();
  const claimDailyEarning = useClaimDailyEarning();

  // Hooks React Query optimisés
  const { data: user, isLoading: userLoading, error: userError } = useUserData(currentUserId);
  const { data: lots = [], isLoading: lotsLoading } = useLots();
  const { data: userLots = [], isLoading: userLotsLoading } = useUserLots(currentUserId);
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(currentUserId);
  const { data: settings } = useSettings();
  const { data: agents = [] } = useAgents();

  const isLoading = userLoading || lotsLoading || userLotsLoading || transactionsLoading;
  const paymentMethods = settings?.paymentMethods || [];
  
  // Debug: Log des méthodes de paiement disponibles
  console.log('💳 Méthodes de paiement disponibles:', paymentMethods);

  // Effet initial pour charger l'utilisateur depuis localStorage
  useEffect(() => {
    const currentUserData = localStorage.getItem('currentUser');
    if (!currentUserData) {
      navigate('/login');
      return;
    }
    try {
      const userData = JSON.parse(currentUserData);
      setCurrentUserId(userData.id);
    } catch (error) {
      localStorage.removeItem('currentUser');
      navigate('/login');
    }
  }, [navigate]);

  // Redirection si erreur utilisateur
  useEffect(() => {
    if (userError || (currentUserId && !userLoading && !user)) {
      localStorage.removeItem('currentUser');
      navigate('/login');
    }
  }, [userError, user, userLoading, currentUserId, navigate]);

  // Calcul du lot actif (memoized pour éviter les recalculs)
  useEffect(() => {
    if (userLots.length > 0 && lots.length > 0) {
      const activeUserLot = userLots.find((ul: any) => ul.active === 1 || ul.active === '1');
      if (activeUserLot) {
        const activeLotData = lots.find((lot: any) => lot.id === activeUserLot.lotId);
        setActiveLot(activeLotData || null);
        setActiveUserLot(activeUserLot);
        setLastClaimDate(activeUserLot.lastEarningDate);
        // Vérifier expiration du lot
        if (activeLotData && activeUserLot.purchasedAt && activeLotData.duration) {
          const purchasedAt = new Date(activeUserLot.purchasedAt);
          const expiration = new Date(purchasedAt.getTime() + activeLotData.duration * 24 * 60 * 60 * 1000);
          setIsLotExpired(new Date() >= expiration);
        } else {
          setIsLotExpired(false);
        }
      } else {
        setActiveLot(null);
        setActiveUserLot(null);
        setLastClaimDate(null);
        setIsLotExpired(false);
      }
    }
  }, [userLots, lots]);

  // Helper: Find the agent with the least number of assigned deposits (to balance load), filtered by payment type
  const getBalancedAgent = useCallback((paymentType?: string) => {
    console.log('🔍 getBalancedAgent appelé avec:', paymentType);
    console.log('📊 Agents disponibles:', agents.length, agents.map(a => ({ id: a.id, name: a.fullName, operator: a.operator, role: a.role })));
    
    if (!agents.length || !user) return null;
    let filteredAgents = agents;
    
    // Filtrer les agents par opérateur selon la méthode de paiement
    if (paymentType) {
      const type = paymentType.toLowerCase();
      console.log('🎯 Filtrage par type:', type);
      
      filteredAgents = agents.filter(agent => {
        // Mapping plus flexible pour les méthodes de paiement
        let operatorToMatch = '';
        if (type.includes('moov')) operatorToMatch = 'moov';
        else if (type.includes('orange')) operatorToMatch = 'orange';  
        else if (type.includes('wave')) operatorToMatch = 'wave';
        else operatorToMatch = type; // Fallback exact match
        
        const hasCorrectOperator = agent.operator && agent.operator.toLowerCase() === operatorToMatch;
        const isAgent = agent.role === 'agent';
        const isNotSelf = agent.id !== user.id; // Empêcher qu'un agent soit assigné à lui-même
        console.log(`👤 Agent ${agent.fullName}: role=${agent.role}, operator=${agent.operator}, recherché=${operatorToMatch}, notSelf=${isNotSelf}, match=${hasCorrectOperator && isAgent && isNotSelf}`);
        return hasCorrectOperator && isAgent && isNotSelf;
      });
    } else {
      // Si pas de type spécifié, prendre tous les agents (sauf soi-même)
      filteredAgents = agents.filter(agent => agent.role === 'agent' && agent.id !== user.id);
    }
    
    console.log('✅ Agents filtrés:', filteredAgents.length, filteredAgents.map(a => ({ id: a.id, name: a.fullName, operator: a.operator })));
    
    if (!filteredAgents.length) return null;
    
    // Count deposits per agent
    const agentDepositCounts: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'deposit' && t.agentId) {
        agentDepositCounts[t.agentId] = (agentDepositCounts[t.agentId] || 0) + 1;
      }
    });
    // Find agent with minimum count
    let minCount = Infinity;
    let chosen: User | null = null;
    filteredAgents.forEach(agent => {
      const count = agentDepositCounts[agent.id] || 0;
      if (count < minCount) {
        minCount = count;
        chosen = agent;
      }
    });
    
    console.log('🎯 Agent choisi:', chosen ? { id: chosen.id, name: chosen.fullName, operator: chosen.operator, deposits: agentDepositCounts[chosen.id] || 0 } : 'AUCUN');
    return chosen;
  }, [agents, transactions, user]);

  // When deposit dialog opens, select a balanced agent (useCallback pour optimiser)

  // Sélection automatique d'un agent à chaque ouverture du dialog ou changement de méthode de paiement
  useEffect(() => {
    if (isDepositDialogOpen && user) {
      const selectedAgentResult = getBalancedAgent(depositMethod);
      setSelectedAgent(selectedAgentResult);
      
      // Si aucun agent n'est trouvé et que l'utilisateur est un agent, afficher un message spécifique
      if (!selectedAgentResult && user.role === 'agent') {
        console.log('⚠️ Agent ne peut pas faire de dépôt vers lui-même');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDepositDialogOpen, depositMethod, agents, transactions, user]);

  const handleDepositDialogOpen = useCallback(() => {
    setIsDepositDialogOpen(true);
    // setSelectedAgent(getBalancedAgent); // plus nécessaire, géré par useEffect
  }, []);

  // Le lot actif de l'utilisateur est maintenant récupéré depuis la table user_lots
  const userActiveLot = activeLot;
  const lotDailyReturn = userActiveLot ? userActiveLot.dailyReturn : 0;
  // Gain en cours = dailyReturn du lot actif (sans user.dailyEarnings qui n'existe plus)
  const currentEarning = lotDailyReturn;

  // Helper to check if user can claim today (par lot actif) - memoized
  const canClaimToday = useCallback(() => {
    if (!activeUserLot || !lastClaimDate) return true;
    const last = new Date(lastClaimDate);
    const now = new Date();
    
    // Vérifier si c'est un jour différent (permet de réclamer une fois par jour)
    return (
      last.getFullYear() !== now.getFullYear() ||
      last.getMonth() !== now.getMonth() ||
      last.getDate() !== now.getDate()
    );
  }, [activeUserLot, lastClaimDate]);

  // Handle claim daily earning (pour le lot actif) - optimisé avec React Query
  const handleClaimDaily = useCallback(
    async () => {
      if (!user) return;
      
      // Vérifier si une réclamation est déjà en cours
      if (isClaiming || claimDailyEarning.isPending) {
        toast({
          title: "Réclamation en cours",
          description: "Une réclamation est déjà en cours de traitement. Veuillez patienter.",
          variant: "destructive"
        });
        return;
      }

      // Vérifier si l'utilisateur peut réclamer aujourd'hui
      if (!canClaimToday()) {
        toast({
          title: "Réclamation déjà effectuée",
          description: "Vous avez déjà réclamé votre gain aujourd'hui. Revenez demain !",
          variant: "destructive"
        });
        return;
      }

      if (!userActiveLot) {
        toast({
          title: "Aucun lot actif",
          description: "Vous devez d'abord acheter un lot pour pouvoir réclamer des gains.",
          variant: "destructive"
        });
        return;
      }
      
      setIsClaiming(true);

      try {
        await claimDailyEarning.mutateAsync({
          user,
          currentEarning,
          userActiveLot,
          activeUserLot,
          setLastClaimDate,
        });
      } catch (error) {
        // Afficher le message d'erreur du backend si présent
        let backendMsg = (error && typeof error === 'object' && 'response' in error && error.response && error.response.data && error.response.data.error)
          ? error.response.data.error
          : (error && typeof error === 'object' && 'message' in error ? error.message : String(error));
        if (backendMsg && backendMsg.includes('déjà réclamé')) {
          toast({
            title: "Réclamation déjà effectuée",
            description: backendMsg,
            variant: "destructive"
          });
        } else if (backendMsg) {
          toast({
            title: "Erreur",
            description: backendMsg,
            variant: "destructive"
          });
        }
      } finally {
        setIsClaiming(false);
      }
    },
    [user, isClaiming, canClaimToday, userActiveLot, currentEarning, activeUserLot, toast, claimDailyEarning, setLastClaimDate]
  );
  // Fonction de gestion du dépôt
  const handleDeposit = useCallback(async () => {
    if (!user || !depositMethod || !depositProof || !depositAmount || !selectedAgent || Number(depositAmount) < 1000) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs correctement (montant minimum 1000 FCFA)",
        variant: "destructive",
      });
      return;
    }

    if (isSubmittingDeposit) {
      toast({
        title: "Envoi en cours",
        description: "Une demande de dépôt est déjà en cours de traitement.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingDeposit(true);

      // Créer la transaction de dépôt via l'API PHP backend
      const res = await fetch('/backend/transactions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          userId: user.id,
          type: 'deposit',
          amount: Number(depositAmount),
          status: 'pending',
          description: `Recharge de compte`,
          paymentMethod: depositMethod,
          paymentProof: depositProof,
          agentId: selectedAgent.id,
          agentNumber: selectedAgent.agentNumber,
        })
      });
      const result = await res.json();
      if (!result || !result.success) throw new Error(result && result.error ? result.error : "Erreur lors de la transaction");
      
      toast({
        title: "Demande envoyée",
        description: "Votre demande de recharge a été envoyée et sera traitée sous 24h maximum.",
      });
      
      // Invalider le cache des transactions pour afficher la nouvelle demande
      queryClient.invalidateQueries({ queryKey: ['transactions', user.id] });
      
      setIsDepositDialogOpen(false);
      setDepositMethod("");
      setDepositProof("");
      setDepositAmount("");
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'envoi de la demande",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDeposit(false);
    }
  }, [user, depositMethod, depositProof, depositAmount, selectedAgent, isSubmittingDeposit, toast, queryClient]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  }, []);

  // Fonction pour vérifier l'utilisateur par téléphone
  const verifyUserByPhone = useCallback(async (phone: string) => {
    // Vérification stricte du numéro international
    if (!isValidPhoneNumber(phone)) {
      setVerifiedUser(null);
      return;
    }
    setIsVerifyingUser(true);
    try {
      const res = await fetch('/backend/transactions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_user',
          phone: phone
        })
      });
      const result = await res.json();
      if (result.success && result.user) {
        // Vérifier si ce n'est pas le même utilisateur
        if (result.user.id === user?.id.toString()) {
          setVerifiedUser(null);
          return;
        }
        setVerifiedUser(result.user);
      } else {
        setVerifiedUser(null);
      }
    } catch (error) {
      console.error('Erreur de vérification:', error);
      setVerifiedUser(null);
    } finally {
      setIsVerifyingUser(false);
    }
  }, [user]);

  // Fonction de transfert inter-comptes
  const handleTransfer = useCallback(async () => {
    // Validation stricte du numéro international
    const phoneRegex = /^\+[1-9]\d{7,14}$/;
    const cleanedPhone = transferPhone.replace(/\s+/g, '');
    if (!user || !cleanedPhone || !transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) < 1000 || !phoneRegex.test(cleanedPhone)) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs correctement (montant minimum 1000 FCFA, numéro international valide)",
        variant: "destructive",
      });
      return;
    }

    if (!verifiedUser) {
      toast({
        title: "Utilisateur non vérifié",
        description: "Veuillez saisir un numéro de téléphone valide d'un utilisateur existant",
        variant: "destructive",
      });
      return;
    }

    // Vérifier si l'utilisateur tente de transférer vers son propre compte
    if (verifiedUser.id === user.id.toString()) {
      toast({
        title: "Transfert impossible",
        description: "Vous ne pouvez pas transférer de l'argent vers votre propre compte",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(transferAmount);
    if (amount > user.balance) {
      toast({
        title: "Solde insuffisant",
        description: "Vous n'avez pas suffisamment de fonds pour effectuer ce transfert",
        variant: "destructive",
      });
      return;
    }

    // Vérifier si une soumission est déjà en cours
    if (isSubmittingTransfer) {
      toast({
        title: "Transfert en cours",
        description: "Un transfert est déjà en cours de traitement. Veuillez patienter.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingTransfer(true);

      // Effectuer le transfert via l'API PHP backend
      const res = await fetch('/backend/transactions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          fromUserId: user.id,
          toPhone: cleanedPhone,
          amount: amount,
          description: transferDescription || `Transfert vers ${transferPhone}`,
        })
      });
      
      const result = await res.json();
      if (!result || !result.success) {
        throw new Error(result && result.error ? result.error : "Erreur lors du transfert");
      }
      
      toast({
        title: "Transfert réussi",
        description: `${formatCurrency(amount)} transféré avec succès vers ${result.recipient?.name || transferPhone}`,
      });
      
      // Invalider les caches pour mettre à jour les données
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user.id] });
      
      setIsTransferDialogOpen(false);
      setTransferPhone("");
      setTransferAmount("");
      setTransferDescription("");
      setVerifiedUser(null);
    } catch (error) {
      toast({
        title: "Erreur de transfert",
        description: error instanceof Error ? error.message : "Erreur lors du transfert",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingTransfer(false);
    }
  }, [user, transferPhone, transferAmount, transferDescription, verifiedUser, isSubmittingTransfer, toast, queryClient]);

  const getTransactionIcon = useCallback((type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-success" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-destructive" />;
      case 'earning':
        return <Gift className="h-4 w-4 text-primary" />;
      case 'commission':
        return <Users className="h-4 w-4 text-accent" />;
      case 'purchase':
      case 'lot_purchase':
        return <TrendingUp className="h-4 w-4 text-warning" />;
      case 'transfer_sent':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'transfer_received':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  }, []);

  const getStatusBadge = useCallback((status: string, transactionType?: string) => {
    switch (status) {
      case 'approved':
        // Pour les transferts, afficher "Terminé" au lieu de "Approuvé"
        if (transactionType === 'transfer_sent' || transactionType === 'transfer_received') {
          return <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs">Terminé</span>;
        }
        return <span className="px-2 py-1 bg-success/10 text-success rounded-full text-xs">Approuvé</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-warning/10 text-warning rounded-full text-xs">En attente</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs">Rejeté</span>;
      default:
        return <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">{status}</span>;
    }
  }, []);

  if (isLoading) {
    function handleLogout(): void {
      localStorage.removeItem('currentUser');
      window.location.href = '/login';
    }
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="user" onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Utilise le total gagné depuis la base de données plutôt que de calculer depuis les transactions limitées
  const totalGagneCumule = Number(user.totalEarned) || 0;
  logger.log('Debug - totalGagneCumule calculé:', totalGagneCumule, 'depuis user.totalEarned:', user.totalEarned);

  function handleLogout(): void {
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  }
  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={user.role} onLogout={handleLogout} />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8 pb-8 sm:pb-12">
        {/* Welcome Section - Mobile compact */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Salut, {user.fullName.split(' ')[0]} !</h1>
          </div>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">Aperçu de vos investissements</p>
        </div>

        {/* Stats Cards - Optimisé mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {/* Solde actuel */}
          <Card className="shadow-card bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-500 rounded-full">
                  <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-white flex-shrink-0" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-blue-700">Solde</span>
              </div>
              <div className="text-sm sm:text-xl font-bold text-blue-800">{formatCurrency(user.balance)}</div>
            </CardContent>
          </Card>

          {/* Gain en cours */}
          <Card className="shadow-card bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-emerald-500 rounded-full">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-white flex-shrink-0" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-emerald-700">Gain</span>
              </div>
              <div className="text-sm sm:text-xl font-bold text-emerald-800">{formatCurrency(currentEarning)}</div>
              {isLotExpired ? (
                <div className="text-xs text-red-600 font-semibold mt-2">Votre lot a expiré. Achetez un nouveau lot pour continuer à réclamer vos gains.</div>
              ) : (
                <Button
                  size="sm"
                  className="w-full text-xs mt-2 h-6 sm:h-8 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 border-0 shadow-md"
                  disabled={!canClaimToday() || isClaiming || !userActiveLot || isLotExpired}
                  onClick={handleClaimDaily}
                >
                  {isClaiming
                    ? 'En cours...'
                    : !canClaimToday()
                      ? 'Déjà réclamé aujourd\'hui'
                      : isLotExpired
                        ? 'Lot expiré'
                        : 'Réclamer'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Total gagné */}
          <Card className="shadow-card bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-amber-500 rounded-full">
                  <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-white flex-shrink-0" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-amber-700">Total</span>
              </div>
              <div className="text-sm sm:text-xl font-bold text-amber-800">{formatCurrency(totalGagneCumule)}</div>
            </CardContent>
          </Card>

          {/* Statut */}
          <Card className="shadow-card bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-purple-500 rounded-full">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 text-white flex-shrink-0" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-purple-700">Statut</span>
              </div>
              <div className="text-sm sm:text-lg font-semibold capitalize text-purple-800">
                {user.accountStatus === 'active' ? 'Actif' : user.accountStatus}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info lot actif - Mobile compact */}
        {userActiveLot && (
          <div className="mb-4 sm:mb-6 lg:hidden">
            <Card className="shadow-card bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 border-0 text-white">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="p-1 bg-white/20 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                  <span className="font-semibold">{userActiveLot.name}</span>
                  <span>•</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full font-medium">{formatCurrency(userActiveLot.dailyReturn)}/jour</span>
                  {!canClaimToday() && (
                    <>
                      <span>•</span>
                      <span className="text-white/80">Prochain: demain</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {!userActiveLot && (
          <div className="mb-4 sm:mb-6 lg:hidden">
            <Card className="shadow-card bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500 border-0 text-white">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="p-1 bg-white/20 rounded-full">
                    <Clock className="h-3 w-3" />
                  </div>
                  <span className="font-medium">Aucun lot actif - Achetez un lot pour commencer</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Cards - Mobile optimisé */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
          
                    {/* Retirer gains */}
          <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-red-50 to-rose-100 border-red-200" onClick={() => navigate('/withdraw')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="mx-auto mb-2 p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-full w-fit shadow-md">
                <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold mb-1 text-red-700">Retirer</h3>
              <p className="text-xs text-red-600 hidden sm:block">Gains</p>
            </CardContent>
          </Card>

          {/* Recharger mon compte */}
              <Dialog open={isDepositDialogOpen} onOpenChange={(open) => {
                if (!isSubmittingDeposit) {
                  setIsDepositDialogOpen(open);
                  if (!open) {
                    setDepositMethod("");
                    setDepositProof("");
                    setDepositAmount("");
                  }
                }
              }}>
                <DialogTrigger asChild>
                  <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <div className="mx-auto mb-2 p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full w-fit shadow-md">
                        <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold mb-1 text-blue-700">Recharger</h3>
                      <p className="text-xs text-blue-600 hidden sm:block">Ajouter fonds</p>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                  <DialogHeader className="flex-shrink-0 pb-2">
                    <DialogTitle className="text-base font-semibold text-gray-800">Recharger mon compte</DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                      {false ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-700">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="font-medium">Les agents ne peuvent pas effectuer de dépôt.</span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">Cette opération est réservée aux investisseurs.</p>
                        </div>
                      ) : (
                        depositMethod && depositAmount && Number(depositAmount) >= 1000 && selectedAgent ? (
                          depositMethod.toLowerCase().includes('wave') ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="font-semibold text-sm text-blue-800">Paiement Wave :</span>
                              </div>
                              <div className="bg-white border rounded-md p-2 text-left">
                                <ol className="list-decimal list-inside text-xs sm:text-sm font-mono text-blue-800 space-y-1">
                                  <li>Ouvrez Wave</li>
                                  <li>Faites le dépôt de <b className="font-semibold text-blue-900">{formatCurrency(Number(depositAmount))}</b> au numéro <b className="font-semibold text-blue-900">{selectedAgent.agentNumber}</b> <span className="text-xs">sous le nom de</span> <b className="font-semibold text-blue-900">{selectedAgent.fullName}</b></li>
                                  <li>Copiez l'ID de la transaction et collez-le ci-dessous</li>
                                </ol>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="font-semibold text-sm text-blue-800">Code USSD à composer :</span>
                              </div>
                              <div className="bg-white border rounded-md p-2">
                                <span className="font-mono text-base text-blue-700 font-bold">
                                  {(() => {
                                    let ussdPrefix = '*144*2*1*';
                                    if (depositMethod.toLowerCase().includes('moov')) ussdPrefix = '*555*2*1*';
                                    const agentNumber = selectedAgent.agentNumber ? selectedAgent.agentNumber.replace('+226', '').replace(/\s+/g, '') : 'numéro';
                                    return `${ussdPrefix}${agentNumber}*${depositAmount}#`;
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-blue-600">
                                  <div>Agent : <span className="font-medium">{selectedAgent.fullName}</span></div>
                                  <div>Montant : <span className="font-medium">{formatCurrency(Number(depositAmount))}</span></div>
                                </div>
                                <a
                                  href={`tel:${encodeURIComponent((() => {
                                    let ussdPrefix = '*144*2*1*';
                                    if (depositMethod.toLowerCase().includes('moov')) ussdPrefix = '*555*2*1*';
                                    const agentNumber = selectedAgent.agentNumber ? selectedAgent.agentNumber.replace('+226', '').replace(/\s+/g, '') : 'numéro';
                                    return `${ussdPrefix}${agentNumber}*${depositAmount}#`;
                                  })())}`}
                                  className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium"
                                  style={{ textDecoration: 'none' }}
                                >
                                  📞 Composer
                                </a>
                              </div>
                            </div>
                          )
                        ) : !selectedAgent ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-orange-700">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="font-medium">
                                {user?.role === 'agent' ? 
                                  "Aucun autre agent disponible pour traiter votre demande." :
                                  "Aucun agent disponible. Réessayez plus tard."
                                }
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-gray-600">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              <span className="text-sm">Remplissez les champs pour obtenir le code USSD.</span>
                            </div>
                          </div>
                        )
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto min-h-0 px-1">
                    <div className="space-y-3 py-2">
                      <div>
                        <Label htmlFor="deposit-method" className="text-sm font-medium text-gray-700 block mb-2">
                          Méthode de paiement *
                        </Label>
                        <Select value={depositMethod} onValueChange={setDepositMethod} disabled={paymentMethods.length === 0 || isSubmittingDeposit}>
                          <SelectTrigger className="text-sm h-9 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <SelectValue placeholder={paymentMethods.length === 0 ? "Aucune méthode disponible" : "Sélectionnez une méthode"} />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.length === 0 ? (
                              <div className="px-3 py-2 text-red-600 text-sm">Aucune méthode disponible</div>
                            ) : (
                              paymentMethods.map((method, idx) => (
                                <SelectItem key={idx} value={method} className="text-sm py-2">{method}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {!depositMethod && (
                          <p className="text-sm text-gray-500 mt-1">Choisissez d'abord une méthode de paiement</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="deposit-amount" className="text-sm font-medium text-gray-700 block mb-2">
                          Montant (FCFA) *
                        </Label>
                        <div className="relative">
                          <input
                            id="deposit-amount"
                            type="number"
                            min="1000"
                            step="500"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-9"
                            placeholder="Montant minimum : 1000 FCFA"
                            value={depositAmount}
                            onChange={e => {
                              const val = e.target.value;
                              if (/^\d*$/.test(val)) setDepositAmount(val);
                            }}
                            onKeyDown={e => {
                              if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            disabled={isSubmittingDeposit || !depositMethod}
                          />
                          {depositAmount && Number(depositAmount) >= 1000 && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600">
                              ✓
                            </div>
                          )}
                        </div>
                        {depositAmount && Number(depositAmount) < 1000 && (
                          <p className="text-sm text-red-500 mt-1">Le montant minimum est de 1000 FCFA</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="deposit-proof" className="text-sm font-medium text-gray-700 block mb-2">
                          Preuve de paiement *
                        </Label>
                        <Textarea
                          id="deposit-proof"
                          placeholder="Saisissez l'ID de transaction ou une description du paiement effectué"
                          value={depositProof}
                          onChange={e => setDepositProof(e.target.value)}
                          className="text-sm min-h-[60px] resize-none border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          disabled={isSubmittingDeposit}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Exemple : "Transaction réussie ID: PP250803.1806.56541381"
                        </p>
                      </div>
                      
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5">⚠️</div>
                          <div className="text-sm text-amber-800">
                            <div className="font-medium mb-1">Instructions :</div>
                            <ul className="space-y-0.5 text-xs">
                              <li>1. Composez le code USSD ci-dessus</li>
                              <li>2. Effectuez le paiement vers l'agent</li>
                              <li>3. Saisissez la preuve dans le champ</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 pt-3 border-t bg-white">
                    {!selectedAgent && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                        <div className="flex items-center gap-2 text-red-700">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="font-medium text-sm">Aucun agent disponible</span>
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          {user?.role === 'agent' ? 
                            "Aucun autre agent n'est disponible pour traiter votre demande." :
                            "Aucun agent n'est disponible actuellement. Veuillez réessayer plus tard."
                          }
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-9 text-sm border-gray-300 hover:bg-gray-50"
                        disabled={isSubmittingDeposit}
                        onClick={() => {
                          if (!isSubmittingDeposit) {
                            setIsDepositDialogOpen(false);
                            setDepositMethod("");
                            setDepositProof("");
                            setDepositAmount("");
                          }
                        }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        className="flex-1 h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={handleDeposit} 
                        disabled={paymentMethods.length === 0 || isSubmittingDeposit || !selectedAgent || !depositMethod || !depositProof || !depositAmount || Number(depositAmount) < 1000}
                      >
                        {isSubmittingDeposit ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Envoi...
                          </div>
                        ) : (
                          'Confirmer'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

          {/* Transfert inter-comptes */}
              <Dialog open={isTransferDialogOpen} onOpenChange={(open) => {
                if (!isSubmittingTransfer) {
                  setIsTransferDialogOpen(open);
                  if (!open) {
                    setTransferPhone("");
                    setTransferAmount("");
                    setTransferDescription("");
                    setVerifiedUser(null);
                    if (phoneVerificationTimeout) {
                      clearTimeout(phoneVerificationTimeout);
                      setPhoneVerificationTimeout(null);
                    }
                  }
                }
              }}>
                <DialogTrigger asChild>
                  <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-indigo-50 to-purple-100 border-indigo-200">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <div className="mx-auto mb-2 p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full w-fit shadow-md">
                        <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold mb-1 text-indigo-700">Transférer</h3>
                      <p className="text-xs text-indigo-600 hidden sm:block">Sans frais</p>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                  <DialogHeader className="flex-shrink-0 pb-3">
                    <DialogTitle className="text-lg font-semibold text-gray-800">Transfert inter-comptes</DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                      {user?.role === 'agent' ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-red-700">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="font-medium">Les agents ne peuvent pas effectuer de transfert.</span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">Cette opération est réservée aux investisseurs.</p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-700">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="font-semibold text-sm">Transfert instantané et gratuit</span>
                          </div>
                          <p className="text-sm text-green-600 mt-1">
                            Transférez sans frais vers n'importe quel utilisateur de InvestPro
                          </p>
                        </div>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-4 px-1 py-3">
                    <div>
                      <Label htmlFor="transfer-phone" className="text-sm font-medium text-gray-700 block mb-2">
                        Numéro de téléphone du destinataire *
                      </Label>
                      <div className="relative">
                        <MuiTelInput
                          id="transfer-phone"
                          value={transferPhone}
                          onChange={phone => {
                            setTransferPhone(phone);
                            setVerifiedUser(null);
                            if (phoneVerificationTimeout) {
                              clearTimeout(phoneVerificationTimeout);
                            }
                            if (isValidPhoneNumber(phone)) {
                              const timeoutId = setTimeout(() => {
                                verifyUserByPhone(phone);
                              }, 800);
                              setPhoneVerificationTimeout(timeoutId);
                            }
                          }}
                          defaultCountry="BF"
                          fullWidth
                          required
                          disabled={isSubmittingTransfer || user?.role === 'agent'}
                        />
                        {isVerifyingUser && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Affichage de l'utilisateur vérifié */}
                      {verifiedUser && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium">Destinataire trouvé</span>
                          </div>
                          <p className="text-sm text-green-600 mt-1">
                            {verifiedUser.name} • {verifiedUser.phone}
                          </p>
                        </div>
                      )}
                      
                      {transferPhone && !verifiedUser && !isVerifyingUser && transferPhone.length >= 12 && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium">Utilisateur non trouvé</span>
                          </div>
                          <p className="text-sm text-red-600 mt-1">
                            Aucun compte avec ce numéro. Vérifiez que le numéro est correct et existe sur la plateforme.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="transfer-amount" className="text-sm font-medium text-gray-700 block mb-2">
                        Montant (FCFA) *
                      </Label>
                      <div className="relative">
                        <Input
                          id="transfer-amount"
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="1000"
                          step="500"
                          placeholder="Montant à transférer (minimum 1000 FCFA)"
                          value={transferAmount}
                          onChange={e => {
                            const value = e.target.value;
                            // Ne permettre que les chiffres positifs
                            if (/^\d*$/.test(value)) {
                              setTransferAmount(value);
                            }
                          }}
                          onKeyDown={e => {
                            // Bloquer les caractères non numériques et les signes
                            if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          className="text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10"
                          disabled={isSubmittingTransfer || user?.role === 'agent'}
                        />
                        {transferAmount && Number(transferAmount) >= 500 && Number(transferAmount) <= (user?.balance || 0) && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600">
                            ✓
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Solde disponible: <span className="font-medium">{formatCurrency(user?.balance || 0)}</span> • Minimum: 1000 FCFA
                      </p>
                      {transferAmount && Number(transferAmount) < 500 && (
                        <p className="text-sm text-red-500 mt-1">Le montant minimum est de 1000 FCFA</p>
                      )}
                      {transferAmount && Number(transferAmount) > (user?.balance || 0) && (
                        <p className="text-sm text-red-500 mt-1">Montant supérieur à votre solde disponible</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="transfer-description" className="text-sm font-medium text-gray-700 block mb-2">
                        Description (optionnelle)
                      </Label>
                      <Input
                        id="transfer-description"
                        placeholder="Motif du transfert (ex: Remboursement, Cadeau, etc.)"
                        value={transferDescription}
                        onChange={e => setTransferDescription(e.target.value)}
                        className="text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-10"
                        disabled={isSubmittingTransfer || user?.role === 'agent'}
                      />
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 text-blue-600 flex-shrink-0">💡</div>
                        <div className="text-sm text-blue-800">
                          <div className="font-medium mb-1">Avantages du transfert :</div>
                          <ul className="space-y-1 text-xs">
                            <li>• Transfert immédiat et sécurisé</li>
                            <li>• Aucun frais de transaction</li>
                            <li>• Confirmation instantanée</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 p-4 border-t bg-gray-50">
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 h-11"
                        disabled={isSubmittingTransfer}
                        onClick={() => {
                          if (!isSubmittingTransfer) {
                            setIsTransferDialogOpen(false);
                            setTransferPhone("");
                            setTransferAmount("");
                            setTransferDescription("");
                            setVerifiedUser(null);
                          }
                        }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 h-11 font-medium" 
                        onClick={handleTransfer} 
                        disabled={isSubmittingTransfer || !transferPhone || !transferAmount || !verifiedUser || Number(transferAmount) < 1000 || user?.role === 'agent'}
                      >
                        {isSubmittingTransfer ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Transfert en cours...</span>
                          </div>
                        ) : (
                          `Transférer ${transferAmount ? formatCurrency(Number(transferAmount)) : ''}`
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
          
          {/* Acheter un lot */}
          <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-green-50 to-emerald-100 border-green-200" onClick={() => navigate('/lots')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="mx-auto mb-2 p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full w-fit shadow-md">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold mb-1 text-green-700">Acheter lot</h3>
              <p className="text-xs text-green-600 hidden sm:block">Nouveau lot</p>
            </CardContent>
          </Card>

          {/* Mon équipe */}
          <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200" onClick={() => navigate('/team')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="mx-auto mb-2 p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full w-fit shadow-md">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold mb-1 text-amber-700">Équipe</h3>
              <p className="text-xs text-amber-600">{user.referralCode}</p>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="shadow-card hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-violet-50 to-purple-100 border-violet-200" onClick={() => window.open('https://t.me/+RmlwXhX1lHswMWE0', '_blank')}>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="mx-auto mb-2 p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full w-fit shadow-md">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold mb-1 text-violet-700">Support</h3>
              <p className="text-xs text-violet-600 hidden sm:block">Aide 24/7</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions - Mobile optimisé */}
        <Card className="shadow-card mt-4 sm:mt-6 mb-8 sm:mb-12 bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200">
          <CardHeader className="pb-3 bg-gradient-to-r from-slate-100 to-gray-200 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 bg-slate-600 rounded-full">
                    <Clock className="h-3 w-3 text-white" />
                  </div>
                  Transactions
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">Dernières activités</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs h-8 text-slate-700 hover:bg-slate-200"
                onClick={() => navigate('/history')}
              >
                Tout voir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            {transactions.length === 0 ? (
              <div className="text-center py-4 sm:py-6 text-muted-foreground">
                <Clock className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 opacity-50" />
                <p className="text-sm sm:text-base">Aucune transaction</p>
                <p className="text-xs sm:text-sm">Achetez un lot pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {transactions.slice(0, 4).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      {getTransactionIcon(transaction.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-xs sm:text-sm truncate">
                            {transaction.type === 'deposit' && 'Dépôt'}
                            {transaction.type === 'withdrawal' && 'Retrait'}
                            {transaction.type === 'earning' && 'Gain'}
                            {transaction.type === 'commission' && 'Commission'}
                            {transaction.type === 'purchase' && 'Achat de lot'}
                            {transaction.type === 'lot_purchase' && 'Achat de lot'}
                            {transaction.type === 'transfer_sent' && 'Transfert'}
                            {transaction.type === 'transfer_received' && 'Transfert reçu'}
                          </p>
                          <div className="hidden sm:block">
                            {getStatusBadge(transaction.status, transaction.type)}
                          </div>
                        </div>
                        {transaction.lotName && (
                          <p className="text-xs text-muted-foreground font-medium truncate">
                            {transaction.lotName}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.createdAt).toLocaleDateString('fr-FR', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <div className="sm:hidden">
                            {getStatusBadge(transaction.status, transaction.type)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-xs sm:text-sm">
                        {formatCurrency(transaction.amount).replace(' FCFA', '')}
                        <span className="text-xs text-muted-foreground block sm:inline sm:ml-1">FCFA</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};