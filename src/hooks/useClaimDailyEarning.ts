import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';

interface ClaimDailyEarningParams {
  user: any;
  currentEarning: number;
  userActiveLot: any;
  activeUserLot: any;
  setLastClaimDate: (date: string) => void;
}

export function useClaimDailyEarning() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ user, currentEarning, userActiveLot, activeUserLot }: ClaimDailyEarningParams) => {
      // Ajoute une transaction de gain pour le lot actif via l'API PHP backend
      const res = await fetch('/backend/transactions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          userId: user.id,
          type: 'earning',
          amount: currentEarning,
          status: 'approved',
          description: 'Gain en cours réclamé',
          lotId: userActiveLot?.id,
        })
      });
      
      const result = await res.json();
      if (!result || !result.success) {
        throw new Error(result && result.error ? result.error : "Erreur lors de la transaction");
      }
      
      // Met à jour le solde utilisateur ET le total gagné via l'API PHP backend
      const newBalance = Number(user.balance) + Number(currentEarning);
      const newTotalEarned = Number(user.totalEarned || 0) + Number(currentEarning);
      
      logger.log('Debug réclamation - Nouveaux calculs:', {
        newBalance: newBalance,
        newTotalEarned: newTotalEarned,
        isNaN_balance: isNaN(newBalance),
        isNaN_total: isNaN(newTotalEarned)
      });
      
      const updateUserRes = await fetch('/backend/users.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          balance: newBalance,
          totalEarned: newTotalEarned,
        })
      });
      
      const updateResult = await updateUserRes.json();
      if (!updateResult || !updateResult.success) {
        throw new Error(updateResult && updateResult.error ? updateResult.error : "Erreur lors de la mise à jour du solde");
      }
      
      // Gestion des commissions de parrainage
      await handleCommissions(user, currentEarning, userActiveLot);
      
      // Sauvegarde la date de réclamation dans la base de données
      const now = new Date();
      await fetch('/backend/user_lots.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateLastEarning',
          userId: user.id,
          lotId: userActiveLot?.id,
          lastEarningDate: now.toISOString(),
        })
      });
      
      return { success: true, lastEarningDate: now.toISOString() };
    },
    
    onSuccess: (data, variables) => {
      // Invalider les caches pour refléter les changements
      queryClient.invalidateQueries({ queryKey: ['user', variables.user.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.user.id] });
      
      variables.setLastClaimDate(data.lastEarningDate);
      
      toast({
        title: "Gain réclamé !",
        description: "Votre gain journalier a été ajouté à votre solde.",
      });
      
      logger.log('Debug - Cache invalidé, utilisateur mis à jour');
    },
    
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de réclamer le gain en cours.",
        variant: "destructive",
      });
    }
  });
}

async function handleCommissions(user: any, currentEarning: number, userActiveLot: any) {
  // --- COMMISSIONS DE PARRAINAGE SUR GAIN JOURNALIER ---
  logger.log('Début gestion commissions:', { userId: user.id, currentEarning, userFullName: user.fullName });
  
  // Chercher le parrain direct (niveau 1)
  let sponsor1 = null;
  let sponsor2 = null;
  
  if (user.referredBy) {
    logger.log('Recherche du parrain niveau 1:', user.referredBy);
    const sponsor1Res = await fetch(`/backend/users.php?id=${user.referredBy}`);
    sponsor1 = await sponsor1Res.json();
    logger.log('Parrain niveau 1 trouvé:', sponsor1);
    
    if (sponsor1 && sponsor1.referredBy) {
      logger.log('Recherche du parrain niveau 2:', sponsor1.referredBy);
      const sponsor2Res = await fetch(`/backend/users.php?id=${sponsor1.referredBy}`);
      sponsor2 = await sponsor2Res.json();
      logger.log('Parrain niveau 2 trouvé:', sponsor2);
    }
  } else {
    logger.log('Aucun parrain trouvé pour cet utilisateur');
  }
  
  // Commission niveau 1 : 5% sur le gain journalier
  if (sponsor1 && sponsor1.id) {
    const commission1 = Number(currentEarning) * 0.05;
    logger.log('Commission niveau 1 calculée:', { sponsor1Id: sponsor1.id, commission1, sponsor1Name: sponsor1.fullName });
    
    const sponsor1NewBalance = Number(sponsor1.balance) + commission1;
    const sponsor1NewTotalEarned = Number(sponsor1.totalEarned || 0) + commission1;
    
    const sponsor1UpdateRes = await fetch('/backend/users.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sponsor1.id,
        balance: sponsor1NewBalance,
        totalEarned: sponsor1NewTotalEarned,
      })
    });
    
    const sponsor1UpdateResult = await sponsor1UpdateRes.json();
    if (!sponsor1UpdateResult || !sponsor1UpdateResult.success) {
      logger.warn('Erreur lors de la mise à jour du sponsor 1:', sponsor1UpdateResult?.error);
    }
    
    await fetch('/backend/transactions.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        userId: sponsor1.id,
        type: 'commission',
        amount: commission1,
        status: 'approved',
        description: `Commission de parrainage (5%) sur gain journalier de ${user.fullName}`,
        lotId: userActiveLot?.id,
      })
    });
  }
  
  // Commission niveau 2 : 2% sur le gain journalier
  if (sponsor2 && sponsor2.id) {
    const commission2 = Number(currentEarning) * 0.02;
    logger.log('Commission niveau 2 calculée:', { sponsor2Id: sponsor2.id, commission2, sponsor2Name: sponsor2.fullName });
    
    const sponsor2NewBalance = Number(sponsor2.balance) + commission2;
    const sponsor2NewTotalEarned = Number(sponsor2.totalEarned || 0) + commission2;
    
    const sponsor2UpdateRes = await fetch('/backend/users.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sponsor2.id,
        balance: sponsor2NewBalance,
        totalEarned: sponsor2NewTotalEarned,
      })
    });
    
    const sponsor2UpdateResult = await sponsor2UpdateRes.json();
    if (!sponsor2UpdateResult || !sponsor2UpdateResult.success) {
      logger.warn('Erreur lors de la mise à jour du sponsor 2:', sponsor2UpdateResult?.error);
    }
    
    await fetch('/backend/transactions.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        userId: sponsor2.id,
        type: 'commission',
        amount: commission2,
        status: 'approved',
        description: `Commission de parrainage (2%) sur gain journalier de ${user.fullName}`,
        lotId: userActiveLot?.id,
      })
    });
  }
}
