import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { User, InvestmentLot } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useNotify } from "@/hooks/useNotify";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, Gem, Star, Crown, Zap } from "lucide-react";

const lotIcons = {
  Topaze: Zap,
  Rubis: TrendingUp,
  Saphir: Star,
  Émeraude: Gem,
  Diamant: Crown,
};

// Fonction utilitaire pour vérifier si un lot peut être acheté
const canPurchaseLot = (lot: InvestmentLot, user: User, activeLot: InvestmentLot | null) => {
  console.log('Vérification d\'achat:', {
    lotName: lot.name,
    lotPrice: lot.price,
    lotPriceType: typeof lot.price,
    userBalance: user.balance,
    userBalanceType: typeof user.balance,
    comparison: user.balance < lot.price,
    userBalanceNumber: Number(user.balance),
    lotPriceNumber: Number(lot.price),
    comparisonNumber: Number(user.balance) < Number(lot.price)
  });
  
  // Vérifie si c'est déjà le lot actif
  if (activeLot && activeLot.id === lot.id) return { canBuy: false, reason: 'already_active' };
  
  // Vérifie si le lot est inférieur ou égal au lot actif (seuls les lots supérieurs sont autorisés)
  if (activeLot && Number(lot.price) <= Number(activeLot.price)) {
    return { canBuy: false, reason: 'not_superior' };
  }
  
  // Vérifie si l'utilisateur a assez d'argent - conversion en nombres pour éviter les problèmes de type
  const userBalanceNum = Number(user.balance);
  const lotPriceNum = Number(lot.price);
  
  if (userBalanceNum < lotPriceNum) {
    console.log('Solde insuffisant détecté:', { userBalanceNum, lotPriceNum });
    return { canBuy: false, reason: 'insufficient_balance' };
  }
  
  return { canBuy: true, reason: null };
};

// Fonction utilitaire pour obtenir les styles d'un lot
const getLotStyles = (lotName: string) => {
  const styles = {
    Topaze: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', icon: 'text-yellow-600 dark:text-yellow-400' },
    Rubis: { bg: 'bg-red-100 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400' },
    Saphir: { bg: 'bg-blue-100 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' },
    Émeraude: { bg: 'bg-green-100 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400' },
    Diamant: { bg: 'bg-purple-100 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
  };
  return styles[lotName as keyof typeof styles] || { bg: 'bg-gray-100 dark:bg-gray-900/20', icon: 'text-gray-600 dark:text-gray-400' };
};

export const Lots = () => {
  const [user, setUser] = useState<User | null>(null);
  const [lots, setLots] = useState<InvestmentLot[]>([]);
  const [activeLot, setActiveLot] = useState<InvestmentLot | null>(null);
  const [activeUserLot, setActiveUserLot] = useState<any>(null);
  const [isLotExpired, setIsLotExpired] = useState(false);
  const [selectedLot, setSelectedLot] = useState<InvestmentLot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Ajout d'un état pour empêcher les doubles clics
  const [isPurchasing, setIsPurchasing] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const notify = useNotify();

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUserData = localStorage.getItem('currentUser');
        if (!currentUserData) {
          navigate('/login');
          return;
        }
        const localUserData = JSON.parse(currentUserData);
        
        // Récupérer les données utilisateur fraîches depuis la BD
        const userRes = await fetch(`/backend/users.php?id=${localUserData.id}`);
        const freshUserData = await userRes.json();
        
        console.log('Données utilisateur depuis la BD:', freshUserData); // Pour déboguer
        console.log('Type du solde:', typeof freshUserData.balance, 'Valeur:', freshUserData.balance);
        
        if (!freshUserData || !freshUserData.id) {
          localStorage.removeItem('currentUser');
          navigate('/login');
          return;
        }
        
        // Mettre à jour localStorage avec les données fraîches
        localStorage.setItem('currentUser', JSON.stringify(freshUserData));
        setUser(freshUserData);
        
        // Charger les lots depuis l'API PHP backend
        const lotsRes = await fetch('/backend/lots.php');
        const lotsData = await lotsRes.json();
        console.log('Données des lots:', lotsData);
        // Trier les lots par prix croissant pour afficher la hiérarchie correcte
        const sortedLots = Array.isArray(lotsData) ? lotsData.sort((a, b) => Number(a.price) - Number(b.price)) : [];
        setLots(sortedLots);
        
        // Récupérer le lot actif de l'utilisateur
        const userLotsRes = await fetch(`/backend/user_lots.php?userId=${freshUserData.id}`);
        const userLots = await userLotsRes.json();
        
        // Trouver le lot actif (active = 1)
        const foundActiveUserLot = userLots.find((ul: any) => ul.active === 1 || ul.active === '1');
        setActiveUserLot(foundActiveUserLot || null);
        if (foundActiveUserLot && Array.isArray(lotsData)) {
          const activeLotData = lotsData.find((lot: any) => lot.id === foundActiveUserLot.lotId);
          setActiveLot(activeLotData || null);
          // Vérifier expiration du lot
          if (activeLotData && foundActiveUserLot.purchasedAt && activeLotData.duration) {
            const purchasedAt = new Date(foundActiveUserLot.purchasedAt);
            const expiration = new Date(purchasedAt.getTime() + activeLotData.duration * 24 * 60 * 60 * 1000);
            setIsLotExpired(new Date() >= expiration);
          } else {
            setIsLotExpired(false);
          }
        } else {
          setIsLotExpired(false);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
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

  const handlePurchaseLot = async () => {
    if (!selectedLot || !user) {
      toast({
        title: "Erreur",
        description: "Aucun lot sélectionné",
        variant: "destructive",
      });
      return;
    }

    // Vérifier si un achat est déjà en cours
    if (isPurchasing) {
      toast({
        title: "Achat en cours",
        description: "Un achat est déjà en cours de traitement. Veuillez patienter.",
        variant: "destructive",
      });
      return;
    }

    const purchaseCheck = canPurchaseLot(selectedLot, user, activeLot);

    if (!purchaseCheck.canBuy) {
      const errorMessages = {
        insufficient_balance: `Votre solde (${formatCurrency(user.balance)}) est insuffisant pour ce lot (${formatCurrency(selectedLot.price)})`,
        already_active: "Ce lot est déjà votre lot actif",
        not_superior: "Vous pouvez seulement passer à un lot de niveau supérieur (prix plus élevé)"
      };
      
      toast({
        title: "Erreur",
        description: errorMessages[purchaseCheck.reason as keyof typeof errorMessages],
        variant: "destructive",
      });
      return;
    }

    try {
      // Marquer le début de l'achat
      setIsPurchasing(true);

      console.log('Données envoyées pour l\'achat:', {
        action: 'purchase',
        userId: user.id,
        lotId: selectedLot.id,
        userBalance: user.balance,
        lotPrice: selectedLot.price
      });
      
      // Appel à l'API PHP pour gérer l'achat et les commissions
      const res = await fetch('/backend/lots.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'purchase',
          userId: user.id,
          lotId: selectedLot.id,
        })
      });
      
      // Vérifier si la réponse est valide
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Erreur serveur détaillée:', errorText);
        throw new Error(`Erreur serveur: ${res.status} - ${errorText}`);
      }
      
      const responseText = await res.text();
      console.log('Réponse brute du serveur:', responseText); // Pour déboguer
      
      if (!responseText.trim()) {
        throw new Error("Le serveur a retourné une réponse vide");
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erreur de parsing JSON:', parseError);
        throw new Error("Réponse serveur invalide");
      }
      
      if (!result.success) {
        throw new Error(result.error || "Erreur lors de l'achat du lot");
      }

      // Rafraîchir l'utilisateur et le lot actif
      const userRes = await fetch(`/backend/users.php?id=${user.id}`);
      const updatedUser = await userRes.json();
      
      // Mettre à jour localStorage avec les données fraîches
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Réinitialiser la date de réclamation pour permettre une réclamation immédiate
      localStorage.removeItem(`lastClaimDate_${user.id}`);
      
      // Récupérer le nouveau lot actif
      const userLotsRes = await fetch(`/backend/user_lots.php?userId=${user.id}`);
      const userLots = await userLotsRes.json();
      const activeUserLot = userLots.find((ul: any) => ul.active === 1 || ul.active === '1');
      if (activeUserLot) {
        const activeLotData = lots.find((lot: any) => lot.id === activeUserLot.lotId);
        setActiveLot(activeLotData || null);
      }
      toast({
        title: "Achat validé",
        description: `Vous avez activé le lot ${selectedLot.name}.`,
      });

      // Notification persistante d'achat de lot
      notify.transaction.purchase(selectedLot.name, selectedLot.price);
      
      setIsDialogOpen(false);
      setSelectedLot(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'achat du lot";
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });

      // Notification d'erreur persistante
      notify.error(
        'Échec de l\'achat',
        errorMessage,
        { category: 'transaction' }
      );
    } finally {
      // Marquer la fin de l'achat
      setIsPurchasing(false);
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
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
        <Navigation userRole="user" onLogout={handleLogout} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            <p className="mt-4 text-violet-700">Chargement des lots...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
      <Navigation userRole={user.role} onLogout={handleLogout} />
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8 pb-8 sm:pb-12">
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <Card className="bg-gradient-to-br from-white to-violet-50 border border-violet-200 shadow-lg p-4 sm:p-6 mb-2">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-violet-800">Acheter un lot</CardTitle>
              <CardDescription className="text-sm sm:text-base text-violet-600 mt-1">Choisissez votre lot d'investissement</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs sm:text-sm text-violet-600">Votre solde actuel :</span>
                <span className="font-semibold text-violet-700 text-sm sm:text-base bg-violet-100 px-2 py-1 rounded-lg">{formatCurrency(user.balance)}</span>
              </div>
            </CardContent>
          </Card>
          {activeLot ? (
            isLotExpired ? (
              <>
                <div className="mt-2 text-xs sm:text-sm text-red-600 bg-red-100 p-2 rounded-lg border border-red-300 font-semibold">
                  ⚠️ Votre lot actif a expiré. Vous devez le désactiver pour pouvoir acheter un nouveau lot.
                </div>
                <Dialog open={isLotExpired}>
                  <DialogContent className="max-w-[95vw] sm:max-w-md bg-white border border-red-200">
                    <DialogHeader>
                      <DialogTitle className="text-lg sm:text-xl text-red-700">Lot expiré</DialogTitle>
                      <DialogDescription className="text-sm sm:text-base text-red-600">
                        Votre lot actif a atteint sa durée maximale. Pour continuer, vous devez le désactiver.<br />
                        Cliquez sur <b>OK</b> pour désactiver ce lot et pouvoir acheter un nouveau lot.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center mt-4">
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white px-6"
                        onClick={async () => {
                          if (!activeUserLot) return;
                          await fetch('/backend/user_lots.php', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: activeUserLot.id,
                              active: 0,
                              lastEarningDate: activeUserLot.lastEarningDate || null
                            })
                          });
                          // Recharge les données utilisateur/lots pour forcer le refresh
                          window.location.reload();
                        }}
                      >
                        OK
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="mt-2 text-xs sm:text-sm text-violet-700 bg-violet-100 p-2 rounded-lg border border-violet-300">
                💡 Vous pouvez seulement passer à un lot supérieur (prix plus élevé)
              </div>
            )
          ) : (
            <div className="mt-2 text-xs sm:text-sm text-violet-600">
              Commencez par le lot Topaze gratuit ou choisissez directement un lot payant
            </div>
          )}
          {activeLot && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-300 rounded-lg shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`p-2 rounded-full bg-gradient-to-br from-violet-200 to-purple-300 flex-shrink-0`}>
                    {(() => {
                      const IconComponent = lotIcons[activeLot.name as keyof typeof lotIcons] || TrendingUp;
                      return <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 text-violet-700`} />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-medium text-violet-600">Lot actuel :</span>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="font-bold text-violet-800 text-sm sm:text-lg">{activeLot.name}</span>
                      <span className="text-xs sm:text-sm text-violet-600">({formatCurrency(activeLot.price)})</span>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-xs sm:text-sm text-violet-600">Gain journalier</p>
                  <p className="font-semibold text-green-600 text-sm sm:text-base">{formatCurrency(activeLot.dailyReturn)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {lots.filter(lot => Number(lot.active) === 1).map((lot, index) => {
            const IconComponent = lotIcons[lot.name as keyof typeof lotIcons] || TrendingUp;
            const purchaseStatus = canPurchaseLot(lot, user, activeLot);
            const lotStyles = getLotStyles(lot.name);
            // Déterminer le niveau hiérarchique (1 = plus bas, 5 = plus haut)
            const hierarchyLevel = index + 1;
            const isHighestTier = index === (lots.filter(l => Number(l.active) === 1).length - 1);
            const cardClass = [
              'shadow-lg hover:shadow-xl',
              'transition-all',
              'hover:transform hover:scale-105',
              'border border-violet-200',
              'relative',
              'bg-gradient-to-br from-white to-violet-50',
              purchaseStatus.canBuy && !isPurchasing ? 'cursor-pointer hover:border-violet-400 hover:shadow-violet-200' : 'opacity-60',
              purchaseStatus.reason === 'already_active' ? 'ring-2 ring-violet-400 bg-violet-100' : '',
              isHighestTier ? 'border-purple-400 ring-2 ring-purple-300' : ''
            ].join(' ');
            return (
              <Card key={lot.id} className={cardClass}>
                {/* Badge de niveau hiérarchique */}
                <div className="absolute top-2 right-2 z-10">
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-bold shadow-md
                    ${isHighestTier ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white' : 
                      hierarchyLevel >= 4 ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' :
                      hierarchyLevel >= 3 ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' :
                      hierarchyLevel >= 2 ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white' :
                      'bg-gradient-to-r from-gray-500 to-slate-600 text-white'}
                  `}>
                    Niveau {hierarchyLevel}
                  </div>
                </div>
                <CardHeader className="text-center p-4 sm:p-6">
                  <div className={`mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-full w-fit bg-gradient-to-br from-violet-100 to-purple-200 shadow-md`}>
                    <IconComponent className={`h-6 w-6 sm:h-8 sm:w-8 text-violet-600`} />
                  </div>
                  <CardTitle className="text-lg sm:text-xl flex items-center justify-center gap-2 text-violet-800">
                    {lot.name}
                    {isHighestTier && <Crown className="h-4 w-4 text-purple-600" />}
                  </CardTitle>
                  <CardDescription className="text-xl sm:text-2xl font-bold text-violet-700 mt-2">
                    {lot.price === 0 ? 'GRATUIT' : formatCurrency(lot.price)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-violet-600">Gain journalier</p>
                    <p className="text-lg sm:text-xl font-semibold text-green-600">{formatCurrency(lot.dailyReturn)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-violet-600">Durée</p>
                    <p className="text-base sm:text-lg font-semibold text-violet-700">
                      {lot.duration} jours
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-violet-600">ROI quotidien</p>
                    <p className="text-base sm:text-lg font-semibold text-violet-700">
                      {lot.price > 0 ? ((lot.dailyReturn / lot.price) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <Dialog open={isDialogOpen && selectedLot?.id === lot.id} onOpenChange={(open) => {
                    if (!isPurchasing) {
                      setIsDialogOpen(open);
                      if (!open) {
                        setSelectedLot(null);
                      }
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full mt-3 sm:mt-4 text-sm sm:text-base bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all"
                        size="sm"
                        disabled={!purchaseStatus.canBuy || isPurchasing}
                        onClick={() => {
                          if (!isPurchasing) {
                            setSelectedLot(lot);
                            setIsDialogOpen(true);
                          }
                        }}
                      >
                        {isPurchasing ? 'Achat en cours...' :
                         purchaseStatus.reason === 'already_active' ? 'Lot actuel' : 
                         purchaseStatus.reason === 'not_superior' ? 'Lot déjà possédé' :
                         purchaseStatus.reason === 'insufficient_balance' ? 'Solde insuffisant' : 
                         lot.price === 0 ? 'Activer gratuitement' : 'Acheter'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-lg bg-gradient-to-br from-white to-violet-50 border border-violet-200">
                      <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl text-violet-800">Confirmer l'achat - {lot.name}</DialogTitle>
                        <DialogDescription className="text-sm sm:text-base text-violet-600">
                          Prix : {formatCurrency(lot.price)} | Gain journalier : {formatCurrency(lot.dailyReturn)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-violet-100 p-3 sm:p-4 rounded-lg border border-violet-200">
                          <p className="text-xs sm:text-sm text-violet-700">
                            Êtes-vous sûr de vouloir acheter ce lot ? Le montant sera déduit de votre solde et ce lot deviendra votre lot actif.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-violet-300 text-violet-700 hover:bg-violet-100"
                            disabled={isPurchasing}
                            onClick={() => {
                              if (!isPurchasing) {
                                setIsDialogOpen(false);
                                setSelectedLot(null);
                              }
                            }}
                          >
                            Annuler
                          </Button>
                          <Button 
                            className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0" 
                            onClick={handlePurchaseLot}
                            disabled={isPurchasing}
                          >
                            {isPurchasing ? 'Achat en cours...' : 'Confirmer l\'achat'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};