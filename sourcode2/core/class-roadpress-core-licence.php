<?php

// Add an action to handle license form submission
add_action('admin_post_roadpress_verify_license', 'roadpress_verify_license');
function roadpress_verify_license() {
    if (!isset($_POST['roadpress_license_nonce']) || !wp_verify_nonce($_POST['roadpress_license_nonce'], 'roadpress_verify_license')) {
        $GLOBALS['roadpress_license_message'] = __('Erreur de sécurité lors de la vérification de la licence', 'roadpress');
        $GLOBALS['roadpress_license_is_error'] = true;
        roadpress_debug_log('[ROADPRESS] [LICENCE] Échec de vérification du nonce');
        return;
    }

    // Retrieve the license key and site URL
    $license_key = sanitize_text_field($_POST['license_key']);
    $site_url = esc_url(home_url()); // URL of the client site

    //roadpress_debug_log('[ROADPRESS] [LICENCE] Tentative de vérification de la licence : ' . $license_key . ' pour le site: ' . $site_url);

    // Check that the license key is filled in
    if (empty($license_key)) {
        $GLOBALS['roadpress_license_message'] = __('Veuillez entrer une clé de licence', 'roadpress');
        $GLOBALS['roadpress_license_is_error'] = true;
        roadpress_debug_log('[ROADPRESS] [LICENCE] Clé de licence vide');
        return;
    }

    // Send a request to the REST API to verify the license
    roadpress_debug_log('[ROADPRESS] [LICENCE] Envoi de la requête de vérification à l\'API');
    $response = roadpress_api_get('verify_license', [
        'license_key' => $license_key,
    ]);

    // Handle request errors
    if (is_wp_error($response)) {
        $GLOBALS['roadpress_license_message'] = __('La vérification de la licence a échoué. Veuillez réessayer plus tard.', 'roadpress');
        $GLOBALS['roadpress_license_is_error'] = true;
        roadpress_debug_log('[ROADPRESS] [LICENCE] Erreur de requête : ' . $response->get_error_message());
        return;
    }

    // Process the API response
    $body = wp_remote_retrieve_body($response);
    $status_code = wp_remote_retrieve_response_code($response);
    //roadpress_debug_log('[ROADPRESS] [LICENCE] Réponse API (status code: ' . $status_code . '): ' . $body);
    
    // Clean up the response body to remove PHP notices
    $clean_body = preg_replace('/<br\s*\/?>.*?{/is', '{', $body);
    //roadpress_debug_log('[ROADPRESS] [LICENCE] Réponse nettoyée : ' . $clean_body);
    
    $data = json_decode($clean_body, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        roadpress_debug_log('[ROADPRESS] [LICENCE] Erreur de décodage JSON : ' . json_last_error_msg());
        
        // Additional recovery attempt
        if (preg_match('/{.*}/s', $body, $matches)) {
            roadpress_debug_log('[ROADPRESS] [LICENCE] Tentative de récupération du JSON valide');
            $data = json_decode($matches[0], true);
        }
    }

    if (isset($data['success']) && $data['success']) {
        roadpress_debug_log('[ROADPRESS] [LICENCE] Licence validée avec succès');
        
        // Update license key
        update_option('roadpress_license_key', $license_key);
        
        // Store API token if provided
        if (isset($data['api_token'])) {
            update_option('roadpress_api_token', $data['api_token']);
            roadpress_debug_log('[ROADPRESS] [LICENCE] Token API stocké avec succès');
        }
        
        // Also update license status
        update_option('roadpress_license_status', 'valid');
        roadpress_debug_log('[ROADPRESS] [LICENCE] Option roadpress_license_status mise à jour : valid');

        // Send a POST request to the server to update license information
        $update_response = roadpress_api_post('update_license', [
            'license_key' => $license_key,
            'site_url'    => $site_url,
        ]);

        if (is_wp_error($update_response)) {
            roadpress_debug_log('[ROADPRESS] [LICENCE] Erreur lors de la mise à jour de la licence sur le serveur distant : ' . $update_response->get_error_message());
        } else {
            roadpress_debug_log('[ROADPRESS] [LICENCE] Mise à jour de la licence sur le serveur - Code HTTP : ' . wp_remote_retrieve_response_code($update_response));
        }

        // Fetch API keys after successful license activation
        roadpress_debug_log('[ROADPRESS] [LICENCE] Récupération des clés API');
        $api_key_response = roadpress_fetch_api_keys();

        $GLOBALS['roadpress_license_message'] = __('Licence vérifiée avec succès', 'roadpress');
        $GLOBALS['roadpress_license_is_error'] = false;
    } else {
        roadpress_debug_log('[ROADPRESS] [LICENCE] Échec de validation de la licence : ' . (isset($data['message']) ? $data['message'] : 'Raison inconnue'));
        
        // Update status as invalid
        update_option('roadpress_license_status', 'invalid');
        roadpress_debug_log('[ROADPRESS] [LICENCE] Option roadpress_license_status mise à jour : invalid');
        
        $GLOBALS['roadpress_license_message'] = __('La clé de licence est invalide', 'roadpress');
        $GLOBALS['roadpress_license_is_error'] = true;
    }
}

// Add a REST API route to disassociate a license
add_action('rest_api_init', function () {
	register_rest_route('roadpress/v1', '/disassociate_license', [
		'methods' => 'POST',
		'callback' => 'roadpress_disassociate_license',
		'permission_callback' => '__return_true'
	]);
});

// Callback to disassociate the license on the client side
function roadpress_disassociate_license($request) {
	$license_key = sanitize_text_field($request['license_key']);

    // Check that the license key is filled in
	if (empty($license_key)) {
		return new WP_REST_Response([
			'success' => false,
			'message' => __('Clé de licence manquante', 'roadpress')
		], 400);
	}

	// Retrieve the stored license key
	$stored_license_key = get_option('roadpress_license_key');

	// Check if the license matches the stored one and disassociate it
	if ($stored_license_key === $license_key) {
		delete_option('roadpress_license_key');
		return new WP_REST_Response([
			'success' => true,
			'message' => __('Licence désassociée avec succès', 'roadpress')
		], 200);
	}

	return new WP_REST_Response([
		'success' => false,
		'message' => __('Clé de licence invalide', 'roadpress')
	], 400);
}

?>