import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Wallet, LogOut, User, History, Users, Menu } from "lucide-react";
import { InvestProLogo } from "@/components/InvestProLogo";
import { NotificationCenter } from "@/components/NotificationCenter";
import React, { useState } from "react";

interface NavigationProps {
  userRole?: 'user' | 'agent' | 'admin';
  onLogout?: () => void;
  showAgentAccount?: boolean;
}

export const Navigation = ({ userRole, onLogout }: NavigationProps) => {
// Ajout d'une prop showAgentAccount pour afficher le bouton agent
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('user-session-changed'));
    navigate('/');
    if (onLogout) onLogout();
  };
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  // Menu content for authenticated users
  const renderMenu = () => (
    <>
      {userRole === 'agent' && (
        <Button
          variant={isActive('/agent/dashboard') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => { setMenuOpen(false); navigate('/agent/dashboard'); }}
          className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 border border-violet-500/20"
        >
          <User className="h-4 w-4 mr-2" />
          Agent
        </Button>
      )}
      {userRole === 'user' && (
        <>
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
            className={isActive('/dashboard') ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700' : 'text-violet-700 hover:bg-violet-100'}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Tableau de bord
          </Button>
          <Button
            variant={isActive('/lots') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/lots'); }}
            className={isActive('/lots') ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700' : 'text-violet-700 hover:bg-violet-100'}
          >
            Acheter un lot
          </Button>
          <Button
            variant={isActive('/history') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/history'); }}
            className={isActive('/history') ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700' : 'text-violet-700 hover:bg-violet-100'}
          >
            <History className="h-4 w-4 mr-2" />
            Historique
          </Button>
          <Button
            variant={isActive('/team') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/team'); }}
            className={isActive('/team') ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700' : 'text-violet-700 hover:bg-violet-100'}
          >
            <Users className="h-4 w-4 mr-2" />
            Mon équipe
          </Button>
        </>
      )}
      {userRole === 'agent' && (
        <>
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
          >
            Tableau de bord
          </Button>
          <Button
            variant={isActive('/agent/deposits') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/agent/deposits'); }}
          >
            Dépôts
          </Button>
          <Button
            variant={isActive('/agent/withdrawals') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/agent/withdrawals'); }}
          >
            Retraits
          </Button>
        </>
      )}
      {userRole === 'admin' && (
        <>
          <Button
            variant={isActive('/admin') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/admin'); }}
          >
            Tableau de bord
          </Button>
          <Button
            variant={isActive('/admin/users') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/admin/users'); }}
          >
            Utilisateurs
          </Button>
          <Button
            variant={isActive('/admin/agents') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/admin/agents'); }}
          >
            Agents
          </Button>
          <Button
            variant={isActive('/admin/lots') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/admin/lots'); }}
          >
            Lots
          </Button>
          <Button
            variant={isActive('/admin/settings') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMenuOpen(false); navigate('/admin/settings'); }}
          >
            Paramètre
          </Button>
        </>
      )}
      <Button
        variant={isActive('/profile') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => { setMenuOpen(false); navigate('/profile'); }}
      >
        <User className="h-4 w-4 mr-2" />
        Profil
      </Button>
      <Button variant="ghost" size="sm" onClick={() => { setMenuOpen(false); handleLogout(); }}>
        <LogOut className="h-4 w-4 mr-2" />
        Déconnexion
      </Button>
    </>
  );

  if (!userRole) {
    return (
      <nav className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <InvestProLogo className="h-8 w-8 text-primary" size={32} />
            <span className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              InvestPro
            </span>
          </div>
          {/* Desktop */}
          <div className="space-x-2 hidden sm:flex">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Se connecter
            </Button>
            <Button onClick={() => navigate('/register')}>
              Créer un compte
            </Button>
          </div>
          {/* Mobile */}
          <div className="sm:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
              <Menu className="h-6 w-6" />
            </Button>
            {menuOpen && (
              <div className="absolute right-4 top-16 z-50 bg-card border rounded shadow-md flex flex-col w-48 p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                <Button variant="ghost" onClick={() => { setMenuOpen(false); navigate('/login'); }}>
                  Se connecter
                </Button>
                <Button onClick={() => { setMenuOpen(false); navigate('/register'); }}>
                  Créer un compte
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gradient-to-r from-violet-50 to-indigo-100 border-b border-violet-200 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <InvestProLogo className="h-8 w-8 text-violet-600" size={32} />
          <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-700 bg-clip-text text-transparent">
            InvestPro
          </span>
        </div>
        {/* Desktop */}
        <div className="hidden sm:flex items-center space-x-4">
          {renderMenu()}
          <NotificationCenter />
        </div>
        {/* Mobile */}
        <div className="sm:hidden flex items-center space-x-2">
          {userRole === 'agent' && (
            <Button
              variant={isActive('/agent/dashboard') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/agent/dashboard')}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 text-xs border border-blue-500/20"
            >
              <User className="h-3 w-3 mr-1" />
              Agent
            </Button>
          )}
          <NotificationCenter />
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
          {menuOpen && (
            <div className="absolute right-4 top-16 z-50 bg-card border rounded shadow-md flex flex-col w-40 p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
              <Button variant="ghost" size="sm" onClick={() => { setMenuOpen(false); handleLogout(); }}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};