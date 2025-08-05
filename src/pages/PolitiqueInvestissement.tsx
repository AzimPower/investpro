import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, TrendingUp, Users, DollarSign, FileText } from "lucide-react";

export const PolitiqueInvestissement = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Politique d'Investissement</h1>
              <p className="text-muted-foreground">
                Comprenez nos conditions et modalités d'investissement
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Avertissement Important */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center text-amber-800">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Avertissement Important
                </CardTitle>
              </CardHeader>
              <CardContent className="text-amber-700">
                <p>
                  Tout investissement comporte des risques. La valeur de vos investissements peut augmenter ou diminuer. 
                  Vous pourriez récupérer moins que votre investissement initial. Il est important de comprendre les 
                  risques avant d'investir.
                </p>
              </CardContent>
            </Card>

            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Notre Politique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                </p>
                <p>
                </p>
              </CardContent>
            </Card>

        
            {/* Conditions de Modification */}
            <Card>
              <CardHeader>
                <CardTitle>Modification de la Politique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Nous nous réservons le droit de modifier cette politique à tout moment. 
                  Les modifications importantes vous seront notifiées par email ou via la plateforme. 
                  En continuant à utiliser nos services après modification, vous acceptez les nouvelles conditions.
                </p>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Dernière mise à jour : 3 août 2025</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Version 1.0 - Politique initiale
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact et Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pour toute question concernant cette politique ou nos services d'investissement, 
                  contactez notre équipe support :
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Email :</strong> support@investpro.bf</p>
                  <p><strong>Téléphone :</strong> +226 XX XX XX XX</p>
                  <p><strong>Heures d'ouverture :</strong> Lundi - Vendredi, 8h - 18h</p>
                </div>
              </CardContent>
            </Card>

            {/* Bouton de retour */}
            <div className="text-center pt-8">
              <Button onClick={() => navigate(-1)} size="lg">
                J'ai lu et compris la politique
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
