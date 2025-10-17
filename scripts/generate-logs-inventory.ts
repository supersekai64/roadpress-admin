/**
 * Script pour générer un inventaire complet de tous les logs possibles
 * Génère un fichier Excel avec toutes les entrées de logs existantes dans l'application
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  Fichier: string;
  Ligne: number;
  Catégorie: string;
  Action: string;
  Méthode: string;
  Endpoint: string;
  Statut: string;
  Message: string;
  Description: string;
}

const logsInventory: LogEntry[] = [
  // =============================================================================
  // API KEYS - Fourniture des clés API
  // =============================================================================
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 42,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'WARNING',
    Message: 'Rate limit dépassé',
    Description: 'Détection de dépassement du rate limit (10 req/min) lors d\'une tentative d\'accès aux clés API',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 79,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'WARNING',
    Message: 'Tentative d\'accès sans clé de licence',
    Description: 'Tentative d\'accès aux clés API sans fournir de license_key dans les paramètres',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 99,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'WARNING',
    Message: 'Tentative d\'accès sans site_url',
    Description: 'Tentative d\'accès aux clés API sans fournir de site_url dans les paramètres',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 132,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'WARNING',
    Message: 'Tentative d\'accès avec clé invalide',
    Description: 'Tentative d\'accès avec une clé de licence qui n\'existe pas dans la base de données',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 161,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'WARNING',
    Message: 'Tentative d\'accès avec licence non-ACTIVE',
    Description: 'Tentative d\'accès avec une licence dont le statut n\'est pas ACTIVE (INACTIVE ou EXPIRED)',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 183,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'WARNING',
    Message: 'Tentative d\'accès avec licence non associée',
    Description: 'Tentative d\'accès avec une licence qui n\'est pas encore associée à un domaine',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 214,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'WARNING',
    Message: 'Tentative d\'accès avec domaine non correspondant',
    Description: 'CRITIQUE - Tentative d\'accès depuis un domaine différent de celui autorisé (tentative de vol de clés)',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 246,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'WARNING',
    Message: 'Tentative d\'accès avec licence expirée',
    Description: 'Tentative d\'accès avec une licence dont la date de fin est dépassée',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 293,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'SUCCESS',
    Message: 'Clés API fournies avec succès',
    Description: 'Fourniture réussie des clés API au plugin client après toutes les vérifications de sécurité',
  },
  {
    Fichier: 'src/app/api/api-keys/provide/route.ts',
    Ligne: 326,
    Catégorie: 'API_KEYS',
    Action: 'PROVIDE_KEYS',
    Méthode: 'GET',
    Endpoint: '/api/api-keys/provide',
    Statut: 'ERROR',
    Message: 'Erreur serveur lors de la fourniture des clés API',
    Description: 'Erreur technique inattendue lors de la fourniture des clés API',
  },

  // =============================================================================
  // API KEYS - Gestion des clés (modification)
  // =============================================================================
  {
    Fichier: 'src/app/api/api-keys/[service]/route.ts',
    Ligne: 95,
    Catégorie: 'API_KEYS',
    Action: 'UPDATE_API_KEY',
    Méthode: 'PUT',
    Endpoint: '/api/api-keys/[service]',
    Statut: 'SUCCESS',
    Message: 'Clé API modifiée',
    Description: 'Modification réussie d\'une clé API (OpenAI, Brevo, DeepL, Mapbox, GeoNames) par un administrateur',
  },
  {
    Fichier: 'src/app/api/api-keys/[service]/route.ts',
    Ligne: 135,
    Catégorie: 'API_KEYS',
    Action: 'UPDATE_API_KEY',
    Méthode: 'PUT',
    Endpoint: '/api/api-keys/[service]',
    Statut: 'ERROR',
    Message: 'Échec modification clé API',
    Description: 'Erreur lors de la modification d\'une clé API par un administrateur',
  },

  // =============================================================================
  // LICENSE - Vérification et activation
  // =============================================================================
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 31,
    Catégorie: 'LICENSE',
    Action: 'CHECK_LICENSE',
    Méthode: 'GET',
    Endpoint: '/api/licenses/verify',
    Statut: 'WARNING',
    Message: 'Rate limit dépassé',
    Description: 'Dépassement du rate limit (30 req/min) lors d\'une consultation de licence',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 76,
    Catégorie: 'LICENSE',
    Action: 'CHECK_LICENSE',
    Méthode: 'GET',
    Endpoint: '/api/licenses/verify',
    Statut: 'ERROR',
    Message: 'Consultation d\'une clé invalide',
    Description: 'Consultation d\'une licence qui n\'existe pas dans la base',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 100,
    Catégorie: 'LICENSE',
    Action: 'CHECK_LICENSE',
    Méthode: 'GET',
    Endpoint: '/api/licenses/verify',
    Statut: 'SUCCESS',
    Message: 'Consultation de licence réussie',
    Description: 'Consultation réussie de l\'état d\'une licence (valide ou expirée)',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 136,
    Catégorie: 'LICENSE',
    Action: 'CHECK_LICENSE',
    Méthode: 'GET',
    Endpoint: '/api/licenses/verify',
    Statut: 'ERROR',
    Message: 'Erreur serveur lors de la consultation',
    Description: 'Erreur technique lors de la consultation d\'une licence',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 169,
    Catégorie: 'LICENSE',
    Action: 'VERIFY_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/verify',
    Statut: 'WARNING',
    Message: 'Rate limit dépassé (POST)',
    Description: 'Dépassement du rate limit (30 req/min) lors d\'une tentative d\'activation de licence',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 218,
    Catégorie: 'LICENSE',
    Action: 'VERIFY_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/verify',
    Statut: 'ERROR',
    Message: 'Tentative d\'activation avec clé invalide',
    Description: 'Tentative d\'activation d\'une licence qui n\'existe pas',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 250,
    Catégorie: 'LICENSE',
    Action: 'VERIFY_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/verify',
    Statut: 'WARNING',
    Message: 'Tentative d\'activation avec licence expirée',
    Description: 'Tentative d\'activation d\'une licence dont la date de fin est dépassée',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 279,
    Catégorie: 'LICENSE',
    Action: 'VERIFY_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/verify',
    Statut: 'ERROR',
    Message: 'Tentative d\'utilisation sur un domaine non autorisé',
    Description: 'Tentative d\'utiliser une licence déjà associée à un autre domaine',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 319,
    Catégorie: 'LICENSE',
    Action: 'ASSOCIATE_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/verify',
    Statut: 'SUCCESS',
    Message: 'Licence activée et associée automatiquement',
    Description: 'Première activation d\'une licence avec association automatique au domaine',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 359,
    Catégorie: 'LICENSE',
    Action: 'VERIFY_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/verify',
    Statut: 'SUCCESS',
    Message: 'Vérification réussie',
    Description: 'Vérification réussie d\'une licence déjà active sur le domaine',
  },
  {
    Fichier: 'src/app/api/licenses/verify/route.ts',
    Ligne: 391,
    Catégorie: 'LICENSE',
    Action: 'VERIFY_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/verify',
    Statut: 'ERROR',
    Message: 'Erreur serveur lors de la vérification',
    Description: 'Erreur technique lors de la vérification ou activation d\'une licence',
  },

  // =============================================================================
  // LICENSE - CRUD Admin
  // =============================================================================
  {
    Fichier: 'src/app/api/licenses/route.ts',
    Ligne: 125,
    Catégorie: 'LICENSE',
    Action: 'CREATE_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses',
    Statut: 'SUCCESS',
    Message: 'Licence créée avec succès',
    Description: 'Création réussie d\'une nouvelle licence par un administrateur',
  },
  {
    Fichier: 'src/app/api/licenses/route.ts',
    Ligne: 154,
    Catégorie: 'LICENSE',
    Action: 'CREATE_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses',
    Statut: 'ERROR',
    Message: 'Données invalides pour la création de licence',
    Description: 'Échec de validation des données lors de la création d\'une licence',
  },
  {
    Fichier: 'src/app/api/licenses/route.ts',
    Ligne: 173,
    Catégorie: 'LICENSE',
    Action: 'CREATE_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses',
    Statut: 'ERROR',
    Message: 'Erreur lors de la création de la licence',
    Description: 'Erreur technique lors de la création d\'une licence',
  },
  {
    Fichier: 'src/app/api/licenses/[id]/route.ts',
    Ligne: 125,
    Catégorie: 'LICENSE',
    Action: 'UPDATE_LICENSE',
    Méthode: 'PUT',
    Endpoint: '/api/licenses/[id]',
    Statut: 'SUCCESS',
    Message: 'Licence modifiée avec succès',
    Description: 'Modification réussie d\'une licence par un administrateur',
  },
  {
    Fichier: 'src/app/api/licenses/[id]/route.ts',
    Ligne: 164,
    Catégorie: 'LICENSE',
    Action: 'UPDATE_LICENSE',
    Méthode: 'PUT',
    Endpoint: '/api/licenses/[id]',
    Statut: 'ERROR',
    Message: 'Données invalides pour la modification de licence',
    Description: 'Échec de validation des données lors de la modification d\'une licence',
  },
  {
    Fichier: 'src/app/api/licenses/[id]/route.ts',
    Ligne: 183,
    Catégorie: 'LICENSE',
    Action: 'UPDATE_LICENSE',
    Méthode: 'PUT',
    Endpoint: '/api/licenses/[id]',
    Statut: 'ERROR',
    Message: 'Erreur lors de la modification de la licence',
    Description: 'Erreur technique lors de la modification d\'une licence',
  },
  {
    Fichier: 'src/app/api/licenses/[id]/route.ts',
    Ligne: 231,
    Catégorie: 'LICENSE',
    Action: 'DELETE_LICENSE',
    Méthode: 'DELETE',
    Endpoint: '/api/licenses/[id]',
    Statut: 'SUCCESS',
    Message: 'Licence supprimée avec succès',
    Description: 'Suppression réussie d\'une licence par un administrateur',
  },
  {
    Fichier: 'src/app/api/licenses/[id]/route.ts',
    Ligne: 262,
    Catégorie: 'LICENSE',
    Action: 'DELETE_LICENSE',
    Méthode: 'DELETE',
    Endpoint: '/api/licenses/[id]',
    Statut: 'ERROR',
    Message: 'Erreur lors de la suppression de la licence',
    Description: 'Erreur technique lors de la suppression d\'une licence',
  },

  // =============================================================================
  // LICENSE - Association manuelle
  // =============================================================================
  {
    Fichier: 'src/app/api/licenses/update/route.ts',
    Ligne: 47,
    Catégorie: 'LICENSE',
    Action: 'ASSOCIATE_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/update',
    Statut: 'SUCCESS',
    Message: 'Licence associée avec succès au site',
    Description: 'Association manuelle réussie d\'une licence à un domaine par un administrateur',
  },
  {
    Fichier: 'src/app/api/licenses/update/route.ts',
    Ligne: 78,
    Catégorie: 'LICENSE',
    Action: 'ASSOCIATE_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/update',
    Statut: 'ERROR',
    Message: 'Erreur lors de l\'association de la licence',
    Description: 'Erreur technique lors de l\'association manuelle d\'une licence',
  },

  // =============================================================================
  // LICENSE - Désassociation
  // =============================================================================
  {
    Fichier: 'src/app/api/licenses/disassociate/route.ts',
    Ligne: 44,
    Catégorie: 'LICENSE',
    Action: 'DISASSOCIATE_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/disassociate',
    Statut: 'SUCCESS',
    Message: 'Licence désassociée avec succès',
    Description: 'Désassociation réussie d\'une licence d\'un domaine',
  },
  {
    Fichier: 'src/app/api/licenses/disassociate/route.ts',
    Ligne: 74,
    Catégorie: 'LICENSE',
    Action: 'DISASSOCIATE_LICENSE',
    Méthode: 'POST',
    Endpoint: '/api/licenses/disassociate',
    Statut: 'ERROR',
    Message: 'Erreur lors de la désassociation de la licence',
    Description: 'Erreur technique lors de la désassociation d\'une licence',
  },

  // =============================================================================
  // POI - Synchronisation
  // =============================================================================
  {
    Fichier: 'src/app/api/poi/sync/route.ts',
    Ligne: 44,
    Catégorie: 'POI',
    Action: 'SYNC_POI',
    Méthode: 'POST',
    Endpoint: '/api/poi/sync',
    Statut: 'ERROR',
    Message: 'Tentative de sync sans clé de licence',
    Description: 'Tentative de synchronisation de POI sans header X-License-Key',
  },
  {
    Fichier: 'src/app/api/poi/sync/route.ts',
    Ligne: 62,
    Catégorie: 'POI',
    Action: 'SYNC_POI',
    Méthode: 'POST',
    Endpoint: '/api/poi/sync',
    Statut: 'ERROR',
    Message: 'Tentative de sync avec clé invalide',
    Description: 'Tentative de synchronisation avec une clé de licence inexistante',
  },
  {
    Fichier: 'src/app/api/poi/sync/route.ts',
    Ligne: 75,
    Catégorie: 'POI',
    Action: 'SYNC_POI',
    Méthode: 'POST',
    Endpoint: '/api/poi/sync',
    Statut: 'ERROR',
    Message: 'Tentative de sync avec licence inactive',
    Description: 'Tentative de synchronisation avec une licence dont le statut n\'est pas ACTIVE',
  },
  {
    Fichier: 'src/app/api/poi/sync/route.ts',
    Ligne: 96,
    Catégorie: 'POI',
    Action: 'SYNC_POI',
    Méthode: 'POST',
    Endpoint: '/api/poi/sync',
    Statut: 'ERROR',
    Message: 'Format de données invalide',
    Description: 'Le champ pois n\'est pas un tableau ou est manquant',
  },
  {
    Fichier: 'src/app/api/poi/sync/route.ts',
    Ligne: 112,
    Catégorie: 'POI',
    Action: 'SYNC_POI',
    Méthode: 'POST',
    Endpoint: '/api/poi/sync',
    Statut: 'WARNING',
    Message: 'Tentative de sync avec tableau vide',
    Description: 'Synchronisation appelée avec un tableau de POI vide',
  },
  {
    Fichier: 'src/app/api/poi/sync/route.ts',
    Ligne: 316,
    Catégorie: 'POI',
    Action: 'SYNC_POI',
    Méthode: 'POST',
    Endpoint: '/api/poi/sync',
    Statut: 'SUCCESS',
    Message: 'Synchronisation de POI et visites',
    Description: 'Synchronisation réussie des POI et visites depuis le plugin client',
  },
  {
    Fichier: 'src/app/api/poi/sync/route.ts',
    Ligne: 340,
    Catégorie: 'POI',
    Action: 'SYNC_POI',
    Méthode: 'POST',
    Endpoint: '/api/poi/sync',
    Statut: 'ERROR',
    Message: 'Erreur serveur lors de la synchronisation des POI',
    Description: 'Erreur technique lors de la synchronisation des POI',
  },

  // =============================================================================
  // API_USAGE - Statistiques emails/SMS
  // =============================================================================
  {
    Fichier: 'src/app/api/statistics/update-stats/route.ts',
    Ligne: 18,
    Catégorie: 'API_USAGE',
    Action: 'STATS_UPDATE_FAILED',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-stats',
    Statut: 'ERROR',
    Message: 'Clé de licence manquante',
    Description: 'Tentative d\'envoi de stats sans clé de licence',
  },
  {
    Fichier: 'src/app/api/statistics/update-stats/route.ts',
    Ligne: 48,
    Catégorie: 'API_USAGE',
    Action: 'STATS_UPDATE_UNAUTHORIZED',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-stats',
    Statut: 'ERROR',
    Message: 'Licence invalide ou inactive',
    Description: 'Tentative d\'envoi de stats avec une licence invalide ou non-ACTIVE',
  },
  {
    Fichier: 'src/app/api/statistics/update-stats/route.ts',
    Ligne: 149,
    Catégorie: 'API_USAGE',
    Action: 'STATS_UPDATE',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-stats',
    Statut: 'SUCCESS',
    Message: 'Stats enregistrées (Emails + SMS)',
    Description: 'Enregistrement réussi des statistiques d\'emails et SMS envoyés',
  },
  {
    Fichier: 'src/app/api/statistics/update-stats/route.ts',
    Ligne: 188,
    Catégorie: 'API_USAGE',
    Action: 'STATS_UPDATE',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-stats',
    Statut: 'ERROR',
    Message: 'Erreur lors de l\'enregistrement des stats',
    Description: 'Erreur technique lors de l\'enregistrement des statistiques',
  },

  // =============================================================================
  // API_USAGE - Logs emails/SMS
  // =============================================================================
  {
    Fichier: 'src/app/api/statistics/update-logs/route.ts',
    Ligne: 18,
    Catégorie: 'API_USAGE',
    Action: 'LOGS_UPDATE_FAILED',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-logs',
    Statut: 'ERROR',
    Message: 'Clé de licence manquante',
    Description: 'Tentative d\'envoi de logs sans clé de licence',
  },
  {
    Fichier: 'src/app/api/statistics/update-logs/route.ts',
    Ligne: 47,
    Catégorie: 'API_USAGE',
    Action: 'LOGS_UPDATE_UNAUTHORIZED',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-logs',
    Statut: 'ERROR',
    Message: 'Licence invalide ou inactive',
    Description: 'Tentative d\'envoi de logs avec une licence invalide ou non-ACTIVE',
  },
  {
    Fichier: 'src/app/api/statistics/update-logs/route.ts',
    Ligne: 108,
    Catégorie: 'API_USAGE',
    Action: 'LOGS_UPDATE',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-logs',
    Statut: 'SUCCESS',
    Message: 'Logs enregistrés (Emails + SMS)',
    Description: 'Enregistrement réussi des logs détaillés d\'emails et SMS',
  },
  {
    Fichier: 'src/app/api/statistics/update-logs/route.ts',
    Ligne: 138,
    Catégorie: 'API_USAGE',
    Action: 'LOGS_UPDATE',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-logs',
    Statut: 'ERROR',
    Message: 'Erreur lors de l\'enregistrement des logs',
    Description: 'Erreur technique lors de l\'enregistrement des logs',
  },

  // =============================================================================
  // API_USAGE - Stats API (OpenAI/DeepL)
  // =============================================================================
  {
    Fichier: 'src/app/api/statistics/update-api-usage/route.ts',
    Ligne: 18,
    Catégorie: 'API_USAGE',
    Action: 'API_USAGE_UPDATE_FAILED',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-api-usage',
    Statut: 'ERROR',
    Message: 'Clé de licence manquante',
    Description: 'Tentative d\'envoi de stats API sans clé de licence',
  },
  {
    Fichier: 'src/app/api/statistics/update-api-usage/route.ts',
    Ligne: 42,
    Catégorie: 'API_USAGE',
    Action: 'API_USAGE_UPDATE_UNAUTHORIZED',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-api-usage',
    Statut: 'ERROR',
    Message: 'Licence invalide ou inactive',
    Description: 'Tentative d\'envoi de stats API avec une licence invalide',
  },
  {
    Fichier: 'src/app/api/statistics/update-api-usage/route.ts',
    Ligne: 91,
    Catégorie: 'API_USAGE',
    Action: 'API_USAGE_UPDATE',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-api-usage',
    Statut: 'SUCCESS',
    Message: 'Stats API enregistrées (DeepL + OpenAI)',
    Description: 'Enregistrement réussi des statistiques d\'usage d\'API OpenAI et DeepL',
  },
  {
    Fichier: 'src/app/api/statistics/update-api-usage/route.ts',
    Ligne: 122,
    Catégorie: 'API_USAGE',
    Action: 'API_USAGE_UPDATE',
    Méthode: 'POST',
    Endpoint: '/api/statistics/update-api-usage',
    Statut: 'ERROR',
    Message: 'Erreur lors de l\'enregistrement des stats API',
    Description: 'Erreur technique lors de l\'enregistrement des stats API',
  },

  // =============================================================================
  // AUTH - Authentification 2FA
  // =============================================================================
  {
    Fichier: 'src/app/api/auth/2fa/complete-login/route.ts',
    Ligne: 47,
    Catégorie: 'AUTH',
    Action: 'COMPLETE_LOGIN',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/complete-login',
    Statut: 'ERROR',
    Message: 'Session 2FA expirée',
    Description: 'Cookie temporaire de session 2FA expiré ou absent',
  },
  {
    Fichier: 'src/app/api/auth/2fa/complete-login/route.ts',
    Ligne: 87,
    Catégorie: 'AUTH',
    Action: 'COMPLETE_LOGIN',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/complete-login',
    Statut: 'ERROR',
    Message: '2FA non configuré ou utilisateur introuvable',
    Description: 'Utilisateur sans 2FA activé ou inexistant lors de la finalisation de connexion',
  },
  {
    Fichier: 'src/app/api/auth/2fa/complete-login/route.ts',
    Ligne: 113,
    Catégorie: 'AUTH',
    Action: 'COMPLETE_LOGIN',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/complete-login',
    Statut: 'SUCCESS',
    Message: 'Connexion avec backup code',
    Description: 'Connexion réussie avec un code de backup 2FA',
  },
  {
    Fichier: 'src/app/api/auth/2fa/complete-login/route.ts',
    Ligne: 131,
    Catégorie: 'AUTH',
    Action: 'COMPLETE_LOGIN',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/complete-login',
    Statut: 'SUCCESS',
    Message: 'Connexion avec TOTP',
    Description: 'Connexion réussie avec un code TOTP (Google Authenticator)',
  },
  {
    Fichier: 'src/app/api/auth/2fa/complete-login/route.ts',
    Ligne: 142,
    Catégorie: 'AUTH',
    Action: 'COMPLETE_LOGIN',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/complete-login',
    Statut: 'ERROR',
    Message: 'Code 2FA invalide',
    Description: 'Code TOTP ou backup code invalide lors de la connexion',
  },
  {
    Fichier: 'src/app/api/auth/2fa/complete-login/route.ts',
    Ligne: 168,
    Catégorie: 'AUTH',
    Action: 'COMPLETE_LOGIN',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/complete-login',
    Statut: 'SUCCESS',
    Message: 'Appareil ajouté aux appareils de confiance',
    Description: 'Appareil enregistré comme appareil de confiance (Remember Device)',
  },
  {
    Fichier: 'src/app/api/auth/2fa/complete-login/route.ts',
    Ligne: 201,
    Catégorie: 'AUTH',
    Action: 'COMPLETE_LOGIN',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/complete-login',
    Statut: 'ERROR',
    Message: 'Erreur serveur',
    Description: 'Erreur technique lors de la finalisation de la connexion 2FA',
  },

  // =============================================================================
  // AUTH - Configuration 2FA
  // =============================================================================
  {
    Fichier: 'src/app/api/auth/2fa/setup/route.ts',
    Ligne: 57,
    Catégorie: 'AUTH',
    Action: 'SETUP_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/setup',
    Statut: 'SUCCESS',
    Message: 'Setup 2FA initié',
    Description: 'Génération réussie du QR code et des codes de backup pour activer le 2FA',
  },
  {
    Fichier: 'src/app/api/auth/2fa/setup/route.ts',
    Ligne: 79,
    Catégorie: 'AUTH',
    Action: 'SETUP_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/setup',
    Statut: 'ERROR',
    Message: 'Erreur setup 2FA',
    Description: 'Erreur technique lors de la génération du setup 2FA',
  },

  // =============================================================================
  // AUTH - Vérification 2FA
  // =============================================================================
  {
    Fichier: 'src/app/api/auth/2fa/verify/route.ts',
    Ligne: 58,
    Catégorie: 'AUTH',
    Action: 'VERIFY_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/verify',
    Statut: 'WARNING',
    Message: 'Échec vérification 2FA',
    Description: 'Code TOTP invalide lors de la vérification',
  },
  {
    Fichier: 'src/app/api/auth/2fa/verify/route.ts',
    Ligne: 85,
    Catégorie: 'AUTH',
    Action: 'ENABLE_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/verify',
    Statut: 'SUCCESS',
    Message: '2FA activé avec succès',
    Description: 'Activation réussie du 2FA après vérification du code lors du setup initial',
  },
  {
    Fichier: 'src/app/api/auth/2fa/verify/route.ts',
    Ligne: 106,
    Catégorie: 'AUTH',
    Action: 'VERIFY_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/verify',
    Statut: 'SUCCESS',
    Message: '2FA vérifié',
    Description: 'Vérification réussie d\'un code TOTP (login standard)',
  },
  {
    Fichier: 'src/app/api/auth/2fa/verify/route.ts',
    Ligne: 126,
    Catégorie: 'AUTH',
    Action: 'VERIFY_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/verify',
    Statut: 'ERROR',
    Message: 'Erreur vérification 2FA',
    Description: 'Erreur technique lors de la vérification du code 2FA',
  },

  // =============================================================================
  // AUTH - Désactivation 2FA
  // =============================================================================
  {
    Fichier: 'src/app/api/auth/2fa/disable/route.ts',
    Ligne: 48,
    Catégorie: 'AUTH',
    Action: 'DISABLE_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/disable',
    Statut: 'WARNING',
    Message: 'Tentative désactivation 2FA avec mauvais mot de passe',
    Description: 'Tentative de désactivation du 2FA avec un mot de passe incorrect',
  },
  {
    Fichier: 'src/app/api/auth/2fa/disable/route.ts',
    Ligne: 90,
    Catégorie: 'AUTH',
    Action: 'DISABLE_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/disable',
    Statut: 'WARNING',
    Message: 'Échec désactivation 2FA : token invalide',
    Description: 'Tentative de désactivation du 2FA avec un code TOTP ou backup invalide',
  },
  {
    Fichier: 'src/app/api/auth/2fa/disable/route.ts',
    Ligne: 120,
    Catégorie: 'AUTH',
    Action: 'DISABLE_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/disable',
    Statut: 'SUCCESS',
    Message: '2FA désactivé',
    Description: 'Désactivation réussie du 2FA',
  },
  {
    Fichier: 'src/app/api/auth/2fa/disable/route.ts',
    Ligne: 140,
    Catégorie: 'AUTH',
    Action: 'DISABLE_2FA',
    Méthode: 'POST',
    Endpoint: '/api/auth/2fa/disable',
    Statut: 'ERROR',
    Message: 'Erreur désactivation 2FA',
    Description: 'Erreur technique lors de la désactivation du 2FA',
  },

  // =============================================================================
  // SYSTEM - Monitoring sécurité
  // =============================================================================
  {
    Fichier: 'src/lib/security-monitor.ts',
    Ligne: 167,
    Catégorie: 'SYSTEM',
    Action: 'SEND_SECURITY_ALERT',
    Méthode: 'POST',
    Endpoint: 'Brevo API',
    Statut: 'SUCCESS',
    Message: 'Alerte sécurité envoyée',
    Description: 'Email d\'alerte sécurité envoyé avec succès via Brevo',
  },
  {
    Fichier: 'src/lib/security-monitor.ts',
    Ligne: 184,
    Catégorie: 'SYSTEM',
    Action: 'SEND_SECURITY_ALERT',
    Méthode: 'POST',
    Endpoint: 'Brevo API',
    Statut: 'ERROR',
    Message: 'Échec envoi alerte sécurité',
    Description: 'Erreur lors de l\'envoi d\'un email d\'alerte sécurité',
  },
  {
    Fichier: 'src/lib/security-monitor.ts',
    Ligne: 316,
    Catégorie: 'SYSTEM',
    Action: 'DETECT_SUSPICIOUS_PATTERN',
    Méthode: 'N/A',
    Endpoint: 'N/A',
    Statut: 'WARNING',
    Message: 'Pattern suspect détecté',
    Description: 'Détection d\'un pattern suspect (accès échoués répétés, heures inhabituelles, etc.)',
  },
];

// Créer le workbook
const wb = XLSX.utils.book_new();

// Convertir les données en feuille
const ws = XLSX.utils.json_to_sheet(logsInventory);

// Configurer la largeur des colonnes
const colWidths = [
  { wch: 50 }, // Fichier
  { wch: 8 },  // Ligne
  { wch: 15 }, // Catégorie
  { wch: 25 }, // Action
  { wch: 10 }, // Méthode
  { wch: 35 }, // Endpoint
  { wch: 10 }, // Statut
  { wch: 50 }, // Message
  { wch: 80 }, // Description
];

ws['!cols'] = colWidths;

// Ajouter la feuille au workbook
XLSX.utils.book_append_sheet(wb, ws, 'Inventaire Logs');

// Créer une feuille de résumé par catégorie
const summary: any[] = [];
const categories = [...new Set(logsInventory.map(log => log.Catégorie))];

categories.forEach(cat => {
  const logsInCat = logsInventory.filter(log => log.Catégorie === cat);
  const statuses = [...new Set(logsInCat.map(log => log.Statut))];
  
  summary.push({
    Catégorie: cat,
    'Total Logs': logsInCat.length,
    SUCCESS: logsInCat.filter(l => l.Statut === 'SUCCESS').length,
    ERROR: logsInCat.filter(l => l.Statut === 'ERROR').length,
    WARNING: logsInCat.filter(l => l.Statut === 'WARNING').length,
    INFO: logsInCat.filter(l => l.Statut === 'INFO').length,
  });
});

const wsSummary = XLSX.utils.json_to_sheet(summary);
wsSummary['!cols'] = [
  { wch: 20 },
  { wch: 12 },
  { wch: 10 },
  { wch: 10 },
  { wch: 10 },
  { wch: 10 },
];
XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé par Catégorie');

// Créer une feuille de résumé par statut
const statusSummary: any[] = [
  { Statut: 'SUCCESS', Nombre: logsInventory.filter(l => l.Statut === 'SUCCESS').length },
  { Statut: 'ERROR', Nombre: logsInventory.filter(l => l.Statut === 'ERROR').length },
  { Statut: 'WARNING', Nombre: logsInventory.filter(l => l.Statut === 'WARNING').length },
  { Statut: 'INFO', Nombre: logsInventory.filter(l => l.Statut === 'INFO').length },
  { Statut: 'TOTAL', Nombre: logsInventory.length },
];

const wsStatus = XLSX.utils.json_to_sheet(statusSummary);
wsStatus['!cols'] = [
  { wch: 15 },
  { wch: 10 },
];
XLSX.utils.book_append_sheet(wb, wsStatus, 'Résumé par Statut');

// Sauvegarder le fichier
const outputPath = path.join(process.cwd(), 'roadpress-logs-inventory.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Inventaire des logs généré avec succès : ${outputPath}`);
console.log(`📊 Total des entrées de log : ${logsInventory.length}`);
console.log(`📂 Catégories : ${categories.join(', ')}`);
