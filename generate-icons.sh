#!/bin/bash
# Script pour générer les icônes PWA InvestPro
# Assurez-vous d'avoir ImageMagick installé : https://imagemagick.org/

# Créer une icône de base SVG
cat > /tmp/investpro-icon.svg << 'EOF'
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Fond dégradé -->
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fond circulaire -->
  <circle cx="256" cy="256" r="240" fill="url(#grad1)" stroke="white" stroke-width="8"/>
  
  <!-- Icône TrendingUp stylisée -->
  <g transform="translate(150, 180)">
    <!-- Graphique en barres -->
    <rect x="0" y="80" width="30" height="80" fill="url(#grad2)" rx="4"/>
    <rect x="40" y="60" width="30" height="100" fill="url(#grad2)" rx="4"/>
    <rect x="80" y="40" width="30" height="120" fill="url(#grad2)" rx="4"/>
    <rect x="120" y="20" width="30" height="140" fill="url(#grad2)" rx="4"/>
    <rect x="160" y="0" width="30" height="160" fill="url(#grad2)" rx="4"/>
    
    <!-- Flèche montante -->
    <path d="M180 30 L200 10 L220 30 L210 30 L210 50 L190 50 L190 30 Z" fill="white"/>
  </g>
  
  <!-- Texte InvestPro -->
  <text x="256" y="350" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">INVEST</text>
  <text x="256" y="380" text-anchor="middle" fill="#fbbf24" font-family="Arial, sans-serif" font-size="32" font-weight="bold">PRO</text>
</svg>
EOF

echo "Génération des icônes PWA pour InvestPro..."

# Tailles requises pour PWA
sizes=(72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
  echo "Génération de l'icône ${size}x${size}..."
  
  # Convertir SVG en PNG avec ImageMagick
  if command -v convert &> /dev/null; then
    convert -background none -size ${size}x${size} /tmp/investpro-icon.svg "public/icons/icon-${size}x${size}.png"
  else
    echo "ImageMagick n'est pas installé. Veuillez installer ImageMagick pour générer automatiquement les icônes."
    echo "Ou utilisez un outil en ligne comme https://realfavicongenerator.net/"
  fi
done

# Générer le favicon
if command -v convert &> /dev/null; then
  convert -background none -size 32x32 /tmp/investpro-icon.svg "public/favicon.ico"
fi

echo "Génération terminée ! Les icônes sont dans le dossier public/icons/"
echo ""
echo "Instructions pour générer manuellement les icônes :"
echo "1. Utilisez l'icône SVG générée (/tmp/investpro-icon.svg)"
echo "2. Convertissez-la aux tailles suivantes : 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512"
echo "3. Placez les fichiers PNG dans le dossier public/icons/"
echo "4. Nommez-les : icon-72x72.png, icon-96x96.png, etc."
