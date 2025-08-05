import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { useNavigate } from "react-router-dom";
import { User, Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowUpRight, ArrowDownRight, Gift, Users, Clock, Wallet } from "lucide-react";

export const History = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
        
        // Charger les transactions depuis le backend
        const transactionsRes = await fetch(`/backend/transactions.php?userId=${freshUser.id}`);
        if (!transactionsRes.ok) {
          throw new Error(`Erreur HTTP: ${transactionsRes.status}`);
        }
        const transactionsData = await transactionsRes.json();
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger l'historique",
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownRight className="h-4 w-4 text-white" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-white" />;
      case 'earning':
        return <Gift className="h-4 w-4 text-white" />;
      case 'commission':
        return <Users className="h-4 w-4 text-white" />;
      case 'transfer_sent':
        return <ArrowUpRight className="h-4 w-4 text-white" />;
      case 'transfer_received':
        return <ArrowDownRight className="h-4 w-4 text-white" />;
      default:
        return <Wallet className="h-4 w-4 text-white" />;
    }
  };

  const getStatusBadge = (status: string, transactionType?: string) => {
    switch (status) {
      case 'approved':
        // Pour les transferts, afficher "Terminé" au lieu de "Approuvé"
        if (transactionType === 'transfer_sent' || transactionType === 'transfer_received') {
          return <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-sm">Terminé</Badge>;
        }
        return <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-sm">Approuvé</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-sm">En attente</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-sm">Rejeté</Badge>;
      default:
        return <Badge variant="outline" className="border-violet-300 text-violet-700">{status}</Badge>;
    }
  };

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Dépôt';
      case 'withdrawal':
        return 'Retrait';
      case 'earning':
        return 'Gain journalier';
      case 'commission':
        return 'Commission parrainage';
      case 'purchase':
        return 'Achat de lot';
      case 'transfer_sent':
        return 'Transfert envoyé';
      case 'transfer_received':
        return 'Transfert reçu';
      default:
        return type;
    }
  };

  const filterTransactionsByType = (type: string) => {
    return transactions.filter(t => t.type === type);
  };

  const downloadStatement = () => {
    const statement = transactions.map(t => ({
      Date: new Date(t.createdAt).toLocaleDateString('fr-FR'),
      Type: getTransactionTypeText(t.type),
      Montant: formatCurrency(t.amount),
      Statut: t.status,
      Description: t.description || '',
    }));

    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Type,Montant,Statut,Description\n"
      + statement.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `releve_${user?.fullName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Téléchargement réussi",
      description: "Votre relevé a été téléchargé",
    });
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

  const deposits = filterTransactionsByType('deposit');
  const withdrawals = filterTransactionsByType('withdrawal');
  const earnings = filterTransactionsByType('earning');
  const commissions = filterTransactionsByType('commission');
  const transfers = transactions.filter(t => t.type === 'transfer_sent' || t.type === 'transfer_received');

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={user.role} onLogout={handleLogout} />
      
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8 pb-8 sm:pb-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-gradient-to-r from-violet-50 to-indigo-100 p-4 rounded-lg border border-violet-200">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 text-violet-800">Historique des transactions</h1>
            <p className="text-xs sm:text-sm lg:text-base text-violet-600">Suivez toutes vos activités financières</p>
          </div>
          <Button onClick={downloadStatement} className="gap-2 w-full sm:w-auto text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 border-0 shadow-md" size="sm">
            <Download className="h-4 w-4" />
            <span className="hidden xs:inline">Télécharger le relevé</span>
            <span className="inline xs:hidden">Relevé</span>
          </Button>
        </div>

        <Tabs defaultValue="deposits" className="space-y-3 sm:space-y-4 lg:space-y-6 mb-6 sm:mb-8">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 text-xs sm:text-sm bg-gradient-to-r from-violet-100 to-indigo-200 p-1 shadow-md">
            <TabsTrigger value="deposits" className="px-1 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">Dépôts ({deposits.length})</TabsTrigger>
            <TabsTrigger value="withdrawals" className="px-1 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md">Retraits ({withdrawals.length})</TabsTrigger>
            <TabsTrigger value="transfers" className="px-1 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md">Transferts ({transfers.length})</TabsTrigger>
            <TabsTrigger value="all" className="hidden sm:block px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-600 data-[state=active]:to-gray-700 data-[state=active]:text-white data-[state=active]:shadow-md">Toutes ({transactions.length})</TabsTrigger>
            <TabsTrigger value="earnings" className="hidden sm:block px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md">Gains ({earnings.length})</TabsTrigger>
            <TabsTrigger value="commissions" className="hidden sm:block px-2 sm:px-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md">Commissions ({commissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <TransactionList transactions={transactions} formatCurrency={formatCurrency} getTransactionIcon={getTransactionIcon} getStatusBadge={getStatusBadge} getTransactionTypeText={getTransactionTypeText} />
          </TabsContent>

          <TabsContent value="deposits">
            <TransactionList transactions={deposits} formatCurrency={formatCurrency} getTransactionIcon={getTransactionIcon} getStatusBadge={getStatusBadge} getTransactionTypeText={getTransactionTypeText} />
          </TabsContent>

          <TabsContent value="withdrawals">
            <TransactionList transactions={withdrawals} formatCurrency={formatCurrency} getTransactionIcon={getTransactionIcon} getStatusBadge={getStatusBadge} getTransactionTypeText={getTransactionTypeText} />
          </TabsContent>

          <TabsContent value="transfers">
            <TransactionList transactions={transfers} formatCurrency={formatCurrency} getTransactionIcon={getTransactionIcon} getStatusBadge={getStatusBadge} getTransactionTypeText={getTransactionTypeText} />
          </TabsContent>

          <TabsContent value="earnings">
            <TransactionList transactions={earnings} formatCurrency={formatCurrency} getTransactionIcon={getTransactionIcon} getStatusBadge={getStatusBadge} getTransactionTypeText={getTransactionTypeText} />
          </TabsContent>

          <TabsContent value="commissions">
            <TransactionList transactions={commissions} formatCurrency={formatCurrency} getTransactionIcon={getTransactionIcon} getStatusBadge={getStatusBadge} getTransactionTypeText={getTransactionTypeText} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

interface TransactionListProps {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
  getTransactionIcon: (type: string) => JSX.Element;
  getStatusBadge: (status: string, transactionType?: string) => JSX.Element;
  getTransactionTypeText: (type: string) => string;
}

const TransactionList = ({ transactions, formatCurrency, getTransactionIcon, getStatusBadge, getTransactionTypeText }: TransactionListProps) => {
  if (transactions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-violet-50 to-indigo-100 border-violet-200">
        <CardContent className="text-center py-6 sm:py-8 lg:py-12">
          <div className="p-4 bg-gradient-to-br from-violet-200 to-indigo-300 rounded-full w-fit mx-auto mb-2 sm:mb-3 lg:mb-4">
            <Clock className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-violet-700" />
          </div>
          <p className="text-xs sm:text-sm lg:text-base text-violet-700 font-medium">Aucune transaction dans cette catégorie</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3 lg:space-y-4">
      {transactions.map((transaction) => {
        // Définir les couleurs d'icône selon le type de transaction
        const getIconBackground = (type: string) => {
          switch (type) {
            case 'deposit':
              return 'bg-gradient-to-br from-blue-500 to-indigo-600';
            case 'withdrawal':
              return 'bg-gradient-to-br from-violet-500 to-purple-600';
            case 'earning':
              return 'bg-gradient-to-br from-emerald-500 to-green-600';
            case 'commission':
              return 'bg-gradient-to-br from-amber-500 to-orange-600';
            case 'transfer_sent':
              return 'bg-gradient-to-br from-indigo-500 to-violet-600';
            case 'transfer_received':
              return 'bg-gradient-to-br from-violet-500 to-indigo-600';
            default:
              return 'bg-gradient-to-br from-slate-500 to-gray-600';
          }
        };

        return (
          <Card key={transaction.id} className="shadow-card bg-gradient-to-br from-white to-violet-50 border-violet-200 hover:shadow-lg transition-all">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-1 min-w-0">
                  <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 shadow-md ${getIconBackground(transaction.type)}`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-base truncate text-violet-800">{getTransactionTypeText(transaction.type)}</h3>
                    <p className="text-xs sm:text-sm text-violet-600">
                      {new Date(transaction.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {transaction.description && (
                      <p className="text-xs sm:text-sm text-violet-500 mt-1 truncate">
                        {/* Ajuster le texte selon le type de transfert */}
                        {transaction.type === 'transfer_received' && transaction.description.includes('Transfert vers') 
                          ? transaction.description.replace('Transfert vers', 'Transfert de')
                          : transaction.description
                        }
                      </p>
                    )}
                    {transaction.paymentMethod && (
                      <p className="text-xs text-violet-500 truncate">
                        Méthode: {transaction.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-sm sm:text-base lg:text-xl font-bold text-indigo-800">{formatCurrency(transaction.amount)}</p>
                  <div className="mt-1">
                                                {getStatusBadge(transaction.status, transaction.type)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};