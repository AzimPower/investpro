import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MuiTelInput } from 'mui-tel-input';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Navigation } from "@/components/Navigation";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { apiRegister, apiGetUserById } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, UserPlus, Shield } from "lucide-react";

export const Register = () => {
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
  phone: "",
    fullName: "",
    password: "",
    confirmPassword: "",
    sponsorCode: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Effet pour pré-remplir le code de parrainage depuis l'URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, sponsorCode: refCode }));
      // Optionnel: Afficher un message pour informer l'utilisateur
      toast({
        title: "Code de parrainage détecté",
        description: `Le code "${refCode}" a été automatiquement rempli.`,
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Validation
  if (!formData.phone || !formData.fullName || !formData.password) {
        throw new Error("Tous les champs obligatoires doivent être remplis");
      }
      if (!acceptPolicy) {
        throw new Error("Vous devez accepter la politique d'investissement pour continuer");
      }
      // Validation stricte du numéro international
      if (!isValidPhoneNumber(formData.phone)) {
        throw new Error("Numéro de téléphone invalide pour le pays sélectionné");
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      if (formData.password.length < 6) {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères");
      }

      // Vérifier si le numéro existe déjà - amélioration de la vérification
  const fullPhoneNumber = formData.phone;
      
      try {
        // Récupérer tous les utilisateurs pour vérifier l'unicité du numéro
        const allUsersRes = await fetch(`/backend/users.php`);
        const allUsersText = await allUsersRes.text();
        
        if (allUsersRes.ok && allUsersText && allUsersText.trim()) {
          let allUsers = [];
          try {
            allUsers = JSON.parse(allUsersText);
          } catch (parseError) {
            console.warn("Erreur de parsing des utilisateurs:", parseError);
          }
          
          if (Array.isArray(allUsers)) {
            // Vérifier si le numéro (avec ou sans +226) existe déjà
            const phoneExists = allUsers.some(user => {
              const userPhone = String(user.phone || '');
              return userPhone === fullPhoneNumber;
            });
            
            if (phoneExists) {
              throw new Error("Ce numéro de téléphone est déjà utilisé");
            }
          }
        }
      } catch (checkError) {
        // Si l'erreur est spécifiquement sur l'unicité du numéro, la relancer
        if (checkError.message === "Ce numéro de téléphone est déjà utilisé") {
          throw checkError;
        }
        // Sinon, continuer (la vérification a échoué mais on peut essayer de créer)
        console.warn("Impossible de vérifier l'unicité du numéro:", checkError);
      }

      // Chercher le parrain si code fourni
      let referredBy = undefined;
      if (formData.sponsorCode) {
        try {
          const allUsersRes = await fetch(`/backend/users.php`);
          const allUsers = await allUsersRes.json();
          const sponsor = Array.isArray(allUsers)
            ? allUsers.find((u) => u.referralCode === formData.sponsorCode)
            : null;
          if (sponsor && sponsor.id) {
            referredBy = sponsor.id;
          } else if (formData.sponsorCode.trim()) {
            throw new Error("Code de parrainage invalide");
          }
        } catch (sponsorError) {
          if (sponsorError.message === "Code de parrainage invalide") {
            throw sponsorError;
          }
          console.warn("Erreur lors de la vérification du parrain:", sponsorError);
        }
      }

      // Générer un code de parrainage unique pour le nouvel utilisateur
      const generateReferralCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
      };
      const referralCode = generateReferralCode();

      // Créer l'utilisateur via l'API PHP avec le numéro complet
      const result = await apiRegister({
  phone: fullPhoneNumber, // Envoyer le numéro international
        fullName: formData.fullName,
        password: formData.password,
        referralCode,
        referredBy,
        role: 'user',
        balance: 0,
        totalEarned: 0,
        accountStatus: 'active',
      });

      if (!result || !result.success) {
        // Vérifier si l'erreur vient du serveur pour un numéro déjà utilisé
        const errorMsg = result && result.error ? result.error : "Erreur lors de la création du compte";
        if (errorMsg.toLowerCase().includes('phone') || errorMsg.toLowerCase().includes('téléphone') || errorMsg.toLowerCase().includes('existe')) {
          throw new Error("Ce numéro de téléphone est déjà utilisé");
        }
        throw new Error(errorMsg);
      }

      toast({
        title: "Compte créé avec succès !",
        description: "Vous pouvez maintenant vous connecter",
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Erreur",
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
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
              <CardDescription>
                Rejoignez notre plateforme d'investissement sécurisée
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Numéro de téléphone *</Label>
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
                  <Label htmlFor="fullName">Nom complet *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Votre nom complet"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Au moins 6 caractères"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Répétez votre mot de passe"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sponsorCode">Code de parrainage (optionnel)</Label>
                  <Input
                    id="sponsorCode"
                    type="text"
                    placeholder="Code de votre parrain"
                    value={formData.sponsorCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, sponsorCode: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si vous avez été invité par quelqu'un, saisissez son code ici
                  </p>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  <div className="text-sm">
                    <p className="font-medium">Sécurité garantie</p>
                    <p className="text-muted-foreground">Vos données sont protégées et chiffrées</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="acceptPolicy"
                    checked={acceptPolicy}
                    onCheckedChange={(checked) => setAcceptPolicy(checked as boolean)}
                    required
                  />
                  <div className="text-sm leading-5">
                    <Label htmlFor="acceptPolicy" className="cursor-pointer">
                      J'accepte la{" "}
                      <Link 
                        to="/politique-investissement" 
                        className="text-primary hover:underline font-medium"
                        target="_blank"
                      >
                        politique d'investissement
                      </Link>{" "}
                      et les conditions d'utilisation *
                    </Label>
                    <p className="text-muted-foreground mt-1">
                      En cochant cette case, vous confirmez avoir lu et accepté nos conditions
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isLoading || !acceptPolicy}
                >
                  {isLoading ? "Création en cours..." : "Créer mon compte"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Se connecter
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