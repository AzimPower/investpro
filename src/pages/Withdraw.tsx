import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { User } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { isValidPhoneNumber } from 'libphonenumber-js';
import { MuiTelInput } from 'mui-tel-input';
import { ArrowUpRight, Wallet, Clock, AlertCircle, CheckCircle } from "lucide-react";

export const Withdraw = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  
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
        const freshUser = await userRes.json();
        if (!freshUser || !freshUser.id) {
          localStorage.removeItem('currentUser');
          navigate('/login');
          return;
        }
        
        // Calculer les gains journaliers depuis les transactions
        const transactionsRes = await fetch(`/backend/transactions.php?userId=${freshUser.id}`);
        const transactionsData = await transactionsRes.json();
        
        let dailyEarnings = 0;
        if (transactionsData && Array.isArray(transactionsData)) {
          const today = new Date().toISOString().split('T')[0];
          dailyEarnings = transactionsData
            .filter(t => t.type === 'earning' && t.createdAt && t.createdAt.startsWith(today))
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        }
        
        // Charger les méthodes de paiement depuis les paramètres
        const settingsRes = await fetch('/backend/settings.php');
        const settings = await settingsRes.json();
        if (settings && settings.paymentMethods) {
          setPaymentMethods(settings.paymentMethods);
        }
        
        setUser({ ...freshUser, dailyEarnings });
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
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
    navigate('/');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount || !withdrawMethod || !paymentDetails) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant valide",
        variant: "destructive",
      });
      return;
    }

    if (amount > user.balance) {
      toast({
        title: "Solde insuffisant",
        description: `Votre solde (${formatCurrency(user.balance)}) est insuffisant pour ce retrait`,
        variant: "destructive",
      });
      return;
    }

    const minWithdraw = 5000;
    if (amount < minWithdraw) {
      toast({
        title: "Montant trop faible",
        description: `Le montant minimum de retrait est de ${formatCurrency(minWithdraw)}`,
        variant: "destructive",
      });
      return;
    }

    // Nettoyer le numéro international si la méthode est mobile money
    let cleanedDetails = paymentDetails.replace(/\s+/g, '');
    if (withdrawMethod.includes('moov') || withdrawMethod.includes('orange') || withdrawMethod.includes('wave')) {
      if (!isValidPhoneNumber(cleanedDetails)) {
        toast({
          title: "Numéro invalide",
          description: "Veuillez saisir un numéro de téléphone international valide (ex: +22673254655)",
          variant: "destructive",
        });
        return;
      }
    }

    // Calculer le montant net à envoyer dans la transaction
    const netAmount = getNetAmount(amount);

    setIsSubmitting(true);
    try {
      // Débiter le solde utilisateur immédiatement via l'API PHP backend
      const updateRes = await fetch('/backend/users.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          balance: user.balance - amount,
        })
      });
      
      if (!updateRes.ok) {
        throw new Error(`Erreur HTTP: ${updateRes.status}`);
      }
      
      const updateResult = await updateRes.json();
      if (!updateResult || !updateResult.success) {
        throw new Error(updateResult && updateResult.error ? updateResult.error : "Erreur lors de la mise à jour du solde utilisateur");
      }
      
      // Créer la transaction de retrait via l'API PHP backend
      const transactionRes = await fetch('/backend/transactions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: 'withdrawal',
          amount: netAmount,
          status: 'pending',
          description: `Demande de retrait via ${withdrawMethod}`,
          paymentMethod: withdrawMethod,
          paymentProof: cleanedDetails,
        })
      });
      
      if (!transactionRes.ok) {
        throw new Error(`Erreur HTTP: ${transactionRes.status}`);
      }
      
      const transactionResult = await transactionRes.json();
      if (!transactionResult || !transactionResult.success) {
        // Si la transaction échoue, essayer de restaurer le solde
        try {
          await fetch('/backend/users.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: user.id,
              balance: user.balance, // Restaurer l'ancien solde
            })
          });
        } catch (restoreError) {
          console.error('Erreur lors de la restauration du solde:', restoreError);
        }
        throw new Error(transactionResult && transactionResult.error ? transactionResult.error : "Erreur lors de la création de la transaction");
      }
      
      // Mettre à jour l'état local de l'utilisateur avec le nouveau solde
      const updatedUser = { ...user, balance: user.balance - amount };
      setUser(updatedUser);
      
      // Mettre à jour les données dans localStorage pour éviter la déconnexion
      const currentUserData = localStorage.getItem('currentUser');
      if (currentUserData) {
        const userData = JSON.parse(currentUserData);
        const updatedUserData = { ...userData, balance: user.balance - amount };
        localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
      }
      
      toast({
        title: "Demande envoyée",
        description: "Votre demande de retrait a été envoyée et sera traitée dans un délai de 24h maximum.",
      });
      // Reset form
      setWithdrawAmount("");
      setWithdrawMethod("");
      setPaymentDetails("");
      
      // Optionnel : naviguer vers l'historique après un délai
      // setTimeout(() => navigate('/history'), 2000);
    } catch (error) {
      console.error('Erreur de retrait:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'envoi de la demande",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateFees = (amount: number) => {
    // Example: 2% fee with minimum 500 FCFA
    const feePercentage = 0.02;
    const minFee = 500;
    const fee = Math.max(amount * feePercentage, minFee);
    return Math.min(fee, amount); // Fee cannot exceed the withdrawal amount
  };

  const getNetAmount = (amount: number) => {
    return amount - calculateFees(amount);
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

  const amount = parseFloat(withdrawAmount) || 0;
  const fees = calculateFees(amount);
  const netAmount = getNetAmount(amount);

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={user.role} onLogout={handleLogout} />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8 pb-8 sm:pb-12">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Retirer mes gains</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Retirez vos bénéfices en toute sécurité</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Balance Info - Mobile optimisé */}
          <Card className="shadow-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                Informations du compte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Solde disponible</span>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">{formatCurrency(user.balance)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Gains journaliers</span>
                <span className="text-sm sm:text-base lg:text-lg font-semibold text-success">
                  {formatCurrency(user.dailyEarnings || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Total gagné</span>
                <span className="text-sm sm:text-base lg:text-lg font-semibold text-accent">
                  {formatCurrency(user.totalEarned || 0)}
                </span>
              </div>
              
              <Separator />
              
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="font-medium text-warning text-sm sm:text-base">Informations importantes</span>
                </div>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <li>• Montant minimum de retrait : 5 000 FCFA</li>
                  <li>• Frais de retrait : 10% (minimum 500 FCFA)</li>
                  <li>• Délai de traitement : 24h maximum</li>
                  <li>• Vérification d'identité requise pour les gros montants</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Form - Mobile optimisé */}
          <Card className="shadow-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                Demande de retrait
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Remplissez le formulaire pour effectuer votre retrait
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs sm:text-sm">Montant à retirer (FCFA)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ex: 50000"
                  className="text-sm"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="5000"
                  max={user.balance}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum disponible : {formatCurrency(user.balance)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method" className="text-xs sm:text-sm">Méthode de retrait</Label>
                <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Choisir une méthode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method.toLowerCase().replace(/\s+/g, '-')}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reception-phone" className="text-xs sm:text-sm">Numéro de réception</Label>
                <MuiTelInput
                  id="reception-phone"
                  value={paymentDetails}
                  onChange={setPaymentDetails}
                  defaultCountry="BF"
                  fullWidth
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Saisissez le numéro de téléphone international du compte à créditer
                </p>
                {paymentDetails && !isValidPhoneNumber(paymentDetails.replace(/\s+/g, '')) && (
                  <p className="text-xs text-red-500">Numéro international invalide</p>
                )}
              </div>

              {amount > 0 && (
                <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm sm:text-base">Récapitulatif</h4>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Montant demandé</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span>Frais de retrait</span>
                    <span className="text-destructive">-{formatCurrency(fees)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-sm sm:text-base">
                    <span>Montant à recevoir</span>
                    <span className="text-success">{formatCurrency(netAmount)}</span>
                  </div>
                </div>
              )}

              <Button 
                className="w-full text-sm" 
                size="sm"
                onClick={handleWithdraw}
                disabled={isSubmitting || !withdrawAmount || !withdrawMethod || !paymentDetails || amount > user.balance || amount < 5000}
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Confirmer le retrait
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                className="w-full text-sm" 
                size="sm"
                onClick={() => navigate('/history')}
              >
                Consulter l'historique
              </Button>

              <div className="bg-success/10 border border-success/20 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="font-medium text-success text-sm sm:text-base">Processus sécurisé</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Votre demande sera vérifiée et traitée par notre équipe dans un délai de 24h maximum. 
                  Vous recevrez une notification une fois le paiement effectué.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};