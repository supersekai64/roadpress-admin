# 🚀 Guide de configuration du template

> **Guide pas à pas pour démarrer un nouveau projet avec ce template**

## 📋 Checklist de démarrage

Suivez ces étapes dans l'ordre pour configurer votre nouveau projet :

### ✅ 1. Cloner et initialiser

```bash
# Cloner le template
git clone <template-repo-url> mon-nouveau-projet
cd mon-nouveau-projet

# Supprimer l'historique Git du template
rm -rf .git

# Initialiser un nouveau repository Git
git init
git add .
git commit -m "Initial commit from Next.js starter template"
```

### ✅ 2. Personnaliser package.json

Modifier `package.json` :

```json
{
  "name": "mon-projet",                    // ← Votre nom de projet
  "version": "0.1.0",                      // ← Reset à 0.1.0
  "description": "Description du projet",  // ← Votre description
  "author": "Votre Nom <email@example.com>", // ← Vos infos
  "repository": {
    "type": "git",
    "url": "https://github.com/vous/votre-repo" // ← Votre repo
  }
}
```

### ✅ 3. Configurer les metadata SEO

Modifier `src/app/layout.tsx` :

```tsx
export const metadata: Metadata = {
  title: "Votre Site",                    // ← Titre de votre site
  description: "Description de votre site", // ← Description
  metadataBase: new URL('https://votresite.com'), // ← Votre URL
  // ... autres metadata à personnaliser
};
```

### ✅ 4. Remplacer les assets

Dans le dossier `public/` :
(https://realfavicongenerator.net/)

- [ ] Remplacer `favicon.svg` par votre favicon
- [ ] Remplacer `favicon.ico` par votre favicon ICO
- [ ] Remplacer `apple-touch-icon.png` (180x180)
- [ ] Remplacer `android-chrome-192x192.png`
- [ ] Remplacer `android-chrome-512x512.png`
- [ ] Mettre vos images dans `public/images/`

### ✅ 5. Configurer manifest.json

Modifier `public/manifest.json` :

```json
{
  "name": "Nom complet de votre app",
  "short_name": "Nom court",
  "description": "Description",
  "theme_color": "#000000",
  // ... personnaliser
}
```

### ✅ 6. Installer les dépendances

```bash
# Installer pnpm si pas déjà fait
npm install -g pnpm

# Installer les dépendances
pnpm install
```

### ✅ 7. Configurer les variables d'environnement

Créer `.env.local` si nécessaire :

```bash
# .env.local
NEXT_PUBLIC_SITE_URL=https://votresite.com
# Ajouter vos variables ici
```

**⚠️ Ne jamais commit `.env.local`** (déjà dans .gitignore)

### ✅ 8. Personnaliser le contenu

Modifier `src/app/page.tsx` :

```tsx
export default function Home() {
  return (
    <main>
      {/* Remplacer par votre contenu */}
    </main>
  );
}
```

### ✅ 9. Configurer sitemap et robots

Modifier `src/app/sitemap.ts` :

```tsx
export default async function sitemap() {
  const baseUrl = 'https://votresite.com'; // ← Votre URL
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // Ajouter vos pages
  ];
}
```

### ✅ 10. Vérifier que tout fonctionne

```bash
# Lancer le dev server
pnpm dev:clean

# Ouvrir http://localhost:3000

# Vérifier le build
pnpm build

# Analyser les bundles
pnpm analyze
```

## 🎯 Prochaines étapes

### Développement

1. **Ajouter des pages** : Créer dans `src/app/` suivant le workflow SEO
2. **Ajouter des composants** : Utiliser shadcn/ui `pnpm dlx shadcn@latest add [component]`
3. **Configurer GSAP** : Ajouter vos animations dans les composants client
4. **Optimiser les images** : Placer dans `public/images/`, utiliser `<OptimizedImage />`

### Déploiement

1. **Push vers GitHub** :
   ```bash
   git remote add origin <votre-repo-url>
   git push -u origin main
   ```

2. **Déployer sur Vercel** :
   - Connecter votre repo GitHub à Vercel
   - Configuration automatique détectée
   - Analytics et Speed Insights actifs automatiquement

3. **Configurer le domaine** :
   - Ajouter votre domaine custom dans Vercel
   - Mettre à jour `metadataBase` dans layout.tsx
   - Mettre à jour sitemap.ts avec la bonne URL

### Monitoring

Une fois déployé :
- ✅ Vercel Analytics actif → Dashboard Vercel
- ✅ Speed Insights actif → Core Web Vitals en temps réel
- ✅ Sitemap accessible : `https://votresite.com/sitemap.xml`
- ✅ Robots.txt accessible : `https://votresite.com/robots.txt`

## 📚 Documentation

- 📖 [README.md](./README.md) - Vue d'ensemble et commandes
- 📝 [.github/copilot-instructions.md](./.github/copilot-instructions.md) - Best practices (1300+ lignes)
- 🖼️ [docs/IMAGE-OPTIMIZATION.md](./docs/IMAGE-OPTIMIZATION.md) - Optimisation d'images

## 🆘 Aide

### Problèmes courants

**Port 3000 occupé ?**
```bash
pnpm kill
pnpm dev:clean
```

**Erreurs de build ?**
```bash
# Supprimer les caches
rm -rf .next
rm -rf node_modules/.cache
pnpm build
```

**Images non optimisées ?**
```bash
# Lancer l'optimisation manuelle
pnpm optimize:images
```

## ✅ Checklist finale avant production

- [ ] `package.json` personnalisé (name, description, author, repo)
- [ ] `layout.tsx` metadata mise à jour
- [ ] Favicons et images remplacés dans `public/`
- [ ] `manifest.json` personnalisé
- [ ] `sitemap.ts` et `robots.ts` configurés avec bonne URL
- [ ] Variables d'environnement configurées (si nécessaire)
- [ ] Contenu de `page.tsx` personnalisé
- [ ] Build réussi sans erreurs (`pnpm build`)
- [ ] Bundles analysés et optimisés (`pnpm analyze`)
- [ ] Git repository initialisé et pushé
- [ ] Déployé sur Vercel
- [ ] Domaine custom configuré (optionnel)
- [ ] Analytics et monitoring vérifiés

---

🎉 **Félicitations ! Votre projet est prêt pour le développement.**

Pour toute question, référez-vous aux instructions Copilot ou à la documentation Next.js.
