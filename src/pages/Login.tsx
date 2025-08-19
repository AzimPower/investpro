import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MuiTelInput } from 'mui-tel-input';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { useNavigate, Link } from "react-router-dom";
import { apiLogin } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNotify } from "@/hooks/useNotify";
import { Eye, EyeOff, LogIn } from "lucide-react";

export const Login = () => {
  const [formData, setFormData] = useState({
  phone: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const notify = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!formData.phone || !formData.password) {
        throw new Error("Veuillez remplir tous les champs");
      }
      // Validation du numéro international
    // Validation stricte du numéro international
    if (!isValidPhoneNumber(formData.phone)) {
        throw new Error("Veuillez entrer un numéro de téléphone international valide");
      }
      const fullPhoneNumber = formData.phone;
      const result = await apiLogin(fullPhoneNumber, formData.password);
      
      if (!result.success || !result.user) {
        throw new Error(result.error || "Numéro de téléphone ou mot de passe incorrect");
      }
      const user = result.user;
      if (user.accountStatus === 'blocked') {
        throw new Error("Votre compte a été bloqué. Contactez l'administrateur.");
      }
      localStorage.setItem('currentUser', JSON.stringify(user));
      window.dispatchEvent(new Event('user-session-changed'));
      
      toast({
        title: "Connexion réussie !",
        description: `Bienvenue ${user.fullName}`,
      });

      // Notification de bienvenue
      notify.success(
        'Connexion réussie',
        `Bienvenue ${user.fullName} ! Vous êtes maintenant connecté.`,
        { 
          category: 'system',
          action: {
            label: 'Voir le tableau de bord',
            onClick: () => navigate('/dashboard')
          }
        }
      );
      setTimeout(() => {
        switch (user.role) {
          case 'admin':
            navigate('/admin');
            break;
          default:
            navigate('/dashboard');
        }
      }, 500);
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Se connecter</CardTitle>
              <CardDescription>
                Accédez à votre compte d'investissement
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                    <MuiTelInput
                      value={formData.phone}
                      onChange={phone => setFormData(prev => ({ ...prev, phone }))}
                      defaultCountry="BF"
                      fullWidth
                      required
                      autoFocus
                    />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Votre mot de passe"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-right">
                  <Link to="https://t.me/+RmlwXhX1lHswMWE0" className="text-sm text-primary hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Pas encore de compte ?{" "}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Créer un compte
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};