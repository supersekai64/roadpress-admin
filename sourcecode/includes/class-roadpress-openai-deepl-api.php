<?php
/**
 * OpenAI and DeepL API statistics handling class
 * 
 * Manages API endpoints related to AI services usage statistics
 */
class RoadPress_OpenAI_DeepL_API {
    
    /**
     * Initialize the OpenAI/DeepL API
     */
    public static function init() {
        // Register REST API endpoints
        add_action('rest_api_init', [self::class, 'register_routes']);
    }
    
    /**
     * Register REST API routes for API usage statistics
     */
    public static function register_routes() {
        register_rest_route('roadpress/v1', '/update_api_stats', [
            'methods' => 'POST',
            'callback' => [self::class, 'update_api_stats_callback'],
            'permission_callback' => '__return_true',
        ]);
    }
    
    /**
     * Callback for updating API usage statistics
     * 
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response or error
     */
    public static function update_api_stats_callback($request) {
        global $wpdb;

        // Get JSON data from request
        $data = $request->get_json_params();
        error_log('[ROADPRESS] [API] Demande reçue : ' . print_r($data, true));

        // Validate required data
        if (!isset($data['license_key'], $data['deepl_stats'], $data['openai_stats'])) {
            error_log('[ROADPRESS] [API] Données manquantes dans la demande');
            return new WP_Error('invalid_data', 'Données manquantes', ['status' => 400]);
        }

        $license_key = sanitize_text_field($data['license_key']);
        $deepl_stats = $data['deepl_stats'];
        $openai_stats = $data['openai_stats'];

        // Validate data format
        if (!is_array($deepl_stats) || !is_array($openai_stats)) {
            error_log('[ROADPRESS] [API] Format incorrect pour deepl_stats ou openai_stats');
            return new WP_Error('invalid_format', 'Format de statistiques incorrect', ['status' => 400]);
        }

        // Verify license in database
        $license = $wpdb->get_row($wpdb->prepare("
            SELECT * FROM {$wpdb->prefix}licenses WHERE license_key = %s
        ", $license_key));

        if (!$license) {
            error_log("[ROADPRESS] [API] Licence introuvable : $license_key");
            return new WP_Error('invalid_license', 'Licence non valide', ['status' => 404]);
        }

        $client_name = $license->client_name;

        // Update DeepL statistics
        $deepl_result = $wpdb->replace("{$wpdb->prefix}license_deepl_stats", [
            'license_key' => $license_key,
            'client_name' => $client_name,
            'tokens_used' => intval($deepl_stats['tokens_used']),
            'estimated_cost' => floatval($deepl_stats['estimated_cost']),
            'last_update' => current_time('mysql'),
        ]);

        if ($deepl_result === false) {
            error_log('[ROADPRESS] [API] Erreur dans la mise à jour des statistiques de DeepL : ' . $wpdb->last_error);
            return new WP_Error('db_error', 'Erreur dans la mise à jour des statistiques de DeepL', ['status' => 500]);
        }
        
        error_log('[ROADPRESS] [API] DeepL statistiques mises à jour : ' . print_r($deepl_stats, true));

        // Update OpenAI statistics
        $openai_result = $wpdb->replace("{$wpdb->prefix}license_openai_stats", [
            'license_key' => $license_key,
            'client_name' => $client_name,
            'tokens_used' => intval($openai_stats['tokens_used']),
            'estimated_cost' => floatval($openai_stats['estimated_cost']),
            'last_update' => current_time('mysql'),
        ]);

        if ($openai_result === false) {
            error_log('[ROADPRESS] [API] Erreur dans la mise à jour des statistiques d\'OpenAI : ' . $wpdb->last_error);
            return new WP_Error('db_error', 'Erreur de mise à jour des statistiques d\'OpenAI', ['status' => 500]);
        }
        
        error_log('[ROADPRESS] [API] Mise à jour des statistiques d\'OpenAI : ' . print_r($openai_stats, true));

        // Update monthly statistics
        self::update_monthly_stats($license_key, $client_name, $deepl_stats, $openai_stats);
        
        // Success response
        error_log('[ROADPRESS] [API] Les statistiques ont été mises à jour avec succès pour la licence : ' . $license_key);
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Statistics updated',
            'deepl_stats' => $deepl_stats,
            'openai_stats' => $openai_stats,
        ], 200);
    }
    
    /**
     * Update monthly API statistics
     * 
     * @param string $license_key License key
     * @param string $client_name Client name
     * @param array $deepl_stats DeepL statistics
     * @param array $openai_stats OpenAI statistics
     * @return bool Success status
     */
    private static function update_monthly_stats($license_key, $client_name, $deepl_stats, $openai_stats) {
        global $wpdb;
        
        // Get current month in YYYY-MM format
        $current_month = date('Y-m');
        
        // Update DeepL monthly statistics
        $deepl_monthly = $wpdb->replace(
            "{$wpdb->prefix}license_deepl_stats_monthly",
            [
                'license_key' => $license_key,
                'client_name' => $client_name,
                'stat_year_month' => $current_month,
                'tokens_used' => intval($deepl_stats['tokens_used']),
                'estimated_cost' => floatval($deepl_stats['estimated_cost']),
                'last_update' => current_time('mysql')
            ]
        );
        
        // Update OpenAI monthly statistics
        $openai_monthly = $wpdb->replace(
            "{$wpdb->prefix}license_openai_stats_monthly",
            [
                'license_key' => $license_key,
                'client_name' => $client_name,
                'stat_year_month' => $current_month,
                'tokens_used' => intval($openai_stats['tokens_used']),
                'estimated_cost' => floatval($openai_stats['estimated_cost']),
                'last_update' => current_time('mysql')
            ]
        );
        
        if ($deepl_monthly !== false && $openai_monthly !== false) {
            error_log('[ROADPRESS] [API] Mise à jour réussie des statistiques mensuelles');
            return true;
        } else {
            error_log('[ROADPRESS] [API] Erreur dans la mise à jour des statistiques mensuelles');
            return false;
        }
    }
}

// Initialize the OpenAI/DeepL API
RoadPress_OpenAI_DeepL_API::init();

// Legacy function for backward compatibility
function roadpress_update_api_stats_callback($request) {
    return RoadPress_OpenAI_DeepL_API::update_api_stats_callback($request);
}