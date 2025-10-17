#  RoadPress Admin - Next.js Dashboard

Interface web moderne pour la gestion centralisée des licences, statistiques API et points d'intérêt (POI) Roadpress.

---

## Stack Technique

- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript (strict mode)
- **Base de données** : PostgreSQL + Prisma ORM (auto-config)
- **Authentification** : NextAuth.js v5
- **UI** : Tailwind CSS + shadcn/ui
- **Graphiques** : Chartjs (react)
- **Tables** : TanStack Table
- **Carte** : Mapbox GL JS
- **Déploiement** : Vercel

---

## Installation & Configuration

### 1. Cloner le repository

```bash
git clone https://github.com/supersekai64/roadpress-admin.git
cd roadpress-admin
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Configurer Vercel Postgres

#### Créer une base de données Vercel Postgres

1. Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
2. **Storage** → **Create Database**
3. Choisir **Postgres**
4. Nommer votre database (ex: `roadpress-db`)
5. Créer la database

#### Récupérer les variables d'environnement

Dans Vercel Dashboard → votre database → **.env.local** tab :

Copier les 3 variables :
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

#### Configurer .env.local

```bash
# Copier le fichier d'exemple
cp .env.example .env.local
```

Éditer `.env.local` et remplacer les valeurs par celles de Vercel :

```env
# Database (Vercel Postgres)
POSTGRES_URL="postgresql://user:password@host:5432/database"
POSTGRES_PRISMA_URL="postgresql://user:password@host:5432/database?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgresql://user:password@host:5432/database"

# NextAuth.js
NEXTAUTH_SECRET="generate-a-secret-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"  # Développement local
# NEXTAUTH_URL="https://roadpress.superbien-works.fr"  # Production

# App
NODE_ENV="development"
```

### 4. Créer les tables et seed la base de données

```bash
# Créer les tables dans Postgres
pnpm db:push

# Seed la DB avec un utilisateur admin par défaut
pnpm db:seed
```

### 5. Lancer le serveur de développement

```bash
pnpm dev:clean
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Scripts disponibles

```bash
# Développement
pnpm dev              # Lancer Next.js avec Turbopack
pnpm dev:clean        # Kill les ports et relancer proprement

# Base de données
pnpm db:generate      # Générer le client Prisma
pnpm db:push          # Push le schéma vers Postgres
pnpm db:migrate       # Créer une migration (LOCAL) avec backup AUTO
pnpm db:migrate:prod  # ⚠️ Migration PRODUCTION avec backup AUTO
pnpm db:backup        # 💾 Créer un backup de la base
pnpm db:restore       # 🔄 Restaurer depuis un backup
pnpm db:studio        # Ouvrir Prisma Studio (UI pour la DB)
pnpm db:seed          # Seed la DB avec données de test

# Build
pnpm build            # Compiler pour production
pnpm start            # Lancer en mode production
pnpm analyze          # Analyser la taille des bundles

# Utilitaires
pnpm lint             # Vérifier le code avec ESLint
pnpm kill             # Tuer tous les processus Node
pnpm optimize:images  # Optimiser les images (WebP/AVIF)
```

---

## Structure du projet

```
src/
├── app/
│   ├── api/
│   │   └── auth/[...nextauth]/     # NextAuth routes
│   ├── dashboard/                  # Pages protégées
│   │   ├── layout.tsx              # Layout avec sidebar
│   │   ├── page.tsx                # Dashboard principal
│   │   ├── licenses/               # Gestion des licences
│   │   ├── statistics/             # Statistiques API
│   │   ├── api-keys/               # Configuration clés API
│   │   └── poi-map/                # Carte POI
│   ├── login/
│   │   └── page.tsx                # Page de connexion
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Redirect vers dashboard
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── header.tsx                  # Header avec user menu
│   ├── sidebar.tsx                 # Navigation sidebar
│   └── ...
├── lib/
│   ├── auth.ts                     # NextAuth config
│   ├── auth.config.ts              # Auth options
│   ├── prisma.ts                   # Prisma client
│   └── utils.ts                    # Utilitaires
├── types/
│   └── next-auth.d.ts              # Types NextAuth
└── middleware.ts                   # Protection des routes

prisma/
├── schema.prisma                   # Schéma de la base
└── seed.ts                         # Seed script
```

---

## 📊 Référentiel des Actions API (Debug Logs)

Toutes les opérations importantes sont loggées dans la table `debug_logs` et visibles dans **Dashboard → Debug**.

### 🔑 Catégorie : LICENSE

Actions liées à la gestion des licences :

| Action | Statut | Description |
|--------|--------|-------------|
| `CREATE_LICENSE` | SUCCESS | Nouvelle licence créée (statut INACTIVE par défaut) |
| `CREATE_LICENSE` | ERROR | Échec de création (données invalides) |
| `UPDATE_LICENSE` | SUCCESS | Licence modifiée (nom client, dates, URL, etc.) |
| `UPDATE_LICENSE` | ERROR | Échec de modification (validation ou BDD) |
| `DELETE_LICENSE` | SUCCESS | Licence supprimée définitivement |
| `DELETE_LICENSE` | ERROR | Échec de suppression |
| `VERIFY_LICENSE` | SUCCESS | Vérification réussie (licence valide et active) |
| `VERIFY_LICENSE` | WARNING | Licence expirée ou inactive |
| `VERIFY_LICENSE` | ERROR | Licence introuvable ou clé invalide |
| `ASSOCIATE_LICENSE` | SUCCESS | URL associée manuellement à une licence |
| `ASSOCIATE_LICENSE` | ERROR | Échec d'association (URL déjà utilisée) |
| `DISASSOCIATE_LICENSE` | SUCCESS | Licence dissociée de son URL |
| `DISASSOCIATE_LICENSE` | ERROR | Échec de dissociation |

**Note** : L'auto-association lors de l'activation est loggée comme `VERIFY_LICENSE` (SUCCESS).

### 🔐 Catégorie : API_KEY

Actions liées aux clés API centralisées :

| Action | Statut | Description |
|--------|--------|-------------|
| `PUSH_API_KEYS` | SUCCESS | Clés API distribuées vers un site client WordPress |
| `PUSH_API_KEYS` | ERROR | Échec de distribution (site injoignable, HTTPS requis) |
| `FETCH_API_KEYS` | SUCCESS | Site client a récupéré ses clés API |
| `FETCH_API_KEYS` | ERROR | Échec de récupération (licence invalide) |
| `UPDATE_API_KEY` | SUCCESS | Clé API modifiée dans le dashboard admin |
| `UPDATE_API_KEY` | ERROR | Échec de modification |

### 📍 Catégorie : POI

Actions liées aux points d'intérêt (synchronisation depuis sites clients) :

| Action | Statut | Description |
|--------|--------|-------------|
| `SYNC_POI` | SUCCESS | POI synchronisés avec succès depuis un site client |
| `SYNC_POI` | INFO | Aucun nouveau POI à synchroniser |
| `SYNC_POI` | ERROR | Échec de synchronisation (licence invalide, erreur réseau) |
| `POI_UPDATE` | SUCCESS | POI existant mis à jour (coordonnées, adresse) |
| `POI_CREATE` | SUCCESS | Nouveau POI créé |
| `POI_DELETE` | SUCCESS | POI supprimé |

### 📈 Catégorie : API_USAGE

Actions liées aux statistiques d'usage API (DeepL, OpenAI, Brevo, SMS) :

| Action | Statut | Description |
|--------|--------|-------------|
| `STATS_UPDATE` | SUCCESS | Stats API enregistrées (emails, SMS par pays) |
| `STATS_UPDATE` | ERROR | Échec d'enregistrement des stats |
| `LOGS_UPDATE` | SUCCESS | Logs détaillés enregistrés (emails individuels, SMS) |
| `LOGS_UPDATE` | ERROR | Échec d'enregistrement des logs |
| `API_USAGE_UPDATE` | SUCCESS | Stats DeepL/OpenAI enregistrées (tokens, coûts) |
| `API_USAGE_UPDATE` | ERROR | Échec d'enregistrement |

### 📊 Champs des Debug Logs

Chaque log contient :

- **category** : LICENSE, API_KEY, POI, API_USAGE
- **action** : Nom de l'action (voir tableaux ci-dessus)
- **status** : SUCCESS, INFO, WARNING, ERROR
- **method** : GET, POST, PUT, DELETE (si API REST)
- **endpoint** : Route API appelée (ex: `/api/licenses/verify`)
- **licenseId** : ID de la licence concernée (si applicable)
- **clientName** : Nom du client concerné (si applicable)
- **message** : Description courte de l'événement
- **requestData** : Données envoyées (JSON)
- **responseData** : Données retournées (JSON)
- **errorDetails** : Stack trace ou détail de l'erreur (si ERROR)
- **duration** : Temps d'exécution en ms (si disponible)
- **ipAddress** : IP du client (si disponible)
- **userAgent** : User-agent du client (si disponible)
- **timestamp** : Date/heure de l'événement

### 🔍 Filtrage dans Dashboard → Debug

Vous pouvez filtrer les logs par :
- **Catégorie** : LICENSE, API_KEY, POI, API_USAGE
- **Label** : LICENCE, API KEY, POI, SYNCHRONISATION, USAGE API
- **Statut** : SUCCESS, INFO, WARNING, ERROR
- **Client** : Nom du client
- **Période** : Date de début/fin
- **Recherche** : Texte libre dans message/action

---

## Schéma de base de données

### Tables principales

#### `users`
- Administrateurs de la plateforme
- Email, password (bcrypt), role

#### `licenses`
- Licences clients
- licenseKey (unique), clientName, status (ACTIVE/INACTIVE/EXPIRED)
- startDate, endDate, siteUrl, isAssociated

#### `email_stats` / `email_stats_monthly` / `email_logs`
- Statistiques emails (Brevo)
- Agrégation journalière et mensuelle

#### `sms_stats` / `sms_stats_monthly` / `sms_logs`
- Statistiques SMS par pays
- Coûts estimés par destination

#### `deepl_stats` / `deepl_stats_monthly`
- Statistiques DeepL (traduction)
- Tokens utilisés, coûts estimés

#### `openai_stats` / `openai_stats_monthly`
- Statistiques OpenAI (IA)
- Tokens utilisés, coûts estimés

#### `pois`
- Points d'intérêt synchronisés depuis sites clients
- Coordonnées GPS, adresse, statistiques de visites

#### `api_keys`
- Clés API centralisées (DeepL, OpenAI, Brevo, Mapbox)
- Distribution automatique aux sites clients

---

## Sécurité

- Authentification JWT avec NextAuth.js
- Middleware de protection des routes
- Variables d'environnement pour secrets
- Hashing bcrypt pour passwords
- TypeScript strict mode
- Validation Zod des inputs

---

## Personnalisation

### Thème

Le projet utilise **next-themes** et **shadcn/ui**. 

Modifier les couleurs dans `src/app/globals.css` :

```css
:root {
  --background: ...;
  --foreground: ...;
  --primary: ...;
}
```

---

## Distribution des clés API vers les sites clients

### 📋 Fonctionnement

Le dashboard permet de distribuer automatiquement les clés API (DeepL, OpenAI, Brevo, Mapbox) vers tous les sites WordPress clients qui ont une licence active.

**Architecture :**
- 1 licence = 1 site WordPress
- Chaque site doit avoir le plugin RoadPress installé
- Le plugin expose l'endpoint : `/wp-json/roadpress/v1/update_api_keys`

### ✅ Prérequis

Chaque site WordPress client doit avoir :
1. Le plugin RoadPress installé et activé
2. Une licence valide configurée
3. HTTPS activé (obligatoire en production)

---

## Prisma Studio

Ouvrir une interface graphique pour visualiser/éditer la base de données :

```bash
pnpm db:studio
```

Ouvre sur [http://localhost:5555](http://localhost:5555)

---

## Déploiement sur Vercel

### 1. Push sur GitHub

```bash
git add .
git commit -m "feat: roadpress admin dashboard"
git push origin main
```

### 2. Import dans Vercel

1. [Vercel Dashboard](https://vercel.com/new)
2. **Import Git Repository**
3. Choisir votre repo `roadpress-admin`

### 3. Configurer les variables d'environnement

Dans Vercel → Settings → Environment Variables :

Ajouter :
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` = `https://your-domain.vercel.app`

### 4. Deploy

Vercel build automatiquement.

Après le déploiement, seed la DB en production :

```bash
# Localement avec les env vars de production
POSTGRES_URL="..." pnpm db:seed
```