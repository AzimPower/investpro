import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetTransactions, apiGetUserById } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, TrendingUp, TrendingDown, RefreshCw, ArrowUpCircle, ArrowDownCircle, User, Phone, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0
  });
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);


  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      // Récupérer l'utilisateur connecté depuis localStorage
      const currentUserData = localStorage.getItem('currentUser');
      if (!currentUserData) return;
      const userData = JSON.parse(currentUserData);
      
      // Charger l'utilisateur complet depuis l'API MySQL
      const agent = await apiGetUserById(userData.id);
      if (!agent || !agent.agentNumber) return;
      
      // Stocker les informations de l'agent
      setAgentInfo(agent);
      
      const agentNumber = agent.agentNumber;
      
      // Charger toutes les transactions depuis l'API MySQL
      const transactions = await apiGetTransactions();
      if (!transactions) return;
      
      // Filtrer les dépôts par agentNumber, mais les retraits sont visibles pour tous
      const agentDeposits = transactions.filter(t => t.type === 'deposit' && String(t.agentNumber) === String(agentNumber));
      const totalDeposits = agentDeposits.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
      const pendingDeposits = agentDeposits.filter(t => t.status === 'pending').length;

      const allWithdrawals = transactions.filter(t => t.type === 'withdrawal');
      const totalWithdrawals = allWithdrawals.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.amount, 0);
      const pendingWithdrawals = allWithdrawals.filter(t => t.status === 'pending').length;

      setStats({ totalDeposits, totalWithdrawals, pendingDeposits, pendingWithdrawals });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  return (
    <>
      <Navigation userRole="agent" />
      <div className="p-2 sm:p-4 space-y-4 sm:space-y-6 mb-16 sm:mb-24 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9]">
        {/* Header avec bouton refresh */}
        <div className="flex items-center justify-between gap-3 bg-white/80 rounded-lg shadow-md p-3 sm:p-4">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold gradient-text">Tableau de Bord Agent</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-1">
                Dernière mise à jour: {lastUpdated.toLocaleTimeString('fr-FR')}
              </p>
            )}
          </div>
          <Button 
            onClick={loadStats}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading && <span className="ml-2 hidden sm:inline">Actualisation...</span>}
          </Button>
        </div>

        {/* Informations de l'agent connecté */}
        {agentInfo && (
          <div className="bg-white/90 rounded-lg shadow-md p-3 sm:p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 rounded-full p-2">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Agent Connecté</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-gray-600">Nom:</span>
                  <p className="font-medium text-gray-900">{agentInfo.fullName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-gray-600">Téléphone:</span>
                  <p className="font-medium text-gray-900">{agentInfo.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-gray-600">N° Agent:</span>
                  <p className="font-medium text-blue-600">{agentInfo.agentNumber}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques - Layout mobile optimisé */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">

          {/* Total dépôts */}
          <Card className="rounded-lg shadow-lg border-0 bg-gradient-to-br from-green-50 to-emerald-50 hover:scale-[1.02] transition-transform duration-200">
            <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
                <div className="text-right">
                  <div className="text-sm sm:text-lg font-bold text-green-900 leading-tight">{formatAmount(stats.totalDeposits)}</div>
                  <CardTitle className="text-xs sm:text-sm text-green-800 leading-tight">Total Dépôts</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 pt-0">
              <div className="text-xs text-green-700 text-center">Montant approuvé</div>
            </CardContent>
          </Card>

          {/* Total retraits */}
          <Card className="rounded-lg shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 hover:scale-[1.02] transition-transform duration-200">
            <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
              <div className="flex items-center justify-between">
                <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                <div className="text-right">
                  <div className="text-sm sm:text-lg font-bold text-blue-900 leading-tight">{formatAmount(stats.totalWithdrawals)}</div>
                  <CardTitle className="text-xs sm:text-sm text-blue-800 leading-tight">Total Retraits</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 pt-0">
              <div className="text-xs text-blue-700 text-center">Montant approuvé</div>
            </CardContent>
          </Card>

          {/* Dépôts en attente */}
          <Card className="rounded-lg shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-amber-50 hover:scale-[1.02] transition-transform duration-200">
            <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
              <div className="flex items-center justify-between">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 flex-shrink-0" />
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-yellow-900">{stats.pendingDeposits}</div>
                  <CardTitle className="text-xs sm:text-sm text-yellow-800 leading-tight">Dépôts en Attente</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 pt-0">
              <Button 
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold text-xs sm:text-sm h-7 sm:h-8" 
                size="sm" 
                onClick={() => navigate('/agent/deposits')}
              >
                <ArrowUpCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Gérer
              </Button>
            </CardContent>
          </Card>

          {/* Retraits en attente */}
          <Card className="rounded-lg shadow-lg border-0 bg-gradient-to-br from-orange-50 to-red-50 hover:scale-[1.02] transition-transform duration-200">
            <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
              <div className="flex items-center justify-between">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0" />
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-orange-900">{stats.pendingWithdrawals}</div>
                  <CardTitle className="text-xs sm:text-sm text-orange-800 leading-tight">Retraits en Attente</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 pt-0">
              <Button 
                className="w-full bg-orange-400 hover:bg-orange-500 text-orange-900 font-semibold text-xs sm:text-sm h-7 sm:h-8" 
                size="sm" 
                onClick={() => navigate('/agent/withdrawals')}
              >
                <ArrowDownCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Gérer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
