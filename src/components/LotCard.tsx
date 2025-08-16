import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentLot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Gem, Crown, Diamond, Sparkles, Star } from "lucide-react";

interface LotCardProps {
  lot: InvestmentLot;
  onSelect?: (lot: InvestmentLot) => void;
  disabled?: boolean;
}

const getLotIcon = (name: string) => {
  switch (name.toLowerCase()) {
    case 'diamant':
      return <Diamond className="h-8 w-8" />;
    case 'émeraude':
      return <Gem className="h-8 w-8" />;
    case 'saphir':
      return <Sparkles className="h-8 w-8" />;
    case 'rubis':
      return <Crown className="h-8 w-8" />;
    case 'topaze':
      return <Star className="h-8 w-8" />;
    default:
      return <Gem className="h-8 w-8" />;
  }
};


// Gestion dynamique de la couleur (hex ou nom)
const getLotColorStyle = (color?: string) => {
  if (!color) return {};
  return color.startsWith('#') ? { color } : {};
};

// Icône dynamique ou par défaut
const getDynamicIcon = (name: string) => {
  switch (name.trim().toLowerCase()) {
    case 'diamant': return <Diamond className="h-8 w-8" />;
    case 'émeraude': return <Gem className="h-8 w-8" />;
    case 'saphir': return <Sparkles className="h-8 w-8" />;
    case 'rubis': return <Crown className="h-8 w-8" />;
    case 'topaze': return <Star className="h-8 w-8" />;
    case 'onyx': return <Gem className="h-8 w-8" />;
    case 'grenat': return <Gem className="h-8 w-8" />;
    case 'améthyste': return <Gem className="h-8 w-8" />;
    case 'moonstone': return <Gem className="h-8 w-8" />;
    case 'perle': return <Gem className="h-8 w-8" />;
    case 'opale': return <Gem className="h-8 w-8" />;
    case 'tourmaline': return <Gem className="h-8 w-8" />;
    default: return <Gem className="h-8 w-8" />;
  }
};

export const LotCard = ({ lot, onSelect, disabled }: LotCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  return (
    <Card className={cn(
      "relative overflow-hidden shadow-card hover:shadow-primary transition-all duration-300 transform hover:scale-105",
      disabled && "opacity-50 cursor-not-allowed"
    )}>
      <div className="absolute inset-0 bg-gradient-card opacity-50" />
      <CardHeader className="relative text-center pb-4">
        <div className="mx-auto mb-2" style={getLotColorStyle(lot.color)}>
          {getDynamicIcon(lot.name)}
        </div>
        <CardTitle className="text-xl font-bold">{lot.name}</CardTitle>
      </CardHeader>
      <CardContent className="relative text-center space-y-4">
        <div className="space-y-2">
          <div className="text-3xl font-bold text-primary">
            {formatCurrency(lot.price)}
          </div>
          <div className="text-sm text-muted-foreground">
            Investissement
          </div>
        </div>
        <div className="border-t pt-4">
          <div className="text-xl font-semibold text-success">
            {formatCurrency(lot.dailyReturn)}
          </div>
          <div className="text-sm text-muted-foreground">
            Gain journalier
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Durée : <span className="font-semibold text-primary">{lot.duration} jours</span>
          </div>
        </div>
        <div className="mb-2 text-xs text-muted-foreground">
          <span>ID: {lot.id}</span> | <span style={{ color: lot.color }}>●</span> | <span>{lot.active ? "Actif" : "Inactif"}</span>
        </div>
        {lot.dailyReturn > 0 && (
          <div className="text-xs text-muted-foreground">
            ROI: {((lot.dailyReturn / lot.price) * 100).toFixed(1)}% par jour
          </div>
        )}
      </CardContent>
      <CardFooter className="relative">
        <Button 
          onClick={() => onSelect?.(lot)}
          disabled={disabled || !lot.active}
          className="w-full"
          variant={lot.price === 0 ? "secondary" : "default"}
        >
          {lot.price === 0 ? "Gratuit" : "Choisir ce lot"}
        </Button>
      </CardFooter>
    </Card>
  );
}