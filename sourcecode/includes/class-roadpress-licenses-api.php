<?php
/**
 * License API handling class for RoadPress Admin
 * 
 * Manages API endpoints related to license verification and management
 */
class RoadPress_Licenses_API {
    
    /**
     * Initialize the licenses API
     */
    public static function init() {
        // Register REST API endpoints
        add_action('rest_api_init', [self::class, 'register_routes']);
    }
    
    /**
     * Register REST API routes for license verification
     */
    public static function register_routes() {
        register_rest_route('roadpress/v1', '/verify_license', [
            'methods' => ['POST', 'GET'],
            'callback' => [self::class, 'verify_license_callback'],
            'permission_callback' => '__return_true',
        ]);
        
        register_rest_route('roadpress/v1', '/update_license', [
            'methods' => 'POST',
            'callback' => [self::class, 'update_license_callback'],
            'permission_callback' => '__return_true',
        ]);
        
        register_rest_route('roadpress/v1', '/disassociate_license', [
            'methods' => 'POST',
            'callback' => [self::class, 'disassociate_license_callback'],
            'permission_callback' => '__return_true',
        ]);
    }
    
    /**
     * Callback for verifying a license
     * 
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response or error
     */
    public static function verify_license_callback($request) {
        global $wpdb;

        wp_cache_flush();
        
        error_log('Callback de vérification de la licence par le client');

        $license_key = sanitize_text_field($request['license_key']);
        $site_url = isset($request['site_url']) ? esc_url_raw($request['site_url']) : '';

        $table_name = $wpdb->prefix . 'licenses';
        $license = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE license_key = %s", $license_key));
        error_log('Résultat de la recherche de licence : ' . print_r($license, true));

        if ($license) {
            $current_date = date('Y-m-d');
            error_log('Date actuelle : ' . $current_date);
            error_log('Date de début de la licence : ' . $license->start_date);
            error_log('Date de fin de licence : ' . $license->end_date);

            if ($current_date >= $license->start_date && $current_date <= $license->end_date) {
                error_log('Licence valide');
                
                // Si une URL de site est fournie, mettre à jour l'association
                if (!empty($site_url)) {
                    error_log('Mise à jour de l\'URL du site pour la licence : ' . $site_url);
                    RoadPress_Database::update_license_site_url($license_key, $site_url);
                }
                
                return new WP_REST_Response([
                    'success' => true,
                    'message' => 'Licence valide',
                    'start_date' => $license->start_date,
                    'end_date' => $license->end_date,
                ], 200);
            } else {
                error_log('Licence expirée');
                // Mettre à jour le statut de la licence à 'expired' si nécessaire
                if ($license->status !== 'expired') {
                    $wpdb->update(
                        $table_name,
                        ['status' => 'expired', 'last_update' => current_time('mysql')],
                        ['license_key' => $license_key]
                    );
                }
                
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Licence expirée',
                ], 200);
            }
        }

        error_log('Clé de licence invalide');
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Clé de licence invalide',
        ], 404);
    }

    /**
     * Update license information from client site
     * 
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response|WP_Error Response or error
     */
    public static function update_license_callback($request) {
        global $wpdb;
        
        $license_key = sanitize_text_field($request['license_key']);
        $site_url = esc_url_raw($request['site_url']);
        
        // Data validation
        if (empty($license_key) || empty($site_url)) {
            return new WP_Error('missing_data', 'Données manquantes', ['status' => 400]);
        }
        
        // Check that the license exists
        $license = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}licenses WHERE license_key = %s",
            $license_key
        ));
        
        if (!$license) {
            return new WP_Error('invalid_license', 'Licence invalide', ['status' => 404]);
        }
        
        // Utiliser la méthode dédiée pour mettre à jour l'URL du site
        $result = RoadPress_Database::update_license_site_url($license_key, $site_url);
        
        if ($result) {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Licence mise à jour avec succès'
            ], 200);
        } else {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Échec de la mise à jour de la licence'
            ], 500);
        }
    }
    
    /**
     * Callback for disassociating a license from a client site
     * 
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response Response object
     */
    public static function disassociate_license_callback($request) {
        global $wpdb;
        
        $license_key = sanitize_text_field($request['license_key']);
        $table_name = $wpdb->prefix . 'licenses';
        
        // Update license to remove association
        $result = $wpdb->update(
            $table_name,
            [
                'is_associated' => 0,
                'site_url' => null,
                'last_update' => current_time('mysql')
            ],
            ['license_key' => $license_key]
        );
        
        if ($result !== false) {
            error_log('Licence dissociée avec succès : ' . $license_key);
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Licence dissociée avec succès'
            ], 200);
        } else {
            error_log('Échec de la dissociation de la licence : ' . $license_key);
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Échec de la dissociation de la licence'
            ], 500);
        }
    }
}

// Initialize the Licenses API
RoadPress_Licenses_API::init();

// Legacy function for backward compatibility
function roadpress_verify_license_callback($request) {
    return RoadPress_Licenses_API::verify_license_callback($request);
}