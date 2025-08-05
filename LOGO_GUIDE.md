# 🎨 Guide de personnalisation du logo InvestPro

## Option 1 : Modifier les icônes SVG existantes

### Couleurs personnalisables :
- **Fond principal** : Changez `#059669` et `#047857` dans les SVG
- **Couleur des barres** : Changez `#fbbf24` 
- **Texte** : Remplacez "VOTRE" et "LOGO" par votre nom

### Fichiers à modifier :
- `public/icons/icon-192x192.svg`
- `public/icons/icon-512x512.svg`

## Option 2 : Utiliser votre propre logo

### 1. Préparez votre logo :
- Format recommandé : PNG avec fond transparent
- Taille minimale : 512x512 pixels
- Placez-le dans `public/icons/`

### 2. Créez les différentes tailles :
```powershell
# Dans PowerShell (Windows)
# Remplacez "votre-logo.png" par le nom de votre fichier

$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($size in $sizes) {
    # Si vous avez ImageMagick installé :
    magick convert "public/icons/votre-logo.png" -resize "${size}x${size}" "public/icons/icon-${size}x${size}.png"
}
```

### 3. Outils en ligne (sans logiciel) :
- **RealFaviconGenerator** : https://realfavicongenerator.net/
- **Favicon.io** : https://favicon.io/
- **App Icon Generator** : https://appicon.co/

### 4. Mettez à jour le manifest :
```json
"icons": [
  {
    "src": "/icons/icon-192x192.png",
    "sizes": "192x192",
    "type": "image/png"
  },
  {
    "src": "/icons/icon-512x512.png", 
    "sizes": "512x512",
    "type": "image/png"
  }
]
```

## Option 3 : Design personnalisé complet

### Créez un nouveau SVG :
```svg
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Votre design ici -->
  <rect width="512" height="512" rx="64" fill="#VOTRE_COULEUR"/>
  <!-- Ajoutez votre logo/forme -->
  <text x="256" y="300" text-anchor="middle" fill="white" font-size="48">VOTRE TEXTE</text>
</svg>
```

## Couleurs suggérées :

### Finance/Business :
- **Bleu professionnel** : `#1e40af` → `#1e3a8a`
- **Vert argent** : `#059669` → `#047857`
- **Or premium** : `#d97706` → `#b45309`

### Tech/Modern :
- **Violet** : `#7c3aed` → `#6d28d9`
- **Cyan** : `#0891b2` → `#0e7490`
- **Rouge moderne** : `#dc2626` → `#b91c1c`

## Test rapide :
Après modification, rechargez http://localhost:8081 pour voir vos changements !
