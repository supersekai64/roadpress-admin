# 🚀 PRODUCTION - Copier-coller ces commandes

## ⚡ Commandes à exécuter dans PowerShell

```powershell
# Aller dans le projet
cd C:\Users\paulc\Desktop\mockup

# Définir la base PROD
$env:DATABASE_URL="postgres://efc126bb539dfd0dca4fa96d7afd0d8245c38e773cb8fcf9f1f703124560f060:sk_A68rPDbtDiBCmv2FNyPzC@db.prisma.io:5432/postgres?sslmode=require"

# Exécuter la migration
pnpm prisma db execute --file .\prisma\migration-prod-remove-unused-columns.sql --schema .\prisma\schema.prisma

# Vérifier (optionnel)
pnpm prisma studio

# Déployer le code
git add .
git commit -m "feat: remove unused statistics columns"
git push origin main
```

**C'est tout ! ✅**

---

## 📖 Plus d'infos

- **Guide détaillé** : `PRODUCTION-COMMANDE-SIMPLE.md`
- **Documentation** : `docs/PRODUCTION-DEPLOYMENT.md`
