import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, History, User, Users, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

const userNavItems = [
  {
    label: "Tableau de bord",
    icon: Home,
    to: () => "/dashboard",
    match: (pathname: string) => pathname.startsWith("/dashboard"),
  },
  {
    label: "Historique",
    icon: History,
    to: () => "/history",
    match: (pathname: string) => pathname.startsWith("/history"),
  },
  {
    label: "Equipe",
    icon: Users,
    to: () => "/team",
    match: (pathname: string) => pathname.startsWith("/team"),
  },
  {
    label: "Profil",
    icon: User,
    to: () => "/profile",
    match: (pathname: string) => pathname.startsWith("/profile"),
  },
];

const adminNavItems = [
  {
    label: "Dashboard",
    icon: Home,
    to: () => "/admin",
    match: (pathname: string) => pathname.startsWith("/admin"),
  },
  {
    label: "Utilisateurs",
    icon: Users,
    to: () => "/admin/users",
    match: (pathname: string) => pathname.startsWith("/admin/users"),
  },
  {
    label: "Stats",
    icon: History,
    to: () => "/admin/stats",
    match: (pathname: string) => pathname.startsWith("/admin/stats"),
  },
  {
    label: "Paramètres",
    icon: User,
    to: () => "/admin/settings",
    match: (pathname: string) => pathname.startsWith("/admin/settings"),
  },
];

export function MobileNavBar() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Détecter si un dialog est ouvert en écoutant les changements dans le DOM
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Vérifier s'il y a des dialogs ouverts
      const hasOpenDialog = document.querySelector('[data-state="open"][role="dialog"]') !== null ||
                           document.querySelector('.fixed.inset-0.z-50') !== null ||
                           document.querySelector('[data-radix-dialog-overlay]') !== null;
      setIsDialogOpen(hasOpenDialog);
    });

    // Observer les changements dans le body pour détecter les dialogs
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'role']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function updateRole() {
      const userData = localStorage.getItem("currentUser");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setRole(user.role);
        } catch {
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setIsInitialized(true);
    }
    updateRole();
    window.addEventListener("storage", updateRole);
    window.addEventListener("focus", updateRole);
    window.addEventListener("user-session-changed", updateRole);
    return () => {
      window.removeEventListener("storage", updateRole);
      window.removeEventListener("focus", updateRole);
      window.removeEventListener("user-session-changed", updateRole);
    };
  }, []);

  // Ne pas rendre tant que nous n'avons pas initialisé le rôle ou si un dialog est ouvert
  if (!isMobile || !isInitialized || isDialogOpen) return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: "10px", // Légère marge du bas pour un effet flottant
        left: "10px",
        right: "10px",
        zIndex: 40, // Z-index inférieur aux dialogs (qui utilisent z-50) pour éviter les conflits
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(245, 243, 255, 0.95))",
        backgroundColor: "rgba(255, 255, 255, 0.9)", // Fallback pour les navigateurs plus anciens
        border: "1px solid rgba(139, 92, 246, 0.2)",
        borderRadius: "20px", // Border radius arrondi moderne
        boxShadow: "0 8px 32px rgba(76, 0, 255, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
        display: "flex",
        justifyContent: "space-around",
        padding: "14px 8px", // Padding augmenté pour plus d'espace
        height: "90px", // Hauteur augmentée pour éviter que les icônes soient cachées
        minHeight: "90px",
        backdropFilter: "blur(20px)", // Flou plus prononcé
        WebkitBackdropFilter: "blur(20px)", // Support Safari
        margin: "0 auto", // Centrage horizontal
        maxWidth: "400px", // Largeur max pour éviter que ça soit trop large sur tablettes
      }}
      className="md:hidden"
    >
      {(role === "admin" ? adminNavItems : userNavItems).map((item, idx) => {
        const Icon = item.icon;
        const to = item.to();
        const isActive = item.match(location.pathname);
        return (
          <button
            key={`${item.label}-${idx}`} // Clé plus unique pour éviter les problèmes de rendu
            onClick={() => navigate(to)}
            className={`flex flex-col items-center text-xs focus:outline-none transition-all duration-300 transform hover:scale-105 ${
              isActive 
                ? "text-violet-700 font-bold" 
                : "text-violet-500 hover:text-violet-600"
            }`}
            style={{ 
              flex: 1,
              padding: "8px 4px", // Padding optimisé
              borderRadius: "16px", // Border radius pour les boutons
              background: isActive 
                ? "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.1))"
                : "transparent",
              minHeight: "70px", // Hauteur augmentée pour les boutons
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              margin: "2px", // Petite marge entre les boutons
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div className={`p-2 rounded-full transition-all duration-300 ${
              isActive 
                ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg transform scale-105" 
                : "bg-gradient-to-br from-violet-100 to-violet-50 hover:from-violet-200 hover:to-violet-100 hover:shadow-md"
            }`}>
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-violet-600"}`} />
            </div>
            <span className={`mt-1 font-medium text-center leading-tight ${
              isActive ? "text-violet-700" : "text-violet-500"
            }`} style={{ fontSize: "11px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
