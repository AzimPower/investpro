import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetUsers, apiGetTransactions, apiUpdateUser } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Edit, UserCheck, UserX, Shield, DollarSign, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notificationManager } from '@/lib/notificationManager';

export default function AdminUsers() {
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [userEarnings, setUserEarnings] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [balanceUpdate, setBalanceUpdate] = useState('');
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm) ||
      user.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
    // Réinitialiser les pages quand le filtre change
    setCurrentPage(1);
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      const [allUsers, allTransactions] = await Promise.all([
        apiGetUsers(),
        apiGetTransactions()
      ]);
      setUsers(allUsers);
      setFilteredUsers(allUsers);
      // Calculer les gains par utilisateur
      const earnings: Record<string, number> = {};
      allUsers.forEach((user: any) => {
        const userEarning = allTransactions
          .filter((t: any) => t.userId === user.id && (t.type === 'earning' || t.type === 'commission') && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        earnings[user.id] = userEarning;
      });
      setUserEarnings(earnings);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'inactive' | 'blocked') => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await apiUpdateUser({ id: userId, accountStatus: status });
      await loadUsers();
      toast({
        title: "Statut mis à jour",
        description: `Le statut de l'utilisateur a été modifié.`,
      });
      // Notification utilisateur
      const statusText = status === 'active' ? 'activé' : status === 'blocked' ? 'bloqué' : 'désactivé';
      await notificationManager.createNotification(
        Number(userId),
        'Statut du compte',
        `Votre compte a été ${statusText} par l'administration.`,
        status === 'active' ? 'success' : status === 'blocked' ? 'error' : 'warning',
        'system'
      );
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive"
      });
    }
    setActionLoading(false);
  };

  const updateUserBalance = async () => {
    if (actionLoading) return;
    if (!selectedUser || !balanceUpdate) return;
    setActionLoading(true);
    try {
      const newBalance = parseFloat(balanceUpdate);
      await apiUpdateUser({ id: selectedUser.id, balance: newBalance });
      await loadUsers();
      setBalanceUpdate('');
      setSelectedUser(null);
      toast({
        title: "Solde mis à jour",
        description: `Le solde de ${selectedUser.fullName} a été modifié.`,
      });
      // Notification utilisateur
      await notificationManager.createNotification(
        Number(selectedUser.id),
        'Solde modifié',
        `Votre solde a été mis à jour par l'administration. Nouveau solde : ${newBalance} FCFA`,
        'info',
        'system'
      );
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le solde.",
        variant: "destructive"
      });
    }
    setActionLoading(false);
  };

  const resetPassword = async (userId: string) => {
    if (actionLoading) return;
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }
    setActionLoading(true);
    try {
      // Mettre à jour le mot de passe via l'API PHP backend
      const res = await fetch('/backend/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adminChangePassword',
          id: userId,
          newPassword: passwordData.newPassword,
        })
      });
      const result = await res.json();
      if (result && result.success) {
        setPasswordData({
          newPassword: '',
          confirmPassword: '',
        });
        setSelectedUser(null);
        toast({
          title: "Mot de passe modifié",
          description: "Le mot de passe a été changé avec succès",
        });
        // Notification utilisateur
        await notificationManager.createNotification(
          Number(userId),
          'Mot de passe modifié',
          "Votre mot de passe a été modifié par l'administration. Si ce n'est pas vous, contactez le support.",
          'warning',
          'system'
        );
      } else {
        throw new Error(result && result.error ? result.error : "Impossible de changer le mot de passe");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de changer le mot de passe",
        variant: "destructive"
      });
    }
    setActionLoading(false);
  };

  // Fonctions pour changer le rôle d'un utilisateur avec confirmation
  const updateUserRole = async (userId: string, role: 'user' | 'agent' | 'admin') => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await apiUpdateUser({ id: userId, role });
      await loadUsers();
      toast({
        title: 'Rôle mis à jour',
        description: `Le rôle de l'utilisateur a été modifié en ${role}.`,
      });
      // Notification utilisateur
      await notificationManager.createNotification(
        Number(userId),
        'Rôle modifié',
        `Votre rôle a été changé en ${role} par l'administration.`,
        'info',
        'system'
      );
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible de mettre à jour le rôle.",
        variant: 'destructive',
      });
    }
    setActionLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      blocked: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      user: 'outline',
      agent: 'secondary',
      admin: 'default'
    } as const;
    
    return <Badge variant={variants[role as keyof typeof variants]}>{role}</Badge>;
  };

  const formatAmount = (amount: number) => {
  // Affiche toujours deux décimales, séparateur virgule, sans arrondir
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' F';
  };

  // Pagination helpers seulement pour les utilisateurs

  // Pagination helpers
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  return (
    <>
      <Navigation userRole="admin" />
      <div className="p-2 sm:p-6 space-y-3 sm:space-y-6 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] mb-16 sm:mb-24">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 bg-white/80 rounded-lg shadow-md p-3 sm:p-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text text-center sm:text-left">Utilisateurs</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-80"
                  autoComplete="new-search"
                  autoCorrect="off"
                  spellCheck={false}
                  name="no_autofill_search_field"
                  id="no_autofill_search_field"
                  inputMode="search"
                  aria-autocomplete="none"
                  tabIndex={0}
                  onFocus={e => { e.target.setAttribute('autocomplete', 'new-search'); }}
                />
          </div>
        </div>

        {/* Table utilisateurs - Optimized for mobile */}
        <Card className="rounded-lg shadow-md border-0 bg-white/90">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base flex items-center">
              <Users className="w-4 h-4 mr-2 text-primary" />
              Utilisateurs ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Mobile layout */}
            <div className="block lg:hidden space-y-2">
              {paginatedUsers.map((user) => (
                <div key={user.id} className="bg-gray-50 p-3 rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{user.fullName}</div>
                      <div className="text-xs text-muted-foreground">{user.phone}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.accountStatus)}
                      </div>
                    </div>
                    <Dialog open={selectedUser?.id === user.id} onOpenChange={open => { if (!open) setSelectedUser(null); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedUser(user);
                          setBalanceUpdate('');
                          setPasswordData({ newPassword: '', confirmPassword: '' });
                        }}>
                          <Edit className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm mx-2">
                        {actionLoading && (
                          <div className="text-center text-indigo-600 text-sm mb-2">Traitement en cours...</div>
                        )}
                        <DialogHeader>
                          <DialogTitle className="text-base">Modifier {user.fullName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Button 
                              size="sm" 
                              variant={user.accountStatus === 'active' ? 'default' : 'outline'}
                              onClick={() => updateUserStatus(user.id, 'active')}
                              className="text-xs"
                              disabled={actionLoading}
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Activer
                            </Button>
                            <Button 
                              size="sm" 
                              variant={user.accountStatus === 'blocked' ? 'destructive' : 'outline'}
                              onClick={() => updateUserStatus(user.id, 'blocked')}
                              className="text-xs"
                              disabled={actionLoading}
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Bloquer
                            </Button>
                          </div>
                          
                          {/* Gestion des rôles */}
                          <div className="space-y-2">
                            {user.role !== 'agent' && (
                              <Button size="sm" variant="secondary" onClick={() => updateUserRole(user.id, 'agent')} className="w-full text-xs" disabled={actionLoading}>
                                Promouvoir agent
                              </Button>
                            )}
                            {user.role === 'agent' && (
                              <Button size="sm" variant="outline" onClick={() => updateUserRole(user.id, 'user')} className="w-full text-xs" disabled={actionLoading}>
                                Retirer agent
                              </Button>
                            )}
                          </div>
                          
                          {/* Changement mot de passe */}
                          <div className="space-y-2">
                              <Input
                                type="password"
                                placeholder="Nouveau mot de passe"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="text-sm"
                                autoComplete="new-password"
                                name="no_autofill_new_password_field"
                                inputMode="text"
                                aria-autocomplete="none"
                                tabIndex={0}
                                readOnly
                                onFocus={e => e.target.removeAttribute('readonly')}
                              />
                              <Input
                                type="password"
                                placeholder="Confirmer"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="text-sm"
                                autoComplete="new-password"
                                name="no_autofill_confirm_password_field"
                                inputMode="text"
                                aria-autocomplete="none"
                                tabIndex={0}
                                readOnly
                                onFocus={e => e.target.removeAttribute('readonly')}
                              />
                            <Button 
                              onClick={() => resetPassword(user.id)}
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              disabled={actionLoading}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              Changer mot de passe
                            </Button>
                          </div>
                          
                          {/* Modification solde */}
                          <div className="space-y-2">
                              <div className="flex space-x-2">
                                <Input
                                  placeholder="Nouveau solde"
                                  value={balanceUpdate}
                                  onChange={(e) => setBalanceUpdate(e.target.value)}
                                  type="number"
                                  className="text-sm"
                                  autoComplete="off"
                                  name="no_autofill_balance_field"
                                  inputMode="numeric"
                                  aria-autocomplete="none"
                                  tabIndex={0}
                                  readOnly
                                  onFocus={e => e.target.removeAttribute('readonly')}
                                />
                                <Button onClick={updateUserBalance} size="sm" disabled={actionLoading}>
                                  <DollarSign className="w-3 h-3" />
                                </Button>
                              </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Solde: </span>
                      <span className="font-medium">{formatAmount(user.balance)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gagné: </span>
                      <span className="font-medium text-green-600">{formatAmount(userEarnings[user.id] || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">Code: </span>
                    <code className="bg-white px-1 py-0.5 rounded text-xs border">{user.referralCode}</code>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Solde</TableHead>
                    <TableHead>Total Gagné</TableHead>
                    <TableHead>Code Parrain</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.accountStatus)}</TableCell>
                      <TableCell>{formatAmount(user.balance)}</TableCell>
                      <TableCell>{formatAmount(userEarnings[user.id] || 0)}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{user.referralCode}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog open={selectedUser?.id === user.id} onOpenChange={open => { if (!open) setSelectedUser(null); }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => {
                                setSelectedUser(user);
                                setBalanceUpdate('');
                                setPasswordData({ newPassword: '', confirmPassword: '' });
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier {user.fullName}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 w-full">
                                  <Button 
                                    size="sm" 
                                    variant={user.accountStatus === 'active' ? 'default' : 'outline'}
                                    onClick={() => updateUserStatus(user.id, 'active')}
                                  >
                                    <UserCheck className="w-4 h-4 mr-1" />
                                    Activer
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant={user.accountStatus === 'blocked' ? 'destructive' : 'outline'}
                                    onClick={() => updateUserStatus(user.id, 'blocked')}
                                  >
                                    <UserX className="w-4 h-4 mr-1" />
                                    Bloquer
                                  </Button>
                                  {/* Boutons de gestion de rôle */}
                                  {user.role !== 'agent' && (
                                    <Button size="sm" variant="secondary" onClick={() => updateUserRole(user.id, 'agent')}>Promouvoir agent</Button>
                                  )}
                                  {user.role !== 'admin' && (
                                    <Button size="sm" variant="outline" onClick={() => updateUserRole(user.id, 'admin')}>Promouvoir admin</Button>
                                  )}
                                  {user.role === 'agent' && (
                                    <Button size="sm" variant="outline" onClick={() => updateUserRole(user.id, 'user')}>Retirer agent</Button>
                                  )}
                                </div>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="newPassword" className="text-sm">Nouveau mot de passe</Label>
                                    <Input
                                      id="newPassword"
                                      type="password"
                                      placeholder="Nouveau mot de passe"
                                      value={passwordData.newPassword}
                                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                      autoComplete="new-password"
                                      autoCorrect="off"
                                      spellCheck={false}
                                      name="no_autofill_new_password_field"
                                      inputMode="text"
                                      aria-autocomplete="none"
                                      tabIndex={0}
                                      onFocus={e => { e.target.setAttribute('autocomplete', 'new-password'); }}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-sm">Confirmer le nouveau mot de passe</Label>
                                    <Input
                                      id="confirmPassword"
                                      type="password"
                                      placeholder="Confirmer le nouveau mot de passe"
                                      value={passwordData.confirmPassword}
                                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                      autoComplete="new-password"
                                      autoCorrect="off"
                                      spellCheck={false}
                                      name="no_autofill_confirm_password_field"
                                      inputMode="text"
                                      aria-autocomplete="none"
                                      tabIndex={0}
                                      onFocus={e => { e.target.setAttribute('autocomplete', 'new-password'); }}
                                    />
                                  </div>
                                  <Button 
                                    onClick={() => resetPassword(user.id)}
                                    variant="outline"
                                    className="w-full"
                                  >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Modifier le mot de passe
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Modifier le solde</label>
                                  <div className="flex space-x-2">
                                    <Input
                                      type="text"
                                      placeholder="Nouveau solde"
                                      value={balanceUpdate}
                                      onChange={(e) => setBalanceUpdate(e.target.value)}
                                      autoComplete="off"
                                      autoCorrect="off"
                                      spellCheck={false}
                                      name="no_autofill_balance_field"
                                      id="no_autofill_balance_field"
                                      inputMode="numeric"
                                      aria-autocomplete="none"
                                      tabIndex={0}
                                      onFocus={e => { e.target.setAttribute('autocomplete', 'off'); }}
                                    />
                                    <Button onClick={updateUserBalance}>
                                      <DollarSign className="w-4 h-4" />
                                    </Button>
                                  </div>
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-3">
                <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                  Préc.
                </Button>
                <span className="text-xs sm:text-sm">{currentPage}/{totalPages}</span>
                <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                  Suiv.
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}