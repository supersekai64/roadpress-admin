-- ============================================
-- MIGRATION PRODUCTION : Suppression colonnes inutiles
-- ============================================
-- Date : 13 octobre 2025
-- Description : Suppression des colonnes non utilisées dans les tables de statistiques
-- ⚠️ À EXÉCUTER EN PRODUCTION APRÈS BACKUP

-- ============================================
-- TABLE email_stats
-- ============================================
-- Supprimer les colonnes inutiles
ALTER TABLE email_stats DROP COLUMN IF EXISTS emails_delivered;
ALTER TABLE email_stats DROP COLUMN IF EXISTS emails_opened;
ALTER TABLE email_stats DROP COLUMN IF EXISTS emails_clicked;
ALTER TABLE email_stats DROP COLUMN IF EXISTS emails_bounced;
ALTER TABLE email_stats DROP COLUMN IF EXISTS emails_spam;

-- ============================================
-- TABLE email_stats_monthly
-- ============================================
ALTER TABLE email_stats_monthly DROP COLUMN IF EXISTS emails_delivered;
ALTER TABLE email_stats_monthly DROP COLUMN IF EXISTS emails_opened;
ALTER TABLE email_stats_monthly DROP COLUMN IF EXISTS emails_clicked;
ALTER TABLE email_stats_monthly DROP COLUMN IF EXISTS emails_bounced;
ALTER TABLE email_stats_monthly DROP COLUMN IF EXISTS emails_spam;

-- ============================================
-- TABLE sms_stats
-- ============================================
ALTER TABLE sms_stats DROP COLUMN IF EXISTS sms_delivered;
ALTER TABLE sms_stats DROP COLUMN IF EXISTS sms_failed;

-- ============================================
-- TABLE sms_stats_monthly
-- ============================================
ALTER TABLE sms_stats_monthly DROP COLUMN IF EXISTS sms_delivered;
ALTER TABLE sms_stats_monthly DROP COLUMN IF EXISTS sms_failed;

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier la structure finale des tables
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('email_stats', 'email_stats_monthly', 'sms_stats', 'sms_stats_monthly')
ORDER BY table_name, ordinal_position;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
