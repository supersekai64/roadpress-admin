<?php
/**
 * Legacy POI API Class
 */
class RoadPress_POI_API {
    
    /**
     * Initialize the POI API
     */
    public static function init() {
        // Legacy initialization code
    }
}

// Enregistrer les routes REST pour la synchronisation des POIs
function roadpress_register_poi_sync_routes() {
    register_rest_route('roadpress/v1', '/sync_pois', [
        'methods' => 'POST',
        'callback' => 'roadpress_sync_pois_callback',
        'permission_callback' => '__return_true',
    ]);
}
add_action('rest_api_init', 'roadpress_register_poi_sync_routes');

// Callback pour recevoir et stocker les POIs
function roadpress_sync_pois_callback($request) {
    global $wpdb;

    // Récupération des données
    $data = $request->get_json_params();
    error_log('[ROADPRESS] [POI] Données POI reçues de ' . $data['site_url']);

    // Vérification des données nécessaires
    if (!isset($data['license_key']) || !isset($data['pois']) || !isset($data['site_url']) || !isset($data['site_name'])) {
        error_log('[ROADPRESS] [POI] Erreur : Données POI incomplètes');
        return new WP_Error('invalid_data', 'Données incomplètes', ['status' => 400]);
    }

    // Sanitize les données
    $license_key = sanitize_text_field($data['license_key']);
    $site_url = esc_url_raw($data['site_url']);
    $site_name = sanitize_text_field($data['site_name']);
    $pois = $data['pois'];

    // Vérification de la licence
    $license = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}licenses WHERE license_key = %s",
        $license_key
    ));

    if (!$license) {
        error_log('[ROADPRESS] [POI] Erreur : Licence invalide pour la clé ' . $license_key);
        return new WP_Error('invalid_license', 'Licence invalide', ['status' => 404]);
    }

    $client_id = intval($license->id);
    error_log('[ROADPRESS] [POI] Client trouvé: ' . $license->client_name . ' (ID: ' . $client_id . ')');

    // Supprimer les POIs existants pour ce client pour éviter les doublons
    $wpdb->delete("{$wpdb->prefix}client_pois", ['client_id' => $client_id]);
    error_log('[ROADPRESS] [POI] Anciens POIs supprimés pour le client ID ' . $client_id);

    // Insérer les nouveaux POIs
    $count = 0;
    foreach ($pois as $poi) {
        $result = $wpdb->insert(
            "{$wpdb->prefix}client_pois",
            [
                'client_id' => $client_id,
                'license_key' => $license_key,
                'client_name' => $license->client_name,
                'site_url' => $site_url,
                'site_name' => $site_name,
                'poi_id' => $poi['id'],
                'name' => $poi['name'],
                'type' => $poi['type'],
                'address' => $poi['address'],
                'latitude' => $poi['latitude'],
                'longitude' => $poi['longitude'],
                'visit_count' => $poi['visit_count'],
                'season_data' => $poi['season_data'],
                'created_at' => $poi['created_at'],
                'updated_at' => $poi['updated_at'],
                'sync_date' => current_time('mysql')
            ]
        );
        if ($result) {
            $count++;
        }
    }

    error_log('[ROADPRESS] [POI] ' . $count . ' POIs ajoutés pour ' . $license->client_name);
    return new WP_REST_Response(['success' => true, 'message' => $count . ' POIs synchronisés'], 200);
}