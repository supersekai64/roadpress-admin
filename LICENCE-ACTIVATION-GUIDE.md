# 🔑 Guide d'activation des licences - RoadPress Admin

> **Date de mise à jour** : 17 octobre 2025
> 
> **Nouvelle logique** : Auto-association lors de l'activation par le plugin client

---

## 📋 Vue d'ensemble

Le système de licences fonctionne désormais avec **auto-association automatique** :

1. **Admin** crée une licence → Génère une clé unique
2. **Client** installe le plugin WordPress → Entre la clé
3. **Plugin** active la licence → L'URL du site est enregistrée automatiquement
4. **Sécurité** : Une licence = un seul domaine

---

## 🔄 Nouveau workflow

### 1️⃣ **Création de licence (Admin)**

**Endpoint** : `POST /api/licenses`

```json
// Requête
{
  "clientName": "ACME Corporation",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}

// Réponse
{
  "id": "uuid",
  "licenseKey": "ABCD1234EFGH5678",
  "clientName": "ACME Corporation",
  "status": "INACTIVE",        // ⚠️ INACTIVE par défaut
  "siteUrl": null,              // ⚠️ null par défaut
  "isAssociated": false,        // ⚠️ false par défaut
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}
```

**Important** :
- ✅ Pas besoin de renseigner l'URL du site
- ✅ La licence est créée en statut `INACTIVE`
- ✅ Sera activée lors du premier appel du plugin

---

### 2️⃣ **Activation de licence (Plugin WordPress)**

**Endpoint** : `POST /api/licenses/verify`

```json
// Requête (depuis le plugin)
{
  "license_key": "ABCD1234EFGH5678",
  "site_url": "https://acme-corp.com"  // ✅ Récupéré automatiquement
}
```

**Scénarios de réponse** :

#### ✅ **Succès - Première activation**
```json
{
  "valid": true,
  "message": "Licence activée avec succès !",
  "license": {
    "key": "ABCD1234EFGH5678",
    "clientName": "ACME Corporation",
    "status": "ACTIVE",          // ✅ Passée à ACTIVE
    "siteUrl": "https://acme-corp.com",  // ✅ Enregistrée
    "isAssociated": true,        // ✅ Associée
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z"
  }
}
```

**Actions effectuées automatiquement** :
- ✅ Mise à jour `siteUrl` avec l'URL du site
- ✅ Mise à jour `isAssociated` → `true`
- ✅ Mise à jour `status` → `ACTIVE`
- ✅ Log d'activation dans la table `DebugLog`

#### ✅ **Succès - Vérification sur domaine autorisé**
```json
{
  "valid": true,
  "message": "Licence valide",
  "license": { ... }
}
```

#### ❌ **Erreur - Clé invalide**
```json
{
  "valid": false,
  "message": "Licence introuvable"
}
```

#### ❌ **Erreur - Licence expirée**
```json
{
  "valid": false,
  "message": "Licence expirée",
  "endDate": "2024-12-31T23:59:59Z"
}
```

#### 🔒 **Bloqué - Domaine non autorisé**
```json
{
  "valid": false,
  "message": "Cette licence est déjà activée sur https://autre-site.com. Contactez l'administrateur pour réassocier la licence.",
  "authorizedDomain": "https://autre-site.com"
}
```

---

## 🔒 Sécurité : Domaine unique

### Règle
**Une licence = un seul domaine autorisé**

### Vérification
```
Si (licence.isAssociated && licence.siteUrl !== site_url_demandé) {
  → BLOQUER l'activation
  → Logger la tentative frauduleuse
}
```

### Réassociation manuelle
Si un client change de domaine :
1. Admin utilise **"Dissocier"** dans le dashboard
2. Plugin peut maintenant s'activer sur le nouveau domaine

---

## 📝 Logs automatiques

Tous les événements sont enregistrés dans `DebugLog` avec catégorie `LICENSE` :

| Action | Statut | Description |
|--------|--------|-------------|
| `CREATE_LICENSE` | SUCCESS | Licence créée |
| `AUTO_ASSOCIATE_LICENSE` | SUCCESS | Première activation réussie |
| `VERIFY_LICENSE_SUCCESS` | SUCCESS | Vérification réussie |
| `VERIFY_LICENSE_FAILED` | ERROR | Clé invalide |
| `VERIFY_LICENSE_BLOCKED` | ERROR | Tentative sur domaine non autorisé |
| `VERIFY_LICENSE_ERROR` | ERROR | Erreur serveur |

**Exemple de log** :
```json
{
  "category": "LICENSE",
  "action": "AUTO_ASSOCIATE_LICENSE",
  "method": "POST",
  "endpoint": "/api/licenses/verify",
  "licenseId": "uuid",
  "clientName": "ACME Corporation",
  "status": "SUCCESS",
  "message": "Licence activée et associée automatiquement à https://acme-corp.com",
  "requestData": {
    "license_key": "ABCD1234EFGH5678",
    "site_url": "https://acme-corp.com",
    "previousStatus": "INACTIVE"
  },
  "responseData": {
    "licenseId": "uuid",
    "status": "ACTIVE",
    "siteUrl": "https://acme-corp.com",
    "isAssociated": true
  },
  "timestamp": "2025-10-17T14:30:00Z"
}
```

---

## 🔧 Intégration plugin WordPress

### Code PHP recommandé

```php
<?php
/**
 * Activer/Vérifier la licence RoadPress
 */
function roadpress_verify_license($license_key) {
    $site_url = get_site_url();
    
    $response = wp_remote_post('https://admin.roadpress.com/api/licenses/verify', [
        'headers' => [
            'Content-Type' => 'application/json',
        ],
        'body' => json_encode([
            'license_key' => $license_key,
            'site_url' => $site_url,
        ]),
        'timeout' => 15,
    ]);
    
    if (is_wp_error($response)) {
        return [
            'valid' => false,
            'message' => 'Impossible de contacter le serveur de licences',
        ];
    }
    
    $body = json_decode(wp_remote_retrieve_body($response), true);
    
    if ($body['valid']) {
        // ✅ Licence valide - Sauvegarder localement
        update_option('roadpress_license_key', $license_key);
        update_option('roadpress_license_status', 'active');
        update_option('roadpress_license_data', $body['license']);
        
        return [
            'valid' => true,
            'message' => $body['message'],
            'license' => $body['license'],
        ];
    } else {
        // ❌ Licence invalide
        return [
            'valid' => false,
            'message' => $body['message'],
        ];
    }
}
```

### Vérification périodique (cron)

```php
add_action('roadpress_daily_license_check', 'roadpress_check_license_validity');

function roadpress_check_license_validity() {
    $license_key = get_option('roadpress_license_key');
    
    if (!$license_key) {
        return;
    }
    
    $result = roadpress_verify_license($license_key);
    
    if (!$result['valid']) {
        // Licence expirée ou invalide
        update_option('roadpress_license_status', 'invalid');
        
        // Désactiver les fonctionnalités premium
        do_action('roadpress_license_deactivated');
    }
}

// Scheduler le cron
if (!wp_next_scheduled('roadpress_daily_license_check')) {
    wp_schedule_event(time(), 'daily', 'roadpress_daily_license_check');
}
```

---

## 🧪 Tests recommandés

### Test 1 : Activation normale
1. Créer licence dans admin
2. Installer plugin sur WordPress
3. Entrer la clé
4. ✅ Vérifier : Status → ACTIVE, URL enregistrée

### Test 2 : Tentative sur 2ème domaine
1. Activer licence sur site1.com
2. Tenter d'activer sur site2.com
3. ✅ Vérifier : Bloqué avec message explicite

### Test 3 : Licence expirée
1. Créer licence avec endDate passée
2. Tenter d'activer
3. ✅ Vérifier : Refusé avec message "expirée"

### Test 4 : Réassociation manuelle
1. Admin clique "Dissocier"
2. Plugin peut maintenant s'activer ailleurs
3. ✅ Vérifier : Nouvelle association réussie

---

## 📊 Dashboard Admin

### Statuts des licences

| Statut | Badge | Signification |
|--------|-------|---------------|
| `INACTIVE` | 🟡 Inactif | Créée, pas encore activée |
| `ACTIVE` | 🟢 Actif | Activée et associée à un site |
| `EXPIRED` | 🔴 Expiré | Date de fin dépassée |

### Actions disponibles

- **Modifier** : Changer nom, dates (pas l'URL)
- **Dissocier** : Permettre réassociation sur nouveau domaine
- **Supprimer** : Suppression définitive

---

## ❓ FAQ

### Pourquoi la licence est INACTIVE après création ?
C'est normal ! Elle passera à ACTIVE lors de la première activation par le plugin.

### Comment changer l'URL d'un client ?
1. Cliquer "Dissocier" dans le dashboard
2. Le client peut réactiver sur le nouveau domaine

### Peut-on utiliser une licence sur plusieurs sites ?
Non, une licence = un seul domaine pour des raisons de sécurité.

### Les logs sont-ils automatiques ?
Oui, toutes les tentatives d'activation sont loggées dans la page Debug.

---

## 🔗 Endpoints API

| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `/api/licenses` | POST | Créer licence (admin) |
| `/api/licenses/verify` | POST | Activer/vérifier (plugin) |
| `/api/licenses/disassociate` | POST | Dissocier (admin) |
| `/api/licenses/[id]` | PUT | Modifier (admin) |
| `/api/licenses/[id]` | DELETE | Supprimer (admin) |

---

**🎉 La nouvelle logique est maintenant active !**
