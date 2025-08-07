import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetTransactions, apiUpdateTransaction, apiGetUserById, apiUpdateUser, apiCreateUserLot, apiGetUsers } from '@/lib/api';
import { notificationManager } from '@/lib/notificationManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Eye, Clock, CreditCard, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper pour afficher date + heure + secondes
const formatDateTime = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [filteredDeposits, setFilteredDeposits] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingPage, setPendingPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 5;
  const { toast } = useToast();

  useEffect(() => {
    // Vider le cache localStorage pour forcer l'utilisation de MySQL
    localStorage.removeItem('transactions');
    localStorage.removeItem('users');
    localStorage.removeItem('lots');
    
    loadDeposits();
  }, []);

  useEffect(() => {
    // Filtrer les dépôts en fonction du terme de recherche (nom, montant, date, méthode)
    if (!searchTerm.trim()) {
      setFilteredDeposits(deposits);
    } else {
      try {
        const filtered = deposits.filter(deposit => {
          const user = getUserName(deposit.userId);
          const searchLower = searchTerm.toLowerCase();
          
          // Recherche par nom d'utilisateur
          const matchesUser = user.toLowerCase().includes(searchLower);
          
          // Recherche par ID utilisateur
          const matchesUserId = deposit.userId.toString().includes(searchTerm);
          
          // Recherche par montant
          const matchesAmount = deposit.amount.toString().includes(searchTerm);
          
          // Recherche par méthode de paiement
          const matchesPaymentMethod = deposit.paymentMethod?.toLowerCase().includes(searchLower) || false;
          
          // Recherche par statut
          const matchesStatus = deposit.status.toLowerCase().includes(searchLower);
          
          // Recherche par lot
          const matchesLot = deposit.lotId?.toLowerCase().includes(searchLower) || false;
          
          // Recherche par date (format DD/MM/YYYY ou DD/MM/YY)
          let matchesDate = false;
          let matchesYear = false;
          let matchesMonth = false;
          
          try {
            const createdDate = new Date(deposit.createdAt);
            if (!isNaN(createdDate.getTime())) {
              const dateStr = createdDate.toLocaleDateString('fr-FR');
              matchesDate = dateStr.includes(searchTerm);
              
              // Recherche par année
              const yearStr = createdDate.getFullYear().toString();
              matchesYear = yearStr.includes(searchTerm);
              
              // Recherche par mois (nom du mois en français)
              const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                                 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
              const monthName = monthNames[createdDate.getMonth()];
              matchesMonth = monthName.includes(searchLower);
            }
          } catch (dateError) {
            console.warn('Erreur lors du parsing de date:', dateError);
          }
          
          return matchesUser || matchesUserId || matchesAmount || matchesPaymentMethod || 
                 matchesStatus || matchesLot || matchesDate || matchesYear || matchesMonth;
        });
        setFilteredDeposits(filtered);
      } catch (error) {
        console.error('Erreur lors du filtrage:', error);
        // En cas d'erreur, afficher tous les dépôts
        setFilteredDeposits(deposits);
      }
    }
    
    // Réinitialiser les pages quand on change la recherche
    setPendingPage(1);
    setProcessedPage(1);
  }, [searchTerm, deposits, users]);

  const loadDeposits = async () => {
    try {
      setIsLoading(true);
      // Charger toutes les transactions et utilisateurs depuis l'API MySQL
      const [allTransactions, allUsers] = await Promise.all([
        apiGetTransactions(),
        apiGetUsers()
      ]);
      
      console.log('API Response:', allTransactions); // Debug log
      
      if (!allTransactions) {
        console.log('No transactions returned from API');
        setDeposits([]);
        setFilteredDeposits([]);
        setUsers(allUsers || []);
        return;
      }
      
      const depositTransactions = allTransactions
        .filter((t: any) => t && t.type === 'deposit')
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
      console.log('Filtered deposits:', depositTransactions); // Debug log
      setDeposits(depositTransactions);
      setFilteredDeposits(depositTransactions);
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error loading deposits:', error);
      setDeposits([]); // Vider la liste en cas d'erreur
      setFilteredDeposits([]);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const processDeposit = async (transactionId: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      const transaction = filteredDeposits.find(d => d.id === transactionId);
      if (!transaction) return;

      await apiUpdateTransaction({
        id: transactionId,
        status,
        processedAt: new Date().toISOString(),
        processedBy: 'admin', // Should be current admin user
        reason
      });

      if (status === 'approved') {
        // Update user balance
        const user = await apiGetUserById(transaction.userId);
        if (user) {
          await apiUpdateUser({
            ...user,
            balance: Number(user.balance) + Number(transaction.amount)
          });

          // If lot purchase, add user lot
          if (transaction.lotId) {
            await apiCreateUserLot({
              userId: user.id,
              lotId: transaction.lotId,
              purchasedAt: new Date().toISOString(),
              active: true
            });
          }
        }
      }

      // Notifier l'utilisateur du résultat du dépôt
      await notificationManager.notifyTransaction(
        Number(transaction.userId),
        'deposit',
        Number(transaction.amount),
        status,
        reason
      );

      await loadDeposits();
      setSelectedDeposit(null);
      setRejectReason('');
      
      toast({
        title: status === 'approved' ? "Dépôt approuvé" : "Dépôt rejeté",
        description: `Le dépôt de ${formatAmount(transaction.amount)} a été ${status === 'approved' ? 'approuvé' : 'rejeté'}.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de traiter le dépôt.",
        variant: "destructive"
      });
    }
  };

  const getUserName = (userId: string) => {
    try {
      if (!users || users.length === 0) {
        return `Utilisateur ${userId}`;
      }
      const user = users.find(u => u.id.toString() === userId.toString());
      return user && user.fullName ? user.fullName : `Utilisateur ${userId}`;
    } catch (error) {
      console.warn('Erreur lors de la récupération du nom utilisateur:', error);
      return `Utilisateur ${userId}`;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
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
    
    return <Badge variant={variants[status as keyof typeof variants]}>
      {labels[status as keyof typeof labels]}
    </Badge>;
  };

  const pendingDeposits = filteredDeposits.filter(d => d.status === 'pending');
  // Pour l'historique, on veut les plus récents en haut (anciens en bas)
  const processedDeposits = filteredDeposits.filter(d => d.status !== 'pending').slice().reverse();
  
  // Pagination pour les deux sections
  const paginatedPending = pendingDeposits.slice((pendingPage-1)*pageSize, pendingPage*pageSize);
  const paginatedProcessed = processedDeposits.slice((processedPage-1)*pageSize, processedPage*pageSize);
  
  // Calcul du nombre total de pages
  const totalPendingPages = Math.ceil(pendingDeposits.length / pageSize);
  const totalProcessedPages = Math.ceil(processedDeposits.length / pageSize);

  return (
    <>
      <Navigation userRole="admin" />
      <div className="p-2 sm:p-6 space-y-3 sm:space-y-6 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] mb-16 sm:mb-24">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 bg-white/80 rounded-lg shadow-md p-3 sm:p-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text text-center sm:text-left">Dépôts</h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, montant, date, méthode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 text-sm"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Chargement des dépôts...</p>
          </div>
        ) : (
          <>
            {/* Pending Deposits - Optimized for mobile */}
            <Card className="rounded-lg shadow-md border-0 bg-orange-50/90">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-base text-orange-600 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Dépôts en Attente ({pendingDeposits.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {pendingDeposits.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <p className="text-sm sm:text-base">Aucun dépôt en attente</p>
              <p className="text-xs sm:text-sm mt-2">Toutes les demandes de dépôt sont actuellement traitées.</p>
            </div>
          ) : (
            <>
              {/* Mobile layout */}
              <div className="block lg:hidden space-y-2">
                {paginatedPending.map((deposit) => (
                  <div key={deposit.id} className="bg-white p-3 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{formatAmount(deposit.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getUserName(deposit.userId)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(deposit.createdAt)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(deposit.status)}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedDeposit(deposit)}
                              className="text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Voir
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm mx-2">
                            <DialogHeader>
                              <DialogTitle className="text-base">Détails du Dépôt</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <label className="text-xs font-medium">Montant</label>
                                  <p className="text-sm font-bold">{formatAmount(deposit.amount)}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium">Utilisateur</label>
                                  <p className="text-sm">{getUserName(deposit.userId)}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium">Méthode</label>
                                  <p className="text-sm">{deposit.paymentMethod || 'Non spécifiée'}</p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium">Lot</label>
                                  <p className="text-sm">{deposit.lotId || 'Recharge simple'}</p>
                                </div>
                              </div>
                              
                              {deposit.paymentProof && (
                                <div>
                                  <label className="text-xs font-medium">Preuve de paiement</label>
                                  <div className="mt-1 p-2 bg-muted rounded">
                                    <p className="text-xs">{deposit.paymentProof}</p>
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="text-xs font-medium">Description</label>
                                <p className="text-xs text-muted-foreground">{deposit.description}</p>
                              </div>

                              <div>
                                <label className="text-xs font-medium">Motif de rejet (optionnel)</label>
                                <Textarea
                                  placeholder="Raison du rejet..."
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  className="text-xs"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Button 
                                  onClick={() => processDeposit(deposit.id, 'approved')}
                                  size="sm"
                                  className="text-xs"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approuver
                                </Button>
                                <Button 
                                  onClick={() => processDeposit(deposit.id, 'rejected', rejectReason)}
                                  variant="destructive"
                                  size="sm"
                                  className="text-xs"
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejeter
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Lot: </span>
                        <span>{deposit.lotId || 'Recharge'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Méthode: </span>
                        <span>{deposit.paymentMethod || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination mobile pour les dépôts en attente (déjà incluse dans le bloc mobile ci-dessus, donc supprimée ici) */}
              
              {/* Desktop table */}
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
                    {paginatedPending.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>
                          {formatDateTime(deposit.createdAt)}
                        </TableCell>
                        <TableCell>{getUserName(deposit.userId)}</TableCell>
                        <TableCell className="font-medium">{formatAmount(deposit.amount)}</TableCell>
                        <TableCell>{deposit.lotId || 'Recharge'}</TableCell>
                        <TableCell>{deposit.paymentMethod || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setSelectedDeposit(deposit)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Détails du Dépôt</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Montant</label>
                                      <p className="text-lg font-bold">{formatAmount(deposit.amount)}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Utilisateur</label>
                                      <p>{deposit.userId}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Méthode de paiement</label>
                                      <p>{deposit.paymentMethod || 'Non spécifiée'}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Lot</label>
                                      <p>{deposit.lotId || 'Recharge simple'}</p>
                                    </div>
                                  </div>
                                  
                                  {deposit.paymentProof && (
                                    <div>
                                      <label className="text-sm font-medium">Preuve de paiement</label>
                                      <div className="mt-2 p-4 bg-muted rounded">
                                        <p className="text-sm">{deposit.paymentProof}</p>
                                      </div>
                                    </div>
                                  )}

                                  <div>
                                    <label className="text-sm font-medium">Description</label>
                                    <p className="text-sm text-muted-foreground">{deposit.description}</p>
                                  </div>

                                  <div className="flex space-x-2">
                                    <Button 
                                      onClick={() => processDeposit(deposit.id, 'approved')}
                                      className="flex-1"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Approuver
                                    </Button>
                                    <Button 
                                      onClick={() => processDeposit(deposit.id, 'rejected', rejectReason)}
                                      variant="destructive"
                                      className="flex-1"
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Rejeter
                                    </Button>
                                  </div>

                                  <div>
                                    <label className="text-sm font-medium">Motif de rejet (optionnel)</label>
                                    <Textarea
                                      placeholder="Raison du rejet..."
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination pour les dépôts en attente */}
              {totalPendingPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingPage(Math.max(1, pendingPage - 1))}
                    disabled={pendingPage === 1}
                    className="text-xs"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPendingPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === pendingPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPendingPage(page)}
                        className="text-xs min-w-8 h-8"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingPage(Math.min(totalPendingPages, pendingPage + 1))}
                    disabled={pendingPage === totalPendingPages}
                    className="text-xs"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Processed Deposits - Optimized for mobile */}
      <Card className="rounded-lg shadow-md border-0 bg-white/90">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-base flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-primary" />
            Historique des Dépôts ({processedDeposits.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {processedDeposits.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <p className="text-sm sm:text-base">Aucun dépôt traité pour le moment</p>
              <p className="text-xs sm:text-sm mt-2">Les dépôts approuvés ou rejetés apparaîtront ici.</p>
            </div>
          ) : (
            <>
              {/* Mobile layout */}
              <div className="block lg:hidden space-y-2">
                {paginatedProcessed.map((deposit) => (
                  <div key={deposit.id} className="bg-gray-50 p-3 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{formatAmount(deposit.amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getUserName(deposit.userId)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(deposit.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Traité le: </span>
                        <span>{deposit.processedAt ? formatDateTime(deposit.processedAt) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Par: </span>
                        <span>{deposit.processedBy || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination mobile pour les dépôts traités (déjà incluse dans le bloc mobile ci-dessus, donc supprimée ici) */}
              
              {/* Desktop table */}
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
                    {paginatedProcessed.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>
                          {formatDateTime(deposit.createdAt)}
                        </TableCell>
                        <TableCell>{getUserName(deposit.userId)}</TableCell>
                        <TableCell className="font-medium">{formatAmount(deposit.amount)}</TableCell>
                        <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                        <TableCell>
                          {deposit.processedAt ? formatDateTime(deposit.processedAt) : '-'}
                        </TableCell>
                        <TableCell>{deposit.processedBy || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination pour les dépôts traités */}
              {totalProcessedPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProcessedPage(Math.max(1, processedPage - 1))}
                    disabled={processedPage === 1}
                    className="text-xs"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalProcessedPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === processedPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setProcessedPage(page)}
                        className="text-xs min-w-8 h-8"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProcessedPage(Math.min(totalProcessedPages, processedPage + 1))}
                    disabled={processedPage === totalProcessedPages}
                    className="text-xs"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
          </>
        )}
      </div>
    </>
  );
}