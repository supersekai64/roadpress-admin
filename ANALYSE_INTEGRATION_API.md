# 📊 Analyse d'intégration API - Roadpress Plugin & Dashboard Next.js

**Date:** 13 octobre 2025  
**Version:** 1.0.0

---

## 🎯 Vue d'ensemble

Votre architecture actuelle se compose de **deux systèmes distincts** :

1. **Plugin WordPress Client** (`/sourcecode2/`) - Installé chez les clients
2. **Dashboard Admin Next.js** (`/src/`) - Interface de gestion centralisée

### 🔄 Flux de communication actuel

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  PLUGIN CLIENT (WordPress)                    DASHBOARD ADMIN         │
│  =============================                (Next.js + PostgreSQL)  │
│                                                                       │
│  Site client: exemple.com          ──────►   admin.roadpress.fr     │
│                                                                       │
│  • Crée des livrets                          • Gère les licences     │
│  • Envoie emails/SMS                         • Consulte stats        │
│  • Utilise OpenAI/Deepl                      • Affiche les POIs      │
│  • Gère les POIs                             • Monitoring global     │
│                                                                       │
│  Envoi de données via                        Réception via           │
│  wp_remote_post() ──────────────────────►   API Routes Next.js      │
│                                                                       │
│  • Licence validation                        /api/licenses           │
│  • Statistiques emails/SMS                   /api/statistics/*       │
│  • Logs d'utilisation                        /api/logs               │
│  • POIs sync                                 /api/poi/sync           │
│  • API keys fetch                            /api/api-keys           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Structure des API identifiées

### 🔹 Plugin Client → Dashboard Admin

Le plugin envoie des données vers ces endpoints (actuellement codés en dur vers `https://admin.roadpress.fr`) :

| Endpoint Plugin (WordPress)              | URL Cible Actuelle                                              | Action                                   |
|------------------------------------------|-----------------------------------------------------------------|------------------------------------------|
| N/A                                      | `https://admin.roadpress.fr/wp-json/roadpress/v1/verify_license` | Vérifier la validité d'une licence       |
| N/A                                      | `https://admin.roadpress.fr/wp-json/roadpress/v1/update_license` | Associer licence à un site               |
| N/A                                      | `https://admin.roadpress.fr/wp-json/roadpress/v1/update_license_stats` | Envoyer stats emails/SMS (hourly)       |
| N/A                                      | `https://admin.roadpress.fr/wp-json/roadpress/v1/update_license_logs` | Envoyer logs emails/SMS (hourly)        |
| N/A                                      | `https://admin.roadpress.fr/wp-json/roadpress/v1/update_api_stats` | Envoyer stats OpenAI/Deepl (hourly)     |
| N/A                                      | `https://admin.roadpress.fr/wp-json/roadpress/v1/provide_api_keys` | Récupérer les clés API (OpenAI, Brevo)  |
| N/A                                      | `https://admin.roadpress.fr/wp-json/roadpress/v1/sync_pois` | Synchroniser les POIs                    |
| `/wp-json/roadpress/v1/disassociate_license` | Appelé par le dashboard                                      | Désassocier une licence d'un site        |

### 🔹 Dashboard Admin (Next.js)

API Routes existantes dans `/src/app/api/` :

| Route Next.js                        | Méthodes | Fonction                                          |
|--------------------------------------|----------|---------------------------------------------------|
| `/api/licenses`                      | GET, POST | Liste/création de licences                       |
| `/api/licenses/[id]`                 | GET, PATCH, DELETE | Détails/modification/suppression licence |
| `/api/statistics/email`              | GET      | Stats emails (agrégées)                          |
| `/api/statistics/sms`                | GET      | Stats SMS globales                               |
| `/api/statistics/sms/by-country`     | GET      | Stats SMS par pays                               |
| `/api/statistics/deepl`              | GET      | Stats Deepl                                      |
| `/api/statistics/openai`             | GET      | Stats OpenAI                                     |
| `/api/poi`                           | GET, POST | Liste/création de POIs                           |
| `/api/poi/sync`                      | POST     | Synchronisation POIs depuis plugin               |
| `/api/poi/[id]`                      | GET, PATCH, DELETE | Détails/modification/suppression POI   |
| `/api/api-keys`                      | GET      | Liste des clés API configurées                   |
| `/api/api-keys/[service]`            | GET, PATCH | Gestion clés API par service                  |
| `/api/api-keys/push`                 | POST     | Envoyer clés API vers un client                  |

---

## 🚨 Problèmes actuels identifiés

### 1. **Endpoints WordPress inexistants côté dashboard**

Le plugin appelle des endpoints WordPress REST API (`/wp-json/roadpress/v1/*`) mais votre dashboard est en **Next.js**, pas WordPress.

**Solution :** Créer des API Routes Next.js équivalentes qui :
- Acceptent les mêmes paramètres
- Valident les données
- Enregistrent en base PostgreSQL
- Retournent le même format de réponse

---

### 2. **URL hardcodée dans le plugin**

Toutes les URLs pointent vers `https://admin.roadpress.fr` en dur.

**Fichiers concernés :**
- `sourcode2/core/class-roadpress-core-licence.php` (ligne 31, 73)
- `sourcode2/core/class-roadpress-core-api-cron.php` (lignes 306, 417, 499, 587, 701, 772, 953)

**Solution :** 
```php
// Ajouter une constante configurable
if (!defined('ROADPRESS_API_BASE_URL')) {
    define('ROADPRESS_API_BASE_URL', 'https://admin.roadpress.fr');
}

// Utiliser la constante partout
$api_url = ROADPRESS_API_BASE_URL . '/api/licenses/verify';
```

---

### 3. **Schéma de base de données incomplet**

Votre schéma Prisma ne contient pas certaines tables nécessaires :

**Tables manquantes :**
- `email_logs` (logs individuels email)
- `sms_logs` (logs individuels SMS)
- `api_keys` (stockage sécurisé des clés)

---

### 4. **Authentification des requêtes plugin → dashboard**

Actuellement, le plugin envoie uniquement la `license_key` pour s'authentifier.

**Problème de sécurité :** Pas de validation de l'origine de la requête.

**Solution recommandée :**
- Générer un `api_token` unique par licence
- Le plugin inclut ce token dans chaque requête (header `Authorization: Bearer <token>`)
- Le dashboard valide le token avant de traiter la requête

---

## 🛠️ Modifications à effectuer

### 📌 PARTIE 1 : Côté Dashboard Next.js

#### 1.1 Créer les nouveaux endpoints API

##### `/src/app/api/licenses/verify/route.ts` (NOUVEAU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint appelé par le plugin client pour vérifier une licence
 * GET /api/licenses/verify?license_key=XXXX
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('license_key');

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license) {
      return NextResponse.json(
        { success: false, message: 'Licence introuvable' },
        { status: 404 }
      );
    }

    // Vérifier les dates de validité
    const now = new Date();
    const isActive =
      license.status === 'ACTIVE' &&
      license.startDate <= now &&
      license.endDate >= now;

    if (!isActive) {
      // Mettre à jour le statut si expiré
      if (license.endDate < now && license.status !== 'EXPIRED') {
        await prisma.license.update({
          where: { id: license.id },
          data: { status: 'EXPIRED' },
        });
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Licence inactive ou expirée',
          status: license.status,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Licence valide',
      license: {
        key: license.licenseKey,
        clientName: license.clientName,
        status: license.status,
        startDate: license.startDate,
        endDate: license.endDate,
      },
    });
  } catch (error) {
    console.error('Erreur vérification licence:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
```

---

##### `/src/app/api/licenses/update/route.ts` (NOUVEAU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour associer une licence à un site client
 * POST /api/licenses/update
 * Body: { license_key, site_url }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, site_url } = body;

    if (!license_key || !site_url) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license) {
      return NextResponse.json(
        { success: false, message: 'Licence introuvable' },
        { status: 404 }
      );
    }

    // Mettre à jour l'URL du site et marquer comme associée
    await prisma.license.update({
      where: { id: license.id },
      data: {
        siteUrl: site_url,
        isAssociated: true,
        lastUpdate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Licence associée avec succès',
    });
  } catch (error) {
    console.error('Erreur association licence:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
```

---

##### `/src/app/api/statistics/update-stats/route.ts` (NOUVEAU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour recevoir les stats emails/SMS du plugin
 * POST /api/statistics/update-stats
 * Body: { license_key, email_stats, sms_stats }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, email_stats, sms_stats } = body;

    if (!license_key) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    // Vérifier la licence
    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license || license.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Enregistrer les stats email si présentes
    if (email_stats !== undefined && email_stats !== null) {
      await prisma.emailStats.create({
        data: {
          licenseId: license.id,
          emailsSent: parseInt(email_stats) || 0,
          emailsDelivered: 0, // Le plugin devrait envoyer ces détails
          emailsOpened: 0,
          emailsClicked: 0,
          emailsBounced: 0,
          emailsSpam: 0,
        },
      });
    }

    // Enregistrer les stats SMS par pays
    if (Array.isArray(sms_stats) && sms_stats.length > 0) {
      for (const stat of sms_stats) {
        if (stat.country && stat.sms_count) {
          await prisma.smsStats.create({
            data: {
              licenseId: license.id,
              country: stat.country,
              smsSent: stat.sms_count,
              smsDelivered: stat.sms_count, // Supposer délivré par défaut
              smsFailed: 0,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Statistiques enregistrées avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement stats:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
```

---

##### `/src/app/api/statistics/update-logs/route.ts` (NOUVEAU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour recevoir les logs emails/SMS du plugin
 * POST /api/statistics/update-logs
 * Body: { license_key, email_logs, sms_logs }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, email_logs, sms_logs } = body;

    if (!license_key) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license || license.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Enregistrer les logs email
    if (Array.isArray(email_logs)) {
      for (const log of email_logs) {
        await prisma.emailLog.create({
          data: {
            licenseId: license.id,
            sentDate: new Date(log.send_date),
            status: 'sent',
            recipient: '', // Le plugin devrait envoyer cette info
          },
        });
      }
    }

    // Enregistrer les logs SMS
    if (Array.isArray(sms_logs)) {
      for (const log of sms_logs) {
        await prisma.smsLog.create({
          data: {
            licenseId: license.id,
            phoneNumber: log.phone,
            country: log.country || 'Unknown',
            sentDate: new Date(log.send_date),
            status: 'sent',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Logs enregistrés avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement logs:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
```

---

##### `/src/app/api/statistics/update-api-usage/route.ts` (NOUVEAU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour recevoir les stats OpenAI/Deepl du plugin
 * POST /api/statistics/update-api-usage
 * Body: { license_key, deepl_stats, openai_stats }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { license_key, deepl_stats, openai_stats } = body;

    if (!license_key) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey: license_key },
    });

    if (!license || license.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Enregistrer stats Deepl
    if (deepl_stats) {
      await prisma.deeplStats.create({
        data: {
          licenseId: license.id,
          charactersUsed: deepl_stats.tokens_used || 0,
          estimatedCost: deepl_stats.estimated_cost || 0,
        },
      });
    }

    // Enregistrer stats OpenAI
    if (openai_stats) {
      await prisma.openaiStats.create({
        data: {
          licenseId: license.id,
          tokensUsed: openai_stats.tokens_used || 0,
          estimatedCost: openai_stats.estimated_cost || 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Stats API enregistrées avec succès',
    });
  } catch (error) {
    console.error('Erreur enregistrement stats API:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
```

---

##### `/src/app/api/api-keys/provide/route.ts` (NOUVEAU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Endpoint pour fournir les clés API au plugin client
 * GET /api/api-keys/provide?license_key=XXXX
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('license_key');

    if (!licenseKey) {
      return NextResponse.json(
        { success: false, message: 'Clé de licence manquante' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { licenseKey },
    });

    if (!license || license.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, message: 'Licence invalide' },
        { status: 403 }
      );
    }

    // Récupérer les clés API globales (à adapter selon votre logique)
    // Vous pourriez stocker ces clés dans une table ApiKeys
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        service: {
          in: ['openai', 'brevo', 'deepl'],
        },
        isActive: true,
      },
    });

    const keys: Record<string, string> = {};
    apiKeys.forEach((key) => {
      keys[key.service] = key.keyValue;
    });

    return NextResponse.json({
      success: true,
      api_keys: {
        openai_api_key: keys.openai || '',
        brevo_api_key: keys.brevo || '',
        deepl_api_key: keys.deepl || '',
      },
    });
  } catch (error) {
    console.error('Erreur récupération clés API:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
```

---

#### 1.2 Compléter le schéma Prisma

Ajouter ces modèles dans `prisma/schema.prisma` :

```prisma
// =====================================================
// EMAIL LOGS
// =====================================================

model EmailLog {
  id          String   @id @default(cuid())
  licenseId   String   @map("license_id")
  recipient   String
  subject     String?
  status      String   // sent, delivered, opened, clicked, bounced, spam
  sentDate    DateTime @map("sent_date")
  createdAt   DateTime @default(now()) @map("created_at")

  license     License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)

  @@index([licenseId])
  @@index([sentDate])
  @@map("email_logs")
}

// =====================================================
// SMS LOGS
// =====================================================

model SmsLog {
  id           String   @id @default(cuid())
  licenseId    String   @map("license_id")
  phoneNumber  String   @map("phone_number")
  country      String
  status       String   // sent, delivered, failed
  sentDate     DateTime @map("sent_date")
  createdAt    DateTime @default(now()) @map("created_at")

  license      License  @relation(fields: [licenseId], references: [id], onDelete: Cascade)

  @@index([licenseId])
  @@index([sentDate])
  @@map("sms_logs")
}

// =====================================================
// API KEYS MANAGEMENT
// =====================================================

model ApiKey {
  id          String   @id @default(cuid())
  service     String   // openai, brevo, deepl, geonames
  keyName     String   @map("key_name")
  keyValue    String   @map("key_value") // Encrypted
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([service])
  @@map("api_keys")
}
```

Après modification, exécuter :

```bash
pnpm prisma generate
pnpm prisma db push
```

---

### 📌 PARTIE 2 : Côté Plugin WordPress Client

#### 2.1 Ajouter une constante configurable

**Fichier à créer : `sourcode2/config.php`**

```php
<?php
// Configuration API pour Roadpress Plugin Client
// Ce fichier peut être modifié pour pointer vers un environnement de test/production

if (!defined('ABSPATH')) {
    exit;
}

// URL de base de l'API admin Roadpress
if (!defined('ROADPRESS_API_BASE_URL')) {
    // Par défaut : production
    define('ROADPRESS_API_BASE_URL', 'https://admin.roadpress.fr');
    
    // Pour dev/test, décommenter et modifier :
    // define('ROADPRESS_API_BASE_URL', 'http://localhost:3000');
}

// Mapping des endpoints
if (!defined('ROADPRESS_API_ENDPOINTS')) {
    define('ROADPRESS_API_ENDPOINTS', [
        'verify_license'      => ROADPRESS_API_BASE_URL . '/api/licenses/verify',
        'update_license'      => ROADPRESS_API_BASE_URL . '/api/licenses/update',
        'update_stats'        => ROADPRESS_API_BASE_URL . '/api/statistics/update-stats',
        'update_logs'         => ROADPRESS_API_BASE_URL . '/api/statistics/update-logs',
        'update_api_stats'    => ROADPRESS_API_BASE_URL . '/api/statistics/update-api-usage',
        'provide_api_keys'    => ROADPRESS_API_BASE_URL . '/api/api-keys/provide',
        'sync_pois'           => ROADPRESS_API_BASE_URL . '/api/poi/sync',
        'disassociate_license' => ROADPRESS_API_BASE_URL . '/api/licenses/disassociate',
    ]);
}
?>
```

---

#### 2.2 Inclure le fichier de configuration

**Modifier `sourcode2/roadpress.php` (ligne 29-30) :**

```php
// Include the vendors files
require ROADPRESS_PLUGIN_DIR . 'vendor/autoload.php';

// ✅ AJOUTER : Include configuration
require ROADPRESS_PLUGIN_DIR . 'config.php';

// Initialize OpenAI client with API key
$openaiApiKey = get_option('roadpress_openai_api_key');
```

---

#### 2.3 Modifier toutes les URLs hardcodées

##### **Fichier : `sourcode2/core/class-roadpress-core-licence.php`**

**Ligne 29-31 (avant) :**
```php
$response = wp_remote_get(add_query_arg([
    'license_key' => $license_key,
], 'https://admin.roadpress.fr/wp-json/roadpress/v1/verify_license'));
```

**Ligne 29-31 (après) :**
```php
$response = wp_remote_get(add_query_arg([
    'license_key' => $license_key,
], ROADPRESS_API_ENDPOINTS['verify_license']));
```

---

**Ligne 73-77 (avant) :**
```php
$update_response = wp_remote_post('https://admin.roadpress.fr/wp-json/roadpress/v1/update_license', [
    'body' => [
        'license_key' => $license_key,
        'site_url'    => $site_url,
    ],
]);
```

**Ligne 73-77 (après) :**
```php
$update_response = wp_remote_post(ROADPRESS_API_ENDPOINTS['update_license'], [
    'body' => wp_json_encode([
        'license_key' => $license_key,
        'site_url'    => $site_url,
    ]),
    'headers' => ['Content-Type' => 'application/json'],
]);
```

---

##### **Fichier : `sourcode2/core/class-roadpress-core-api-cron.php`**

**Remplacer toutes les occurrences :**

```php
// Ligne 306 (avant)
$api_url = 'https://admin.roadpress.fr/wp-json/roadpress/v1/verify_license';

// Ligne 306 (après)
$api_url = ROADPRESS_API_ENDPOINTS['verify_license'];

// ===

// Ligne 417 (avant)
$response = wp_remote_post('https://admin.roadpress.fr/wp-json/roadpress/v1/update_license_stats', [

// Ligne 417 (après)
$response = wp_remote_post(ROADPRESS_API_ENDPOINTS['update_stats'], [

// ===

// Ligne 499 (avant)
$response = wp_remote_post('https://admin.roadpress.fr/wp-json/roadpress/v1/update_license_logs', [

// Ligne 499 (après)
$response = wp_remote_post(ROADPRESS_API_ENDPOINTS['update_logs'], [

// ===

// Ligne 587 (avant)
$response = wp_remote_post('https://admin.roadpress.fr/wp-json/roadpress/v1/update_api_stats', [

// Ligne 587 (après)
$response = wp_remote_post(ROADPRESS_API_ENDPOINTS['update_api_stats'], [

// ===

// Ligne 772 (avant)
], 'https://admin.roadpress.fr/wp-json/roadpress/v1/provide_api_keys');

// Ligne 772 (après)
], ROADPRESS_API_ENDPOINTS['provide_api_keys']);

// ===

// Ligne 953 (avant)
$response = wp_remote_post('https://admin.roadpress.fr/wp-json/roadpress/v1/sync_pois', [

// Ligne 953 (après)
$response = wp_remote_post(ROADPRESS_API_ENDPOINTS['sync_pois'], [
```

---

### 📌 PARTIE 3 : Sécurisation (RECOMMANDÉ)

#### 3.1 Ajouter un champ `apiToken` dans la table License

**Modifier `prisma/schema.prisma` :**

```prisma
model License {
  id            String   @id @default(cuid())
  licenseKey    String   @unique @map("license_key")
  apiToken      String   @unique @default(cuid()) @map("api_token") // ✅ NOUVEAU
  clientName    String   @map("client_name")
  status        LicenseStatus @default(INACTIVE)
  // ... reste inchangé
}
```

Puis :
```bash
pnpm prisma generate
pnpm prisma db push
```

---

#### 3.2 Middleware d'authentification Next.js

**Créer `/src/lib/auth-plugin.ts` :**

```typescript
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function validatePluginRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      valid: false,
      error: 'Token manquant',
      status: 401,
    };
  }

  try {
    const license = await prisma.license.findUnique({
      where: { apiToken: token },
    });

    if (!license || license.status !== 'ACTIVE') {
      return {
        valid: false,
        error: 'Token invalide ou licence inactive',
        status: 403,
      };
    }

    return {
      valid: true,
      license,
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Erreur serveur',
      status: 500,
    };
  }
}
```

---

**Utiliser dans chaque endpoint :**

```typescript
import { validatePluginRequest } from '@/lib/auth-plugin';

export async function POST(request: NextRequest) {
  // Valider l'authentification
  const auth = await validatePluginRequest(request);
  if (!auth.valid) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const license = auth.license!;

  // Continuer le traitement...
}
```

---

#### 3.3 Modifier le plugin pour envoyer le token

**Dans `sourcode2/config.php`, ajouter :**

```php
// Fonction helper pour récupérer le token API
function roadpress_get_api_token() {
    return get_option('roadpress_api_token', '');
}
```

**Dans toutes les requêtes du plugin, ajouter le header :**

```php
$api_token = roadpress_get_api_token();

$response = wp_remote_post(ROADPRESS_API_ENDPOINTS['update_stats'], [
    'body' => wp_json_encode($data),
    'headers' => [
        'Content-Type' => 'application/json',
        'Authorization' => 'Bearer ' . $api_token, // ✅ NOUVEAU
    ],
]);
```

**Lors de l'activation de licence, stocker le token :**

```php
// Dans class-roadpress-core-licence.php, après validation réussie
if (isset($data['success']) && $data['success']) {
    update_option('roadpress_license_key', $license_key);
    update_option('roadpress_license_status', 'valid');
    
    // ✅ NOUVEAU : Stocker le token API reçu
    if (isset($data['api_token'])) {
        update_option('roadpress_api_token', $data['api_token']);
    }
    
    // ...
}
```

**Côté dashboard, retourner le token lors de la vérification :**

```typescript
// Dans /api/licenses/verify/route.ts
return NextResponse.json({
  success: true,
  message: 'Licence valide',
  api_token: license.apiToken, // ✅ AJOUTER
  license: {
    key: license.licenseKey,
    // ...
  },
});
```

---

## 📊 Résumé des fichiers à créer/modifier

### ✅ Côté Dashboard Next.js

**NOUVEAUX FICHIERS :**
1. `/src/app/api/licenses/verify/route.ts`
2. `/src/app/api/licenses/update/route.ts`
3. `/src/app/api/statistics/update-stats/route.ts`
4. `/src/app/api/statistics/update-logs/route.ts`
5. `/src/app/api/statistics/update-api-usage/route.ts`
6. `/src/app/api/api-keys/provide/route.ts`
7. `/src/lib/auth-plugin.ts`

**FICHIERS À MODIFIER :**
1. `prisma/schema.prisma` (ajouter EmailLog, SmsLog, ApiKey, apiToken)

---

### ✅ Côté Plugin WordPress

**NOUVEAUX FICHIERS :**
1. `sourcode2/config.php`

**FICHIERS À MODIFIER :**
1. `sourcode2/roadpress.php` (inclure config.php)
2. `sourcode2/core/class-roadpress-core-licence.php` (URLs + token)
3. `sourcode2/core/class-roadpress-core-api-cron.php` (URLs + token)

---

## 🚀 Plan de déploiement

### Phase 1 : Développement local

1. **Dashboard :**
   - Créer les 6 nouveaux endpoints API
   - Mettre à jour le schéma Prisma
   - Tester avec Postman ou curl

2. **Plugin :**
   - Créer `config.php`
   - Remplacer les URLs hardcodées
   - Tester la communication avec le dashboard local

---

### Phase 2 : Tests d'intégration

1. Installer le plugin sur un WordPress de test
2. Activer une licence de test
3. Vérifier que les données arrivent dans le dashboard :
   - Logs emails/SMS
   - Stats OpenAI/Deepl
   - POIs synchronisés

---

### Phase 3 : Sécurisation

1. Implémenter le système de tokens API
2. Ajouter la validation dans tous les endpoints
3. Tester l'authentification

---

### Phase 4 : Production

1. Déployer le dashboard sur Vercel/serveur
2. Configurer les variables d'environnement
3. Mettre à jour `ROADPRESS_API_BASE_URL` dans le plugin
4. Déployer le plugin sur les sites clients existants

---

## 🔍 Variables d'environnement requises

**`.env.local` (Dashboard Next.js) :**

```env
# Base de données
DATABASE_URL="postgresql://..."
PRISMA_DATABASE_URL="postgresql://..."

# Auth (si NextAuth.js)
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://admin.roadpress.fr"

# Clés API (stockées aussi en base)
OPENAI_API_KEY="sk-..."
BREVO_API_KEY="xkeysib-..."
DEEPL_API_KEY="..."
GEONAMES_USERNAME="..."

# Mapbox (si POI map)
NEXT_PUBLIC_MAPBOX_TOKEN="pk...."
```

---

## 📝 Checklist de vérification

### ✅ Avant déploiement

- [ ] Tous les endpoints Next.js créés et testés
- [ ] Schéma Prisma mis à jour et migrations appliquées
- [ ] Plugin modifié pour utiliser les nouvelles URLs
- [ ] Système de tokens API implémenté
- [ ] Tests d'intégration réussis (plugin → dashboard)
- [ ] Logs et monitoring configurés
- [ ] Documentation mise à jour

### ✅ Après déploiement

- [ ] Dashboard accessible et authentification fonctionnelle
- [ ] Plugin communique correctement avec le dashboard
- [ ] Stats apparaissent dans le dashboard
- [ ] Logs enregistrés correctement
- [ ] POIs synchronisés
- [ ] Clés API distribuées aux clients
- [ ] Monitoring des erreurs actif

---

## 🆘 Troubleshooting

### Problème : Le plugin ne peut pas contacter le dashboard

**Solutions :**
1. Vérifier que `ROADPRESS_API_BASE_URL` est correctement définie
2. Vérifier les CORS sur le dashboard (si nécessaire)
3. Vérifier les logs WordPress : `wp-content/debug.log`
4. Tester l'endpoint manuellement avec curl :

```bash
curl -X GET "https://admin.roadpress.fr/api/licenses/verify?license_key=TEST123"
```

---

### Problème : 403 Forbidden sur les endpoints

**Solutions :**
1. Vérifier que le token API est envoyé dans le header `Authorization`
2. Vérifier que la licence est ACTIVE en base
3. Vérifier les logs Next.js : `pnpm dev` en console

---

### Problème : Stats ne s'affichent pas dans le dashboard

**Solutions :**
1. Vérifier que les données arrivent bien en base (Prisma Studio : `pnpm prisma studio`)
2. Vérifier les requêtes React Query dans les DevTools
3. Vérifier les logs console navigateur (F12)

---

## 📞 Contact & Support

Pour toute question sur cette intégration, consulter :
- Documentation Next.js : https://nextjs.org/docs
- Documentation Prisma : https://www.prisma.io/docs
- Documentation WordPress HTTP API : https://developer.wordpress.org/plugins/http-api/

---

**FIN DE L'ANALYSE**

Ce document contient toutes les informations nécessaires pour faire communiquer votre plugin WordPress client avec votre dashboard Next.js admin. Procédez étape par étape en suivant les phases de déploiement. 🚀
