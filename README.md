# 🚀 Next.js Starter Template

> **Template professionnel Next.js 15** avec TypeScript, Tailwind CSS, shadcn/ui, GSAP, Lenis et optimisations avancées

Un starter moderne et optimisé pour démarrer rapidement vos projets Next.js avec les meilleures pratiques de développement.

## ✨ Fonctionnalités

### 🎯 Core Stack
- ⚡ **Next.js 15** - App Router, React Server Components, TypeScript strict
- 🎨 **Tailwind CSS 3** - Utility-first CSS avec configuration complète
- 🧩 **shadcn/ui** - Composants UI accessibles et personnalisables (Radix UI)
- 🌗 **Thème dark/light** - Gestion automatique avec next-themes

### 🎬 Animations & UX
- 🎭 **GSAP 3** - Animations professionnelles avec cleanup patterns
- 🌊 **Lenis** - Smooth scrolling fluide et performant

### ⚙️ Performance & Optimisation
- 🖼️ **Optimisation d'images** - Conversion automatique WebP/AVIF avec cache MD5
- 📦 **Bundle analyzer** - Analyse et optimisation des chunks
- 📊 **Vercel Analytics** - Suivi des performances et analytics
- ⚡ **Speed Insights** - Monitoring des Core Web Vitals
- 🚀 **Turbopack** - Build ultra-rapide en développement
- 📦 **Code splitting** - Lazy loading et tree shaking optimisés

### 🛠️ Outils de développement
- 🔧 **pnpm** - Gestionnaire de paquets rapide et efficace
- 🧹 **dev:clean** - Script PowerShell pour restart propre
- 🎯 **Copilot Instructions** - 1300+ lignes de best practices
- 📝 **TypeScript strict** - Typage complet avec conventions immutables
- ✅ **ESLint + Prettier** - Configuration Next.js optimale

### 🔍 SEO & Accessibilité
- 🌐 **Metadata API** - SEO optimisé avec Open Graph et Twitter Cards
- 🗺️ **Sitemap & Robots** - Génération automatique
- ♿ **Accessibilité** - HTML sémantique et ARIA
- 📱 **PWA ready** - Manifest et favicons optimisés

## � Démarrage rapide

### 1. Cloner le template

```bash
# Cloner le repository
git clone <your-repo-url> mon-projet
cd mon-projet

# Supprimer l'historique Git (optionnel)
rm -rf .git
git init
```

### 2. Installer pnpm

⚠️ **Ce template utilise pnpm comme gestionnaire de paquets**

```bash
npm install -g pnpm
```

### 3. Installer les dépendances

```bash
pnpm install
```

### 4. Personnaliser le projet

Modifier les fichiers suivants avec vos informations :
- `package.json` - Nom, description, auteur, repository
- `src/app/layout.tsx` - Metadata (title, description, URL)
- `public/` - Remplacer les favicons et images par les vôtres
- `.env.local` (créer) - Variables d'environnement si nécessaire

### 5. Lancer le projet

```bash
pnpm dev:clean
```

🎉 **Votre application est prête sur** [http://localhost:3000](http://localhost:3000)

## 🛠️ Commandes disponibles

### Développement

⭐ **Commande recommandée** - Lancer le serveur en tuant d'abord les ports occupés :

```bash
pnpm dev:clean
```

Ou lancer normalement (sans kill) :

```bash
pnpm dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

Si le port est déjà occupé, utilisez :

```bash
pnpm kill      # Tuer tous les processus Node
pnpm dev:clean # Puis relancer
```

### Build et analyse

Compiler le projet pour la production :

```bash
pnpm build
```

Analyser la taille des bundles (ouvre un rapport interactif) :

```bash
pnpm analyze
```

### Autres commandes

```bash
pnpm build
```

### Production

Démarrer le serveur de production :

```bash
pnpm start
```

### Linting

Vérifier le code avec ESLint :

```bash
pnpm lint
```

### Gestion des packages

```bash
pnpm add <package>      # Ajouter une dépendance
pnpm add -D <package>   # Ajouter une dépendance de dev
pnpm remove <package>   # Supprimer une dépendance
pnpm install            # Installer toutes les dépendances
```

## 🎬 Démarrer un nouveau projet

**� Guide complet** : Voir [TEMPLATE-SETUP.md](./TEMPLATE-SETUP.md)  
**⚡ Checklist rapide** : Voir [TODO-AFTER-CLONE.md](./TODO-AFTER-CLONE.md)

## �📁 Structure du projet

```
nextjs-starter-template/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout principal
│   │   ├── page.tsx             # Page d'accueil
│   │   └── globals.css          # Styles globaux avec Tailwind
│   ├── components/
│   │   ├── ui/                  # Composants shadcn/ui
│   │   ├── theme-provider.tsx   # Provider pour les thèmes
│   │   ├── theme-toggle.tsx     # Bouton toggle dark/light
│   │   └── optimized-image.tsx  # Composant d'images optimisées
│   ├── lib/
│   │   └── utils.ts             # Utilitaires (cn fonction)
│   └── types/
│       └── css.d.ts             # Types pour les imports CSS
├── public/
│   ├── images/                  # Images sources (PNG, JPG)
│   └── optimized/               # Images optimisées (auto-générées)
├── scripts/
│   ├── dev-clean.ps1            # Script pour kill & restart dev
│   └── optimize-images.js       # Script d'optimisation d'images
├── docs/
│   └── IMAGE-OPTIMIZATION.md    # Doc optimisation d'images
├── .github/
│   └── copilot-instructions.md  # Instructions pour Copilot
├── components.json              # Configuration shadcn/ui
├── tailwind.config.ts           # Configuration Tailwind
├── tsconfig.json                # Configuration TypeScript
└── next.config.ts               # Configuration Next.js
```

## 🎨 shadcn/ui

Pour ajouter des composants shadcn/ui :

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog
```

Liste complète : [shadcn/ui components](https://ui.shadcn.com/docs/components)

## 🖼️ Optimisation des images

Ce projet inclut un système d'optimisation automatique des images :

- Conversion PNG/JPG → **WebP** et **AVIF**
- Cache intelligent (pas de retraitement si l'image n'a pas changé)
- Réduction de poids jusqu'à **89%**
- Intégré automatiquement au build

### Utilisation :

1. Placez vos images dans `public/images/`
2. Utilisez le composant optimisé :

```tsx
import { OptimizedImage } from '@/components/optimized-image';

<OptimizedImage 
  src="/images/hero.jpg"
  alt="Hero"
  width={1920}
  height={1080}
/>
```

3. Les images sont optimisées automatiquement lors du build

📚 **Documentation complète** : [docs/IMAGE-OPTIMIZATION.md](./docs/IMAGE-OPTIMIZATION.md)

## ✨ GSAP

GSAP est installé et prêt à l'emploi. Exemple d'utilisation :

```tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function AnimatedComponent() {
  const ref = useRef(null);

  useEffect(() => {
    gsap.from(ref.current, {
      opacity: 0,
      y: 50,
      duration: 1,
    });
  }, []);

  return <div ref={ref}>Contenu animé</div>;
}
```

## 🌊 Lenis

Lenis est installé pour un smooth scrolling fluide. Exemple d'intégration :

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis();

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return null;
}
```

## 🎯 Pourquoi ce template ?

### ✅ Avantages
- ⚡ **Démarrage instantané** - Toute la configuration est faite
- 🏗️ **Architecture solide** - Best practices Next.js 15 intégrées
- 📚 **Documentation complète** - 1300+ lignes d'instructions Copilot
- 🎨 **UI moderne** - shadcn/ui + dark mode prêts
- 🚀 **Performance optimisée** - Images, bundles, SEO
- 🔧 **DevX optimale** - Scripts, outils, conventions
- 📱 **Production ready** - Analytics, monitoring, PWA

### 🎓 Cas d'usage idéaux
- Sites web corporate
- Applications SaaS
- Portfolios & blogs
- Dashboards & admin panels
- Landing pages
- E-commerce
- Tout projet Next.js nécessitant performance et qualité

## 📝 Conventions et best practices

Ce template inclut **1300+ lignes d'instructions Copilot** couvrant :

### 📐 Conventions de nommage
- **Fichiers** : `kebab-case` (ex: `theme-toggle.tsx`, `user-profile.ts`)
- **Composants React** : `PascalCase` (ex: `<ThemeToggle />`, `<OptimizedImage />`)
- **Fonctions/variables** : `camelCase` (ex: `useState`, `handleClick`)
- **Constantes** : `SCREAMING_SNAKE_CASE` (ex: `API_BASE_URL`, `MAX_RETRIES`)
- **Fonctions async** : suffixe `Async` (ex: `fetchUserAsync()`)

### 🎯 Patterns TypeScript
- Props immutables avec `readonly`
- Typage strict, pas de `any`
- Gestion d'erreurs avec try/catch obligatoire
- États loading/error systématiques

### ♿ Accessibilité
- HTML sémantique obligatoire
- ARIA labels sur tous les composants
- Alt text descriptifs sur images
- Labels associés aux inputs

### 🔍 SEO
- Metadata complète sur chaque page
- Sitemap et robots.txt générés
- JSON-LD (données structurées)
- Workflow de création de page documenté

### 📦 Performance
- Code splitting et lazy loading
- Tree shaking optimisé
- Bundle analysis régulière
- Limites de taille documentées (First Load < 200KB)

📚 **Voir `.github/copilot-instructions.md` pour la documentation complète**

## � Documentation

### Documentation interne
- 📖 [Copilot Instructions](./.github/copilot-instructions.md) - Best practices complètes (1300+ lignes)
- 🖼️ [Optimisation d'images](./docs/IMAGE-OPTIMIZATION.md) - Guide complet WebP/AVIF

### Ressources externes
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [GSAP Documentation](https://gsap.com/docs/v3/)
- [Lenis Documentation](https://lenis.darkroom.engineering/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contribution

Ce template est conçu pour être **fork et personnalisé**. N'hésitez pas à :
- Ajouter vos propres outils
- Modifier les configurations
- Adapter les conventions à votre équipe
- Partager vos améliorations

## 📊 Stats du template

- 📄 **1300+ lignes** d'instructions Copilot
- 🎨 **shadcn/ui** composants prêts à l'emploi
- 📦 **15+ packages** préconfigurés
- 🔧 **10+ scripts** utilitaires
- ✅ **0 erreur** ESLint/TypeScript
- 🚀 **< 105 KB** First Load JS (optimisé)

## ⚠️ Support environnement

- ✅ **Windows** - Scripts PowerShell optimisés
- ✅ **macOS/Linux** - Compatible avec adaptations mineures
- ✅ **Node.js** - Version 18+ recommandée
- ✅ **pnpm** - Version 9+ requise

## 📄 Licence

MIT - Libre d'utilisation pour projets personnels et commerciaux

---

**Fait avec ❤️ pour accélérer le développement Next.js**