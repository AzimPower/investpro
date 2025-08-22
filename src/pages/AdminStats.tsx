import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetUsers, apiGetTransactions, apiGetUserLots, apiGetUserById, apiGetSettings } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Users, Award, DollarSign, Calendar, Clock, CreditCard, UserCheck, UserX, Shield, Filter, Download, BarChart3 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserStats {
  user: any;
  totalInvested: number;
  totalEarned: number;
  referrals: number;
  commissions: number;
}

interface PeriodStats {
  date: string;
  deposits: number;
  withdrawals: number;
  newUsers: number;
  earnings: number;
  commissions: number;
  activeUsers: number;
}

export default function AdminStats() {
  const [topPerformers, setTopPerformers] = useState<UserStats[]>([]);
  const [topAffiliates, setTopAffiliates] = useState<UserStats[]>([]);
  const [periodStats, setPeriodStats] = useState<PeriodStats[]>([]);
  const [filteredStats, setFilteredStats] = useState<PeriodStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | '7days' | '30days' | '3months' | '6months' | '1year'>('30days');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    activeUsers: 0,
    blockedUsers: 0,
    totalInvested: 0,
    totalEarned: 0,
    totalCommissions: 0,
    totalWithdrawals: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    avgDepositAmount: 0,
    avgWithdrawalAmount: 0,
    conversionRate: 0,
    retentionRate: 0
  });

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod, dateRange]);

  const getPeriodDates = () => {
    const now = new Date();
    let startDate: Date;
    let days: number;
    
    // Si des dates personnalisées sont entrées, les utiliser en priorité
    if (dateRange.startDate && dateRange.endDate) {
      startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le jour de fin
      return { startDate, days, endDate };
    }

    // Sinon utiliser la période prédéfinie
    switch (selectedPeriod) {
      case 'today':
        startDate = startOfDay(now);
        days = 1;
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        days = 1;
        break;
      case '7days':
        startDate = subDays(now, 7);
        days = 7;
        break;
      case '3months':
        startDate = subDays(now, 90);
        days = 90;
        break;
      case '6months':
        startDate = subDays(now, 180);
        days = 180;
        break;
      case '1year':
        startDate = subDays(now, 365);
        days = 365;
        break;
      default: // 30days
        startDate = subDays(now, 30);
        days = 30;
    }

    return { startDate, days, endDate: now };
  };

  const loadStatistics = async () => {
    try {
      // Récupérer les données depuis l'API backend
      const users = await apiGetUsers();
      const transactions = await apiGetTransactions();
      const { startDate, days, endDate } = getPeriodDates();

      // Calculate user statistics
      const userStats: UserStats[] = users.map((user: any) => {
        const userTransactions = transactions.filter((t: any) => t.userId === user.id);
        
        // Récupérer les filleuls de cet utilisateur (utilisateurs qui ont ce user comme parrain)
        const referrals = users.filter((u: any) => u.referredBy === user.id || u.referredBy === user.referralCode);

        const totalInvested = userTransactions
          .filter((t: any) => t.type === 'deposit' && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const commissions = userTransactions
          .filter((t: any) => t.type === 'commission')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        return {
          user,
          totalInvested,
          totalEarned: Number(user.totalEarned) || 0,
          referrals: referrals.length,
          commissions
        };
      });

      // Top performers by total earned
      const topByEarnings = userStats
        .filter(stats => stats.user.role === 'user')
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 10);

      // Top affiliates by referrals and commissions
      const topByAffiliation = userStats
        .filter(stats => stats.referrals > 0 || stats.commissions > 0)
        .sort((a, b) => {
          // Priorité aux filleuls, puis aux commissions
          const scoreA = a.referrals * 1000 + a.commissions;
          const scoreB = b.referrals * 1000 + b.commissions;
          return scoreB - scoreA;
        })
        .slice(0, 10);

      console.log('Top Affiliates Debug:', topByAffiliation); // Debug pour voir les données
      console.log('Users sample:', users.slice(0, 2)); // Debug structure utilisateurs
      console.log('UserStats sample:', userStats.slice(0, 2)); // Debug statistiques utilisateurs

      setTopPerformers(topByEarnings);
      setTopAffiliates(topByAffiliation);

      // Calculate period statistics avec filtrage sur la période sélectionnée
      const periodData = Array.from({ length: days }, (_, i) => {
        const date = dateRange.startDate && dateRange.endDate 
          ? new Date(new Date(dateRange.startDate).getTime() + i * 24 * 60 * 60 * 1000)
          : subDays(endDate!, i);
        
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        // Filtrer les transactions pour cette journée spécifique
        const dayTransactions = transactions.filter((t: any) => {
          const transactionDate = new Date(t.createdAt);
          return transactionDate >= dayStart && transactionDate <= dayEnd;
        });

        // Filtrer les nouveaux utilisateurs pour cette journée
        const dayUsers = users.filter((u: any) => {
          const userDate = new Date(u.createdAt);
          return userDate >= dayStart && userDate <= dayEnd;
        });

        const deposits = dayTransactions
          .filter((t: any) => t.type === 'deposit' && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const withdrawals = dayTransactions
          .filter((t: any) => t.type === 'withdrawal' && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const earnings = dayTransactions
          .filter((t: any) => t.type === 'earning' && t.status === 'approved')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        const commissions = dayTransactions
          .filter((t: any) => t.type === 'commission')
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

        // Utilisateurs actifs (qui ont fait au moins une transaction dans la journée)
        const activeUsers = new Set(dayTransactions.map((t: any) => t.userId)).size;

        return {
          date: format(date, 'dd/MM', { locale: fr }),
          deposits,
          withdrawals,
          newUsers: dayUsers.length,
          earnings,
          commissions,
          activeUsers
        };
      });

      // Inverser seulement si on utilise une période prédéfinie (pas de dates personnalisées)
      const finalPeriodData = dateRange.startDate && dateRange.endDate 
        ? periodData 
        : periodData.reverse();

      setPeriodStats(finalPeriodData);
      setFilteredStats(finalPeriodData);

      // Calculate comprehensive statistics
      const totalInvested = transactions
        .filter((t: any) => t.type === 'deposit' && t.status === 'approved')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalWithdrawals = transactions
        .filter((t: any) => t.type === 'withdrawal' && t.status === 'approved')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalEarned = users.reduce((sum: number, u: any) => sum + (Number(u.totalEarned) || 0), 0);

      const totalCommissions = transactions
        .filter((t: any) => t.type === 'commission')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      // Statistiques des agents
      const totalAgents = users.filter((u: any) => u.role === 'agent').length;
      const activeUsers = users.filter((u: any) => u.accountStatus === 'active').length;
      const blockedUsers = users.filter((u: any) => u.accountStatus === 'blocked').length;

      // Dépôts et retraits en attente
      const pendingDeposits = transactions.filter((t: any) => t.type === 'deposit' && t.status === 'pending').length;
      const pendingWithdrawals = transactions.filter((t: any) => t.type === 'withdrawal' && t.status === 'pending').length;

      // Moyennes
      const approvedDeposits = transactions.filter((t: any) => t.type === 'deposit' && t.status === 'approved');
      const avgDepositAmount = approvedDeposits.length > 0 
        ? approvedDeposits.reduce((sum: number, t: any) => sum + Number(t.amount), 0) / approvedDeposits.length 
        : 0;

      const approvedWithdrawals = transactions.filter((t: any) => t.type === 'withdrawal' && t.status === 'approved');
      const avgWithdrawalAmount = approvedWithdrawals.length > 0 
        ? approvedWithdrawals.reduce((sum: number, t: any) => sum + Number(t.amount), 0) / approvedWithdrawals.length 
        : 0;

      // Taux de conversion (utilisateurs qui ont fait au moins un dépôt)
      const usersWithDeposits = new Set(transactions.filter((t: any) => t.type === 'deposit' && t.status === 'approved').map((t: any) => t.userId)).size;
      const conversionRate = users.length > 0 ? (usersWithDeposits / users.length) * 100 : 0;

      // Taux de rétention (utilisateurs actifs dans les 30 derniers jours)
      const last30DaysStart = subDays(new Date(), 30);
      const recentTransactions = transactions.filter((t: any) => new Date(t.createdAt) >= last30DaysStart);
      const activeUsersLast30Days = new Set(recentTransactions.map((t: any) => t.userId)).size;
      const retentionRate = users.length > 0 ? (activeUsersLast30Days / users.length) * 100 : 0;

      setTotalStats({
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalAgents,
        activeUsers,
        blockedUsers,
        totalInvested,
        totalEarned,
        totalCommissions,
        totalWithdrawals,
        pendingDeposits,
        pendingWithdrawals,
        avgDepositAmount,
        avgWithdrawalAmount,
        conversionRate,
        retentionRate
      });

    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const formatAmount = (amount: number) => {
  // Affiche toujours deux décimales, séparateur virgule, sans arrondir
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' F';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Dépôts', 'Retraits', 'Nouveaux Utilisateurs', 'Gains', 'Commissions', 'Utilisateurs Actifs'];
    const csvContent = [
      headers.join(','),
      ...filteredStats.map(stat => [
        stat.date,
        stat.deposits,
        stat.withdrawals,
        stat.newUsers,
        stat.earnings,
        stat.commissions,
        stat.activeUsers
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques_${selectedPeriod}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const clearDateRange = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  const getPeriodLabel = () => {
    if (dateRange.startDate && dateRange.endDate) {
      return `${format(new Date(dateRange.startDate), 'dd/MM/yyyy')} - ${format(new Date(dateRange.endDate), 'dd/MM/yyyy')}`;
    }
    
    const labels = {
      today: "Aujourd'hui",
      yesterday: "Hier", 
      '7days': '7 derniers jours',
      '30days': '30 derniers jours',
      '3months': '3 derniers mois',
      '6months': '6 derniers mois',
      '1year': '1 an'
    };
    
    return labels[selectedPeriod];
  };

  return (
    <>
      <Navigation userRole="admin" />
      <div className="p-2 sm:p-6 space-y-4 sm:space-y-6 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] mb-16 sm:mb-24">
        
        {/* Header avec filtres */}
        <div className="bg-white/80 rounded-lg shadow-md p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">Statistiques Avancées</h1>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </div>

          {/* Filtres de période */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Période prédéfinie</label>
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="yesterday">Hier</SelectItem>
                  <SelectItem value="7days">7 derniers jours</SelectItem>
                  <SelectItem value="30days">30 derniers jours</SelectItem>
                  <SelectItem value="3months">3 derniers mois</SelectItem>
                  <SelectItem value="6months">6 derniers mois</SelectItem>
                  <SelectItem value="1year">1 an</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de début (personnalisée)</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Date de fin (personnalisée)</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex gap-2">
                {(dateRange.startDate || dateRange.endDate) && (
                  <Button 
                    onClick={clearDateRange} 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Filter className="w-3 h-3" />
                    Effacer
                  </Button>
                )}
                <Badge variant={dateRange.startDate && dateRange.endDate ? "default" : "secondary"} className="px-2 py-1">
                  {dateRange.startDate && dateRange.endDate ? "Période personnalisée" : "Période prédéfinie"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques générales étendues */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="rounded-lg shadow-md border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total Utilisateurs</div>
                  <div className="text-sm sm:text-lg font-bold">{totalStats.totalUsers}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Actifs: {totalStats.activeUsers} | Bloqués: {totalStats.blockedUsers}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-md border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Agents</div>
                  <div className="text-sm sm:text-lg font-bold">{totalStats.totalAgents}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalStats.totalUsers > 0 ? ((totalStats.totalAgents / totalStats.totalUsers) * 100).toFixed(1) : 0}% des utilisateurs
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-md border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total Investi</div>
                  <div className="text-xs sm:text-lg font-bold">{formatAmount(totalStats.totalInvested)}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Moy: {formatAmount(totalStats.avgDepositAmount)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-md border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total Gains</div>
                  <div className="text-xs sm:text-lg font-bold">{formatAmount(totalStats.totalEarned)}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ROI: {totalStats.totalInvested > 0 ? ((totalStats.totalEarned / totalStats.totalInvested) * 100).toFixed(1) : 0}%
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-md border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Commissions</div>
                  <div className="text-xs sm:text-lg font-bold">{formatAmount(totalStats.totalCommissions)}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                % investi: {totalStats.totalInvested > 0 ? ((totalStats.totalCommissions / totalStats.totalInvested) * 100).toFixed(1) : 0}%
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-md border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Total Retraits</div>
                  <div className="text-xs sm:text-lg font-bold">{formatAmount(totalStats.totalWithdrawals)}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Moy: {formatAmount(totalStats.avgWithdrawalAmount)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-md border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">En Attente</div>
                  <div className="text-xs sm:text-lg font-bold">
                    {totalStats.pendingDeposits + totalStats.pendingWithdrawals}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Dép: {totalStats.pendingDeposits} | Ret: {totalStats.pendingWithdrawals}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-md border-0 bg-white/90 hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                <div className="text-right">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Taux Conversion</div>
                  <div className="text-xs sm:text-lg font-bold">{totalStats.conversionRate.toFixed(1)}%</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Rétention: {totalStats.retentionRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
          {/* Top Performers - Compact mobile layout */}
          <Card className="rounded-lg shadow-md border-0 bg-white/90">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center text-sm sm:text-base">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-yellow-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-2">
                {topPerformers.slice(0, 5).map((stats, index) => (
                  <div key={stats.user.id} className="flex items-center justify-between p-2 rounded bg-gray-50/80">
                    <div className="flex items-center space-x-2 flex-1">
                      <Badge variant={index < 3 ? 'default' : 'outline'} className="text-xs px-1.5 py-0.5">
                        #{index + 1}
                      </Badge>
                      <div className="truncate">
                        <div className="text-xs sm:text-sm font-medium truncate">{stats.user.fullName}</div>
                        <div className="text-xs text-muted-foreground">{formatAmount(stats.totalInvested)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-bold text-green-600">
                        {formatAmount(stats.totalEarned)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Affiliates - Compact mobile layout avec debug */}
          <Card className="rounded-lg shadow-md border-0 bg-white/90">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center text-sm sm:text-base">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-500" />
                Top Affiliés ({topAffiliates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {topAffiliates.length > 0 ? (
                <div className="space-y-2">
                  {topAffiliates.slice(0, 5).map((stats, index) => (
                    <div key={stats.user.id} className="flex items-center justify-between p-2 rounded bg-gray-50/80">
                      <div className="flex items-center space-x-2 flex-1">
                        <Badge variant={index < 3 ? 'default' : 'outline'} className="text-xs px-1.5 py-0.5">
                          #{index + 1}
                        </Badge>
                        <div className="truncate">
                          <div className="text-xs sm:text-sm font-medium truncate">{stats.user.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{stats.referrals} filleuls</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-purple-600">
                          {formatAmount(stats.commissions)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucun affilié trouvé</p>
                  <p className="text-xs mt-1">
                    Les utilisateurs doivent avoir des filleuls ou des commissions pour apparaître ici
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Period Statistics - Amélioration avec plus de détails */}
        <Card className="rounded-lg shadow-md border-0 bg-white/90">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center justify-between text-sm sm:text-base">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Évolution détaillée - {getPeriodLabel()}
              </div>
              <Badge variant="outline">
                {filteredStats.length} jour{filteredStats.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-green-50 p-3 rounded-lg border">
                  <div className="text-sm font-medium text-green-800">Total Dépôts Période</div>
                  <div className="text-lg font-bold text-green-900">
                    {formatAmount(filteredStats.reduce((sum, stat) => sum + stat.deposits, 0))}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border">
                  <div className="text-sm font-medium text-red-800">Total Retraits Période</div>
                  <div className="text-lg font-bold text-red-900">
                    {formatAmount(filteredStats.reduce((sum, stat) => sum + stat.withdrawals, 0))}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border">
                  <div className="text-sm font-medium text-blue-800">Nouveaux Utilisateurs</div>
                  <div className="text-lg font-bold text-blue-900">
                    {filteredStats.reduce((sum, stat) => sum + stat.newUsers, 0)}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border">
                  <div className="text-sm font-medium text-purple-800">Total Commissions Période</div>
                  <div className="text-lg font-bold text-purple-900">
                    {formatAmount(filteredStats.reduce((sum, stat) => sum + stat.commissions, 0))}
                  </div>
                </div>
              </div>

              {/* Affichage détaillé des 7 derniers jours ou moins selon la période */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-1 sm:gap-2 min-w-[300px]">
                {filteredStats.slice(-Math.min(7, filteredStats.length)).map((stat, index) => (
                  <div key={index} className="text-center p-2 sm:p-3 border rounded bg-white/70 hover:bg-white transition-colors">
                    <div className="text-xs font-medium text-muted-foreground mb-2">{stat.date}</div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-green-600" title="Dépôts">
                        +{new Intl.NumberFormat('fr-FR', { 
                          style: 'currency', 
                          currency: 'XOF',
                          notation: 'compact',
                          maximumFractionDigits: 0
                        }).format(stat.deposits)}
                      </div>
                      <div className="text-xs text-red-600" title="Retraits">
                        -{new Intl.NumberFormat('fr-FR', { 
                          style: 'currency', 
                          currency: 'XOF',
                          notation: 'compact',
                          maximumFractionDigits: 0
                        }).format(stat.withdrawals)}
                      </div>
                      <div className="text-xs text-blue-600" title="Nouveaux utilisateurs">
                        👥 {stat.newUsers}
                      </div>
                      <div className="text-xs text-yellow-600" title="Gains distribués">
                        💰 {new Intl.NumberFormat('fr-FR', { 
                          style: 'currency', 
                          currency: 'XOF',
                          notation: 'compact',
                          maximumFractionDigits: 0
                        }).format(stat.earnings)}
                      </div>
                      <div className="text-xs text-purple-600" title="Utilisateurs actifs">
                        ⚡ {stat.activeUsers}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table détaillée pour les grandes périodes */}
              {filteredStats.length > 7 && (
                <div className="mt-6 overflow-x-auto">
                  <h4 className="text-sm font-medium mb-3">Données complètes de la période</h4>
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Dépôts</TableHead>
                        <TableHead>Retraits</TableHead>
                        <TableHead>Nouveaux</TableHead>
                        <TableHead>Gains</TableHead>
                        <TableHead>Commissions</TableHead>
                        <TableHead>Actifs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStats.slice(-20).reverse().map((stat, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{stat.date}</TableCell>
                          <TableCell className="text-green-600">
                            {formatAmount(stat.deposits)}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {formatAmount(stat.withdrawals)}
                          </TableCell>
                          <TableCell className="text-blue-600">
                            {stat.newUsers}
                          </TableCell>
                          <TableCell className="text-yellow-600">
                            {formatAmount(stat.earnings)}
                          </TableCell>
                          <TableCell className="text-purple-600">
                            {formatAmount(stat.commissions)}
                          </TableCell>
                          <TableCell className="text-indigo-600">
                            {stat.activeUsers}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}