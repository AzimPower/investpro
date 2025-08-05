
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { apiCreateAgentApplication } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Copy, Link, Gift, TrendingUp, UserPlus, Share } from "lucide-react";

export const Team = () => {
  const [user, setUser] = useState<User | null>(null);
  const [referrals, setReferrals] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [referralLink, setReferralLink] = useState("");
  // Pour la modal de candidature agent
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentForm, setAgentForm] = useState({
    fullName: "",
    phone: "",
    operator: "",
    agentNumber: ""
  });
  // Toujours déclarer les hooks en haut
  const [commissions, setCommissions] = useState<number>(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUserData = localStorage.getItem('currentUser');
        if (!currentUserData) {
          navigate('/login');
          return;
        }
        const userData = JSON.parse(currentUserData);
        
        // Charger l'utilisateur depuis le backend
        const userRes = await fetch(`/backend/users.php?id=${userData.id}`);
        if (!userRes.ok) {
          throw new Error(`Erreur HTTP: ${userRes.status}`);
        }
        const freshUser = await userRes.json();
        if (!freshUser || !freshUser.id) {
          localStorage.removeItem('currentUser');
          navigate('/login');
          return;
        }
        setUser(freshUser);
        
        // Générer le lien de parrainage
        const baseUrl = window.location.origin;
        setReferralLink(`${baseUrl}/register?ref=${freshUser.referralCode}`);
        
        // Charger tous les utilisateurs depuis le backend pour filtrer les referrals
        const allUsersRes = await fetch('/backend/users.php');
        if (!allUsersRes.ok) {
          throw new Error(`Erreur HTTP: ${allUsersRes.status}`);
        }
        const allUsers = await allUsersRes.json();
        
        if (Array.isArray(allUsers)) {
          // Filtrer les referrals directs (niveau 1)
          const level1 = allUsers.filter(u => u.referredBy === freshUser.id);
          
          // Filtrer les referrals de niveau 2
          const level2 = allUsers.filter(u => level1.some(l1 => l1.id === u.referredBy));
          
          // Combiner tous les referrals
          const allReferrals = [...level1, ...level2];
          setReferrals(allReferrals);
        } else {
          setReferrals([]);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données de l'équipe",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [navigate, toast]);

  // Calcul des commissions réellement perçues (transactions)
  useEffect(() => {
    const fetchCommissions = async () => {
      if (!user) return setCommissions(0);
      try {
        // Charger les transactions depuis le backend
        const transactionsRes = await fetch(`/backend/transactions.php?userId=${user.id}`);
        if (!transactionsRes.ok) {
          throw new Error(`Erreur HTTP: ${transactionsRes.status}`);
        }
        const transactions = await transactionsRes.json();
        const total = Array.isArray(transactions)
          ? transactions.filter(t => t.type === 'commission' && t.status === 'approved').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
          : 0;
        setCommissions(total);
      } catch (error) {
        console.error('Erreur lors du chargement des commissions:', error);
        setCommissions(0);
      }
    };
    fetchCommissions();
  }, [user]);

  // Séparer les referrals par niveau
  const level1Referrals = user ? referrals.filter(r => r.referredBy === user.id) : [];
  const level2Referrals = referrals.filter(r => level1Referrals.some(l1 => l1.id === r.referredBy));

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const copyReferralLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(referralLink);
        toast({
          title: "Lien copié",
          description: "Le lien de parrainage a été copié dans le presse-papiers",
        });
      } else {
        // Fallback pour les navigateurs plus anciens ou contextes non sécurisés
        const textArea = document.createElement('textarea');
        textArea.value = referralLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        toast({
          title: "Lien copié",
          description: "Le lien de parrainage a été copié dans le presse-papiers",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien. Veuillez le sélectionner manuellement.",
        variant: "destructive",
      });
    }
  };

  const copyReferralCode = async () => {
    if (!user) return;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(user.referralCode);
        toast({
          title: "Code copié",
          description: "Le code de parrainage a été copié dans le presse-papiers",
        });
      } else {
        // Fallback pour les navigateurs plus anciens ou contextes non sécurisés
        const textArea = document.createElement('textarea');
        textArea.value = user.referralCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        toast({
          title: "Code copié",
          description: "Le code de parrainage a été copié dans le presse-papiers",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      toast({
        title: "Erreur",
        description: "Impossible de copier le code. Veuillez le sélectionner manuellement.",
        variant: "destructive",
      });
    }
  };

  const shareReferralLink = async () => {
    try {
      if (navigator.share && navigator.canShare) {
        const shareData = {
          title: 'Rejoignez InvestPro',
          text: 'Investissez et gagnez de l\'argent chaque jour avec InvestPro. Appuyez sur ce lien pour essayer !',
          url: referralLink,
        };
        
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }
      
      // Fallback: copier le lien
      await copyReferralLink();
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      if (error.name !== 'AbortError') {
        // L'utilisateur n'a pas annulé le partage, c'est une vraie erreur
        await copyReferralLink();
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };


  if (isLoading) {
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



  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={user.role} onLogout={handleLogout} />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8 pb-8 sm:pb-12">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Mon équipe</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gérez votre réseau de parrainage et suivez vos commissions</p>
        </div>

        {/* Stats Cards - Mobile optimisé */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <Card className="shadow-card bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium text-blue-700">Total Membre</span>
                <div className="p-1.5 bg-blue-500 rounded-full">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-blue-800">{referrals.length}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium text-emerald-700">Commissions</span>
                <div className="p-1.5 bg-emerald-500 rounded-full">
                  <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              </div>
              <div className="text-sm sm:text-2xl font-bold text-emerald-800">{formatCurrency(commissions)}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium text-amber-700">Niveau 1</span>
                <div className="p-1.5 bg-amber-500 rounded-full">
                  <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-amber-800">{level1Referrals.length}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium text-purple-700">Niveau 2</span>
                <div className="p-1.5 bg-purple-500 rounded-full">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-purple-800">{level2Referrals.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Tools - Mobile optimisé */}
        <Card className="shadow-card mb-4 sm:mb-6 lg:mb-8 bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200">
          <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="p-1.5 bg-white/20 rounded-full">
                <Link className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
              Outils de parrainage
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-indigo-100">
              Partagez votre code ou lien de parrainage pour inviter de nouveaux membres
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Votre code de parrainage</label>
              <div className="flex gap-2">
                <Input value={user.referralCode} readOnly className="font-mono text-sm bg-white border-slate-300" />
                <Button variant="outline" size="sm" onClick={copyReferralCode} className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Lien de parrainage</label>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="text-xs sm:text-sm bg-white border-slate-300" />
                <Button variant="outline" size="sm" onClick={copyReferralLink} className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="default" size="sm" onClick={shareReferralLink} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0">
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-amber-100 border border-yellow-200 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-amber-800">
                💡 <strong>Astuce :</strong> Gagnez des commissions en invitant vos amis ! 
                Vous recevez des bonus pour chaque personne qui s'inscrit avec votre code et investit.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section Postuler Agent - visible pour tous */}
        <Card className="mb-6 sm:mb-8 bg-gradient-to-br from-indigo-50 to-purple-100 border-indigo-200 shadow-card">
          <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5" />
              Devenez Agent InvestPro
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-indigo-100">
              <b>Devenez agent et profitez d'avantages exclusifs !</b><br />
              Pour postuler, il vous faut <b>au moins 5 filleuls niveau 1</b> et <b>10 niveau 2</b>.<br />
              <span className="block mt-1 text-xs text-white/80">Actuellement : {level1Referrals.length} niveau 1, {level2Referrals.length} niveau 2</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
            <div className="bg-gradient-to-r from-emerald-50 to-green-100 border border-emerald-200 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-emerald-800">
                <b>Avantages d'être agent :</b><br />
                - Gérer les dépôts et retraits de votre équipe<br />
                - Gagner des revenus supplémentaires sur chaque opération<br />
                - Commissions supplémentaires sur les investissements de votre équipe<br />
                - Accès à des outils de gestion avancés<br />
                - Assistance prioritaire et support dédié<br />
                - Statut privilégié dans la communauté InvestPro
              </p>
            </div>
            <Button
              variant="default"
              size="lg"
              className={`w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0 text-white font-bold text-base sm:text-lg py-2 sm:py-3 ${level1Referrals.length < 5 || level2Referrals.length < 10 ? 'opacity-60 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (level1Referrals.length >= 5 && level2Referrals.length >= 10) {
                  setAgentForm({
                    fullName: user?.fullName || "",
                    phone: user?.phone || "",
                    operator: user?.operator || "",
                    agentNumber: user?.agentNumber || ""
                  });
                  setShowAgentModal(true);
                } else {
                  toast({
                    title: "Conditions non remplies",
                    description: "Vous devez avoir au moins 5 filleuls niveau 1 et 10 niveau 2 pour postuler.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={level1Referrals.length < 5 || level2Referrals.length < 10}
            >
              Postuler pour devenir agent
            </Button>
      {/* Modal formulaire agent */}
      <Dialog open={showAgentModal} onOpenChange={setShowAgentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devenir Agent InvestPro</DialogTitle>
            <DialogDescription>
              Merci de compléter vos informations pour finaliser votre candidature.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!agentForm.fullName || !agentForm.phone || !agentForm.operator || !agentForm.agentNumber) {
                toast({
                  title: "Champs manquants",
                  description: "Merci de remplir tous les champs du formulaire.",
                  variant: "destructive",
                });
                return;
              }
              apiCreateAgentApplication({
                userId: user ? Number(user.id) : 0,
                fullName: agentForm.fullName,
                phone: agentForm.phone,
                operator: agentForm.operator,
                agentNumber: agentForm.agentNumber
              })
                .then(() => {
                  setShowAgentModal(false);
                  toast({
                    title: "Demande envoyée",
                    description: "Votre demande pour devenir agent a été transmise à l'équipe. Vous serez contacté prochainement.",
                  });
                })
                .catch(error => {
                  setShowAgentModal(false);
                  toast({
                    title: "Erreur",
                    description: error.message || "Impossible d'envoyer la demande.",
                    variant: "destructive",
                  });
                });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium mb-1">Nom complet</label>
              <Input
                value={agentForm.fullName}
                onChange={e => setAgentForm(f => ({ ...f, fullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Téléphone</label>
              <Input
                value={agentForm.phone}
                onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Opérateur</label>
              <Select
                value={agentForm.operator}
                onValueChange={val => setAgentForm(f => ({ ...f, operator: val }))}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir l'opérateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moov">Moov</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Numéro agent</label>
              <Input
                value={agentForm.agentNumber}
                onChange={e => setAgentForm(f => ({ ...f, agentNumber: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">Envoyer la demande</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
            <div className="text-xs sm:text-sm text-slate-600 mt-2">
              <b>Comment ça marche ?</b> <br />
              Après votre demande, notre équipe examinera votre profil et vous contactera pour finaliser votre statut d'agent.<br />
              <span className="block mt-1 text-amber-700">Invitez plus de personnes pour débloquer l'accès au statut d'agent !</span>
            </div>
          </CardContent>
        </Card>

        {/* Team Members - Mobile optimisé */}
        <Tabs defaultValue="all" className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm bg-gradient-to-r from-slate-100 to-gray-200 p-1">
            <TabsTrigger value="all" className="px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">Tous ({referrals.length})</TabsTrigger>
            <TabsTrigger value="level1" className="px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white">Niveau 1 ({level1Referrals.length})</TabsTrigger>
            <TabsTrigger value="level2" className="px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white">Niveau 2 ({level2Referrals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <TeamMembersList members={referrals} />
          </TabsContent>

          <TabsContent value="level1">
            <TeamMembersList members={level1Referrals} />
          </TabsContent>

          <TabsContent value="level2">
            <TeamMembersList members={level2Referrals} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface TeamMembersListProps {
  members: User[];
}

const TeamMembersList = ({ members }: TeamMembersListProps) => {
  const [lots, setLots] = useState<any[]>([]);
  const [userLots, setUserLots] = useState<{[key: number]: any}>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger tous les lots depuis le backend
        const lotsRes = await fetch('/backend/lots.php');
        if (!lotsRes.ok) {
          throw new Error(`Erreur HTTP: ${lotsRes.status}`);
        }
        const allLots = await lotsRes.json();
        setLots(Array.isArray(allLots) ? allLots : []);

        // Charger les lots actifs de chaque membre
        const userLotsMap: {[key: number]: any} = {};
        
        for (const member of members) {
          try {
            // Récupérer les transactions d'achat de lots pour ce membre
            const transactionsRes = await fetch(`/backend/transactions.php?userId=${member.id}`);
            if (transactionsRes.ok) {
              const transactions = await transactionsRes.json();
              if (Array.isArray(transactions)) {
                // Trouver la dernière transaction d'achat approuvée
                const purchaseTransactions = transactions
                  .filter(t => t.type === 'purchase' && t.status === 'approved' && t.lotId)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
                if (purchaseTransactions.length > 0) {
                  const latestPurchase = purchaseTransactions[0];
                  const activeLot = allLots.find(lot => lot.id == latestPurchase.lotId);
                  if (activeLot) {
                    userLotsMap[member.id] = activeLot;
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Erreur lors du chargement du lot pour ${member.fullName}:`, error);
          }
        }
        
        setUserLots(userLotsMap);
      } catch (error) {
        console.error('Erreur lors du chargement des lots:', error);
        setLots([]);
      }
    };
    
    if (members.length > 0) {
      fetchData();
    }
  }, [members]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  if (members.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200">
        <CardContent className="text-center py-8 sm:py-12">
          <div className="p-4 bg-gradient-to-br from-slate-200 to-gray-300 rounded-full w-fit mx-auto mb-3 sm:mb-4">
            <Users className="h-8 w-8 sm:h-12 sm:w-12 text-slate-600" />
          </div>
          <p className="text-sm sm:text-base text-slate-700 font-medium">Aucun membre dans cette catégorie</p>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Commencez à partager votre code de parrainage pour développer votre équipe !
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {members.map((member) => {
        // Récupérer le lot actif du membre depuis l'état
        const activeLot = userLots[member.id];
        return (
          <Card key={member.id} className="shadow-card bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:shadow-lg transition-all">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex-shrink-0 shadow-md">
                    <Users className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base truncate text-slate-800">{member.fullName}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 truncate">{member.phone}</p>
                    <p className="text-xs text-slate-500">
                      Inscrit le {new Date(member.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col sm:text-right justify-between sm:justify-start items-center sm:items-end space-y-0 sm:space-y-2 flex-shrink-0">
                  <div>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">Lot actif</p>
                    {activeLot ? (
                      <>
                        <p className="font-semibold text-sm sm:text-base text-slate-800">{activeLot.name}</p>
                        <p className="text-xs text-emerald-600 font-medium">{formatCurrency(parseFloat(activeLot.price))}</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">Aucun</p>
                    )}
                  </div>
                  <Badge 
                    variant={member.accountStatus === 'active' ? 'default' : 'secondary'} 
                    className={`text-xs ${
                      member.accountStatus === 'active' 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0' 
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {member.accountStatus === 'active' ? 'Actif' : member.accountStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};