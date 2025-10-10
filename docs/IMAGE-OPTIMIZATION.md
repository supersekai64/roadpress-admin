# 🖼️ Système d'optimisation d'images

## 📁 Structure des dossiers

```
public/
├── images/              ← Placez vos images sources ici (PNG, JPG, JPEG)
│   ├── hero.jpg
│   ├── logo.png
│   └── ...
└── optimized/           ← Images optimisées générées automatiquement
    ├── hero.webp
    ├── hero.avif
    ├── logo.webp
    └── logo.avif
```

## 🚀 Utilisation

### 1. Ajouter des images sources

Placez vos images dans `public/images/` (ou n'importe où dans `public/`)

### 2. Build automatique

Les images sont automatiquement optimisées lors du build :

```bash
pnpm build
```

Le script `optimize:images` s'exécute **automatiquement avant** le build grâce au hook `prebuild`.

### 3. Optimisation manuelle

Pour optimiser les images sans faire de build :

```bash
pnpm optimize:images
```

## 🎨 Utiliser les images dans votre code

### Avec le composant OptimizedImage (recommandé)

```tsx
import { OptimizedImage } from '@/components/optimized-image';

export default function Page() {
  return (
    <OptimizedImage
      src="/images/hero.jpg"
      alt="Hero"
      width={1920}
      height={1080}
      priority
    />
  );
}
```

Le composant charge automatiquement :
1. **AVIF** en priorité (le plus léger)
2. **WebP** en fallback
3. **Image originale** si les formats modernes ne sont pas supportés

### Avec next/image classique

```tsx
import Image from 'next/image';

export default function Page() {
  return (
    <picture>
      <source type="image/avif" srcSet="/optimized/hero.avif" />
      <source type="image/webp" srcSet="/optimized/hero.webp" />
      <Image src="/images/hero.jpg" alt="Hero" width={1920} height={1080} />
    </picture>
  );
}
```

## ⚡ Système de cache intelligent

- **Hash MD5** : Chaque image est identifiée par son hash
- **Pas de retraitement** : Les images inchangées sont ignorées
- **Cache persistant** : Stocké dans `.image-cache.json`
- **Performance** : Build ultra-rapide si les images n'ont pas changé

## 📊 Configuration

Modifiez `scripts/optimize-images.js` pour personnaliser :

```javascript
const CONFIG = {
  inputDir: 'public',              // Dossier source
  outputDir: 'public/optimized',   // Dossier destination
  formats: ['webp', 'avif'],       // Formats générés
  quality: {
    webp: 80,                      // Qualité WebP (0-100)
    avif: 65,                      // Qualité AVIF (0-100)
  },
  sourceExtensions: ['png', 'jpg', 'jpeg'],
};
```

## 📈 Gains de performance

### Exemple de réduction de poids :

- **Original PNG** : 2.5 MB
- **WebP** : 450 KB (-82%)
- **AVIF** : 280 KB (-89%)

### Avantages :

- ✅ **Chargement plus rapide** : Moins de bande passante
- ✅ **Meilleur SEO** : Core Web Vitals optimisés
- ✅ **UX améliorée** : Images qui s'affichent instantanément
- ✅ **Économies** : Moins de coûts de bande passante

## 🔧 Commandes disponibles

```bash
pnpm optimize:images  # Optimiser manuellement les images
pnpm build            # Optimiser ET compiler (automatique)
```

## 📝 Notes importantes

1. **Ne commitez pas** `/public/optimized/` ni `.image-cache.json` (déjà dans `.gitignore`)
2. Les images optimisées sont **regénérées** à chaque déploiement
3. Le cache accélère les builds en ignorant les images non modifiées
4. Les formats **AVIF** sont plus légers mais moins compatibles (iOS 16+, Android 12+)
5. Les formats **WebP** sont le fallback universel (98% de compatibilité)

## 🐛 Dépannage

### Les images ne s'affichent pas

Vérifiez que :
- Les images sources sont dans `public/`
- Le script d'optimisation s'est exécuté
- Le dossier `public/optimized/` existe

### Le build est lent

- Utilisez le cache (`.image-cache.json`)
- Ne modifiez que les images nécessaires
- Le premier build est toujours plus long

### Erreur Sharp

```bash
pnpm add -D sharp
```

Puis relancez le build.
