<?php
/**
 * Statistics management class for RoadPress Admin
 * Handles statistics collection, processing and export
 */
class RoadPress_Stats {
    /**
     * Handle CSV export action
     * This is a compatibility method that redirects to the correct export function
     */
    public static function handle_export() {
        if (!isset($_GET['action']) || $_GET['action'] !== 'export_stats' || 
            !isset($_GET['page']) || $_GET['page'] !== 'roadpress-api-statistics') {
            return;
        }
        
        // Redirect to the proper export function in RoadPress_Page_Stats
        if (class_exists('RoadPress_Page_Stats') && method_exists('RoadPress_Page_Stats', 'export_simple_stats_to_csv')) {
            RoadPress_Page_Stats::export_simple_stats_to_csv();
        } else {
            wp_die('La fonctionnalité d\'exportation n\'est pas disponible. Veuillez contacter l\'administrateur.');
        }
    }
    
    /**
     * Get license statistics for both email and SMS
     * 
     * @return array Statistics data
     */
    public static function get_license_stats() {
        global $wpdb;
        
        // Get email statistics by license
        $email_stats = $wpdb->get_results("
            SELECT license_key, client_name, email_stats, last_update
            FROM {$wpdb->prefix}license_email_stats
        ", ARRAY_A);

        // Get SMS statistics by license and country
        $sms_stats = $wpdb->get_results("
            SELECT license_key, client_name, country, sms_sent, last_update
            FROM {$wpdb->prefix}license_sms_stats
        ", ARRAY_A);

        // Get DeepL statistics
        $deepl_stats = $wpdb->get_results("
            SELECT license_key, client_name, tokens_used, estimated_cost, last_update
            FROM {$wpdb->prefix}license_deepl_stats
        ", ARRAY_A);

        // Get OpenAI statistics
        $openai_stats = $wpdb->get_results("
            SELECT license_key, client_name, tokens_used, estimated_cost, last_update
            FROM {$wpdb->prefix}license_openai_stats
        ", ARRAY_A);

        // Combine all results
        $stats = [
            'email_stats' => $email_stats,
            'sms_stats' => $sms_stats,
            'deepl_stats' => $deepl_stats,
            'openai_stats' => $openai_stats
        ];

        return $stats;
    }
    
    /**
     * Get API statistics for a specific client and year
     * Retrieves only statistics for active and expired licenses
     * 
     * @param string $client Client name or 'all'
     * @param int $year Year to filter by
     * @return array API statistics
     */
    public static function get_api_statistics($client = 'all', $year = null) {
        global $wpdb;
        
        if (empty($year)) {
            $year = date('Y');
        }
        
        // Recover only active or expired license keys
        $valid_license_keys = $wpdb->get_col("
            SELECT license_key 
            FROM {$wpdb->prefix}licenses 
            WHERE status IN ('active', 'expired')
        ");
        
        // If no valid license, return empty tables
        if (empty($valid_license_keys)) {
            return [
                'deepl_stats' => [],
                'openai_stats' => [],
                'email_stats' => [],
                'sms_stats' => []
            ];
        }
        
        // Build the list of keys for the WHERE clause
        $license_keys_str = "'" . implode("','", $valid_license_keys) . "'";
        $where_licenses = "AND license_key IN ($license_keys_str)";
        
        // Build where clause for client filter
        $where_client = $client !== 'all' ? $wpdb->prepare(" AND client_name = %s", $client) : "";
        
        // Get DeepL monthly statistics
        $deepl_stats = $wpdb->get_results(
            "SELECT 
                client_name, 
                stat_year_month as stat_year_month,
                SUM(tokens_used) as tokens_used, 
                SUM(estimated_cost) as estimated_cost
            FROM {$wpdb->prefix}license_deepl_stats_monthly
            WHERE SUBSTRING(stat_year_month, 1, 4) = '{$year}' {$where_client} {$where_licenses}
            GROUP BY client_name, stat_year_month
            ORDER BY client_name, stat_year_month"
        , ARRAY_A);
        
        // Get OpenAI monthly statistics
        $openai_stats = $wpdb->get_results(
            "SELECT 
                client_name, 
                stat_year_month as stat_year_month,
                SUM(tokens_used) as tokens_used, 
                SUM(estimated_cost) as estimated_cost
            FROM {$wpdb->prefix}license_openai_stats_monthly
            WHERE SUBSTRING(stat_year_month, 1, 4) = '{$year}' {$where_client} {$where_licenses}
            GROUP BY client_name, stat_year_month
            ORDER BY client_name, stat_year_month"
        , ARRAY_A);
        
        // Get Email monthly statistics
        $email_stats = $wpdb->get_results(
            "SELECT 
                client_name, 
                CONCAT(stat_year, '-', LPAD(stat_month, 2, '0')) as stat_year_month,
                SUM(email_stats) as emails_sent
            FROM {$wpdb->prefix}license_email_stats_monthly
            WHERE stat_year = {$year} {$where_client} {$where_licenses}
            GROUP BY client_name, stat_year, stat_month
            ORDER BY client_name, stat_year, stat_month"
        , ARRAY_A);
        
        // Get SMS monthly statistics
        $sms_stats = $wpdb->get_results(
            "SELECT 
                client_name, 
                CONCAT(stat_year, '-', LPAD(stat_month, 2, '0')) as stat_year_month,
                country,
                SUM(sms_sent) as sms_sent
            FROM {$wpdb->prefix}license_sms_stats_monthly
            WHERE stat_year = {$year} {$where_client} {$where_licenses}
            GROUP BY client_name, stat_year, stat_month, country
            ORDER BY client_name, stat_year, stat_month, country"
        , ARRAY_A);
        
        return [
            'deepl_stats' => $deepl_stats,
            'openai_stats' => $openai_stats,
            'email_stats' => $email_stats,
            'sms_stats' => $sms_stats
        ];
    }
    
    /**
     * Get available clients for filtering
     * 
     * @return array List of clients
     */
    public static function get_clients() {
        global $wpdb;
        return $wpdb->get_results("SELECT DISTINCT client_name FROM {$wpdb->prefix}licenses WHERE status = 'active'");
    }
    
    /**
     * Get available years for filtering
     * 
     * @param int $range Number of past years to include
     * @return array List of years
     */
    public static function get_years($range = 2) {
        $current_year = date('Y');
        return range($current_year - $range, $current_year);
    }
    
    /**
     * Aggregate logs into statistics
     * This function should be called periodically to update statistics tables from logs
     */
    public static function aggregate_logs_to_stats() {
        global $wpdb;
        $results = ['email_updated' => 0, 'sms_updated' => 0];
        
        // 1. Aggregate Email logs into monthly stats
        $email_monthly_update = $wpdb->query("
            INSERT INTO {$wpdb->prefix}license_email_stats_monthly (license_key, client_name, email_stats, stat_year, stat_month, last_update)
            SELECT 
                license_key, 
                client_name, 
                COUNT(*) as email_count,
                YEAR(send_date) as stat_year,
                MONTH(send_date) as stat_month,
                MAX(send_date) as last_update
            FROM {$wpdb->prefix}license_email_logs
            GROUP BY license_key, client_name, YEAR(send_date), MONTH(send_date)
            ON DUPLICATE KEY UPDATE
                email_stats = VALUES(email_stats),
                last_update = GREATEST(last_update, VALUES(last_update))
        ");
        
        if ($email_monthly_update !== false) {
            $results['email_updated'] = $email_monthly_update;
        }
        
        // 2. Vider la table email_stats avant l'agrégation pour éviter l'accumulation
        $wpdb->query("TRUNCATE TABLE {$wpdb->prefix}license_email_stats");
        
        // 3. Aggregate Email monthly stats into general stats
        $wpdb->query("
            INSERT INTO {$wpdb->prefix}license_email_stats (license_key, client_name, email_stats, last_update)
            SELECT 
                license_key, 
                client_name, 
                SUM(email_stats) as total_emails,
                MAX(last_update) as last_update
            FROM {$wpdb->prefix}license_email_stats_monthly
            GROUP BY license_key, client_name
            ON DUPLICATE KEY UPDATE
                email_stats = VALUES(email_stats),
                last_update = VALUES(last_update)
        ");
        
        // 4. Aggregate SMS logs into monthly stats
        $sms_monthly_update = $wpdb->query("
            INSERT INTO {$wpdb->prefix}license_sms_stats_monthly (license_key, client_name, country, sms_sent, stat_year, stat_month, last_update)
            SELECT 
                license_key, 
                client_name, 
                country,
                COUNT(*) as sms_count,
                YEAR(send_date) as stat_year,
                MONTH(send_date) as stat_month,
                MAX(send_date) as last_update
            FROM {$wpdb->prefix}license_sms_logs
            GROUP BY license_key, client_name, country, YEAR(send_date), MONTH(send_date)
            ON DUPLICATE KEY UPDATE
                sms_sent = VALUES(sms_sent),
                last_update = GREATEST(last_update, VALUES(last_update))
        ");
        
        if ($sms_monthly_update !== false) {
            $results['sms_updated'] = $sms_monthly_update;
        }
        
        // 5. Vider la table sms_stats avant l'agrégation pour éviter l'accumulation
        $wpdb->query("TRUNCATE TABLE {$wpdb->prefix}license_sms_stats");
        
        // 6. Aggregate SMS monthly stats into general stats
        $wpdb->query("
            INSERT INTO {$wpdb->prefix}license_sms_stats (license_key, client_name, country, sms_sent, last_update)
            SELECT 
                license_key, 
                client_name, 
                country,
                SUM(sms_sent) as total_sms,
                MAX(last_update) as last_update
            FROM {$wpdb->prefix}license_sms_stats_monthly
            GROUP BY license_key, client_name, country
            ON DUPLICATE KEY UPDATE
                sms_sent = VALUES(sms_sent),
                last_update = VALUES(last_update)
        ");
        
        // Log et retourner les résultats
        error_log('[ROADPRESS] [STAT] Agrégation des statistiques terminée : ' . 
                $results['email_updated'] . ' emails, ' . 
                $results['sms_updated'] . ' SMS');
        
        return $results;
    }
}