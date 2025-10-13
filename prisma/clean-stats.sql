-- Script pour supprimer les anciennes données avant migration
-- À exécuter uniquement en DEV

DELETE FROM pois;
DELETE FROM email_stats;
DELETE FROM email_stats_monthly;
DELETE FROM sms_stats;
DELETE FROM sms_stats_monthly;
DELETE FROM deepl_stats;
DELETE FROM deepl_stats_monthly;
DELETE FROM openai_stats;
DELETE FROM openai_stats_monthly;

-- Réinitialiser les séquences si nécessaire
