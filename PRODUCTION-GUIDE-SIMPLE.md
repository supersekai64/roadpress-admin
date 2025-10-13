# 🎯 Guide SIMPLE - Appliquer en PRODUCTION

## ✅ Méthode recommandée : Script SQL direct

Puisque votre base de production existe déjà et n'utilise pas Prisma Migrate, utilisez le script SQL direct.

---

## 📋 Étapes à suivre (dans l'ordre)

### 1️⃣ BACKUP (OBLIGATOIRE - 5 minutes)

**Via l'interface Prisma Cloud :**
```
1. Aller sur https://cloud.prisma.io/
2. Sélectionner votre projet
3. Database > Backup > Create Backup
4. Attendre la confirmation
```

**Ou via psql (si vous avez accès direct) :**
```bash
pg_dump -h db.prisma.io -U <votre_user> postgres > backup_$(date +%Y%m%d).sql
```

---

### 2️⃣ Exécuter le script SQL (1 minute)

**Fichier à utiliser :** `prisma/migration-prod-remove-unused-columns.sql`

**Option A : Via Prisma CLI (recommandé)**
```powershell
# Depuis votre machine Windows
# Utiliser les credentials de .env.production

$env:DATABASE_URL="postgres://efc126bb539dfd0dca4fa96d7afd0d8245c38e773cb8fcf9f1f703124560f060:sk_A68rPDbtDiBCmv2FNyPzC@db.prisma.io:5432/postgres?sslmode=require"

pnpm prisma db execute --file ./prisma/migration-prod-remove-unused-columns.sql --schema ./prisma/schema.prisma
```

**Option B : Via interface Prisma Cloud**
```
1. Aller sur https://cloud.prisma.io/
2. Sélectionner votre projet
3. Database > Query Console
4. Copier-coller le contenu de migration-prod-remove-unused-columns.sql
5. Cliquer sur "Run"
```

---

### 3️⃣ Vérifier que ça a fonctionné (30 secondes)

**Via Prisma Cloud ou psql :**
```sql
-- Vérifier la structure des tables
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('email_stats', 'email_stats_monthly', 'sms_stats', 'sms_stats_monthly')
ORDER BY table_name, ordinal_position;

-- Résultat attendu pour email_stats :
-- id, license_id, emails_sent, last_update, created_at

-- Résultat attendu pour sms_stats :
-- id, license_id, sms_sent, total_cost, last_update, created_at
```

---

### 4️⃣ Déployer le code sur Vercel (automatique)

```bash
# Commit et push
git add .
git commit -m "feat: remove unused statistics columns"
git push origin main

# Vercel va automatiquement déployer
# Surveiller : https://vercel.com/[votre-projet]/deployments
```

---

### 5️⃣ Tester en production (2 minutes)

```bash
# Test 1 : API Email
curl https://roadpress.superbien-works.fr/api/statistics/email?licenseId=all

# Test 2 : API SMS
curl https://roadpress.superbien-works.fr/api/statistics/sms?licenseId=all

# Test 3 : Interface web
# Ouvrir : https://roadpress.superbien-works.fr/dashboard/statistics
# Vérifier que tout s'affiche correctement
```

---

## 🔍 Vérifications POST-migration

- [ ] ✅ Les API répondent sans erreur
- [ ] ✅ La page Statistiques s'affiche
- [ ] ✅ Les graphiques fonctionnent
- [ ] ✅ Pas d'erreurs dans les logs Vercel
- [ ] ✅ Backup conservé (au moins 7 jours)

---

## 🚨 En cas de problème

### Si une erreur apparaît après la migration SQL

**1. Rollback du code uniquement (le plus rapide)**
```
1. Aller sur Vercel
2. Deployments > Trouver le deployment précédent
3. Cliquer sur les "..." > "Promote to Production"
```

**2. Restaurer la base (si vraiment nécessaire)**
```
Via Prisma Cloud :
1. Database > Backups
2. Sélectionner le backup d'avant migration
3. Restore

Ou via psql :
psql -h db.prisma.io -U <user> postgres < backup_[date].sql
```

---

## 📞 Support rapide

### Erreur "Column does not exist"
→ Le code a été déployé avant la migration SQL  
→ **Solution** : Exécuter le script SQL immédiatement

### Erreur "Cannot drop column"
→ Il y a peut-être des vues ou contraintes  
→ **Solution** : Vérifier les dépendances avec :
```sql
SELECT * FROM information_schema.table_constraints 
WHERE table_name IN ('email_stats', 'sms_stats');
```

### Erreur "Permission denied"
→ L'utilisateur n'a pas les droits ALTER TABLE  
→ **Solution** : Utiliser un compte admin

---

## ⏱️ Temps total estimé

- Backup : 5 minutes
- Exécution SQL : 1 minute
- Vérification : 30 secondes
- Déploiement Vercel : 3-5 minutes (automatique)
- Tests : 2 minutes

**Total : ~10-15 minutes**

---

## 💡 Conseil

**Meilleur moment pour faire la migration :**
- ✅ En heures creuses (soirée, weekend)
- ✅ Quand vous pouvez surveiller pendant 30 minutes
- ✅ Après avoir testé en DEV (déjà fait ✅)

---

**✅ Vous êtes prêt !**

Le script SQL est dans : `prisma/migration-prod-remove-unused-columns.sql`
