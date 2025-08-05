import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { LotCard } from "@/components/LotCard";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { InvestProLogo } from "@/components/InvestProLogo";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGetLots } from "@/lib/api";
import { InvestmentLot } from "@/lib/types";
import { Shield, Users, Wallet, ArrowRight, Star, CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-investment.jpg";

export const Home = () => {
  const navigate = useNavigate();
  const [lots, setLots] = useState<InvestmentLot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLots = async () => {
      try {
        setLoading(true);
        const lotData = await apiGetLots();
        if (lotData && Array.isArray(lotData)) {
          // Filtrer les lots actifs et normaliser les données
          const activeLots = lotData
            .filter(lot => lot.active)
            .map(lot => ({
              id: lot.id ? lot.id.toString() : Math.random().toString(),
              name: lot.name || '',
              description: lot.description || `Investissement ${lot.name}`,
              price: parseFloat(lot.price || 0),
              dailyReturn: parseFloat(lot.dailyReturn || 0),
              duration: parseInt(lot.duration || 30), // Durée par défaut de 30 jours
              color: lot.color || '#3B82F6',
              active: Boolean(lot.active)
            }));
          setLots(activeLots);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des lots:', error);
        setLots([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLots();
  }, []);

  const features = [
    {
      icon: <InvestProLogo className="h-12 w-12 text-violet-600" size={48} />,
      title: "Gains journaliers garantis",
      description: "Recevez vos gains chaque jour de manière automatique et sécurisée"
    },
    {
      icon: <Shield className="h-12 w-12 text-violet-600" />,
      title: "Plateforme sécurisée",
      description: "Vos investissements sont protégés par nos systèmes de sécurité avancés"
    },
    {
      icon: <Users className="h-12 w-12 text-violet-600" />,
      title: "Système de parrainage",
      description: "Invitez vos amis et gagnez des commissions sur leurs investissements"
    },
    {
      icon: <Wallet className="h-12 w-12 text-violet-600" />,
      title: "Retraits faciles",
      description: "Retirez vos gains rapidement via Mobile Money ou Wave"
    }
  ];

  const advantages = [
    "Pas de frais cachés",
    "Support client 24/7",
    "Interface simple et intuitive",
    "Paiements rapides",
    "Transparence totale",
    "Communauté active"
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/90 via-purple-700/90 to-indigo-800/90" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-float">
              Investissez malin.
              <br />
              <span className="text-purple-200 drop-shadow-lg">Gagnez chaque jour.</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Rejoignez des milliers d'investisseurs qui font fructifier leur argent avec nos lots d'investissement sécurisés
            </p>
            
            {/* PWA Install Button */}
            <div className="mb-6 flex justify-center">
              <PWAInstallButton />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:space-x-4 sm:gap-0 justify-center items-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-4 bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-800 shadow-xl hover:shadow-2xl transition-all w-full sm:w-auto border-0"
                onClick={() => navigate('/register')}
              >
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-4 border-white/30bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-800 shadow-xl hover:shadow-2xl transition-all w-full sm:w-auto border-0"
                onClick={() => navigate('/login')}
              >
                Se connecter
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Lots Section */}
      <section className="py-16 bg-gradient-to-br from-violet-50 to-indigo-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-violet-800">
              Nos lots d'investissement
            </h2>
            <p className="text-lg text-violet-600 max-w-2xl mx-auto">
              Choisissez le lot qui correspond à votre budget et commencez à gagner dès aujourd'hui
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {loading ? (
              // Indicateur de chargement
              Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))
            ) : lots.length > 0 ? (
              lots.map((lot) => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  onSelect={() => navigate('/register')}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-lg text-muted-foreground">
                  Aucun lot d'investissement disponible pour le moment.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-violet-800">
              Pourquoi choisir InvestPro ?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-white to-violet-50 border-violet-200 hover:border-violet-300">
                <CardHeader>
                  <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-violet-100 to-purple-200 rounded-full">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-violet-800">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-violet-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages Section */}
      <section className="py-16 bg-gradient-to-br from-violet-50 to-indigo-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-violet-800">
                Nos avantages
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {advantages.map((advantage, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-5 rounded-xl bg-white/90 shadow-lg hover:shadow-xl border border-violet-200 hover:border-violet-300 transition-all group"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-200 group-hover:from-violet-200 group-hover:to-purple-300 transition-all">
                    <CheckCircle className="h-7 w-7 text-violet-600" />
                  </div>
                  <span className="text-lg font-semibold text-violet-800 group-hover:text-violet-900 transition-all">{advantage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-indigo-900 via-violet-900 to-purple-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Prêt à commencer votre voyage d'investissement ?
          </h2>
          <p className="text-xl mb-8 text-violet-200">
            Rejoignez notre communauté d'investisseurs et commencez à gagner dès aujourd'hui
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-2xl hover:shadow-violet-500/50 transition-all animate-pulse border-0 transform hover:scale-105"
            onClick={() => navigate('/register')}
          >
            Créer mon compte gratuitement
            <Star className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-violet-50 to-indigo-100 border-t border-violet-200 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <InvestProLogo className="h-6 w-6 text-violet-600" size={24} />
            <span className="text-lg font-bold text-violet-800">InvestPro</span>
          </div>
          <p className="text-violet-600">
            © 2024 InvestPro. Tous droits réservés. Investissez de manière responsable.
          </p>
        </div>
      </footer>
    </div>
  );
};