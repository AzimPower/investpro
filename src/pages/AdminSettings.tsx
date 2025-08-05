import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
// ...existing code...
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Percent, Clock, CreditCard, Users, Bell, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemSettings {
  commissionLevel1: number;
  commissionLevel2: number;
  withdrawalFeePercent: number;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  processingDelayHours: number;
  autoProcessing: boolean;
  maintenanceMode: boolean;
  welcomeMessage: string;
  supportEmail: string;
  supportPhone: string;
  paymentMethods: string[];
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Charger les paramètres depuis le backend
      const res = await fetch('/backend/settings.php');
      let savedSettings = await res.json();
      // Si le backend retourne un tableau, prendre le premier élément
      if (Array.isArray(savedSettings)) {
        savedSettings = savedSettings[0];
      }
      if (savedSettings) {
        setSettings({
          ...savedSettings,
          paymentMethods: Array.isArray(savedSettings.paymentMethods)
            ? savedSettings.paymentMethods
            : (savedSettings.paymentMethods ? savedSettings.paymentMethods.split(',') : [])
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    try {
      // Sauvegarder les paramètres via le backend
      const res = await fetch('/backend/settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings })
      });
      let result;
      try {
        result = await res.json();
      } catch (jsonError) {
        throw new Error("Réponse du serveur invalide (pas du JSON). Vérifiez le backend.");
      }
      if (result && result.success) {
        toast({
          title: "Paramètres sauvegardés",
          description: "Les paramètres système ont été mis à jour.",
        });
      } else {
        throw new Error(result && result.error ? result.error : "Erreur lors de la sauvegarde");
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de sauvegarder les paramètres.",
        variant: "destructive"
      });
    }
  };

  const addPaymentMethod = () => {
    if (settings && newPaymentMethod.trim() && !settings.paymentMethods.includes(newPaymentMethod.trim())) {
      setSettings({
        ...settings,
        paymentMethods: [...settings.paymentMethods, newPaymentMethod.trim()]
      });
      setNewPaymentMethod('');
    }
  };

  const removePaymentMethod = (method: string) => {
    if (settings) {
      setSettings({
        ...settings,
        paymentMethods: settings.paymentMethods.filter(m => m !== method)
      });
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  return (
    <>
      <Navigation userRole="admin" />
      <div className="p-6 space-y-6 mb-24">
        {!settings ? (
          <div className="text-center text-muted-foreground">Chargement des paramètres...</div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold gradient-text">Paramètres Généraux</h1>
              <Button onClick={saveSettings}>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Commission Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Percent className="w-5 h-5 mr-2" />
                    Taux de Commission
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Commission Niveau 1 (%)</label>
                    <Input
                      type="number"
                      value={settings.commissionLevel1}
                      onChange={(e) => updateSetting('commissionLevel1', parseFloat(e.target.value) || 0)}
                      placeholder="10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pourcentage de commission pour les filleuls directs
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Commission Niveau 2 (%)</label>
                    <Input
                      type="number"
                      value={settings.commissionLevel2}
                      onChange={(e) => updateSetting('commissionLevel2', parseFloat(e.target.value) || 0)}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pourcentage de commission pour les filleuls indirects
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Withdrawal Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Paramètres de Retrait
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Frais de retrait (%)</label>
                    <Input
                      type="number"
                      value={settings.withdrawalFeePercent}
                      onChange={(e) => updateSetting('withdrawalFeePercent', parseFloat(e.target.value) || 0)}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Montant minimum (FCFA)</label>
                    <Input
                      type="number"
                      value={settings.minWithdrawalAmount}
                      onChange={(e) => updateSetting('minWithdrawalAmount', parseFloat(e.target.value) || 0)}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Montant maximum (FCFA)</label>
                    <Input
                      type="number"
                      value={settings.maxWithdrawalAmount}
                      onChange={(e) => updateSetting('maxWithdrawalAmount', parseFloat(e.target.value) || 0)}
                      placeholder="500000"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Processing Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Délais de Traitement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Délai de traitement (heures)</label>
                    <Input
                      type="number"
                      value={settings.processingDelayHours}
                      onChange={(e) => updateSetting('processingDelayHours', parseFloat(e.target.value) || 0)}
                      placeholder="24"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Délai maximum pour traiter les demandes
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Traitement automatique</label>
                      <p className="text-xs text-muted-foreground">
                        Approuver automatiquement les petites transactions
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoProcessing}
                      onCheckedChange={(checked) => updateSetting('autoProcessing', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* System Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Paramètres Système
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Mode maintenance</label>
                      <p className="text-xs text-muted-foreground">
                        Désactiver l'accès utilisateur temporairement
                      </p>
                    </div>
                    <Switch
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
                    />
                  </div>
                  {settings.maintenanceMode && (
                    <Badge variant="destructive" className="w-full justify-center">
                      Mode maintenance activé
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Méthodes de Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Nouvelle méthode de paiement"
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                  />
                  <Button onClick={addPaymentMethod}>Ajouter</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.paymentMethods.map((method, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removePaymentMethod(method)}
                    >
                      {method} ✕
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Support Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Informations de Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Message de bienvenue</label>
                  <Textarea
                    value={settings.welcomeMessage}
                    onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
                    placeholder="Message affiché aux nouveaux utilisateurs"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email de support</label>
                    <Input
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => updateSetting('supportEmail', e.target.value)}
                      placeholder="support@plateforme.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Téléphone de support</label>
                    <Input
                      value={settings.supportPhone}
                      onChange={(e) => updateSetting('supportPhone', e.target.value)}
                      placeholder="+221 XX XXX XX XX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}