import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { apiGetLots, apiUpdateLot, apiCreateLot } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Gem, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminLots() {
  const [lots, setLots] = useState<any[]>([]);
  const [editingLot, setEditingLot] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    dailyReturn: 0,
    duration: 0,
    color: 'lot-diamond',
    active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadLots();
  }, []);

  const loadLots = async () => {
    try {
      const allLots = await apiGetLots();
      setLots(allLots);
    } catch (error) {
      console.error('Error loading lots:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (editingLot) {
        // Update existing lot
        const payload = {
          ...editingLot,
          ...formData,
          price: parseFloat(formData.price as any),
          dailyReturn: parseFloat(formData.dailyReturn as any),
          duration: parseInt(formData.duration as any, 10),
          color: formData.color ? String(formData.color) : '',
          name: formData.name ? String(formData.name) : '',
          active: !!formData.active
        };
        console.log('Payload update lot:', payload);
        await apiUpdateLot(payload);
        toast({
          title: "Lot mis à jour",
          description: `Le lot ${formData.name} a été modifié.`,
        });
      } else {
        // Create new lot
        const payload = {
          ...formData,
          price: parseFloat(formData.price as any),
          dailyReturn: parseFloat(formData.dailyReturn as any),
          duration: parseInt(formData.duration as any, 10),
          color: formData.color ? String(formData.color) : '',
          name: formData.name ? String(formData.name) : '',
          active: !!formData.active
        };
        console.log('Payload create lot:', payload);
        await apiCreateLot(payload);
        toast({
          title: "Lot créé",
          description: `Le lot ${formData.name} a été créé.`,
        });
      }
      await loadLots();
      resetForm();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le lot.",
        variant: "destructive"
      });
    }
  };

  const toggleLotStatus = async (lotId: string, active: boolean) => {
    try {
      // On retrouve le lot pour envoyer tous les champs nécessaires (notamment duration)
      const lot = lots.find(l => l.id === lotId);
      if (!lot) throw new Error('Lot introuvable');
      const payload = {
        ...lot,
        active,
        price: parseFloat(lot.price),
        dailyReturn: parseFloat(lot.dailyReturn),
        duration: parseInt(lot.duration, 10),
        color: lot.color ? String(lot.color) : '',
        name: lot.name ? String(lot.name) : '',
      };
      console.log('Payload toggle status:', payload);
      await apiUpdateLot(payload);
      await loadLots();
      toast({
        title: active ? "Lot activé" : "Lot désactivé",
        description: `Le statut du lot a été modifié.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du lot.",
        variant: "destructive"
      });
    }
  };

  const startEdit = (lot: any) => {
    setEditingLot(lot);
    setFormData({
      name: lot.name,
      price: lot.price,
      dailyReturn: lot.dailyReturn,
      duration: lot.duration,
      color: lot.color,
      active: lot.active
    });
    setIsCreating(true);
  };

  const startCreate = () => {
    setEditingLot(null);
    setFormData({
      name: '',
      price: 0,
      dailyReturn: 0,
      duration: 0,
      color: 'lot-diamond',
      active: true
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingLot(null);
    setIsCreating(false);
    setFormData({
      name: '',
      price: 0,
      dailyReturn: 0,
      duration: 0,
      color: 'lot-diamond',
      active: true
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  const getLotIcon = (color: string) => {
    const colorMap = {
      'lot-diamond': '💎',
      'lot-emerald': '💚',
      'lot-sapphire': '💙',
      'lot-ruby': '❤️',
      'lot-topaz': '💛'
    };
    return colorMap[color as keyof typeof colorMap] || '💎';
  };

  const colorOptions = [
    { value: 'lot-diamond', label: 'Diamant', icon: '💎' },
    { value: 'lot-emerald', label: 'Émeraude', icon: '💚' },
    { value: 'lot-sapphire', label: 'Saphir', icon: '💙' },
    { value: 'lot-ruby', label: 'Rubis', icon: '❤️' },
    { value: 'lot-topaz', label: 'Topaze', icon: '💛' }
  ];

  return (
    <>
      <Navigation userRole="admin" />
      <div className="p-2 sm:p-6 space-y-3 sm:space-y-6 min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f1f5f9] mb-16 sm:mb-24">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 bg-white/80 rounded-lg shadow-md p-3 sm:p-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text text-center sm:text-left">Lots</h1>
          <Button onClick={startCreate} size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Lot
          </Button>
        </div>

      {/* Create/Edit Form - Optimized for mobile */}
      {isCreating && (
        <Card className="rounded-lg shadow-md border-0 bg-white/90">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base">
              {editingLot ? `Modifier ${editingLot.name}` : 'Créer un nouveau lot'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium">Nom du lot</label>
                <Input
                  placeholder="Ex: Diamant"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium">Prix (FCFA)</label>
                <Input
                  type="number"
                  placeholder="120000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium">Gain journalier (FCFA)</label>
                <Input
                  type="number"
                  placeholder="8000"
                  value={formData.dailyReturn}
                  onChange={(e) => setFormData({ ...formData, dailyReturn: parseFloat(e.target.value) || 0 })}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium">Durée (jours)</label>
                <Input
                  type="number"
                  placeholder="30"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                  className="text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs sm:text-sm font-medium">Couleur/Thème</label>
                <select
                  className="w-full p-2 border rounded text-sm"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                >
                  {colorOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center space-x-2 sm:col-span-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <label className="text-xs sm:text-sm font-medium">Lot actif</label>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-3 sm:mt-4">
              <Button onClick={handleSave} size="sm" className="w-full sm:w-auto">
                <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                {editingLot ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button variant="outline" onClick={resetForm} size="sm" className="w-full sm:w-auto">
                <X className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lots Table - Optimized for mobile */}
      <Card className="rounded-lg shadow-md border-0 bg-white/90">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-base flex items-center">
            <Gem className="w-4 h-4 mr-2 text-primary" />
            Lots d'Investissement ({lots.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {/* Mobile layout */}
          <div className="block lg:hidden space-y-2">
            {lots.map((lot) => (
              <div key={lot.id} className="bg-gray-50 p-3 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-lg">{getLotIcon(lot.color)}</span>
                    <div>
                      <div className="font-medium text-sm">{lot.name}</div>
                      <div className="text-xs text-muted-foreground">{formatAmount(lot.price)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge variant={lot.active ? 'default' : 'secondary'} className="text-xs px-1.5 py-0.5">
                      {lot.active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-muted-foreground">Gain/jour: </span>
                    <span className="font-medium text-green-600">{formatAmount(lot.dailyReturn)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ROI: </span>
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {lot.price > 0 ? ((lot.dailyReturn / lot.price) * 100).toFixed(2) : 0}%
                    </Badge>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEdit(lot)}
                  className="w-full text-xs"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Modifier
                </Button>
              </div>
            ))}
          </div>
          
          {/* Desktop table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Gain Journalier</TableHead>
                  <TableHead>Durée (jours)</TableHead>
                  <TableHead>ROI %</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getLotIcon(lot.color)}</span>
                        <span className="font-medium">{lot.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{formatAmount(lot.price)}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatAmount(lot.dailyReturn)}
                    </TableCell>
                    <TableCell>{lot.duration}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {lot.price > 0 ? ((lot.dailyReturn / lot.price) * 100).toFixed(2) : 0}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={lot.active ? 'default' : 'secondary'}>
                          {lot.active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(lot)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}