import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { apiGetUserById, apiGetTransactions, apiUpdateUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Lock, Bell, Shield, Phone, Mail, Calendar, LogOut } from "lucide-react";

export const Profile = () => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<any>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    marketingEmails: false,
  });
  
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
        // Charger l'utilisateur depuis l'API
        const freshUser = await apiGetUserById(userData.id);
        if (!freshUser || !freshUser.id) {
          localStorage.removeItem('currentUser');
          navigate('/login');
          return;
        }
        setUser(freshUser);
        setEditedUser({
          fullName: freshUser.fullName,
          phone: freshUser.phone,
          email: freshUser.email || '',
          agentNumber: freshUser.agentNumber || '',
        });
        // Charger les transactions depuis l'API
        const userTransactions = await apiGetTransactions(freshUser.id);
        setTransactions(Array.isArray(userTransactions) ? userTransactions : []);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger le profil",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [navigate, toast]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('user-session-changed'));
    navigate('/');
  };

  const handleUpdateProfile = async () => {
    // Validation des champs obligatoires
    const requiredFields = ['fullName', 'phone'];
    if (user?.role === 'agent') {
      requiredFields.push('agentNumber');
    }
    
    const missingFields = requiredFields.filter(field => !editedUser[field]?.trim());
    
    if (!user || missingFields.length > 0) {
      toast({
        title: "Erreur",
        description: `Veuillez remplir tous les champs obligatoires: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Mettre à jour l'utilisateur via l'API
      const updateData = {
        id: user.id,
        fullName: editedUser.fullName.trim(),
        phone: editedUser.phone.trim(),
         ...(editedUser.email?.trim() && { email: editedUser.email.trim() }),
        ...(user.role === 'agent' && { agentNumber: editedUser.agentNumber.trim() })
      };
      
      console.log('Données à envoyer:', updateData);
      
      const result = await apiUpdateUser(updateData);
      
      console.log('Résultat reçu:', result);
      
      if (result && result.success && result.user) {
        // Normaliser les données utilisateur reçues
        const normalizedUser = {
          ...result.user,
          balance: parseFloat(result.user.balance || 0),
          totalEarned: parseFloat(result.user.totalEarned || 0)
        };
        
        setUser(normalizedUser);
        localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
        setIsEditing(false);
        toast({
          title: "Profil mis à jour",
          description: "Vos informations ont été modifiées avec succès",
        });
      } else {
        throw new Error(result && result.error ? result.error : "Réponse inattendue du serveur");
      }
    } catch (error) {
      console.error('Erreur de mise à jour:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
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
      // Mettre à jour le mot de passe via l'API PHP backend
      const res = await fetch('/backend/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changePassword',
          id: user!.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        })
      });
      const result = await res.json();
      if (result && result.success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        toast({
          title: "Mot de passe modifié",
          description: "Votre mot de passe a été changé avec succès",
        });
      } else {
        throw new Error(result && result.error ? result.error : "Impossible de changer le mot de passe");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de changer le mot de passe",
        variant: "destructive",
      });
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
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Mon profil</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gérez vos informations personnelles et paramètres</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Profile Summary - Mobile optimisé */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="shadow-card">
              <CardHeader className="text-center p-4 sm:p-6">
                <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 bg-primary/10 rounded-full w-fit">
                  <UserIcon className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">{user.fullName}</CardTitle>
                <CardDescription className="text-sm sm:text-base">{user.phone}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Statut</span>
                  <Badge variant={user.accountStatus === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {user.accountStatus === 'active' ? 'Actif' : user.accountStatus}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Rôle</span>
                  <Badge variant="outline" className="text-xs">{user.role}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Membre depuis</span>
                  <span className="text-xs sm:text-sm">{new Date(user.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: '2-digit'
                  })}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">Solde</span>
                    <span className="font-semibold text-primary text-sm sm:text-base">{formatCurrency(user.balance)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">Total gagné</span>
                    <span className="font-semibold text-success text-sm sm:text-base">{
                      formatCurrency(
                        transactions
                          .filter(t => (t.type === 'earning' || t.type === 'commission') && t.status === 'approved')
                          .reduce((sum, t) => sum + t.amount, 0)
                      )
                    }</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">Code parrainage</span>
                    <span className="font-mono text-xs sm:text-sm">{user.referralCode}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                  Actions du compte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                <Button variant="destructive" className="w-full text-sm" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Se déconnecter
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Profile Settings - Mobile optimisé */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="personal" className="space-y-4 sm:space-y-6">
              <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
                <TabsTrigger value="personal" className="px-2 sm:px-4">Informations</TabsTrigger>
                <TabsTrigger value="security" className="px-2 sm:px-4">Sécurité</TabsTrigger>
                <TabsTrigger value="notifications" className="px-2 sm:px-4">Notifications</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card className="shadow-card">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      Informations personnelles
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Modifiez vos informations personnelles
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">

                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-xs sm:text-sm">Nom complet</Label>
                      <Input
                        id="fullName"
                        className="text-sm"
                        value={isEditing ? editedUser.fullName || '' : user.fullName}
                        onChange={(e) => setEditedUser({ ...editedUser, fullName: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs sm:text-sm">Numéro de téléphone</Label>
                      <Input
                        id="phone"
                        className="text-sm"
                        value={isEditing ? editedUser.phone || '' : user.phone}
                        onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs sm:text-sm">Adresse email</Label>
                      <Input
                        id="email"
                        type="email"
                        className="text-sm"
                        value={isEditing ? editedUser.email || '' : user.email || ''}
                        onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Champ agentNumber visible uniquement pour les agents */}
                    {user.role === 'agent' && (
                      <div className="space-y-2">
                        <Label htmlFor="agentNumber" className="text-xs sm:text-sm">Numéro d'agent (téléphone agent)</Label>
                        <Input
                            id="agentNumber"
                            className="text-sm"
                            value={user.agentNumber || ''}
                            readOnly
                            disabled
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Code de parrainage</Label>
                      <Input value={user.referralCode} disabled className="text-sm font-mono" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {isEditing ? (
                        <>
                          <Button onClick={handleUpdateProfile} className="text-sm" size="sm">
                            Sauvegarder
                          </Button>
                          <Button variant="outline" className="text-sm" size="sm" onClick={() => {
                            setIsEditing(false);
                            setEditedUser({
                              fullName: user.fullName,
                              phone: user.phone,
                              email: user.email || '',
                              agentNumber: user.agentNumber || '',
                            });
                          }}>
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setIsEditing(true)} className="text-sm" size="sm">
                          Modifier
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card className="shadow-card">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                      Sécurité
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Modifiez votre mot de passe
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Mot de passe actuel</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        className="text-sm"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-xs sm:text-sm">Nouveau mot de passe</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        className="text-sm"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirmer le nouveau mot de passe</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        className="text-sm"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      />
                    </div>

                    <Button onClick={handleChangePassword} className="text-sm" size="sm">
                      Changer le mot de passe
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications">
                <Card className="shadow-card">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                      Notifications
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      Gérez vos préférences de notification
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1 min-w-0 pr-4">
                        <Label className="text-xs sm:text-sm">Notifications par email</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Recevez des notifications importantes par email
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) => 
                          setNotifications({ ...notifications, emailNotifications: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1 min-w-0 pr-4">
                        <Label className="text-xs sm:text-sm">Notifications SMS</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Recevez des alertes importantes par SMS
                        </p>
                      </div>
                      <Switch
                        checked={notifications.smsNotifications}
                        onCheckedChange={(checked) => 
                          setNotifications({ ...notifications, smsNotifications: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1 min-w-0 pr-4">
                        <Label className="text-xs sm:text-sm">Emails marketing</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Recevez des offres et promotions spéciales
                        </p>
                      </div>
                      <Switch
                        checked={notifications.marketingEmails}
                        onCheckedChange={(checked) => 
                          setNotifications({ ...notifications, marketingEmails: checked })
                        }
                      />
                    </div>

                    <Button 
                      className="text-sm" 
                      size="sm" 
                      onClick={() => {
                        toast({
                          title: "Préférences sauvegardées",
                          description: "Vos préférences de notification ont été mises à jour",
                        });
                      }}
                    >
                      Sauvegarder les préférences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};