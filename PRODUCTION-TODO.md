# ⚡ PRODUCTION - Actions à faire

## 🎯 Résumé ultra-court

1. **Exécuter** le script SQL depuis votre machine (pas besoin d'interface web)
2. **Vérifier** que les colonnes sont supprimées
3. **Push** le code sur Git (Vercel déploie auto)
4. **Tester** l'appli en prod

---

## 📝 Commandes à exécuter (copier-coller dans PowerShell)

```powershell
# 1. Aller dans le projet
cd C:\Users\paulc\Desktop\mockup

# 2. Définir la base de données PROD
$env:DATABASE_URL="postgres://efc126bb539dfd0dca4fa96d7afd0d8245c38e773cb8fcf9f1f703124560f060:sk_A68rPDbtDiBCmv2FNyPzC@db.prisma.io:5432/postgres?sslmode=require"

# 3. Exécuter la migration SQL sur PROD
pnpm prisma db execute --file .\prisma\migration-prod-remove-unused-columns.sql --schema .\prisma\schema.prisma

# 4. Vérifier avec Prisma Studio (optionnel)
pnpm prisma studio
# → Ouvrir email_stats et vérifier que les colonnes ont disparu

# 5. Déployer le code
git add .
git commit -m "feat: remove unused statistics columns"
git push origin main

# 6. Tester : https://roadpress.superbien-works.fr/dashboard/statistics
```

---

## ⚠️ Backup recommandé AVANT

```powershell
# Créer une copie du schéma actuel
$env:DATABASE_URL="postgres://efc126bb539dfd0dca4fa96d7afd0d8245c38e773cb8fcf9f1f703124560f060:sk_A68rPDbtDiBCmv2FNyPzC@db.prisma.io:5432/postgres?sslmode=require"

pnpm prisma db pull
# → Sauvegarde l'état actuel dans schema.prisma
# → Commit ce fichier avant de continuer

git add prisma/schema.prisma
git commit -m "backup: schema before migration"
```

---

## 📚 Documentation complète

- **Guide simple** : `PRODUCTION-GUIDE-SIMPLE.md`
- **Guide détaillé** : `docs/PRODUCTION-DEPLOYMENT.md`
- **Changements API** : `docs/API-CHANGES-STATISTICS.md`
- **Migration complète** : `docs/MIGRATION-REMOVE-UNUSED-COLUMNS.md`

---

## ✅ Checklist

- [ ] Backup fait
- [ ] Script SQL exécuté
- [ ] Colonnes vérifiées
- [ ] Code déployé
- [ ] Tests OK

---

**⏱️ Temps estimé : 10-15 minutes**
