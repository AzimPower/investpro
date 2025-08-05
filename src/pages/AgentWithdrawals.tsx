import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetTransactions, apiUpdateTransaction, apiGetUserById, apiUpdateUser } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { useNotificationManager } from "@/lib/notificationManager";
import { CheckCircle, XCircle, Eye, Clock, CreditCard, User, Calendar, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Type pour les transactions
interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  description?: string;
  lotId?: string;
  paymentMethod?: string;
  paymentProof?: string;
  agentId?: string;
  agentNumber?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  reason?: string;
  userFullName?: string; // Ajouter le nom de l'utilisateur
}

export default function AgentWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<{[key: string]: any}>({}); // Cache des utilisateurs
  const [page, setPage] = useState(1);
  const [pageHistorique, setPageHistorique] = useState(1); // Page séparée pour l'historique
  const pageSize = 5;
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Transaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all'|'pending'|'approved'|'rejected'>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // Ajout d'un état pour empêcher les doubles clics
  const [processingWithdrawals, setProcessingWithdrawals] = useState<Set<string>>(new Set());
  // Pour savoir si on traite une approbation ou un rejet (par retrait)
  const [processingAction, setProcessingAction] = useState<{ [id: string]: 'approve' | 'reject' | null }>({});
  const { toast } = useToast();
  const notifyManager = useNotificationManager();

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer les informations de l'agent connecté
      const currentUserData = localStorage.getItem('currentUser');
      if (!currentUserData) return;
      
      const userData = JSON.parse(currentUserData);
      
      // Charger toutes les transactions depuis l'API MySQL
      const transactions = await apiGetTransactions();
      console.log('API Response (Agent):', transactions);
      
      if (!transactions) {
        console.log('No transactions returned from API');
        setWithdrawals([]);
        return;
      }
      
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
      
      // Tous les retraits, en excluant les propres demandes de l'agent
      const allWithdrawals = transactions.filter(t => {
        if (t.type !== 'withdrawal') return false;
        
        // Empêcher l'agent de voir ses propres demandes de retrait
        const isOwnWithdrawal = String(t.userId) === String(userData.id);
        
        return !isOwnWithdrawal;
      });
      
      // Enrichir avec les noms d'utilisateur
      const enrichedWithdrawals = allWithdrawals.map(withdrawal => ({
        ...withdrawal,
        userFullName: usersCache[withdrawal.userId]?.fullName || `Utilisateur ${withdrawal.userId}`
      }));
      
      // Trier du plus récent au plus ancien
      enrichedWithdrawals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log('Filtered withdrawals (Agent):', enrichedWithdrawals);
      setWithdrawals(enrichedWithdrawals);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des retraits",
        variant: "destructive"
      });
      setWithdrawals([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Si validé, ne fait rien (déjà débité à la demande). Si rejeté, recrédite le solde utilisateur.
  const approveWithdrawal = async (id: string) => {
    // Vérifier si le retrait est déjà en cours de traitement
    if (processingWithdrawals.has(id)) {
      toast({
        title: "Action en cours",
        description: "Ce retrait est déjà en cours de traitement.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Ajouter l'ID à la liste des retraits en cours de traitement
      setProcessingWithdrawals(prev => new Set(prev).add(id));
      setProcessingAction(prev => ({ ...prev, [id]: 'approve' }));

      // Vérifier à nouveau le statut de la transaction
      const currentTransaction = withdrawals.find(w => w.id === id);
      if (!currentTransaction) {
        throw new Error('Transaction non trouvée');
      }

      if (currentTransaction.status !== 'pending') {
        throw new Error('Cette transaction a déjà été traitée');
      }

      await apiUpdateTransaction({
        id,
        action: 'update',
        status: 'approved',
        processedAt: new Date().toISOString(),
        processedBy: 'agent'
      });
      
      toast({
        title: "Retrait approuvé",
        description: "Le retrait a été approuvé avec succès",
      });
      
      // Notification à l'utilisateur que son retrait a été approuvé
      await notifyManager.transaction.withdrawal(
        Number(currentTransaction.userId),
        Number(currentTransaction.amount),
        'approved'
      );
      
      setSelectedWithdrawal(null);
      setRejectReason('');
      loadWithdrawals();
    } catch (error) {
      console.error('Erreur lors de l\'approbation du retrait:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'approbation du retrait",
        variant: "destructive"
      });
    } finally {
      // Retirer l'ID de la liste des retraits en cours de traitement
      setProcessingWithdrawals(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setProcessingAction(prev => ({ ...prev, [id]: null }));
    }
  };

  const rejectWithdrawal = async (id: string, reason?: string) => {
    // Vérifier si le retrait est déjà en cours de traitement
    if (processingWithdrawals.has(id)) {
      toast({
        title: "Action en cours",
        description: "Ce retrait est déjà en cours de traitement.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Ajouter l'ID à la liste des retraits en cours de traitement
      setProcessingWithdrawals(prev => new Set(prev).add(id));
      setProcessingAction(prev => ({ ...prev, [id]: 'reject' }));

      // Vérifier à nouveau le statut de la transaction
      const currentTransaction = withdrawals.find(w => w.id === id);
      if (!currentTransaction) {
        throw new Error('Transaction non trouvée');
      }

      if (currentTransaction.status !== 'pending') {
        throw new Error('Cette transaction a déjà été traitée');
      }

      await apiUpdateTransaction({
        id,
        action: 'update',
        status: 'rejected',
        processedAt: new Date().toISOString(),
        processedBy: 'agent',
        reason
      });
      
      // Remboursement du solde si rejeté
      const transaction = withdrawals.find(w => w.id === id);
      if (transaction) {
        const user = await apiGetUserById(parseInt(transaction.userId));
        if (user) {
          const currentBalance = parseFloat(user.balance || '0');
          const refundAmount = parseFloat(String(transaction.amount || '0'));
          const newBalance = (currentBalance + refundAmount).toFixed(2);
          
          await apiUpdateUser({
            id: user.id,
            action: 'update',
            balance: newBalance
          });
        }
      }
      
      toast({
        title: "Retrait rejeté",
        description: "Le retrait a été rejeté et le montant a été remboursé",
      });
      
      // Notification à l'utilisateur que son retrait a été rejeté
      await notifyManager.transaction.withdrawal(
        Number(transaction.userId),
        Number(transaction.amount),
        'rejected'
      );
      
      setSelectedWithdrawal(null);
      setRejectReason('');
      loadWithdrawals();
    } catch (error) {
      console.error('Erreur lors du rejet du retrait:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du rejet du retrait",
        variant: "destructive"
      });
    } finally {
      // Retirer l'ID de la liste des retraits en cours de traitement
      setProcessingWithdrawals(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      setProcessingAction(prev => ({ ...prev, [id]: null }));
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
  const filteredWithdrawals = withdrawals.filter(d => {
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
          String(d.amount || ''),
          d.amount ? d.amount.toString() : '',
        ].join(' ').toLowerCase();
        
        matchSearch = searchableText.includes(searchLower);
      }
      
      return matchStatus && matchMethod && matchSearch;
    } catch (error) {
      console.error('Erreur dans le filtrage:', error);
      return true;
    }
  });

  const pendingWithdrawals = filteredWithdrawals.filter(d => d.status === 'pending');
  const processedWithdrawals = filteredWithdrawals.filter(d => d.status !== 'pending');
  
  // Pagination séparée pour chaque section
  const paginatedPending = pendingWithdrawals.slice((page-1)*pageSize, page*pageSize);
  const paginatedProcessed = processedWithdrawals.slice((pageHistorique-1)*pageSize, pageHistorique*pageSize);

  // Pour la liste des méthodes de paiement disponibles
  const paymentMethods = Array.from(new Set(withdrawals.map(d => d.paymentMethod).filter(Boolean)));

  if (isLoading) {
    return (
      <>
        <Navigation userRole="agent" />
        <div className="p-6 flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement des retraits...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation userRole="agent" />
      <div className="p-2 sm:p-6 space-y-3 sm:space-y-6 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] mb-16 sm:mb-24">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 bg-white/80 rounded-lg shadow-md p-3 sm:p-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text text-center sm:text-left">Retraits</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              <Button 
                onClick={loadWithdrawals}
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

        {/* Pending Withdrawals */}
        <Card className="bg-white/90 backdrop-blur-sm border-orange-200 shadow-lg">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-orange-600 text-lg sm:text-xl flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Retraits en Attente ({pendingWithdrawals.length})
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
                  {search && search.trim() ? (
                    <>
                      <p>Aucun retrait en attente ne correspond à votre recherche.</p>
                      <p className="text-sm mt-2">Essayez un autre terme de recherche.</p>
                    </>
                  ) : (
                    <>
                      <p>Aucun retrait en attente.</p>
                      <p className="text-sm mt-2">Toutes les demandes de retrait sont actuellement traitées ou il n'y a pas de nouvelles demandes.</p>
                    </>
                  )}
                </div>
              ) : (
                paginatedPending.map((wd) => (
                  <div key={wd.id} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-orange-600" />
                        <span className="font-bold text-lg text-orange-600">{formatAmount(wd.amount)}</span>
                      </div>
                      {getStatusBadge(wd.status)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="font-medium">{wd.userFullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span>{new Date(wd.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3 h-3 text-green-600" />
                        <span className="text-green-600 font-medium">À recevoir: {formatAmount(wd.amount * 0.9)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Dialog open={selectedWithdrawal?.id === wd.id} onOpenChange={open => {
                        if (open) setSelectedWithdrawal(wd); else { setSelectedWithdrawal(null); setRejectReason(''); }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={processingWithdrawals.has(wd.id)}
                            className="text-xs"
                          >
                            {processingWithdrawals.has(wd.id) ? 'Traitement...' : <Eye className="w-3 h-3" />}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Détails du Retrait</DialogTitle>
                          </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Montant</label>
                                  <p className="text-lg font-bold">{formatAmount(wd.amount)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Utilisateur</label>
                                  <p className="font-medium">{wd.userFullName}</p>
                                  <p className="text-xs text-muted-foreground">ID: {wd.userId}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Méthode de paiement</label>
                                  <p>{wd.paymentMethod || 'Non spécifiée'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Date</label>
                                  <p>{new Date(wd.createdAt).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div className="col-span-2">
                                  <label className="text-sm font-medium">Montant à recevoir (après 10% de frais)</label>
                                  <p className="text-lg font-semibold text-green-700">{formatAmount(wd.amount * 0.9)}</p>
                                </div>
                              </div>
                              {wd.paymentProof && (
                                <div>
                                  <label className="text-sm font-medium">Preuve de paiement</label>
                                  <div className="mt-2 p-4 bg-muted rounded">
                                    <p className="text-sm">{wd.paymentProof}</p>
                                  </div>
                                </div>
                              )}
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
                    <TableHead>Méthode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {search && search.trim() ? (
                            <>
                              <p>Aucun retrait en attente ne correspond à votre recherche.</p>
                              <p className="text-sm mt-2">Essayez un autre terme de recherche.</p>
                            </>
                          ) : (
                            <>
                              <p>Aucun retrait en attente.</p>
                              <p className="text-sm mt-2">Toutes les demandes de retrait sont actuellement traitées ou il n'y a pas de nouvelles demandes.</p>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPending.map((wd) => (
                      <TableRow key={wd.id}>
                        <TableCell>{new Date(wd.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="font-medium">{wd.userFullName}</TableCell>
                        <TableCell className="font-medium">{formatAmount(wd.amount)}</TableCell>
                        <TableCell>{wd.paymentMethod || '-'}</TableCell>
                        <TableCell>{getStatusBadge(wd.status)}</TableCell>
                        <TableCell>
                          <Dialog open={selectedWithdrawal?.id === wd.id} onOpenChange={open => {
                            if (open) setSelectedWithdrawal(wd); else { setSelectedWithdrawal(null); setRejectReason(''); }
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled={processingWithdrawals.has(wd.id)}
                              >
                                {processingWithdrawals.has(wd.id) ? 'Traitement...' : 'Détails'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Montant</label>
                                    <p className="text-lg font-bold">{formatAmount(wd.amount)}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Utilisateur</label>
                                    <p className="font-medium">{wd.userFullName}</p>
                                    <p className="text-xs text-muted-foreground">ID: {wd.userId}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Méthode de paiement</label>
                                    <p>{wd.paymentMethod || 'Non spécifiée'}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Date</label>
                                    <p>{new Date(wd.createdAt).toLocaleDateString('fr-FR')}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-sm font-medium">Montant à recevoir (après 10% de frais)</label>
                                    <p className="text-lg font-semibold text-green-700">{formatAmount(wd.amount * 0.9)}</p>
                                  </div>
                                </div>
                                {wd.paymentProof && (
                                  <div>
                                    <label className="text-sm font-medium">Preuve de paiement</label>
                                    <div className="mt-2 p-4 bg-muted rounded">
                                      <p className="text-sm">{wd.paymentProof}</p>
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <p className="text-sm text-muted-foreground">{wd.description}</p>
                                </div>
                                <div className="flex space-x-2">
                                  <Button 
                                    onClick={() => approveWithdrawal(wd.id)} 
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
                                    disabled={processingWithdrawals.has(wd.id)}
                                  >
                                    {processingWithdrawals.has(wd.id)
                                      ? (processingAction[wd.id] === 'approve' ? 'Traitement...' : 'Approuver')
                                      : 'Approuver'}
                                  </Button>
                                  <Button 
                                    onClick={() => rejectWithdrawal(wd.id, rejectReason)} 
                                    variant="destructive" 
                                    className="flex-1"
                                    disabled={processingWithdrawals.has(wd.id)}
                                  >
                                    {processingWithdrawals.has(wd.id)
                                      ? (processingAction[wd.id] === 'reject' ? 'Traitement...' : 'Rejeter')
                                      : 'Rejeter'}
                                  </Button>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Motif de rejet (optionnel)</label>
                                  <Textarea
                                    placeholder="Raison du rejet..."
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    disabled={processingWithdrawals.has(wd.id)}
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

            {/* Pagination controls for pending */}
            {pendingWithdrawals.length > pageSize && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Affichage de {((page-1)*pageSize)+1} à {Math.min(page*pageSize, pendingWithdrawals.length)} sur {pendingWithdrawals.length} retraits en attente
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page-1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-2 py-1 text-sm">Page {page} sur {Math.ceil(pendingWithdrawals.length/pageSize)}</span>
                  <Button size="sm" variant="outline" disabled={page*pageSize >= pendingWithdrawals.length} onClick={() => setPage(page+1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Processed Withdrawals */}
        <Card className="bg-white/90 backdrop-blur-sm border-blue-200 shadow-lg">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-blue-600 text-lg sm:text-xl flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Historique des Retraits ({processedWithdrawals.length})
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
                  {search && search.trim() ? (
                    <>
                      <p>Aucun historique ne correspond à votre recherche.</p>
                      <p className="text-sm mt-2">Essayez un autre terme de recherche.</p>
                    </>
                  ) : (
                    <>
                      <p>Aucun historique.</p>
                      <p className="text-sm mt-2">Les retraits approuvés ou rejetés apparaîtront ici.</p>
                    </>
                  )}
                </div>
              ) : (
                paginatedProcessed.map((wd) => (
                  <div key={wd.id} className={`rounded-lg p-3 border shadow-sm ${
                    wd.status === 'approved' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
                    wd.status === 'rejected' ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200' :
                    'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ArrowDown className={`w-4 h-4 ${
                          wd.status === 'approved' ? 'text-green-600' :
                          wd.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                        }`} />
                        <span className={`font-bold text-lg ${
                          wd.status === 'approved' ? 'text-green-600' :
                          wd.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                        }`}>{formatAmount(wd.amount)}</span>
                      </div>
                      {getStatusBadge(wd.status)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="font-medium">{wd.userFullName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span>{new Date(wd.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      {wd.processedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-blue-500" />
                          <span className="text-blue-600">Traité le {new Date(wd.processedAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
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
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          {search && search.trim() ? (
                            <>
                              <p>Aucun historique ne correspond à votre recherche.</p>
                              <p className="text-sm mt-2">Essayez un autre terme de recherche.</p>
                            </>
                          ) : (
                            <>
                              <p>Aucun historique.</p>
                              <p className="text-sm mt-2">Les retraits approuvés ou rejetés apparaîtront ici.</p>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProcessed.map((wd) => (
                      <TableRow key={wd.id}>
                        <TableCell>{new Date(wd.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="font-medium">{wd.userFullName}</TableCell>
                        <TableCell className="font-medium">{formatAmount(wd.amount)}</TableCell>
                        <TableCell>{getStatusBadge(wd.status)}</TableCell>
                        <TableCell>{wd.processedAt ? new Date(wd.processedAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                        <TableCell>{wd.processedBy ? wd.processedBy.replace('+226', '') : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls for historique */}
            {processedWithdrawals.length > pageSize && (
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Affichage de {((pageHistorique-1)*pageSize)+1} à {Math.min(pageHistorique*pageSize, processedWithdrawals.length)} sur {processedWithdrawals.length} dans l'historique
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" disabled={pageHistorique === 1} onClick={() => setPageHistorique(pageHistorique-1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="px-2 py-1 text-sm">Page {pageHistorique} sur {Math.ceil(processedWithdrawals.length/pageSize)}</span>
                  <Button size="sm" variant="outline" disabled={pageHistorique*pageSize >= processedWithdrawals.length} onClick={() => setPageHistorique(pageHistorique+1)}>
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
