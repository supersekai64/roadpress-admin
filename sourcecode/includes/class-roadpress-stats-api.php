<?php
/**
 * Statistics API handling class for RoadPress Admin
 * 
 * Manages API endpoints related to client statistics collection
 */
class RoadPress_Stats_API {
    
    /**
     * Initialize the stats API
     */
    public static function init() {
        // Register REST API endpoints
        add_action('rest_api_init', [self::class, 'register_routes']);
    }
    
    /**
     * Register REST API routes for statistics
     */
    public static function register_routes() {
        register_rest_route('roadpress/v1', '/update_license_stats', [
            'methods' => 'POST',
            'callback' => [self::class, 'update_stats_callback'],
            'permission_callback' => '__return_true',
        ]);
    }
    
    /**
     * Callback for updating statistics from client sites
     * 
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response or error
     */
    public static function update_stats_callback($request) {
        global $wpdb;

        // Get JSON data
        $data = $request->get_json_params();
        error_log('[ROADPRESS] [API] Données statistiques reçues : ' . print_r($data, true));

        // Verify required data
        if (!isset($data['license_key']) || !isset($data['email_stats']) || !isset($data['sms_stats'])) {
            error_log('[ROADPRESS] [API] Erreur : Données manquantes');
            return new WP_Error('invalid_data', 'Données manquantes', ['status' => 400]);
        }

        // Sanitize and validate data
        $license_key = sanitize_text_field($data['license_key']);
        $email_stats = intval($data['email_stats']);
        $sms_stats = $data['sms_stats'];

        error_log('[ROADPRESS] [API] Clé de licence :' . $license_key);
        error_log('[ROADPRESS] [API] E-mails envoyés : ' . $email_stats);
        error_log('[ROADPRESS] [API] Statistiques pour les SMS : ' . print_r($sms_stats, true));

        // Verify license
        $license = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}licenses WHERE license_key = %s",
            $license_key
        ));

        if (!$license) {
            error_log('[ROADPRESS] [API] Erreur : Licence non valide pour la clé ' . $license_key);
            return new WP_Error('invalid_license', 'Invalid license', ['status' => 404]);
        }

        $client_name = $license->client_name;
        error_log('[ROADPRESS] [API] Nom du client associé à la licence : ' . $client_name);

        // Update email statistics
        self::update_email_stats($license_key, $client_name, $email_stats);
        
        // Update SMS statistics
        self::update_sms_stats($license_key, $client_name, $sms_stats);

        // Return success response
        error_log('[ROADPRESS] [API] Les statistiques ont été mises à jour avec succès pour la licence : ' . $license_key);
        return new WP_REST_Response(['success' => true, 'message' => 'Statistics updated'], 200);
    }
    
    /**
     * Update email statistics
     * 
     * @param string $license_key License key
     * @param string $client_name Client name
     * @param int $email_stats Email statistics count
     * @return bool Success status
     */
    private static function update_email_stats($license_key, $client_name, $email_stats) {
        global $wpdb;
        
        // Mise à jour des statistiques cumulées
        $email_update_result = $wpdb->replace("{$wpdb->prefix}license_email_stats", [
            'license_key' => $license_key,
            'client_name' => $client_name,
            'email_stats' => $email_stats,
            'last_update' => current_time('mysql'),
        ]);

        // Mise à jour des statistiques mensuelles
        $current_year = date('Y');
        $current_month = date('n');
        
        // Vérifier si l'entrée pour ce mois existe déjà
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}license_email_stats_monthly 
             WHERE license_key = %s AND client_name = %s AND stat_year = %d AND stat_month = %d",
            $license_key, $client_name, $current_year, $current_month
        ));
        
        if ($existing) {
            // Mettre à jour l'entrée existante
            $monthly_update_result = $wpdb->update(
                "{$wpdb->prefix}license_email_stats_monthly",
                [
                    'email_stats' => $email_stats,
                    'last_update' => current_time('mysql'),
                ],
                [
                    'license_key' => $license_key,
                    'client_name' => $client_name,
                    'stat_year' => $current_year,
                    'stat_month' => $current_month,
                ]
            );
        } else {
            // Créer une nouvelle entrée
            $monthly_update_result = $wpdb->insert(
                "{$wpdb->prefix}license_email_stats_monthly",
                [
                    'license_key' => $license_key,
                    'client_name' => $client_name,
                    'email_stats' => $email_stats,
                    'stat_year' => $current_year,
                    'stat_month' => $current_month,
                    'last_update' => current_time('mysql'),
                ]
            );
        }

        if ($email_update_result === false || $monthly_update_result === false) {
            error_log('[ROADPRESS] [API] Erreur SQL lors de la mise à jour des statistiques de messagerie : ' . $wpdb->last_error);
            return false;
        } else {
            error_log('[ROADPRESS] [API] Mise à jour réussie des statistiques sur les e-mails');
            return true;
        }
    }
    
    /**
     * Update SMS statistics
     * 
     * @param string $license_key License key
     * @param string $client_name Client name
     * @param array $sms_stats SMS statistics array
     * @return bool Success status
     */
    private static function update_sms_stats($license_key, $client_name, $sms_stats) {
        global $wpdb;
        $success = true;
        $current_year = date('Y');
        $current_month = date('n');
        
        foreach ($sms_stats as $stat) {
            $country = sanitize_text_field($stat['country']);
            $sms_count = intval($stat['sms_count']);

            error_log('[ROADPRESS] [API] Mise à jour des statistiques SMS pour le pays: ' . $country . ', SMS count: ' . $sms_count);

            // Mise à jour des statistiques cumulées
            $sms_update_result = $wpdb->replace("{$wpdb->prefix}license_sms_stats", [
                'license_key' => $license_key,
                'client_name' => $client_name,
                'country' => $country,
                'sms_sent' => $sms_count,
                'last_update' => current_time('mysql'),
            ]);
            
            // Vérifier si l'entrée pour ce mois existe déjà
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}license_sms_stats_monthly 
                WHERE license_key = %s AND client_name = %s AND country = %s AND stat_year = %d AND stat_month = %d",
                $license_key, $client_name, $country, $current_year, $current_month
            ));
            
            if ($existing) {
                // Mettre à jour l'entrée existante
                $monthly_update_result = $wpdb->update(
                    "{$wpdb->prefix}license_sms_stats_monthly",
                    [
                        'sms_sent' => $sms_count,
                        'last_update' => current_time('mysql'),
                    ],
                    [
                        'license_key' => $license_key,
                        'client_name' => $client_name,
                        'country' => $country,
                        'stat_year' => $current_year,
                        'stat_month' => $current_month,
                    ]
                );
            } else {
                // Créer une nouvelle entrée
                $monthly_update_result = $wpdb->insert(
                    "{$wpdb->prefix}license_sms_stats_monthly",
                    [
                        'license_key' => $license_key,
                        'client_name' => $client_name,
                        'country' => $country,
                        'sms_sent' => $sms_count,
                        'stat_year' => $current_year,
                        'stat_month' => $current_month,
                        'last_update' => current_time('mysql'),
                    ]
                );
            }

            if ($sms_update_result === false || $monthly_update_result === false) {
                error_log('[ROADPRESS] [API] Erreur dans la mise à jour des statistiques SMS pour le pays : ' . $country);
                $success = false;
            } else {
                error_log('[ROADPRESS] [API] Les statistiques SMS ont été mises à jour avec succès pour le pays : ' . $country);
            }
        }
        
        return $success;
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
            WHERE send_date > (
                SELECT IFNULL(MAX(last_update), '1970-01-01') 
                FROM {$wpdb->prefix}license_email_stats_monthly
                WHERE stat_year = YEAR(send_date) AND stat_month = MONTH(send_date)
            )
            GROUP BY license_key, client_name, YEAR(send_date), MONTH(send_date)
            ON DUPLICATE KEY UPDATE
                email_stats = email_stats + VALUES(email_stats),
                last_update = GREATEST(last_update, VALUES(last_update))
        ");
        
        if ($email_monthly_update !== false) {
            $results['email_monthly_updated'] = $email_monthly_update;
        }
        
        // 2. Aggregate Email logs into general stats
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
        
        // 3. Aggregate SMS logs into monthly stats
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
            WHERE send_date > (
                SELECT IFNULL(MAX(last_update), '1970-01-01') 
                FROM {$wpdb->prefix}license_sms_stats_monthly
                WHERE stat_year = YEAR(send_date) AND stat_month = MONTH(send_date) AND country = {$wpdb->prefix}license_sms_logs.country
            )
            GROUP BY license_key, client_name, country, YEAR(send_date), MONTH(send_date)
            ON DUPLICATE KEY UPDATE
                sms_sent = sms_sent + VALUES(sms_sent),
                last_update = GREATEST(last_update, VALUES(last_update))
        ");
        
        if ($sms_monthly_update !== false) {
            $results['sms_monthly_updated'] = $sms_monthly_update;
        }
        
        // 4. Aggregate SMS monthly stats into general stats
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
        
        return $results;
    }
}

// Initialize the Stats API
RoadPress_Stats_API::init();

// Legacy function for backward compatibility
function roadpress_update_stats_callback($request) {
    return RoadPress_Stats_API::update_stats_callback($request);
}