# ⚡ PRODUCTION - Commande simple à exécuter

## 🎯 Exécution depuis votre machine Windows

Vous n'avez PAS besoin d'accéder à l'interface Prisma Console !  
Tout se fait depuis votre terminal PowerShell.

---

## 📝 Commande à exécuter

```powershell
# 1. Ouvrir PowerShell dans le projet
cd C:\Users\paulc\Desktop\mockup

# 2. Définir la variable d'environnement PROD
$env:DATABASE_URL="postgres://efc126bb539dfd0dca4fa96d7afd0d8245c38e773cb8fcf9f1f703124560f060:sk_A68rPDbtDiBCmv2FNyPzC@db.prisma.io:5432/postgres?sslmode=require"

# 3. Exécuter le script SQL sur la base de PRODUCTION
pnpm prisma db execute --file .\prisma\migration-prod-remove-unused-columns.sql --schema .\prisma\schema.prisma

# C'est tout ! ✅
```

---

## ⚠️ IMPORTANT AVANT

### Option A : Backup via console.prisma.io (recommandé si disponible)

1. Aller sur https://console.prisma.io/
2. Sélectionner votre projet
3. Chercher une option "Backup" ou "Export"
4. Créer un backup manuel

### Option B : Backup via commande (si pas d'interface)

```powershell
# Exporter toute la base avant modification
$env:DATABASE_URL="postgres://efc126bb539dfd0dca4fa96d7afd0d8245c38e773cb8fcf9f1f703124560f060:sk_A68rPDbtDiBCmv2FNyPzC@db.prisma.io:5432/postgres?sslmode=require"

# Créer un backup SQL
pnpm prisma db pull
# Cela va mettre à jour votre schema.prisma avec l'état actuel de la prod
# Vous avez ainsi une trace de la structure actuelle
```

---

## 🔍 Vérifier après l'exécution

```powershell
# 1. Ouvrir Prisma Studio sur la PROD
$env:DATABASE_URL="postgres://efc126bb539dfd0dca4fa96d7afd0d8245c38e773cb8fcf9f1f703124560f060:sk_A68rPDbtDiBCmv2FNyPzC@db.prisma.io:5432/postgres?sslmode=require"

pnpm prisma studio

# 2. Naviguer dans les tables email_stats et sms_stats
# 3. Vérifier que les colonnes ont bien disparu
```

---

## 🚀 Après la migration SQL

```powershell
# 1. Déployer le code sur Vercel
git add .
git commit -m "feat: remove unused statistics columns"
git push origin main

# 2. Vercel déploie automatiquement
# 3. Tester : https://roadpress.superbien-works.fr/dashboard/statistics
```

---

## 📊 Récapitulatif visuel

```
┌─────────────────────────────────────┐
│ Votre Machine (Windows)             │
│                                     │
│  PowerShell                         │
│    ↓                                │
│  $env:DATABASE_URL = "prod..."      │
│    ↓                                │
│  pnpm prisma db execute             │
│    ↓                                │
│  Lit : migration-prod-....sql       │
│    ↓                                │
│  Envoie les commandes SQL           │
│    ↓                                │
└─────────────────────────────────────┘
              ↓
         (Internet)
              ↓
┌─────────────────────────────────────┐
│ Prisma Cloud (Production)           │
│                                     │
│  Database: db.prisma.io             │
│    ↓                                │
│  Exécute les DROP COLUMN            │
│    ↓                                │
│  Colonnes supprimées ✅             │
│                                     │
└─────────────────────────────────────┘
```

---

## 🆘 Si vous avez une erreur

### "Error: P1001: Can't reach database server"
→ Vérifier que la `DATABASE_URL` est correcte  
→ Vérifier votre connexion internet

### "Error: P3009: Failed to execute"
→ Peut-être que les colonnes n'existent pas (déjà supprimées)  
→ C'est OK, vérifier avec Prisma Studio

### "Permission denied"
→ L'utilisateur doit avoir les droits ALTER TABLE  
→ Vérifier avec Prisma Support

---

## ✅ Checklist rapide

```powershell
# [ ] Étape 1 : Définir la variable
$env:DATABASE_URL="postgres://efc126bb...@db.prisma.io:5432/postgres"

# [ ] Étape 2 : Exécuter la migration
pnpm prisma db execute --file .\prisma\migration-prod-remove-unused-columns.sql --schema .\prisma\schema.prisma

# [ ] Étape 3 : Vérifier
pnpm prisma studio
# Ouvrir email_stats et vérifier les colonnes

# [ ] Étape 4 : Déployer le code
git push origin main

# [ ] Étape 5 : Tester l'application
# https://roadpress.superbien-works.fr/dashboard/statistics
```

---

## ⏱️ Temps estimé : 5 minutes

1. Copier-coller la commande : 30 secondes
2. Exécution SQL : 10 secondes
3. Vérification : 1 minute
4. Git push : 1 minute
5. Tests : 2 minutes

**Total : ~5 minutes** ⚡

---

## 💡 Astuce

**Vous pouvez tester la commande en DEV d'abord :**

```powershell
# Utiliser votre base locale pour tester
$env:DATABASE_URL="postgresql://roadpress_dev:roadpress_local_2025@localhost:5432/roadpress_dev"

pnpm prisma db execute --file .\prisma\migration-prod-remove-unused-columns.sql --schema .\prisma\schema.prisma

# Si ça marche en local, ça marchera en prod !
```

---

**🎉 C'est tout ! Pas besoin d'accéder à console.prisma.io**
