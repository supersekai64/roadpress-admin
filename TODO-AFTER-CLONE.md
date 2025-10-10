# ⚠️ À faire après clonage du template

> **Checklist rapide des modifications obligatoires**

## 🔴 Modifications OBLIGATOIRES

### 1. package.json
```json
{
  "name": "votre-projet",           // ← CHANGER
  "description": "...",              // ← CHANGER
  "author": "Votre Nom <email>",    // ← CHANGER
  "repository": {
    "url": "votre-repo-url"         // ← CHANGER
  }
}
```

### 2. src/app/layout.tsx
```tsx
export const metadata: Metadata = {
  title: "Votre Site",              // ← CHANGER
  description: "...",                // ← CHANGER
  metadataBase: new URL("https://votresite.com"), // ← CHANGER
  authors: [{ name: "Votre Nom" }], // ← CHANGER
};
```

### 3. public/manifest.json
```json
{
  "name": "Votre App",              // ← CHANGER
  "short_name": "App",              // ← CHANGER
  "description": "...",             // ← CHANGER
}
```

### 4. src/app/sitemap.ts
```tsx
const baseUrl = 'https://votresite.com'; // ← CHANGER
```

### 5. Favicons et images
- Remplacer tous les fichiers dans `public/`
- Placer vos images dans `public/images/`

## 📖 Documentation complète

Voir [TEMPLATE-SETUP.md](./TEMPLATE-SETUP.md) pour le guide complet pas à pas.

## 🚀 Démarrage rapide

```bash
# Installer et lancer
pnpm install
pnpm dev:clean
```

Ouvrir http://localhost:3000 et commencer à développer ! 🎉
