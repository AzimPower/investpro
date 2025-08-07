import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetTransactions, apiUpdateTransaction, apiGetUserById, apiUpdateUser } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";
import { useNotificationManager } from "@/lib/notificationManager";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Eye, Clock, CreditCard, User, Calendar, Gem, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Variable globale pour empêcher les actions multiples sur les mêmes dépôts
const globalProcessingDeposits = new Set<string>();

export default function AgentDeposits() {
  interface Transaction {
    id: string;
    userId: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    type: string;
    createdAt: string;
    processedAt?: string;
    processedBy?: string;
    agentNumber?: string;
    lotId?: string;
    paymentMethod?: string;
    paymentProof?: string;
    description?: string;
    reason?: string;
    userFullName?: string;
  }

  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<{[key: string]: any}>({});
  const [agentNumber, setAgentNumber] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageHistorique, setPageHistorique] = useState(1);
  const pageSize = 5;
  const [selectedDeposit, setSelectedDeposit] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'approved'|'rejected'>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // Ajout d'un état pour empêcher les doubles clics
  const [processingDeposits, setProcessingDeposits] = useState<Set<string>>(new Set());
  // Pour savoir si on traite une approbation ou un rejet (par dépôt)
  const [processingAction, setProcessingAction] = useState<{ [id: string]: 'approve' | 'reject' | null }>({});
  const { toast } = useToast();
  const notifyManager = useNotificationManager();

  useEffect(() => {
    loadDeposits();
  }, []);

  const loadDeposits = async () => {
    try {
      setIsLoading(true);
      const currentUserData = localStorage.getItem('currentUser');
      if (!currentUserData) return;
      
      const userData = JSON.parse(currentUserData);
      const agent = await apiGetUserById(userData.id);
      if (!agent || !agent.agentNumber) return;
      
      setAgentNumber(agent.agentNumber);
      
      // Charger toutes les transactions
      const transactions = await apiGetTransactions();
      if (!transactions) return;
      
      // Charger tous les utilisateurs pour récupérer les noms
      const allUsersRes = await fetch('/backend/users.php');
      const allUsers = await allUsersRes.json();
      
      // Créer un cache des utilisateurs par ID
      const usersCache: {[key: string]: any} = {};
      if (Array.isArray(allUsers)) {
        allUsers.forEach(user => {
          usersCache[user.id] = user;
        });
      }
      setUsers(usersCache);
      
      // Nettoyer le numéro d'agent pour la comparaison
      const cleanAgentNumber = agent.agentNumber.replace('+226', '');
      
      // Filtrer tous les dépôts de cet agent, en excluant ses propres demandes
      const agentDeposits = transactions.filter(t => {
        if (t.type !== 'deposit') return false;
        
        // Comparer avec et sans préfixe
        const depositAgentNumber = String(t.agentNumber || '').replace('+226', '');
        const isAgentDeposit = depositAgentNumber === cleanAgentNumber;
        
        // Empêcher l'agent de voir ses propres demandes de dépôt
        const isOwnDeposit = String(t.userId) === String(userData.id);
        
        return isAgentDeposit && !isOwnDeposit;
      });
      
      // Enrichir avec les noms d'utilisateur
      const enrichedDeposits = agentDeposits.map(deposit => ({
        ...deposit,
        userFullName: usersCache[deposit.userId]?.fullName || `Utilisateur ${deposit.userId}`
      }));
      
      // Trier du plus ancien au plus récent
      enrichedDeposits.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      setDeposits(enrichedDeposits);
    } catch (error) {
      console.error('Error loading deposits:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des dépôts",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Met à jour le solde utilisateur lors de l'approbation ou du rejet d'un dépôt
  const approveDeposit = async (id: string) => {
    // Vérifier si le dépôt est déjà en cours de traitement (local + global)
    if (processingDeposits.has(id) || globalProcessingDeposits.has(id)) {
      toast({
        title: "Action en cours",
        description: "Ce dépôt est déjà en cours de traitement.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Ajouter l'ID aux deux listes de protection
      setProcessingDeposits(prev => new Set(prev).add(id));
      globalProcessingDeposits.add(id);
      setProcessingAction(prev => ({ ...prev, [id]: 'approve' }));

      console.log(`🔄 Début approbation dépôt ${id}`);

      // Vérifier à nouveau le statut de la transaction depuis la base de données
      const currentTransaction = deposits.find(d => d.id === id);
      if (!currentTransaction) {
        throw new Error('Transaction non trouvée');
      }

      // Vérifier si elle n'a pas déjà été traitée
      if (currentTransaction.status !== 'pending') {
        throw new Error('Cette transaction a déjà été traitée');
      }

      // Récupérer la transaction fraîche depuis la base de données pour éviter les conflits de concurrence
      const allTransactions = await apiGetTransactions();
      const freshTransaction = allTransactions?.find(t => t.id === id);
      
      if (!freshTransaction) {
        throw new Error('Transaction non trouvée dans la base de données');
      }

      if (freshTransaction.status !== 'pending') {
        throw new Error('Cette transaction a déjà été traitée par un autre agent');
      }

      // Récupérer l'utilisateur
      const user = await apiGetUserById(Number(freshTransaction.userId));
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // S'assurer que les valeurs sont bien des nombres avec 2 décimales
      const currentBalance = parseFloat(user.balance || '0');
      const amount = parseFloat(String(freshTransaction.amount || '0'));
      
      // Calculer le nouveau solde avec précision
      const calculatedBalance = currentBalance + amount;
      
      if (isNaN(calculatedBalance)) {
        throw new Error('Erreur de calcul du nouveau solde');
      }
      
      const newBalance = calculatedBalance.toFixed(2);

      console.log(`💰 Mise à jour transaction ${id} et solde utilisateur ${freshTransaction.userId}`);

      // Mettre à jour la transaction d'abord
      await apiUpdateTransaction({ 
        id, 
        action: 'update',
        status: 'approved', 
        processedAt: new Date().toISOString(), 
        processedBy: agentNumber 
      });

      // Puis mettre à jour le solde de l'utilisateur
      await apiUpdateUser({
        id: user.id,
        action: 'update',
        balance: newBalance.toString()
      });

      setSelectedDeposit(null);
      setRejectReason('');
      await loadDeposits();
      
      console.log(`📧 Envoi notification pour dépôt ${id} approuvé`);

      // Notification à l'utilisateur que son dépôt a été approuvé - UNE SEULE FOIS
      try {
        await notifyManager.transaction.deposit(
          Number(freshTransaction.userId),
          Number(freshTransaction.amount),
          'approved'
        );
        console.log(`✅ Notification envoyée avec succès pour dépôt ${id}`);
      } catch (notificationError) {
        console.error('❌ Erreur lors de l\'envoi de la notification:', notificationError);
        // Ne pas faire échouer toute l'opération à cause d'une erreur de notification
      }
      
      toast({
        title: "Dépôt approuvé",
        description: "Le dépôt a été approuvé avec succès.",
        variant: "default"
      });

      console.log(`✅ Approbation dépôt ${id} terminée avec succès`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'approbation du dépôt ${id}:`, error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'approbation du dépôt.",
        variant: "destructive"
      });
    } finally {
      // Retirer l'ID des deux listes de protection
      setProcessingDeposits(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      globalProcessingDeposits.delete(id);
      setProcessingAction(prev => ({ ...prev, [id]: null }));
      console.log(`🔓 Dépôt ${id} retiré de la protection`);
    }
  };

  const rejectDeposit = async (id: string, reason?: string) => {
    // Vérifier si le dépôt est déjà en cours de traitement (local + global)
    if (processingDeposits.has(id) || globalProcessingDeposits.has(id)) {
      toast({
        title: "Action en cours",
        description: "Ce dépôt est déjà en cours de traitement.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Ajouter l'ID aux deux listes de protection
      setProcessingDeposits(prev => new Set(prev).add(id));
      globalProcessingDeposits.add(id);
      setProcessingAction(prev => ({ ...prev, [id]: 'reject' }));

      console.log(`🔄 Début rejet dépôt ${id}`);

      // Récupérer la transaction fraîche depuis la base de données pour éviter les conflits de concurrence
      const allTransactions = await apiGetTransactions();
      const freshTransaction = allTransactions?.find(t => t.id === id);
      
      if (!freshTransaction) {
        throw new Error('Transaction non trouvée dans la base de données');
      }

      if (freshTransaction.status !== 'pending') {
        throw new Error('Cette transaction a déjà été traitée par un autre agent');
      }

      console.log(`🚫 Mise à jour transaction ${id} comme rejetée`);

      await apiUpdateTransaction({ 
        id, 
        action: 'update',
        status: 'rejected', 
        processedAt: new Date().toISOString(), 
        processedBy: agentNumber, 
        reason 
      });
      
      setSelectedDeposit(null);
      setRejectReason('');
      await loadDeposits();
      
      console.log(`📧 Envoi notification pour dépôt ${id} rejeté`);

      // Notification à l'utilisateur que son dépôt a été rejeté - UNE SEULE FOIS
      try {
        await notifyManager.transaction.deposit(
          Number(freshTransaction.userId),
          Number(freshTransaction.amount),
          'rejected'
        );
        console.log(`✅ Notification envoyée avec succès pour dépôt ${id}`);
      } catch (notificationError) {
        console.error('❌ Erreur lors de l\'envoi de la notification:', notificationError);
        // Ne pas faire échouer toute l'opération à cause d'une erreur de notification
      }
      
      toast({
        title: "Dépôt rejeté",
        description: reason ? `Le dépôt a été rejeté. Motif: ${reason}` : "Le dépôt a été rejeté.",
        variant: "default"
      });

      console.log(`✅ Rejet dépôt ${id} terminé avec succès`);
    } catch (error) {
      console.error(`❌ Erreur lors du rejet du dépôt ${id}:`, error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors du rejet du dépôt.",
        variant: "destructive"
      });
    } finally {
      // Retirer l'ID des deux listes de protection
      setProcessingDeposits(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      globalProcessingDeposits.delete(id);
      setProcessingAction(prev => ({ ...prev, [id]: null }));
      console.log(`🔓 Dépôt ${id} retiré de la protection`);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive'
    } as const;
    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      rejected: 'Rejeté'
    };
    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>;
  };

  // Filtrage + recherche amélioré
  const filteredDeposits = deposits.filter(d => {
    try {
      const matchStatus = filterStatus === 'all' || d.status === filterStatus;
      const matchMethod = filterMethod === 'all' || d.paymentMethod === filterMethod;
      
      let matchSearch = true;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        
        // Recherche dans les champs texte
        const searchableText = [
          d.userFullName || '',
          d.userId || '',
          d.paymentProof || '',
          d.paymentMethod || '',
          d.description || '',
          String(d.amount || ''), // Recherche directe sur le montant numérique
          d.amount ? d.amount.toString() : '', // Version string du montant
        ].join(' ').toLowerCase();
        
        matchSearch = searchableText.includes(searchLower);
        
        // Debug pour voir ce qui est recherché
        console.log('Recherche:', searchLower);
        console.log('Texte searchable:', searchableText);
        console.log('Match trouvé:', matchSearch);
      }
      
      const finalMatch = matchStatus && matchMethod && matchSearch;
      
      // Debug final
      if (search && search.trim()) {
        console.log(`Élément ${d.id}:`, {
          matchStatus,
          matchMethod,
          matchSearch,
          finalMatch,
          userFullName: d.userFullName,
          amount: d.amount
        });
      }
      
      return finalMatch;
    } catch (error) {
      console.error('Erreur dans le filtrage:', error);
      return true; // En cas d'erreur, afficher l'élément
    }
  });

  console.log('Dépôts filtrés:', filteredDeposits.length, 'sur', deposits.length);
  console.log('Terme de recherche actuel:', search);

  const pendingDeposits = filteredDeposits.filter(d => d.status === 'pending');
  // Pour l'historique, on veut les plus récents en haut (nouveaux en haut)
  const processedDeposits = filteredDeposits
    .filter(d => d.status !== 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Pagination séparée pour chaque section
  const paginatedPending = pendingDeposits.slice((page-1)*pageSize, page*pageSize);
  const paginatedProcessed = processedDeposits.slice((pageHistorique-1)*pageSize, pageHistorique*pageSize);

  // Pour la liste des méthodes de paiement disponibles
  const paymentMethods = Array.from(new Set(deposits.map(d => d.paymentMethod).filter(Boolean)));

  if (isLoading) {
    return (
      <>
        <Navigation userRole="agent" />
        <div className="p-6 flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement des dépôts...</p>
          </div>
        </div>
      </>
    );
  }

  // Helper pour afficher la date avec heure et secondes
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      <Navigation userRole="agent" />
      <div className="p-2 sm:p-6 space-y-3 sm:space-y-6 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] mb-16 sm:mb-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 bg-white/80 rounded-lg shadow-md p-3 sm:p-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text text-center sm:text-left">Dépôts</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <Button 
                onClick={loadDeposits}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                ↻
              </Button>
              <input
                type="text"
                className="flex-1 sm:w-48 border rounded px-2 py-1 text-sm"
                placeholder="Rechercher..."
                value={search}
                onChange={e => { 
                  setSearch(e.target.value); 
                  setPage(1); 
                  setPageHistorique(1);
                }}
              />
            </div>
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <select
                className="flex-1 sm:flex-none border rounded px-2 py-1 text-xs sm:text-sm"
                value={filterStatus}
                onChange={e => { 
                  setFilterStatus(e.target.value as any); 
                  setPage(1); 
                  setPageHistorique(1);
                }}
              >
                <option value="all">Tous</option>
                <option value="pending">Attente</option>
                <option value="approved">Approuvé</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pending Deposits */}
        <Card className="bg-white/90 backdrop-blur-sm border-orange-200 shadow-lg">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-orange-600 text-lg sm:text-xl flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Dépôts en Attente ({pendingDeposits.length})
              {search && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  - Résultats de recherche
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Mobile Layout */}
            <div className="block lg:hidden space-y-3">
              {paginatedPending.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search && search.trim() ? 'Aucun dépôt en attente ne correspond à votre recherche.' : 'Aucun dépôt en attente.'}
                </div>
              ) : (
                paginatedPending.map((dep) => (
                  <div key={dep.id} className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-3 border border-orange-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-orange-600" />
                        <span className="font-bold text-lg text-orange-600">{formatAmount(dep.amount)}</span>
                      </div>
                      {getStatusBadge(dep.status)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="font-medium">{dep.userFullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span>{formatDateTime(dep.createdAt)}</span>
                      </div>
                      {dep.lotId && (
                        <div className="flex items-center gap-2">
                          <Gem className="w-3 h-3 text-gray-500" />
                          <span>Lot {dep.lotId}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Dialog open={selectedDeposit?.id === dep.id} onOpenChange={open => {
                        if (open) setSelectedDeposit(dep); else { setSelectedDeposit(null); setRejectReason(''); }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)}
                            className="text-xs"
                          >
                            {(processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)) ? 'Traitement...' : <Eye className="w-3 h-3" />}
                          </Button>
                        </DialogTrigger>
                        <DialogContent aria-describedby="deposit-details-description">
                          <DialogHeader>
                            <DialogTitle>Détails du Dépôt</DialogTitle>
                          </DialogHeader>
                          <div id="deposit-details-description" className="sr-only">
                            Détails de la transaction de dépôt, incluant le montant, l'utilisateur et les options d'approbation ou de rejet
                          </div>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Montant</label>
                                  <p className="text-lg font-bold">{formatAmount(dep.amount)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Utilisateur</label>
                                  <p className="font-medium">{dep.userFullName}</p>
                                  <p className="text-xs text-muted-foreground">ID: {dep.userId}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Méthode de paiement</label>
                                  <p>{dep.paymentMethod || 'Non spécifiée'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Lot</label>
                                  <p>{dep.lotId || 'Recharge simple'}</p>
                                </div>
                              </div>
                              {dep.paymentProof && (
                                <div>
                                  <label className="text-sm font-medium">Preuve de paiement</label>
                                  <div className="mt-2 p-4 bg-muted rounded">
                                    <p className="text-sm">{dep.paymentProof}</p>
                                  </div>
                                </div>
                              )}
                              <div>
                                <label className="text-sm font-medium">Description</label>
                                <p className="text-sm text-muted-foreground">{dep.description}</p>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  onClick={() => {
                                    if (!processingDeposits.has(dep.id) && !globalProcessingDeposits.has(dep.id)) {
                                      approveDeposit(dep.id);
                                    }
                                  }} 
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
                                  disabled={processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)}
                                >
                                  {processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)
                                    ? (processingAction[dep.id] === 'approve' ? 'Traitement...' : 'Approuver')
                                    : 'Approuver'}
                                </Button>
                                <Button 
                                  onClick={() => {
                                    if (!processingDeposits.has(dep.id) && !globalProcessingDeposits.has(dep.id)) {
                                      rejectDeposit(dep.id, rejectReason);
                                    }
                                  }} 
                                  variant="destructive" 
                                  className="flex-1"
                                  disabled={processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)}
                                >
                                  {processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)
                                    ? (processingAction[dep.id] === 'reject' ? 'Traitement...' : 'Rejeter')
                                    : 'Rejeter'}
                                </Button>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Motif de rejet (optionnel)</label>
                                <Textarea
                                  placeholder="Raison du rejet..."
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                  disabled={processingDeposits.has(dep.id)}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPending.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          {search && search.trim() ? 'Aucun dépôt en attente ne correspond à votre recherche.' : 'Aucun dépôt en attente.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPending.map((dep) => (
                        <TableRow key={dep.id}>
                          <TableCell>{formatDateTime(dep.createdAt)}</TableCell>
                          <TableCell className="font-medium">{dep.userFullName}</TableCell>
                          <TableCell className="font-medium">{formatAmount(dep.amount)}</TableCell>
                          <TableCell>{dep.lotId || 'Recharge'}</TableCell>
                          <TableCell>{dep.paymentMethod || '-'}</TableCell>
                          <TableCell>{getStatusBadge(dep.status)}</TableCell>
                          <TableCell>
                            <Dialog open={selectedDeposit?.id === dep.id} onOpenChange={open => {
                              if (open) setSelectedDeposit(dep); else { setSelectedDeposit(null); setRejectReason(''); }
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  disabled={processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)}
                                >
                                  {(processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)) ? 'Traitement...' : 'Détails'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent aria-describedby="deposit-details-description">
                                <DialogHeader>
                                  <DialogTitle>Détails du Dépôt</DialogTitle>
                                </DialogHeader>
                                <div id="deposit-details-description" className="sr-only">
                                  Détails de la transaction de dépôt, incluant le montant, l'utilisateur et les options d'approbation ou de rejet
                                </div>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Montant</label>
                                      <p className="text-lg font-bold">{formatAmount(dep.amount)}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Utilisateur</label>
                                      <p className="font-medium">{dep.userFullName}</p>
                                      <p className="text-xs text-muted-foreground">ID: {dep.userId}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Méthode de paiement</label>
                                      <p>{dep.paymentMethod || 'Non spécifiée'}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Lot</label>
                                      <p>{dep.lotId || 'Recharge simple'}</p>
                                    </div>
                                  </div>
                                  {dep.paymentProof && (
                                    <div>
                                      <label className="text-sm font-medium">Preuve de paiement</label>
                                      <div className="mt-2 p-4 bg-muted rounded">
                                        <p className="text-sm">{dep.paymentProof}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <label className="text-sm font-medium">Description</label>
                                    <p className="text-sm text-muted-foreground">{dep.description}</p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button 
                                      onClick={() => {
                                        if (!processingDeposits.has(dep.id) && !globalProcessingDeposits.has(dep.id)) {
                                          approveDeposit(dep.id);
                                        }
                                      }} 
                                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
                                      disabled={processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)}
                                    >
                                      {processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)
                                        ? (processingAction[dep.id] === 'approve' ? 'Traitement...' : 'Approuver')
                                        : 'Approuver'}
                                    </Button>
                                    <Button 
                                      onClick={() => {
                                        if (!processingDeposits.has(dep.id) && !globalProcessingDeposits.has(dep.id)) {
                                          rejectDeposit(dep.id, rejectReason);
                                        }
                                      }} 
                                      variant="destructive" 
                                      className="flex-1"
                                      disabled={processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)}
                                    >
                                      {processingDeposits.has(dep.id) || globalProcessingDeposits.has(dep.id)
                                        ? (processingAction[dep.id] === 'reject' ? 'Traitement...' : 'Rejeter')
                                        : 'Rejeter'}
                                    </Button>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Motif de rejet (optionnel)</label>
                                    <Textarea
                                      placeholder="Raison du rejet..."
                                      value={rejectReason}
                                      onChange={e => setRejectReason(e.target.value)}
                                      disabled={processingDeposits.has(dep.id)}
                                    />
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

            {/* Pagination controls for pending deposits */}
            {pendingDeposits.length > pageSize && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Affichage de {((page-1)*pageSize)+1} à {Math.min(page*pageSize, pendingDeposits.length)} sur {pendingDeposits.length} dépôts en attente
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page-1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-2 py-1 text-sm">Page {page} sur {Math.ceil(pendingDeposits.length/pageSize)}</span>
                  <Button size="sm" variant="outline" disabled={page*pageSize >= pendingDeposits.length} onClick={() => setPage(page+1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Deposits */}
        <Card className="bg-white/90 backdrop-blur-sm border-blue-200 shadow-lg">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-blue-600 text-lg sm:text-xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Historique des Dépôts ({processedDeposits.length})
              {search && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  - Résultats de recherche
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Mobile Layout */}
            <div className="block lg:hidden space-y-3">
              {paginatedProcessed.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search && search.trim() ? 'Aucun dépôt traité ne correspond à votre recherche.' : 'Aucun dépôt traité.'}
                </div>
              ) : (
                paginatedProcessed.map((dep) => (
                  <div key={dep.id} className={`rounded-lg p-3 border shadow-sm ${
                    dep.status === 'approved' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
                    dep.status === 'rejected' ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200' :
                    'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className={`w-4 h-4 ${
                          dep.status === 'approved' ? 'text-green-600' :
                          dep.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                        }`} />
                        <span className={`font-bold text-lg ${
                          dep.status === 'approved' ? 'text-green-600' :
                          dep.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                        }`}>{formatAmount(dep.amount)}</span>
                      </div>
                      {getStatusBadge(dep.status)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="font-medium">{dep.userFullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span>{formatDateTime(dep.createdAt)}</span>
                      </div>
                      {dep.lotId && (
                        <div className="flex items-center gap-2">
                          <Gem className="w-3 h-3 text-gray-500" />
                          <span>Lot {dep.lotId}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Dialog open={selectedDeposit?.id === dep.id} onOpenChange={open => {
                        if (open) setSelectedDeposit(dep); else { setSelectedDeposit(null); setRejectReason(''); }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-xs"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent aria-describedby="deposit-details-description">
                          <DialogHeader>
                            <DialogTitle>Détails du Dépôt</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Montant</label>
                                <p className="text-lg font-bold">{formatAmount(dep.amount)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Utilisateur</label>
                                <p className="font-medium">{dep.userFullName}</p>
                                <p className="text-xs text-muted-foreground">ID: {dep.userId}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Statut</label>
                                <p>{getStatusBadge(dep.status)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Lot</label>
                                <p>{dep.lotId || 'Recharge simple'}</p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Description</label>
                              <p className="text-sm text-muted-foreground">{dep.description}</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Traité le</TableHead>
                    <TableHead>Traité par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProcessed.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        {search && search.trim() ? 'Aucun historique ne correspond à votre recherche.' : 'Aucun historique.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProcessed.map((dep) => (
                      <TableRow key={dep.id}>
                          <TableCell>{formatDateTime(dep.createdAt)}</TableCell>
                        <TableCell className="font-medium">{dep.userFullName}</TableCell>
                        <TableCell className="font-medium">{formatAmount(dep.amount)}</TableCell>
                        <TableCell>{getStatusBadge(dep.status)}</TableCell>
                        <TableCell>{dep.processedAt ? formatDateTime(dep.processedAt) : '-'}</TableCell>
                        <TableCell>{dep.processedBy ? dep.processedBy.replace('+226', '') : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
              </div>

            {/* Pagination controls for historique */}
            {processedDeposits.length > pageSize && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Affichage de {((pageHistorique-1)*pageSize)+1} à {Math.min(pageHistorique*pageSize, processedDeposits.length)} sur {processedDeposits.length} dans l'historique
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" disabled={pageHistorique === 1} onClick={() => setPageHistorique(pageHistorique-1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-2 py-1 text-sm">Page {pageHistorique} sur {Math.ceil(processedDeposits.length/pageSize)}</span>
                  <Button size="sm" variant="outline" disabled={pageHistorique*pageSize >= processedDeposits.length} onClick={() => setPageHistorique(pageHistorique+1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
