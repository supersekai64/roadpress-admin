# 🚀 Guide de déploiement - Intégration API Roadpress

**Date de mise en œuvre :** 13 octobre 2025  
**Statut :** ✅ Fichiers créés et modifications appliquées

---

## ✅ Modifications effectuées

### 📊 Base de données (Prisma)

**Fichier modifié :** `prisma/schema.prisma`

✅ Ajout du champ `apiToken` dans le modèle `License` :
```prisma
apiToken String? @unique @default(cuid()) @map("api_token")
```

**Action effectuée :**
- ✅ `pnpm prisma generate` - Client Prisma régénéré
- ✅ `pnpm prisma db push` - Champ ajouté en base de données

---

### 🔧 Nouveaux endpoints API (Dashboard Next.js)

Tous les endpoints sont créés dans `/src/app/api/` :

#### 1. `/api/licenses/verify/route.ts` ✅
**Fonction :** Vérifier la validité d'une licence  
**Méthode :** GET  
**Paramètres :** `?license_key=XXXX`  
**Retour :** `{ success, message, api_token, license: {...} }`

#### 2. `/api/licenses/update/route.ts` ✅
**Fonction :** Associer une licence à un site client  
**Méthode :** POST  
**Body :** `{ license_key, site_url }`  
**Retour :** `{ success, message }`

#### 3. `/api/licenses/disassociate/route.ts` ✅
**Fonction :** Désassocier une licence d'un site  
**Méthode :** POST  
**Body :** `{ license_key }`  
**Retour :** `{ success, message }`

#### 4. `/api/statistics/update-stats/route.ts` ✅
**Fonction :** Recevoir les stats emails/SMS du plugin  
**Méthode :** POST  
**Body :** `{ license_key, email_stats, sms_stats }`  
**Retour :** `{ success, message }`

#### 5. `/api/statistics/update-logs/route.ts` ✅
**Fonction :** Recevoir les logs emails/SMS du plugin  
**Méthode :** POST  
**Body :** `{ license_key, email_logs, sms_logs }`  
**Retour :** `{ success, message }`

#### 6. `/api/statistics/update-api-usage/route.ts` ✅
**Fonction :** Recevoir les stats OpenAI/Deepl du plugin  
**Méthode :** POST  
**Body :** `{ license_key, deepl_stats, openai_stats }`  
**Retour :** `{ success, message }`

#### 7. `/api/api-keys/provide/route.ts` ✅
**Fonction :** Fournir les clés API au plugin client  
**Méthode :** GET  
**Paramètres :** `?license_key=XXXX`  
**Retour :** `{ success, api_keys: { openai_api_key, brevo_api_key, ... } }`

---

### 🔐 Middleware d'authentification

**Fichier créé :** `/src/lib/auth-plugin.ts` ✅

Contient la fonction `validatePluginRequest()` pour valider :
- Token Bearer dans header `Authorization`
- Fallback sur `license_key` en query param
- Vérification que la licence est ACTIVE

---

### 🔌 Plugin WordPress Client

#### Fichier de configuration créé : `sourcode2/config.php` ✅

**Contenu :**
- Constante `ROADPRESS_API_BASE_URL` (modifiable pour dev/prod)
- Tableau `ROADPRESS_API_ENDPOINTS` avec tous les endpoints
- Fonctions helpers :
  - `roadpress_get_api_token()` - Récupérer le token stocké
  - `roadpress_get_auth_headers()` - Headers HTTP avec authentification
  - `roadpress_api_post()` - Requête POST authentifiée
  - `roadpress_api_get()` - Requête GET authentifiée
  - `roadpress_parse_api_response()` - Parser la réponse JSON

#### Fichiers modifiés :

**1. `sourcode2/roadpress.php`** ✅
- ✅ Ajout de `require_once ROADPRESS_PLUGIN_DIR . 'config.php';`

**2. `sourcode2/core/class-roadpress-core-licence.php`** ✅
- ✅ Remplacé URL hardcodée par `roadpress_api_get('verify_license')`
- ✅ Remplacé URL hardcodée par `roadpress_api_post('update_license')`
- ✅ Ajout du stockage du token API : `update_option('roadpress_api_token', $data['api_token'])`

**3. `sourcode2/core/class-roadpress-core-api-cron.php`** ✅
- ✅ Fonction `roadpress_is_license_valid()` : Utilise `roadpress_api_get()` + `roadpress_parse_api_response()`
- ✅ Fonction `roadpress_send_stats_to_server()` : Utilise `roadpress_api_post('update_stats')`
- ✅ Fonction `roadpress_send_logs_to_server()` : Utilise `roadpress_api_post('update_logs')`
- ✅ Fonction `roadpress_send_api_stats_to_server()` : Utilise `roadpress_api_post('update_api_usage')`
- ✅ Fonction `roadpress_fetch_api_keys()` : Utilise `roadpress_api_get('provide_api_keys')`

---

## 🧪 Tests à effectuer

### Phase 1 : Tests locaux Dashboard

#### 1.1 Tester l'endpoint de vérification de licence

```bash
# Avec curl (Windows PowerShell)
curl "http://localhost:3000/api/licenses/verify?license_key=VOTRE_CLE" | ConvertFrom-Json

# Résultat attendu :
{
  "success": true,
  "message": "Licence valide",
  "api_token": "clxxx...",
  "license": {
    "key": "...",
    "clientName": "...",
    "status": "ACTIVE",
    ...
  }
}
```

#### 1.2 Tester l'endpoint de mise à jour de stats

```powershell
$body = @{
    license_key = "VOTRE_CLE"
    email_stats = 10
    sms_stats = @(
        @{ country = "France"; sms_count = 5 }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/statistics/update-stats" -Method POST -Body $body -ContentType "application/json"
```

#### 1.3 Vérifier que les données sont en base

```bash
pnpm prisma studio
```

Ouvrir :
- Table `licenses` → Vérifier que `api_token` est présent
- Tables `email_stats` et `sms_stats` → Vérifier les nouvelles entrées

---

### Phase 2 : Tests avec plugin WordPress local

#### 2.1 Configurer un WordPress de test

1. Installer WordPress en local (XAMPP, LocalWP, etc.)
2. Copier le dossier `/sourcode2/` dans `/wp-content/plugins/roadpress/`
3. Activer le plugin dans WordPress Admin

#### 2.2 Configurer l'URL de l'API

Éditer `sourcode2/config.php` :

```php
// Décommenter et modifier pour pointer vers votre dashboard local
define('ROADPRESS_API_BASE_URL', 'http://localhost:3000');
```

#### 2.3 Activer une licence de test

1. Dashboard Next.js → Créer une licence de test
2. WordPress Admin → Roadpress → Licence
3. Saisir la clé de licence
4. Vérifier les logs WordPress : `wp-content/debug.log`

**Logs attendus :**
```
[ROADPRESS] [LICENCE] Licence validée avec succès
[ROADPRESS] [LICENCE] Token API stocké avec succès
[ROADPRESS] [API] Clé API mise à jour : OpenAI
[ROADPRESS] [API] Clé API mise à jour : Brevo
[ROADPRESS] [API] Clé API mise à jour : Deepl
```

#### 2.4 Vérifier l'envoi automatique de stats

Attendre 1 heure ou forcer l'exécution des crons WordPress :

```bash
wp cron event run roadpress_send_stats_event --allow-root
wp cron event run roadpress_send_logs_event --allow-root
wp cron event run roadpress_send_api_stats_event --allow-root
```

Vérifier dans le dashboard Next.js :
- Page Statistiques → Emails/SMS
- Page Rapports → Consommation API

---

## 🚀 Déploiement en production

### Étape 1 : Préparer le dashboard

#### 1.1 Variables d'environnement

Vérifier `.env` sur le serveur de production :

```env
# Base de données
DATABASE_URL="postgresql://..."
PRISMA_DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://admin.roadpress.fr"

# Clés API (doivent être en base aussi)
OPENAI_API_KEY="sk-..."
BREVO_API_KEY="xkeysib-..."
DEEPL_API_KEY="..."
GEONAMES_USERNAME="..."

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk...."
```

#### 1.2 Déployer sur Vercel

```bash
# Build et déploiement
pnpm build
vercel --prod

# OU via Git push (si configured)
git push origin main
```

#### 1.3 Vérifier les endpoints

```bash
curl "https://admin.roadpress.fr/api/licenses/verify?license_key=TEST" | jq
```

---

### Étape 2 : Déployer le plugin

#### 2.1 Préparer le package

1. Vérifier que `config.php` pointe vers `https://admin.roadpress.fr`
2. Créer un ZIP du dossier `sourcode2/`
3. Renommer en `roadpress.zip`

#### 2.2 Installer sur les sites clients

**Option A : Via WordPress Admin**
1. Extensions → Ajouter
2. Téléverser `roadpress.zip`
3. Activer

**Option B : Via FTP/SFTP**
1. Uploader dans `/wp-content/plugins/roadpress/`
2. Activer via Admin

#### 2.3 Activer les licences

Pour chaque site client :
1. Créer une licence dans le dashboard admin
2. Copier la clé générée
3. Sur le site client : WordPress Admin → Roadpress → Licence
4. Coller la clé et vérifier

---

### Étape 3 : Monitoring

#### 3.1 Vérifier les logs côté dashboard

Dans Vercel :
- Aller dans Functions → Logs
- Filtrer par `/api/licenses/verify`, `/api/statistics/update-stats`, etc.

#### 3.2 Vérifier les logs côté plugin

Sur chaque site WordPress client :
- Activer `WP_DEBUG` dans `wp-config.php`
- Consulter `wp-content/debug.log`

#### 3.3 Vérifier les données en base

```bash
pnpm prisma studio
```

Vérifier régulièrement :
- Table `licenses` → `isAssociated = true`, `siteUrl` renseigné
- Tables `*_stats` et `*_logs` → Nouvelles entrées toutes les heures

---

## 🔧 Configuration avancée

### Sécurisation avec tokens API (Recommandé)

Les tokens API sont déjà implémentés ! Le plugin :
1. Récupère le `api_token` lors de la vérification de licence
2. Le stocke dans `roadpress_api_token`
3. L'envoie dans le header `Authorization: Bearer <token>` pour chaque requête

**Vérifier que ça fonctionne :**

```bash
# Récupérer le token d'une licence
SELECT api_token FROM licenses WHERE license_key = 'VOTRE_CLE';

# Tester une requête avec le token
curl -H "Authorization: Bearer <token>" \
     "https://admin.roadpress.fr/api/statistics/update-stats" \
     -X POST -d '{"license_key":"...","email_stats":10}' \
     -H "Content-Type: application/json"
```

---

### Changer l'URL de l'API (Développement)

**Sur le plugin WordPress :**

Éditer `sourcode2/config.php` :

```php
// Passer en mode développement
define('ROADPRESS_API_BASE_URL', 'http://localhost:3000');
```

**Redémarrer le serveur WordPress pour prendre en compte les changements.**

---

## 📊 Checklist finale

### ✅ Dashboard Next.js

- [x] Schéma Prisma mis à jour avec `apiToken`
- [x] Client Prisma régénéré
- [x] Migration appliquée (`pnpm prisma db push`)
- [x] 7 endpoints API créés
- [x] Middleware d'authentification créé
- [ ] Build réussi sans erreurs (`pnpm build`)
- [ ] Déployé sur Vercel/serveur
- [ ] Variables d'environnement configurées

### ✅ Plugin WordPress

- [x] Fichier `config.php` créé
- [x] `roadpress.php` modifié pour inclure `config.php`
- [x] Toutes les URLs hardcodées remplacées
- [x] Stockage du token API implémenté
- [ ] Testé en local avec succès
- [ ] Package ZIP créé
- [ ] Déployé sur les sites clients

### ✅ Tests d'intégration

- [ ] Activation de licence fonctionnelle
- [ ] Stats emails/SMS envoyées et visibles dans le dashboard
- [ ] Logs enregistrés correctement
- [ ] Stats OpenAI/Deepl remontées
- [ ] Clés API distribuées aux clients
- [ ] POIs synchronisés (si applicable)

---

## 🆘 Troubleshooting

### Problème : Le plugin ne contacte pas le dashboard

**Vérifications :**
1. URL dans `config.php` est correcte
2. Firewall ne bloque pas les requêtes sortantes
3. SSL/TLS configuré correctement (si HTTPS)
4. Logs WordPress : `wp-content/debug.log`

**Test manuel :**
```bash
# Depuis le serveur WordPress
curl "https://admin.roadpress.fr/api/licenses/verify?license_key=TEST"
```

---

### Problème : Erreur 403 Forbidden

**Cause :** Token API invalide ou licence inactive

**Solution :**
1. Vérifier dans la base que `api_token` est présent
2. Vérifier que `status = 'ACTIVE'`
3. Vérifier les dates `startDate` et `endDate`

---

### Problème : Stats n'apparaissent pas dans le dashboard

**Vérifications :**
1. Dans Prisma Studio : vérifier que les données sont en base
2. Dans le dashboard : vérifier la période de dates sélectionnée
3. Vérifier les logs Vercel : erreurs lors de l'insertion ?

---

### Problème : Clés API non reçues par le plugin

**Vérifications :**
1. Dans le dashboard : Paramètres → Clés API
2. Vérifier que les clés sont marquées comme actives
3. Vérifier le format de la réponse de `/api/api-keys/provide`

**Test manuel :**
```bash
curl "https://admin.roadpress.fr/api/api-keys/provide?license_key=VOTRE_CLE" | jq
```

---

## 📞 Support

**Documentation :**
- Analyse complète : `ANALYSE_INTEGRATION_API.md`
- Ce guide : `GUIDE_DEPLOIEMENT.md`

**Logs importants :**
- Dashboard : Vercel Functions Logs
- Plugin : `wp-content/debug.log`
- Base de données : Prisma Studio

---

## 🎉 Prochaines étapes

1. ✅ Tout est prêt côté code !
2. ⏳ Lancer le serveur de dev : `pnpm dev:clean`
3. ⏳ Tester les endpoints avec curl/Postman
4. ⏳ Installer le plugin sur un WordPress de test
5. ⏳ Tester l'activation de licence
6. ⏳ Vérifier que les stats remontent
7. ⏳ Déployer en production

---

**Tout est prêt ! Vous pouvez maintenant tester l'intégration. Besoin d'aide ? Consultez la section Troubleshooting ci-dessus.** 🚀
