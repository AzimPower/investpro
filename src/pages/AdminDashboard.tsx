import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetTransactions, apiGetUsers } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, TrendingUp, Clock, Eye, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInvested: 0,
    totalWithdrawals: 0,
    totalCommissions: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Récupérer toutes les transactions
      const transactions = await apiGetTransactions();
      // Récupérer tous les utilisateurs
      const users = await apiGetUsers();

      // Calculs
      const totalInvested = transactions
        .filter((t: any) => t.type === 'deposit' && t.status === 'approved')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalWithdrawals = transactions
        .filter((t: any) => t.type === 'withdrawal' && t.status === 'approved')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalCommissions = transactions
        .filter((t: any) => t.type === 'commission')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const pendingDeposits = transactions
        .filter((t: any) => t.type === 'deposit' && t.status === 'pending').length;

      const pendingWithdrawals = transactions
        .filter((t: any) => t.type === 'withdrawal' && t.status === 'pending').length;

      setStats({
        totalUsers: users ? users.length : 0,
        totalInvested,
        totalWithdrawals,
        totalCommissions,
        pendingDeposits,
        pendingWithdrawals
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  return (
    <>
      <Navigation userRole="admin" />
      <div className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6 pb-8 sm:pb-12 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9]">

      {/* Statistics Cards - Mobile optimisé */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="card-gradient rounded-xl shadow-lg border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Utilisateurs</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="card-gradient rounded-xl shadow-lg border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Investi</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-sm sm:text-xl lg:text-2xl font-bold truncate">{formatAmount(stats.totalInvested)}</div>
          </CardContent>
        </Card>

        <Card className="card-gradient rounded-xl shadow-lg border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Retraits</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-sm sm:text-xl lg:text-2xl font-bold truncate">{formatAmount(stats.totalWithdrawals)}</div>
          </CardContent>
        </Card>

        <Card className="card-gradient rounded-xl shadow-lg border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium truncate">Total Commissions</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-sm sm:text-xl lg:text-2xl font-bold truncate">{formatAmount(stats.totalCommissions)}</div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl shadow-lg border-0 bg-yellow-50 hover:scale-[1.02] transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-yellow-800 truncate">Dépôts en Attente</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-yellow-900">{stats.pendingDeposits}</div>
            <Button 
              className="mt-1 sm:mt-2 w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold text-xs" 
              size="sm" 
              onClick={() => navigate('/admin/deposits')}
            >
              Gérer
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg border-0 bg-orange-50 hover:scale-[1.02] transition-transform duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-orange-800 truncate">Retraits en Attente</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-orange-900">{stats.pendingWithdrawals}</div>
            <Button 
              className="mt-1 sm:mt-2 w-full bg-orange-400 hover:bg-orange-500 text-orange-900 font-semibold text-xs" 
              size="sm"
              onClick={() => navigate('/admin/withdrawals')}
            >
              Gérer
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Mobile optimisé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Button onClick={() => navigate('/admin/users')} className="h-12 sm:h-16 w-full rounded-xl shadow-md bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 transition-all duration-200">
          <div className="text-center w-full">
            <Users className="w-5 h-5 sm:w-7 sm:h-7 mx-auto mb-1 text-blue-700" />
            <div className="text-xs sm:text-sm font-semibold text-blue-900">Utilisateurs</div>
          </div>
        </Button>
        
        <Button onClick={() => navigate('/admin/agents')} className="h-12 sm:h-16 w-full rounded-xl shadow-md bg-gradient-to-r from-indigo-100 to-indigo-200 hover:from-indigo-200 hover:to-indigo-300 transition-all duration-200" variant="secondary">
          <div className="text-center w-full">
            <Shield className="w-5 h-5 sm:w-7 sm:h-7 mx-auto mb-1 text-indigo-700" />
            <div className="text-xs sm:text-sm font-semibold text-indigo-900">Agents</div>
          </div>
        </Button>
        
        <Button onClick={() => navigate('/admin/lots')} className="h-12 sm:h-16 w-full rounded-xl shadow-md bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 transition-all duration-200" variant="secondary">
          <div className="text-center w-full">
            <TrendingUp className="w-5 h-5 sm:w-7 sm:h-7 mx-auto mb-1 text-green-700" />
            <div className="text-xs sm:text-sm font-semibold text-green-900">Lots</div>
          </div>
        </Button>
        
        <Button onClick={() => navigate('/admin/stats')} className="h-12 sm:h-16 w-full rounded-xl shadow-md bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 transition-all duration-200" variant="outline">
          <div className="text-center w-full">
            <Eye className="w-5 h-5 sm:w-7 sm:h-7 mx-auto mb-1 text-purple-700" />
            <div className="text-xs sm:text-sm font-semibold text-purple-900">Statistiques</div>
          </div>
        </Button>
      </div>
      </div>
    </>
  );
}