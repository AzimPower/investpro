import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetUsers, apiGetTransactions, apiUpdateUser, apiRegister } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Edit, 
  UserCheck, 
  UserX, 
  Shield, 
  UserPlus, 
  Phone, 
  Building, 
  Mail,
  Trash2,
  Eye,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<any[]>([]);
  const [agentEarnings, setAgentEarnings] = useState<Record<string, number>>({});
  const [agentStats, setAgentStats] = useState<Record<string, { deposits: number; commissions: number }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [newAgentData, setNewAgentData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    agentNumber: '',
    operator: 'moov' as 'moov' | 'orange' | 'wave',
  });
  const [editAgentData, setEditAgentData] = useState({
    fullName: '',
    phone: '',
    email: '',
    agentNumber: '',
    operator: 'moov' as 'moov' | 'orange' | 'wave',
    accountStatus: 'active' as 'active' | 'inactive' | 'blocked',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);
  const [isViewAgentOpen, setIsViewAgentOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: () => {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const agentsPerPage = 10;
  const { toast } = useToast();

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    const filtered = agents.filter(agent => 
      agent.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone.includes(searchTerm) ||
      (agent.agentNumber && agent.agentNumber.includes(searchTerm)) ||
      agent.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAgents(filtered);
    setCurrentPage(1);
  }, [searchTerm, agents]);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      const [allUsers, allTransactions] = await Promise.all([
        apiGetUsers(),
        apiGetTransactions()
      ]);

      // Filtrer seulement les agents
      const agentUsers = allUsers.filter((user: any) => user.role === 'agent');
      setAgents(agentUsers);
      setFilteredAgents(agentUsers);

      // Calculer les statistiques par agent
      const earnings: Record<string, number> = {};
      const stats: Record<string, { deposits: number; commissions: number }> = {};

      agentUsers.forEach((agent: any) => {
        // Calculer les gains totaux
        const agentEarning = allTransactions
          .filter((t: any) => t.userId === agent.id && (t.type === 'earning' || t.type === 'commission') && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        earnings[agent.id] = agentEarning;

        // Calculer les statistiques de dépôts et commissions
        const deposits = allTransactions
          .filter((t: any) => t.agentId === agent.id && t.type === 'deposit' && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const commissions = allTransactions
          .filter((t: any) => t.agentId === agent.id && t.type === 'commission' && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        stats[agent.id] = { deposits, commissions };
      });

      setAgentEarnings(earnings);
      setAgentStats(stats);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les agents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createAgent = async () => {
    // Validation des champs
    if (!newAgentData.fullName || !newAgentData.phone || !newAgentData.password || !newAgentData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (newAgentData.password !== newAgentData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    if (newAgentData.password.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    // Validation du numéro de téléphone
    if (!/^\+?[1-9]\d{1,14}$/.test(newAgentData.phone.replace(/[\s-]/g, ''))) {
      toast({
        title: "Erreur",
        description: "Format de téléphone invalide",
        variant: "destructive",
      });
      return;
    }

    try {
      // Vérifier si le téléphone existe déjà
      const existingUser = agents.find(a => a.phone === newAgentData.phone);
      if (existingUser) {
        toast({
          title: "Erreur",
          description: "Ce numéro de téléphone est déjà utilisé",
          variant: "destructive",
        });
        return;
      }

      // Générer un code de parrainage unique
      const referralCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const agentData = {
        fullName: newAgentData.fullName,
        phone: newAgentData.phone,
        email: newAgentData.email || null,
        password: newAgentData.password,
        role: 'agent',
        referralCode,
        agentNumber: newAgentData.agentNumber || newAgentData.phone,
        operator: newAgentData.operator,
        accountStatus: 'active',
      };

      await apiRegister(agentData);
      
      // Réinitialiser le formulaire
      setNewAgentData({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        agentNumber: '',
        operator: 'moov',
      });
      
      setIsCreateAgentOpen(false);
      await loadAgents();
      
      toast({
        title: "Agent créé",
        description: `L'agent ${newAgentData.fullName} a été créé avec succès`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'agent",
        variant: "destructive",
      });
    }
  };

  const updateAgent = async () => {
    if (!selectedAgent) return;

    // Validation des champs
    if (!editAgentData.fullName || !editAgentData.phone) {
      toast({
        title: "Erreur",
        description: "Le nom et le téléphone sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiUpdateUser({
        id: selectedAgent.id,
        fullName: editAgentData.fullName,
        phone: editAgentData.phone,
        email: editAgentData.email || null,
        agentNumber: editAgentData.agentNumber || editAgentData.phone,
        operator: editAgentData.operator,
        accountStatus: editAgentData.accountStatus,
      });

      setIsEditAgentOpen(false);
      setSelectedAgent(null);
      await loadAgents();

      toast({
        title: "Agent modifié",
        description: `L'agent ${editAgentData.fullName} a été modifié avec succès`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'agent",
        variant: "destructive",
      });
    }
  };

  const updateAgentStatus = async (agentId: string, status: 'active' | 'inactive' | 'blocked') => {
    try {
      await apiUpdateUser({ id: agentId, accountStatus: status });
      await loadAgents();
      toast({
        title: "Statut mis à jour",
        description: `Le statut de l'agent a été modifié.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive"
      });
    }
  };

  const removeAgentRole = async (agentId: string) => {
    try {
      await apiUpdateUser({ id: agentId, role: 'user' });
      await loadAgents();
      toast({
        title: "Rôle retiré",
        description: "Le rôle d'agent a été retiré avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le rôle d'agent",
        variant: "destructive",
      });
    }
  };

  // Fonction pour afficher une confirmation
  const showConfirmDialog = (title: string, description: string, action: () => void) => {
    setConfirmAction({
      isOpen: true,
      title,
      description,
      action,
    });
  };

  // Fonction pour confirmer la suppression du rôle d'agent
  const confirmRemoveAgentRole = (agent: any) => {
    showConfirmDialog(
      "Retirer le rôle d'agent",
      `Êtes-vous sûr de vouloir retirer le rôle d'agent à ${agent.fullName} ? Cette action transformera ce compte en compte utilisateur normal.`,
      () => removeAgentRole(agent.id)
    );
  };

  // Fonction pour confirmer la suppression du statut d'agent
  const confirmUpdateAgentStatus = (agent: any, status: 'active' | 'inactive' | 'blocked') => {
    const statusLabels = {
      active: 'activer',
      inactive: 'désactiver',
      blocked: 'bloquer'
    };
    
    showConfirmDialog(
      `${statusLabels[status].charAt(0).toUpperCase() + statusLabels[status].slice(1)} l'agent`,
      `Êtes-vous sûr de vouloir ${statusLabels[status]} le compte de ${agent.fullName} ?`,
      () => updateAgentStatus(agent.id, status)
    );
  };

  const resetPassword = async (agentId: string) => {
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

    try {
      const res = await fetch('/backend/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adminChangePassword',
          id: agentId,
          newPassword: passwordData.newPassword,
        })
      });
      
      const result = await res.json();
      if (result && result.success) {
        setPasswordData({ newPassword: '', confirmPassword: '' });
        toast({
          title: "Mot de passe modifié",
          description: "Le mot de passe a été changé avec succès",
        });
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
  };

  const openEditAgent = (agent: any) => {
    setSelectedAgent(agent);
    setEditAgentData({
      fullName: agent.fullName,
      phone: agent.phone,
      email: agent.email || '',
      agentNumber: agent.agentNumber || agent.phone,
      operator: agent.operator || 'moov',
      accountStatus: agent.accountStatus,
    });
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setIsEditAgentOpen(true);
  };

  const openViewAgent = (agent: any) => {
    setSelectedAgent(agent);
    setIsViewAgentOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      blocked: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  // Pagination
  const totalPages = Math.ceil(filteredAgents.length / agentsPerPage);
  const paginatedAgents = filteredAgents.slice((currentPage - 1) * agentsPerPage, currentPage * agentsPerPage);

  return (
    <>
      <Navigation userRole="admin" />
      <div className="p-2 sm:p-6 space-y-3 sm:space-y-6 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] mb-16 sm:mb-24">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 bg-white/80 rounded-lg shadow-md p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
              Gestion des Agents ({filteredAgents.length})
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80"
              />
            </div>
            
            <Dialog open={isCreateAgentOpen} onOpenChange={setIsCreateAgentOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-2">
                <DialogHeader>
                  <DialogTitle>Créer un Nouvel Agent</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="agent-name">Nom complet *</Label>
                      <Input
                        id="agent-name"
                        value={newAgentData.fullName}
                        onChange={(e) => setNewAgentData({ ...newAgentData, fullName: e.target.value })}
                        placeholder="Jean Dupont"
                      />
                    </div>
                    <div>
                      <Label htmlFor="agent-phone">Téléphone *</Label>
                      <Input
                        id="agent-phone"
                        value={newAgentData.phone}
                        onChange={(e) => setNewAgentData({ ...newAgentData, phone: e.target.value })}
                        placeholder="+22673254655"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="agent-email">Email</Label>
                    <Input
                      id="agent-email"
                      type="email"
                      value={newAgentData.email}
                      onChange={(e) => setNewAgentData({ ...newAgentData, email: e.target.value })}
                      placeholder="jean@example.com"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="agent-number">Numéro Agent</Label>
                      <Input
                        id="agent-number"
                        value={newAgentData.agentNumber}
                        onChange={(e) => setNewAgentData({ ...newAgentData, agentNumber: e.target.value })}
                        placeholder="Optionnel"
                      />
                    </div>
                    <div>
                      <Label htmlFor="agent-operator">Opérateur</Label>
                      <Select 
                        value={newAgentData.operator} 
                        onValueChange={(value: 'moov' | 'orange' | 'wave') => 
                          setNewAgentData({ ...newAgentData, operator: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moov">Moov</SelectItem>
                          <SelectItem value="orange">Orange</SelectItem>
                          <SelectItem value="wave">Wave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="agent-password">Mot de passe *</Label>
                      <Input
                        id="agent-password"
                        type="password"
                        value={newAgentData.password}
                        onChange={(e) => setNewAgentData({ ...newAgentData, password: e.target.value })}
                        placeholder="Minimum 6 caractères"
                      />
                    </div>
                    <div>
                      <Label htmlFor="agent-confirm-password">Confirmer *</Label>
                      <Input
                        id="agent-confirm-password"
                        type="password"
                        value={newAgentData.confirmPassword}
                        onChange={(e) => setNewAgentData({ ...newAgentData, confirmPassword: e.target.value })}
                        placeholder="Confirmer le mot de passe"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={createAgent}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Créer Agent
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateAgentOpen(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Agents</p>
                  <p className="text-2xl font-bold text-blue-800">{agents.length}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Agents Actifs</p>
                  <p className="text-2xl font-bold text-green-800">
                    {agents.filter(a => a.accountStatus === 'active').length}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Total Commissions</p>
                  <p className="text-lg font-bold text-yellow-800">
                    {formatAmount(Object.values(agentStats).reduce((sum, stat) => sum + stat.commissions, 0))}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table des agents */}
        <Card className="rounded-lg shadow-md border-0 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Liste des Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile layout */}
            <div className="block lg:hidden space-y-3">
              {paginatedAgents.map((agent) => (
                <div key={agent.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base truncate">{agent.fullName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {agent.phone}
                      </div>
                      {agent.email && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {agent.email}
                        </div>
                      )}
                      {agent.agentNumber && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {agent.agentNumber}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(agent.accountStatus)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Opérateur: </span>
                      <Badge variant="outline" className="text-xs">
                        {agent.operator || 'N/A'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Solde: </span>
                      <span className="font-medium">{formatAmount(agent.balance)}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openViewAgent(agent)}
                      className="flex-1 text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openEditAgent(agent)}
                      className="flex-1 text-xs"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Modifier
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Numéro Agent</TableHead>
                    <TableHead>Opérateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Solde</TableHead>
                    <TableHead>Commissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{agent.fullName}</div>
                          <div className="text-sm text-muted-foreground">
                            Code: {agent.referralCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{agent.phone}</div>
                          {agent.email && (
                            <div className="text-sm text-muted-foreground">{agent.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{agent.agentNumber || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{agent.operator || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(agent.accountStatus)}</TableCell>
                      <TableCell>{formatAmount(agent.balance)}</TableCell>
                      <TableCell>{formatAmount(agentStats[agent.id]?.commissions || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openViewAgent(agent)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openEditAgent(agent)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => confirmRemoveAgentRole(agent)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Préc.
                </Button>
                <span className="text-sm">{currentPage}/{totalPages}</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Suiv.
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog pour voir les détails d'un agent */}
        <Dialog open={isViewAgentOpen} onOpenChange={setIsViewAgentOpen}>
          <DialogContent className="max-w-lg mx-2">
            <DialogHeader>
              <DialogTitle>Détails de l'Agent</DialogTitle>
            </DialogHeader>
            {selectedAgent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Nom complet</Label>
                    <p className="text-sm text-muted-foreground">{selectedAgent.fullName}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Téléphone</Label>
                    <p className="text-sm text-muted-foreground">{selectedAgent.phone}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Email</Label>
                    <p className="text-sm text-muted-foreground">{selectedAgent.email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Numéro Agent</Label>
                    <p className="text-sm text-muted-foreground">{selectedAgent.agentNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Opérateur</Label>
                    <Badge variant="outline">{selectedAgent.operator || 'N/A'}</Badge>
                  </div>
                  <div>
                    <Label className="font-semibold">Statut</Label>
                    {getStatusBadge(selectedAgent.accountStatus)}
                  </div>
                  <div>
                    <Label className="font-semibold">Code de parrainage</Label>
                    <code className="bg-muted px-2 py-1 rounded text-sm">{selectedAgent.referralCode}</code>
                  </div>
                  <div>
                    <Label className="font-semibold">Date d'inscription</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedAgent.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Statistiques</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">
                        {formatAmount(selectedAgent.balance)}
                      </p>
                      <p className="text-xs text-muted-foreground">Solde</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">
                        {formatAmount(agentStats[selectedAgent.id]?.deposits || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Dépôts gérés</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-yellow-600">
                        {formatAmount(agentStats[selectedAgent.id]?.commissions || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Commissions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog pour modifier un agent */}
        <Dialog open={isEditAgentOpen} onOpenChange={setIsEditAgentOpen}>
          <DialogContent className="max-w-md mx-2">
            <DialogHeader>
              <DialogTitle>Modifier l'Agent</DialogTitle>
            </DialogHeader>
            {selectedAgent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="edit-agent-name">Nom complet *</Label>
                    <Input
                      id="edit-agent-name"
                      value={editAgentData.fullName}
                      onChange={(e) => setEditAgentData({ ...editAgentData, fullName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-agent-phone">Téléphone *</Label>
                    <Input
                      id="edit-agent-phone"
                      value={editAgentData.phone}
                      onChange={(e) => setEditAgentData({ ...editAgentData, phone: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-agent-email">Email</Label>
                  <Input
                    id="edit-agent-email"
                    type="email"
                    value={editAgentData.email}
                    onChange={(e) => setEditAgentData({ ...editAgentData, email: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="edit-agent-number">Numéro Agent</Label>
                    <Input
                      id="edit-agent-number"
                      value={editAgentData.agentNumber}
                      onChange={(e) => setEditAgentData({ ...editAgentData, agentNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-agent-operator">Opérateur</Label>
                    <Select 
                      value={editAgentData.operator} 
                      onValueChange={(value: 'moov' | 'orange' | 'wave') => 
                        setEditAgentData({ ...editAgentData, operator: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moov">Moov</SelectItem>
                        <SelectItem value="orange">Orange</SelectItem>
                        <SelectItem value="wave">Wave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-agent-status">Statut du compte</Label>
                  <Select 
                    value={editAgentData.accountStatus} 
                    onValueChange={(value: 'active' | 'inactive' | 'blocked') => 
                      setEditAgentData({ ...editAgentData, accountStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="blocked">Bloqué</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Section changement de mot de passe */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Changer le mot de passe</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="new-password">Nouveau mot de passe</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Laisser vide pour ne pas changer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">Confirmer</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Confirmer le mot de passe"
                      />
                    </div>
                  </div>
                  {passwordData.newPassword && (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => resetPassword(selectedAgent.id)}
                      className="mt-2 w-full"
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Changer le mot de passe
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={updateAgent}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Sauvegarder
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditAgentOpen(false)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation */}
        <AlertDialog open={confirmAction.isOpen} onOpenChange={(open) => setConfirmAction(prev => ({ ...prev, isOpen: open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmAction.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmAction.action();
                  setConfirmAction(prev => ({ ...prev, isOpen: false }));
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
