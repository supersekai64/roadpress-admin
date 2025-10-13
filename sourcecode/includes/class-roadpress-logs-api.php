<?php
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Logs API handling class for RoadPress Admin
 * 
 * Manages API endpoints related to client logs collection
 */
class RoadPress_Logs_API {
    
    /**
     * Initialize the logs API
     */
    public static function init() {
        // Register REST API endpoints
        add_action('rest_api_init', [self::class, 'register_routes']);
    }
    
    /**
     * Register REST API routes for logs
     */
    public static function register_routes() {
        register_rest_route('roadpress/v1', '/update_license_logs', [
            'methods' => 'POST',
            'callback' => [self::class, 'update_logs_callback'],
            'permission_callback' => '__return_true',
        ]);
    }
    
    /**
     * Callback for updating logs data from client sites
     * 
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response or error
     */
    public static function update_logs_callback($request) {
        global $wpdb;

        // Get request data
        $data = $request->get_json_params();
        error_log('[ROADPRESS] [API] Données d\'enregistrement reçues : ' . print_r($data, true));

        // Verify required data
        if (!isset($data['license_key']) || !isset($data['email_logs']) || !isset($data['sms_logs'])) {
            error_log('[ROADPRESS] [API] Erreur : Données manquantes.');
            return new WP_Error('invalid_data', 'Données manquantes', ['status' => 400]);
        }

        // Sanitize and assign data
        $license_key = sanitize_text_field($data['license_key']);
        $email_logs = $data['email_logs'];
        $sms_logs = $data['sms_logs'];

        error_log('[ROADPRESS] [API] Clé de licence : ' . $license_key);

        // Verify license
        $license = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}licenses WHERE license_key = %s",
            $license_key
        ));

        if (!$license) {
            error_log('[ROADPRESS] [API] Erreur : Licence non valide pour la clé ' . $license_key);
            return new WP_Error('invalid_license', 'Licence non valide', ['status' => 404]);
        }

        $client_id = intval($license->id);
        error_log('[ROADPRESS] [API] ID du client pour la licence : ' . $client_id);

        // Process email logs
        $success = true;
        if (!self::process_email_logs($email_logs, $client_id, $license_key, $license->client_name)) {
            $success = false;
        }

        // Process SMS logs
        if (!self::process_sms_logs($sms_logs, $client_id, $license_key, $license->client_name)) {
            $success = false;
        }

        // Agréger les logs en statistiques
        if ($success && class_exists('RoadPress_Stats') && method_exists('RoadPress_Stats', 'aggregate_logs_to_stats')) {
            $aggregation = RoadPress_Stats::aggregate_logs_to_stats();
            error_log('[ROADPRESS] [API] Agrégation automatique des logs : ' . 
                      (isset($aggregation['email_updated']) ? $aggregation['email_updated'] : 0) . ' emails, ' . 
                      (isset($aggregation['sms_updated']) ? $aggregation['sms_updated'] : 0) . ' SMS');
        }
        
        // Success response
        error_log('[ROADPRESS] [API] Les journaux ont été mis à jour avec succès pour la clé de licence : ' . $license_key);
        return new WP_REST_Response(['success' => true, 'message' => 'Les journaux ont été mis à jour avec succès'], 200);
    }
    
    /**
     * Process and insert email logs
     * 
     * @param array $email_logs Email logs to process
     * @param int $client_id Client ID
     * @param string $license_key License key
     * @param string $client_name Client name
     * @return bool Success status
     */
    private static function process_email_logs($email_logs, $client_id, $license_key, $client_name) {
        global $wpdb;
        $success = true;
        
        foreach ($email_logs as $log) {
            $send_date = isset($log['send_date']) ? sanitize_text_field($log['send_date']) : null;

            if ($send_date) {
                // Utiliser replace au lieu de insert avec vérification d'existence
                $insert_result = $wpdb->replace(
                    "{$wpdb->prefix}license_email_logs",
                    [
                        'client_id' => $client_id,
                        'license_key' => $license_key,
                        'client_name' => $client_name,
                        'send_date' => $send_date,
                    ],
                    ['%d', '%s', '%s', '%s']
                );

                if ($insert_result === false) {
                    error_log('[ROADPRESS] [API] Erreur d\'insertion du journal des e-mails : ' . $wpdb->last_error);
                    $success = false;
                } else {
                    error_log('[ROADPRESS] [API] Le journal des e-mails a été traité avec succès');
                }
            } else {
                error_log('[ROADPRESS] [API] Le journal des e-mails a été ignoré en raison de données non valides : ' . print_r($log, true));
            }
        }
        
        return $success;
    }
    
    /**
     * Process and insert SMS logs
     * 
     * @param array $sms_logs SMS logs to process
     * @param int $client_id Client ID
     * @param string $license_key License key
     * @param string $client_name Client name
     * @return bool Success status
     */
    private static function process_sms_logs($sms_logs, $client_id, $license_key, $client_name) {
        global $wpdb;
        $success = true;
        
        foreach ($sms_logs as $log) {
            $country = isset($log['country']) ? sanitize_text_field($log['country']) : null;
            $send_date = isset($log['send_date']) ? sanitize_text_field($log['send_date']) : null;

            if ($country && $send_date) {
                // Utiliser replace au lieu de insert avec vérification d'existence
                $insert_result = $wpdb->replace(
                    "{$wpdb->prefix}license_sms_logs",
                    [
                        'client_id' => $client_id,
                        'license_key' => $license_key,
                        'client_name' => $client_name,
                        'phone' => isset($log['phone']) ? sanitize_text_field($log['phone']) : '',
                        'country' => $country,
                        'send_date' => $send_date,
                    ],
                    ['%d', '%s', '%s', '%s', '%s', '%s']
                );

                if ($insert_result === false) {
                    error_log('[ROADPRESS] [API] Erreur d\'insertion du journal SMS : ' . $wpdb->last_error);
                    $success = false;
                } else {
                    error_log('[ROADPRESS] [API] Le journal SMS a été traité avec succès');
                }
            } else {
                error_log('[ROADPRESS] [API] Journal SMS ignoré en raison de données non valides : ' . print_r($log, true));
            }
        }
        
        return $success;
    }
}

// Initialize the Logs API
RoadPress_Logs_API::init();

// Legacy function for backward compatibility
function roadpress_update_logs_callback($request) {
    return RoadPress_Logs_API::update_logs_callback($request);
}