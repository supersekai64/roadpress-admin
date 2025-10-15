# 🚨 RÉSOLUTION URGENTE - Erreur 404 Page Debug en Production

## 🔍 Diagnostic du problème

Vous voyez une page 404 HTML complète au lieu des données de l'API. Cela signifie que :
1. ❌ La route `/api/debug/stats` n'est **pas accessible**
2. ❌ Le middleware NextAuth ne valide **pas correctement** la session
3. ❌ Les variables d'environnement sont **mal configurées** ou **manquantes**

---

## ✅ SOLUTION IMMÉDIATE

### Étape 1 : Vérifier les variables dans Vercel Dashboard

Connectez-vous à [Vercel Dashboard](https://vercel.com/dashboard) → Votre projet → **Settings** → **Environment Variables**

#### Variables OBLIGATOIRES (exactement ces noms) :

```bash
# 1. Base de données Prisma (CRITIQUE)
PRISMA_DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."

# 2. NextAuth (CRITIQUE)
NEXTAUTH_SECRET="U1aWZwhTAYfogxdkHI8Fbzpyq7nXPK0L"
NEXTAUTH_URL="https://roadpress.superbien-works.fr"

# 3. Autres
NODE_ENV="production"
NEXT_PUBLIC_MAPBOX_TOKEN="pk.votre-token"
```

⚠️ **ATTENTION : Le nom de la variable doit être EXACTEMENT `PRISMA_DATABASE_URL` et non `DATABASE_URL`**

---

### Étape 2 : Vérifier la configuration actuelle

1. **Ouvrir dans votre navigateur (en production) :**
   ```
   https://roadpress.superbien-works.fr/api/env-check
   ```

2. **Vérifier la réponse :**
   ```json
   {
     "success": true,
     "environment": {
       "hasNextAuthSecret": true,     // ✅ Doit être true
       "nextAuthSecretLength": 32,    // ✅ Doit être >= 32
       "nextAuthUrl": "https://roadpress.superbien-works.fr",  // ✅ URL exacte
       "hasPrismaDatabaseUrl": true,  // ✅ Doit être true
       "hasDirectDatabaseUrl": true   // ✅ Doit être true
     }
   }
   ```

3. **Si une valeur est `false` :**
   - La variable correspondante n'existe **PAS** dans Vercel
   - Ou le **nom est incorrect**

---

### Étape 3 : Configuration correcte dans Vercel

#### 🔹 Option A : Via l'interface Vercel (RECOMMANDÉ)

1. **Aller dans Vercel Dashboard**
2. **Settings → Environment Variables**
3. **Supprimer les anciennes variables** (si noms incorrects)
4. **Ajouter ces variables EXACTEMENT avec ces noms :**

| Nom de la variable | Valeur | Environnement |
|-------------------|---------|---------------|
| `PRISMA_DATABASE_URL` | `postgresql://...` (votre connexion Postgres) | Production |
| `DIRECT_DATABASE_URL` | `postgresql://...` (connexion directe sans pooling) | Production |
| `NEXTAUTH_SECRET` | `U1aWZwhTAYfogxdkHI8Fbzpyq7nXPK0L` | Production |
| `NEXTAUTH_URL` | `https://roadpress.superbien-works.fr` | Production |
| `NODE_ENV` | `production` | Production |

5. **Cocher "Production"** pour chaque variable
6. **Save**

#### 🔹 Option B : Via Vercel CLI

```bash
# Définir les variables
vercel env add PRISMA_DATABASE_URL production
vercel env add DIRECT_DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production

# Vérifier
vercel env ls
```

---

### Étape 4 : Obtenir les URLs de connexion Postgres

Si vous n'avez pas les URLs de connexion Postgres :

1. **Vercel Dashboard → Storage → Votre database**
2. **Onglet ".env.local"**
3. **Copier les variables :**
   - `POSTGRES_URL` → Utiliser pour `PRISMA_DATABASE_URL`
   - `POSTGRES_URL_NON_POOLING` → Utiliser pour `DIRECT_DATABASE_URL`

**Exemple :**
```bash
# Ce que Vercel vous donne :
POSTGRES_URL="postgresql://user:pass@host.com:5432/db?sslmode=require"
POSTGRES_URL_NON_POOLING="postgresql://user:pass@host.com:5432/db?sslmode=require"

# Ce que vous devez mettre dans Vercel :
PRISMA_DATABASE_URL="postgresql://user:pass@host.com:5432/db?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:pass@host.com:5432/db?sslmode=require"
```

---

### Étape 5 : Redéployer

**Après avoir ajouté/modifié les variables :**

1. **Vercel Dashboard → Deployments**
2. **Cliquer "..." sur le dernier déploiement**
3. **"Redeploy"**
4. **Attendre la fin du build** (2-3 minutes)

**OU via Git :**
```bash
git add .
git commit -m "fix: correction variables environnement production"
git push origin main
```

---

### Étape 6 : Tester

1. **Vider le cache navigateur** (Ctrl+Shift+Delete)
2. **Aller sur :** `https://roadpress.superbien-works.fr/login`
3. **Se déconnecter** (si connecté)
4. **Se reconnecter avec :**
   - Email : `paul@superbien-works.fr`
   - Mot de passe : `(D7ZD4xk6!!??)`
5. **Aller sur :** `https://roadpress.superbien-works.fr/dashboard/debug`

**✅ Si ça marche :** Vous devriez voir la page Debug avec les statistiques

**❌ Si ça ne marche toujours pas :** Continuer à l'étape 7

---

### Étape 7 : Debug avancé

#### Vérifier les logs Vercel

1. **Vercel Dashboard → Votre projet → Logs**
2. **Filtrer par "Function Logs"**
3. **Chercher les erreurs contenant :**
   - `NEXTAUTH_SECRET`
   - `PRISMA_DATABASE_URL`
   - `auth`
   - `session`

#### Erreurs courantes et solutions

| Erreur dans les logs | Cause | Solution |
|---------------------|-------|----------|
| `NEXTAUTH_SECRET environment variable is not set` | Variable manquante | Ajouter dans Vercel Dashboard |
| `Invalid \`prisma.xxx.findXXX()\` invocation` | Mauvaise connexion DB | Vérifier `PRISMA_DATABASE_URL` |
| `Can't reach database server` | DB non accessible | Vérifier que la DB Vercel Postgres est active |
| `Session not found or expired` | Session invalide | Se déconnecter + vider cache + reconnecter |
| `404 Not Found` (HTML complet) | Route API non accessible | Problème middleware ou variables manquantes |

---

## 🔧 Modifications apportées dans le code

J'ai fait ces modifications pour résoudre le problème :

### 1. Ajout du `secret` dans `auth.config.ts`

**Fichier :** `src/lib/auth.config.ts`

```typescript
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,  // ← AJOUTÉ
  // ... reste du code
};
```

### 2. Route de diagnostic

**Fichier :** `src/app/api/env-check/route.ts` (NOUVEAU)

Permet de vérifier rapidement les variables d'environnement :
```
GET https://roadpress.superbien-works.fr/api/env-check
```

⚠️ **IMPORTANT : Désactiver cette route après debug** (risque de sécurité)

---

## 📋 Checklist finale

Avant de clore :

- [ ] `PRISMA_DATABASE_URL` défini dans Vercel (nom exact)
- [ ] `DIRECT_DATABASE_URL` défini dans Vercel (nom exact)
- [ ] `NEXTAUTH_SECRET` défini dans Vercel (≥32 caractères)
- [ ] `NEXTAUTH_URL` = `https://roadpress.superbien-works.fr` (sans `/` à la fin)
- [ ] Toutes les variables cochées "Production"
- [ ] Redéploiement effectué après modification
- [ ] Cache navigateur vidé
- [ ] Déconnexion + Reconnexion effectuée
- [ ] Route `/api/env-check` retourne tous `true`
- [ ] Page `/dashboard/debug` accessible sans 404
- [ ] ⚠️ Route `/api/env-check` **désactivée** après debug

---

## 🚨 Si le problème persiste

### Test de connexion direct

```bash
# Tester la connexion Prisma en local avec les vars de prod
PRISMA_DATABASE_URL="votre-url-prod" pnpm prisma db push --skip-generate
```

Si ça échoue → Problème de connexion DB Vercel

### Vérifier que la DB existe

1. Vercel Dashboard → Storage
2. Vérifier que votre database PostgreSQL est **active**
3. Vérifier qu'elle contient des tables (section "Tables")

### Contact support

Si rien ne fonctionne :
1. Logs Vercel complets (export en fichier)
2. Screenshot de vos variables d'environnement (masquer les valeurs sensibles)
3. Résultat de `/api/env-check`
4. Contacter le support Vercel

---

## 📚 Documentation

- [NextAuth.js Environment Variables](https://next-auth.js.org/configuration/options#environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Guide complet](./DEPLOYMENT-TROUBLESHOOTING.md)
