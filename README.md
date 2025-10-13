#  RoadPress Admin - Next.js Dashboard

Interface web moderne pour la gestion centralisée des licences, statistiques API et points d'intérêt (POI) RoadPress.

## Stack Technique

- **Framework** : Next.js 15 (App Router)
- **Language** : TypeScript (strict mode)
- **Base de données** : Vercel Postgres + Prisma ORM
- **Authentification** : NextAuth.js v5
- **UI** : Tailwind CSS + shadcn/ui
- **Graphiques** : Recharts
- **Tables** : TanStack Table
- **Carte** : Mapbox GL JS
- **Déploiement** : Vercel

---

## Installation & Configuration

### 1. Cloner le repository

```bash
git clone https://github.com/supersekai64/roadpress-mockup.git
cd roadpress-mockup
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

**Générer un NEXTAUTH_SECRET** :

```bash
# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Linux/Mac
openssl rand -base64 32
```

### 4. Créer les tables et seed la base de données

```bash
# Créer les tables dans Postgres
pnpm db:push

# Seed la DB avec un utilisateur admin par défaut
pnpm db:seed
```

**Credentials par défaut :**
- Email : `admin@roadpress.com`
- Password : `admin123`

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
pnpm db:migrate       # Créer une migration
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
3. Choisir votre repo `roadpress-mockup`

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