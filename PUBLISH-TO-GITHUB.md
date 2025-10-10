# 📤 Publier le template sur GitHub

## 🎯 Étape 1 : Créer le repository sur GitHub

1. Aller sur https://github.com/new
2. Remplir :
   - **Repository name** : `nextjs-starter-template`
   - **Description** : `Professional Next.js 15 starter template with TypeScript, Tailwind CSS, shadcn/ui, GSAP, and Lenis`
   - **Public** : ✅
   - ⚠️ **IMPORTANT** : Cocher **"Template repository"** ✅
   - **Add README** : ❌ (on a déjà)
   - **Add .gitignore** : ❌ (on a déjà)
   - **Choose a license** : MIT
3. Cliquer sur **"Create repository"**

## 🔧 Étape 2 : Initialiser Git localement

```powershell
# Dans le dossier du projet
cd C:\Users\paulc\Desktop\mockup

# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit: Next.js 15 Starter Template

- Next.js 15 with App Router
- TypeScript strict mode
- Tailwind CSS + shadcn/ui
- GSAP + Lenis animations
- Image optimization (WebP/AVIF)
- Vercel Analytics + Speed Insights
- Bundle analyzer
- 1300+ lines Copilot instructions
- SEO optimized
- Production ready"

# Renommer la branche en main
git branch -M main
```

## 📤 Étape 3 : Connecter et pousser vers GitHub

```powershell
# Remplacer VOTRE_USERNAME par votre nom d'utilisateur GitHub
git remote add origin https://github.com/VOTRE_USERNAME/nextjs-starter-template.git

# Vérifier la connexion
git remote -v

# Pousser le code
git push -u origin main
```

## ✅ Étape 4 : Vérifications post-publication

### Sur GitHub, vérifier :

1. ✅ Le badge **"Template"** est visible en haut du repo
2. ✅ Le bouton **"Use this template"** est présent
3. ✅ Le README.md s'affiche correctement
4. ✅ Tous les fichiers sont présents
5. ✅ La licence MIT est visible

### Améliorer le repository :

1. **Ajouter des topics** (en haut à droite) :
   - nextjs
   - react
   - typescript
   - tailwindcss
   - shadcn-ui
   - gsap
   - starter-template
   - boilerplate

2. **Ajouter un About** (en haut à droite) :
   - Description courte
   - Website (si vous en avez)
   - Cocher "Template" si pas déjà fait

3. **Créer une GitHub Pages** (optionnel) :
   - Settings → Pages
   - Source : Deploy from a branch
   - Branch : main / root
   - Ça créera une démo live du template

## 🎉 Étape 5 : Utiliser le template

Les utilisateurs pourront maintenant :

1. Cliquer sur **"Use this template"**
2. Choisir **"Create a new repository"**
3. Nommer leur projet
4. Cloner et suivre [TEMPLATE-SETUP.md](./TEMPLATE-SETUP.md)

## 📝 Commandes complètes (copier-coller)

```powershell
# 1. Initialiser Git
git init
git add .
git commit -m "Initial commit: Next.js 15 Starter Template"
git branch -M main

# 2. Connecter à GitHub (REMPLACER VOTRE_USERNAME)
git remote add origin https://github.com/VOTRE_USERNAME/nextjs-starter-template.git

# 3. Pousser
git push -u origin main
```

## 🚨 En cas de problème

### Erreur "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/VOTRE_USERNAME/nextjs-starter-template.git
```

### Erreur d'authentification
- Utiliser un **Personal Access Token** au lieu du mot de passe
- Générer sur : https://github.com/settings/tokens
- Permissions : `repo` (full control)

### Forcer le push (si conflits)
```powershell
git push -u origin main --force
```

---

**Une fois publié, partagez le lien et aidez la communauté ! 🚀**
