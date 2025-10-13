<?php

// Ensure the required flow functions are available
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-flow.php';

// Processes POIs asynchronously via WordPress Cron
function roadpress_process_pois_async($roadpress_id) {
    roadpress_debug_log('[ROADPRESS] [POI] [ASYNC] Début du traitement pour le livret ' . $roadpress_id);
    
    // Check if booklet ID is present
    if (empty($roadpress_id)) {
        roadpress_debug_log('[ROADPRESS] [POI] [ASYNC] Erreur : ID du livret manquant');
        return false;
    }
    
    // Recover complete data stored in the
    $cron_data = get_option('roadpress_cron_data_' . $roadpress_id);
    if (empty($cron_data)) {
        roadpress_debug_log('[ROADPRESS] [POI] [ASYNC] Erreur : Données du cron non trouvées pour le livret ' . $roadpress_id);
        return false;
    }
    
    $post_ids = isset($cron_data['post_ids']) ? $cron_data['post_ids'] : [];
    $playlist_ids = isset($cron_data['playlist_ids']) ? $cron_data['playlist_ids'] : [];
    $qualification_data = isset($cron_data['qualification_data']) ? $cron_data['qualification_data'] : [];
    
    if (empty($post_ids) && empty($playlist_ids)) {
        roadpress_debug_log('[ROADPRESS] [POI] [ASYNC] Erreur : Aucun post ou playlist spécifié pour le livret ' . $roadpress_id);
        return false;
    }
    
    roadpress_debug_log('[ROADPRESS] [POI] [ASYNC] Début extraction asynchrone pour le livret ' . $roadpress_id);
    
    // POI extraction
    $poi_data = roadpress_extract_pois_from_posts($post_ids, $playlist_ids);
    roadpress_debug_log('[ROADPRESS] [POI] [ASYNC] Données POI extraites : ' . count($poi_data));
    
    // POI processing and registration
    if (!empty($poi_data)) {
        $result = roadpress_process_pois_for_booklet($poi_data, $roadpress_id, $qualification_data);
        roadpress_debug_log('[ROADPRESS] [POI] [ASYNC] Traitement POIs terminé : ' . ($result ? 'Succès' : 'Échec'));
        
        // Cleaning the option after use
        delete_option('roadpress_cron_data_' . $roadpress_id);
        
        return $result;
    } else {
        roadpress_debug_log('[ROADPRESS] [POI] [ASYNC] Aucune donnée POI à traiter');
        
        // Cleaning the option after use
        delete_option('roadpress_cron_data_' . $roadpress_id);
        
        return false;
    }
}
add_action('roadpress_process_pois_event', 'roadpress_process_pois_async');

// Function to obtain the country according to the area code
function get_country_from_phone($phone_number) {
	$phone_prefixes = [
		'+355' 	=> 'Albania', 
		'+213' 	=> 'Algeria', 
		'+1684' => 'American Samoa', 
		'+376' 	=> 'Andorra', 
		'+244' 	=> 'Angola', 
		'+1264' => 'Anguilla', 
		'+1268' => 'Antigua and Barbuda', 
		'+54'	=> 'Argentina', 
		'+374' 	=> 'Armenia', 
		'+297' 	=> 'Aruba', 
		'+61' 	=> 'Australia', 
		'+43' 	=> 'Austria', 
		'+994' 	=> 'Azerbaijan', 
		'+1242' => 'Bahamas', 
		'+973' 	=> 'Bahrain', 
		'+880' 	=> 'Bangladesh', 
		'+1246' => 'Barbados', 
		'+375' 	=> 'Belarus', 
		'+32' 	=> 'Belgium', 
		'+501' 	=> 'Belize', 
		'+229' 	=> 'Benin', 
		'+1441' => 'Bermuda', 
		'+975' 	=> 'Bhutan', 
		'+591' 	=> 'Bolivia', 
		'+387' 	=> 'Bosnia and Herzegovina', 
		'+267' 	=> 'Botswana', 
		'+55' 	=> 'Brazil', 
		'+673' 	=> 'Brunei', 
		'+359' 	=> 'Bulgaria', 
		'+226' 	=> 'Burkina Faso', 
		'+855' 	=> 'Cambodia', 
		'+237' 	=> 'Cameroon', 
		'+1204' => 'Canada', 
		'+1236' => 'Canada', 
		'+1416' => 'Canada', 
		'+1514' => 'Canada', 
		'+1604' => 'Canada', 
		'+1780' => 'Canada', 
		'+1819' => 'Canada', 
		'+1902' => 'Canada', 
		'+1905' => 'Canada', 
		'+1867' => 'Canada', 
		'+1345' => 'Cayman Islands', 
		'+235' 	=> 'Chad', 
		'+56' 	=> 'Chile', 
		'+86' 	=> 'China', 
		'+57' 	=> 'Colombia', 
		'+269' 	=> 'Comoros', 
		'+243' 	=> 'Congo (Dem. Rep.)', 
		'+682' 	=> 'Cook Islands', 
		'+506' 	=> 'Costa Rica', 
		'+385' 	=> 'Croatia', 
		'+357' 	=> 'Cyprus', 
		'+420' 	=> 'Czech Republic', 
		'+45' 	=> 'Denmark', 
		'+253' 	=> 'Djibouti', 
		'+1767' => 'Dominica', 
		'+1809' => 'Dominican Republic', 
		'+1829' => 'Dominican Republic', 
		'+1849' => 'Dominican Republic', 
		'+670' 	=> 'East Timor', 
		'+593' 	=> 'Ecuador', 
		'+20' 	=> 'Egypt', 
		'+503' 	=> 'El Salvador', 
		'+240' 	=> 'Equatorial Guinea', 
		'+372' 	=> 'Estonia', 
		'+268' 	=> 'Eswatini', 
		'+251' 	=> 'Ethiopia', 
		'+298' 	=> 'Faroe Islands', 
		'+679' 	=> 'Fiji', 
		'+358' 	=> 'Finland', 
		'+33' 	=> 'France', 
		'+594' 	=> 'French Guiana', 
		'+689' 	=> 'French Polynesia', 
		'+262' 	=> 'French Southern Territories', 
		'+241' 	=> 'Gabon', 
		'+220' 	=> 'Gambia', 
		'+995' 	=> 'Georgia', 
		'+49' 	=> 'Germany', 
		'+233' 	=> 'Ghana', 
		'+350' 	=> 'Gibraltar', 
		'+30' 	=> 'Greece', 
		'+299' 	=> 'Greenland', 
		'+1473' => 'Grenada', 
		'+590' 	=> 'Guadeloupe', 
		'+1671' => 'Guam', 
		'+502' 	=> 'Guatemala', 
		'+245' 	=> 'Guinea-Bissau', 
		'+592' 	=> 'Guyana', 
		'+509' 	=> 'Haiti', 
		'+504' 	=> 'Honduras', 
		'+852' 	=> 'Hong Kong', 
		'+36' 	=> 'Hungary', 
		'+354' 	=> 'Iceland', 
		'+91' 	=> 'India', 
		'+62' 	=> 'Indonesia', 
		'+353' 	=> 'Ireland', 
		'+972' 	=> 'Israel', 
		'+39' 	=> 'Italy', 
		'+225' 	=> 'Ivory Coast', 
		'+1876' => 'Jamaica', 
		'+81' 	=> 'Japan', 
		'+962'	=> 'Jordan', 
		'+254' 	=> 'Kenya', 
		'+383' 	=> 'Kosovo', 
		'+965' 	=> 'Kuwait', 
		'+996' 	=> 'Kyrgyzstan', 
		'+856' 	=> 'Laos', 
		'+371' 	=> 'Latvia', 
		'+961' 	=> 'Lebanon', 
		'+266' 	=> 'Lesotho', 
		'+231' 	=> 'Liberia', 
		'+423' 	=> 'Liechtenstein', 
		'+370' 	=> 'Lithuania', 
		'+352' 	=> 'Luxembourg', 
		'+853' 	=> 'Macau', 
		'+389' 	=> 'Macedonia', 
		'+261' 	=> 'Madagascar', 
		'+265' 	=> 'Malawi', 
		'+60' 	=> 'Malaysia', 
		'+960' 	=> 'Maldives', 
		'+223' 	=> 'Mali', 
		'+356' 	=> 'Malta', 
		'+596' 	=> 'Martinique', 
		'+222' 	=> 'Mauritania', 
		'+230' 	=> 'Mauritius', 
		'+262' 	=> 'Mayotte/La Réunion', 
		'+52' 	=> 'Mexico', 
		'+373' 	=> 'Moldova', 
		'+377' 	=> 'Monaco', 
		'+976' 	=> 'Mongolia', 
		'+382' 	=> 'Montenegro', 
		'+1664' => 'Montserrat', 
		'+212' 	=> 'Morocco', 
		'+258' 	=> 'Mozambique', 
		'+95' 	=> 'Myanmar', 
		'+264' 	=> 'Namibia', 
		'+674' 	=> 'Nauru', 
		'+977' 	=> 'Nepal', 
		'+31' 	=> 'Netherlands', 
		'+687' 	=> 'New Caledonia', 
		'+64' 	=> 'New Zealand', 
		'+505' 	=> 'Nicaragua', 
		'+227' 	=> 'Niger', 
		'+234' 	=> 'Nigeria', 
		'+47' 	=> 'Norway', 
		'+968' 	=> 'Oman', 
		'+92' 	=> 'Pakistan', 
		'+680' 	=> 'Palau', 
		'+970' 	=> 'Palestinian Territory', 
		'+507' 	=> 'Panama', 
		'+675' 	=> 'Papua New Guinea', 
		'+595' 	=> 'Paraguay', 
		'+51' 	=> 'Peru', 
		'+63' 	=> 'Philippines', 
		'+48' 	=> 'Poland', 
		'+351' 	=> 'Portugal', 
		'+1787' => 'Puerto Rico', 
		'+1939' => 'Puerto Rico', 
		'+974' 	=> 'Qatar', 
		'+262' 	=> 'Reunion', 
		'+40' 	=> 'Romania', 
		'+7' 	=> 'Russia', 
		'+250' 	=> 'Rwanda', 
		'+590' 	=> 'Saint Barthelemy', 
		'+1869' => 'Saint Kitts and Nevis', 
		'+1758' => 'Saint Lucia', 
		'+508' 	=> 'Saint Pierre and Miquelon', 
		'+1784' => 'Saint Vincent and The Grenadines', 
		'+685' 	=> 'Samoa', 
		'+378' 	=> 'San Marino', 
		'+966' 	=> 'Saudi Arabia', 
		'+221' 	=> 'Senegal', 
		'+381' 	=> 'Serbia', 
		'+248' 	=> 'Seychelles', 
		'+232' 	=> 'Sierra Leone', 
		'+65' 	=> 'Singapore', 
		'+421' 	=> 'Slovakia', 
		'+386' 	=> 'Slovenia', 
		'+27' 	=> 'South Africa', 
		'+82' 	=> 'South Korea', 
		'+211' 	=> 'South Sudan', 
		'+34' 	=> 'Spain', 
		'+94' 	=> 'Sri Lanka', 
		'+597' 	=> 'Suriname', 
		'+46' 	=> 'Sweden', 
		'+41' 	=> 'Switzerland', 
		'+886' 	=> 'Taiwan', 
		'+992' 	=> 'Tajikistan', 
		'+255' 	=> 'Tanzania', 
		'+66' 	=> 'Thailand', 
		'+228' 	=> 'Togo', 
		'+676' 	=> 'Tonga', 
		'+1868' => 'Trinidad and Tobago', 
		'+216' 	=> 'Tunisia', 
		'+90' 	=> 'Turkey', 
		'+993'	=> 'Turkmenistan', 
		'+1649' => 'Turks and Caicos Islands', 
		'+256' 	=> 'Uganda', 
		'+380' 	=> 'Ukraine', 
		'+971' 	=> 'United Arab Emirates', 
		'+44' 	=> 'United Kingdom', 
		'+1202' => 'United States', 
		'+1212' => 'United States', 
		'+1310' => 'United States', 
		'+1415' => 'United States', 
		'+1503' => 'United States', 
		'+1602' => 'United States', 
		'+1703' => 'United States', 
		'+1801' => 'United States', 
		'+1904' => 'United States', 
		'+598' 	=> 'Uruguay', 
		'+998' 	=> 'Uzbekistan', 
		'+678' 	=> 'Vanuatu', 
		'+84' 	=> 'Vietnam', 
		'+1284' => 'Virgin Islands, British', 
		'+1340' => 'Virgin Islands, US', 
		'+681' 	=> 'Wallis and Futuna', 
		'+260' 	=> 'Zambia'
	];
		
	// Sort prefixes from longest to shortest
	uksort($phone_prefixes, function($a, $b) {
		return strlen($b) - strlen($a);
	});

	// Find the longest corresponding area code
	foreach ($phone_prefixes as $prefix => $country) {
		if (strpos($phone_number, $prefix) === 0) {
			return $country;
		}
	}
	
	return null;
}

// Check the license status
function roadpress_is_license_valid() {
    $license_key = get_option('roadpress_license_key');
    roadpress_debug_log('[ROADPRESS] [LICENSE] Vérification licence avec clé: ' . ($license_key ? 'présente' : 'absente'));

    if (empty($license_key)) {
        return false;
    }

    $response = roadpress_api_get('verify_license', [
        'license_key' => $license_key,
    ]);

    $license_info = roadpress_parse_api_response($response);
    
    if (!$license_info) {
        return false;
    }

    $result = isset($license_info['success']) && $license_info['success'];
    roadpress_debug_log('[ROADPRESS] [LICENSE] Résultat validation: ' . ($result ? 'valide' : 'invalide'));

    // Update status option if necessary
    update_option('roadpress_license_status', $result ? 'valid' : 'invalid');

    return $result;
}

// Send email and SMS statistics to the admin plugin
function roadpress_send_stats_to_server() {
    global $wpdb;
    $license_key = get_option('roadpress_license_key');

    if (!roadpress_is_license_valid()) {
        roadpress_debug_log('[ROADPRESS] [API] Licence invalide');
        return;
    }

    $email_stats = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}roadpress_booklet WHERE sent_email = 1");

    if ($email_stats === null) {
        roadpress_debug_log('[ROADPRESS] [API] Erreur : Impossible de récupérer les statistiques des emails');
    } elseif ($email_stats === '0') {
        roadpress_debug_log('[ROADPRESS] [API] Aucune statistique E-mail trouvée');
    } else {
        roadpress_debug_log("[ROADPRESS] [API] Statistiques E-mails récupérées avec succès : $email_stats email(s) envoyé(s)");
    }
    
    $sms_stats = $wpdb->get_results("
        SELECT qualification.phone, COUNT(*) as sms_count
        FROM {$wpdb->prefix}roadpress_booklet r
        JOIN {$wpdb->prefix}roadpress_qualification qualification
        ON r.roadpress_id = qualification.roadpress_id
        WHERE r.sent_sms = 1
        GROUP BY qualification.phone
    ", ARRAY_A);

    if (empty($sms_stats)) {
        roadpress_debug_log('[ROADPRESS] [API] Aucune statistique SMS trouvée');
        $sms_stats_final = [];
    } else {
        $grouped_sms_stats = [];
        foreach ($sms_stats as $stat) {
            $country = get_country_from_phone($stat['phone']);
            if (!$country) {
                continue;
            }

            if (!isset($grouped_sms_stats[$country])) {
                $grouped_sms_stats[$country] = 0;
            }

            $grouped_sms_stats[$country] += $stat['sms_count'];
        }

        $sms_stats_final = [];
        foreach ($grouped_sms_stats as $country => $sms_count) {
            $sms_stats_final[] = [
                'country' => $country,
                'sms_count' => $sms_count,
            ];
        }

        roadpress_debug_log('[ROADPRESS] [API] Statistiques SMS (regroupées par pays) : ' . print_r($sms_stats_final, true));
    }

    $data = [
        'license_key' => $license_key,
        'email_stats' => $email_stats,
        'sms_stats' => $sms_stats_final,
    ];

    //roadpress_debug_log('[ROADPRESS] [API] Données envoyées pour les statistiques : ' . print_r($data, true));

    $response = roadpress_api_post('update_stats', $data);

    if (is_wp_error($response)) {
        roadpress_debug_log('[ROADPRESS] [API] Erreur lors de l\'envoi des statistiques : ' . $response->get_error_message());
    } else {
        $body = wp_remote_retrieve_body($response);
        $response_code = wp_remote_retrieve_response_code($response);
    
        // Clean up the response body to remove PHP notices
        $clean_body = preg_replace('/<br\s*\/?>.*?{/is', '{', $body);
        roadpress_debug_log('[ROADPRESS] [API] Réponse nettoyée pour les statistiques : ' . $clean_body);
        
        $decoded_body = json_decode($clean_body, true);
    
        if (json_last_error() !== JSON_ERROR_NONE) {
            roadpress_debug_log('[ROADPRESS] [API] Erreur JSON : ' . json_last_error_msg());
            
            // Additional recovery attempt
            if (preg_match('/{.*}/s', $body, $matches)) {
                roadpress_debug_log('[ROADPRESS] [API] Tentative de récupération du JSON valide');
                $decoded_body = json_decode($matches[0], true);
            }
        }
        
        if (json_last_error() === JSON_ERROR_NONE) {
            $formatted_body = json_encode($decoded_body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            roadpress_debug_log('[ROADPRESS] [API] Réponse du serveur pour les statistiques : ' . PHP_EOL . $formatted_body);
        } else {
            roadpress_debug_log('[ROADPRESS] [API] Réponse brute du serveur pour les statistiques : ' . $body);
        }
    
        if ($response_code >= 200 && $response_code < 300) {
            roadpress_debug_log('[ROADPRESS] [API] Statistiques envoyées avec succès');
        } else {
            roadpress_debug_log('[ROADPRESS] [API] Erreur statistiques : Réponse inattendue du serveur avec le code HTTP ' . $response_code);
        }
    }
}

// Send email and SMS logs to the admin plugin
function roadpress_send_logs_to_server() {
    global $wpdb;
    $license_key = get_option('roadpress_license_key');

    roadpress_debug_log('[ROADPRESS] [API] Début de roadpress_send_logs_to_server');

    if (!roadpress_is_license_valid()) {
        roadpress_debug_log('[ROADPRESS] [API] Licence invalide');
        return;
    }

    $email_logs = $wpdb->get_results("
        SELECT created_at AS send_date
        FROM {$wpdb->prefix}roadpress_booklet
        WHERE sent_email = 1
    ", ARRAY_A);
    roadpress_debug_log('[ROADPRESS] [API] Logs E-mails : ' . print_r($email_logs, true));

    $sms_logs = $wpdb->get_results("
        SELECT qualification.phone AS phone, r.created_at AS send_date
        FROM {$wpdb->prefix}roadpress_booklet r
        JOIN {$wpdb->prefix}roadpress_qualification qualification
        ON r.roadpress_id = qualification.roadpress_id
        WHERE r.sent_sms = 1
    ", ARRAY_A);

    foreach ($sms_logs as &$log) {
        $log['country'] = get_country_from_phone($log['phone']);
    }
    roadpress_debug_log('[ROADPRESS] [API] Logs SMS : ' . print_r($sms_logs, true));

    $data = [
        'license_key' => $license_key,
        'email_logs' => $email_logs,
        'sms_logs' => $sms_logs
    ];

    //roadpress_debug_log('[ROADPRESS] [API] Données envoyées pour les logs : ' . print_r($data, true));

    $response = roadpress_api_post('update_logs', $data);

    if (is_wp_error($response)) {
        roadpress_debug_log('[ROADPRESS] [API] Erreur lors de l\'envoi des logs : ' . $response->get_error_message());
    } else {
        $body = wp_remote_retrieve_body($response);
        $response_code = wp_remote_retrieve_response_code($response);
    
        // Clean up the response body to remove PHP notices
        $clean_body = preg_replace('/<br\s*\/?>.*?{/is', '{', $body);
        roadpress_debug_log('[ROADPRESS] [API] Réponse nettoyée pour les logs : ' . $clean_body);
        
        $decoded_body = json_decode($clean_body, true);
    
        if (json_last_error() !== JSON_ERROR_NONE) {
            roadpress_debug_log('[ROADPRESS] [API] Erreur JSON : ' . json_last_error_msg());
            
            // Additional recovery attempt
            if (preg_match('/{.*}/s', $body, $matches)) {
                roadpress_debug_log('[ROADPRESS] [API] Tentative de récupération du JSON valide');
                $decoded_body = json_decode($matches[0], true);
            }
        }
        
        if (json_last_error() === JSON_ERROR_NONE) {
            $formatted_body = json_encode($decoded_body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            roadpress_debug_log('[ROADPRESS] [API] Réponse du serveur pour les logs : ' . PHP_EOL . $formatted_body);
        } else {
            roadpress_debug_log('[ROADPRESS] [API] Réponse brute du serveur pour les logs : ' . $body);
        }
    
        if ($response_code >= 200 && $response_code < 300) {
            roadpress_debug_log('[ROADPRESS] [API] Logs envoyées avec succès');
        } else {
            roadpress_debug_log('[ROADPRESS] [API] Erreur logs : Réponse inattendue du serveur avec le code HTTP ' . $response_code);
        }
    }
}

// Send API statistics to the admin plugin
function roadpress_send_api_stats_to_server() {
    global $wpdb;
    $license_key = get_option('roadpress_license_key');

    roadpress_debug_log('[ROADPRESS] Début de roadpress_send_api_stats_to_server');

    if (!roadpress_is_license_valid()) {
        roadpress_debug_log('[ROADPRESS] [API] Licence invalide');
        return;
    }

    // Recovering Deepl and OpenAI tokens
    $api_stats = $wpdb->get_results("
        SELECT SUM(token_deepl) as total_deepl, SUM(token_ai) as total_openai
        FROM {$wpdb->prefix}roadpress_booklet
    ", ARRAY_A);

   if (empty($api_stats)) {
        roadpress_debug_log('[ROADPRESS] [API] Aucune statistique d\'API trouvée');
        return;
    } else {
        roadpress_debug_log('[ROADPRESS] [API] Statistiques récupérées : ' . print_r($api_stats, true));
    }

    $deepl_tokens = intval($api_stats[0]['total_deepl']);
    $openai_tokens = intval($api_stats[0]['total_openai']);

    // Approximate cost calculation
    $deepl_cost = $deepl_tokens * 0.00002; // $20 per 1,000,000 tokens
    $openai_cost = $openai_tokens * 0.000000285; // $0,285 per 1,000,000 tokens (70% input, 30% output)

    $data = [
        'license_key' => $license_key,
        'deepl_stats' => [
            'tokens_used' => $deepl_tokens,
            'estimated_cost' => $deepl_cost,
        ],
        'openai_stats' => [
            'tokens_used' => $openai_tokens,
            'estimated_cost' => $openai_cost,
        ],
    ];

    //roadpress_debug_log('[ROADPRESS] [API] Données préparées pour l\'envoi (Statistiques API) : ' . print_r($data, true));

    $response = roadpress_api_post('update_api_usage', $data);

    if (is_wp_error($response)) {
        roadpress_debug_log('[ROADPRESS] [API] Erreur lors de l\'envoi des statistiques : ' . $response->get_error_message());
    } else {
        $body = wp_remote_retrieve_body($response);
        $response_code = wp_remote_retrieve_response_code($response);

        // Clean the response body to remove PHP notices
        $clean_body = preg_replace('/<br\s*\/?>.*?{/is', '{', $body);
        roadpress_debug_log('[ROADPRESS] [API] Réponse nettoyée pour les statistiques API : ' . $clean_body);
        
        $decoded_body = json_decode($clean_body, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            roadpress_debug_log('[ROADPRESS] [API] Erreur JSON : ' . json_last_error_msg());
            
            // Additional recovery attempt
            if (preg_match('/{.*}/s', $body, $matches)) {
                roadpress_debug_log('[ROADPRESS] [API] Tentative de récupération du JSON valide');
                $decoded_body = json_decode($matches[0], true);
            }
        }
        
        if (json_last_error() === JSON_ERROR_NONE) {
            roadpress_debug_log('[ROADPRESS] [API] Réponse formatée : ' . print_r($decoded_body, true));
        } else {
            roadpress_debug_log('[ROADPRESS] [API] Réponse brute : ' . $body);
        }

        if ($response_code >= 200 && $response_code < 300) {
           roadpress_debug_log('[ROADPRESS] [API] Statistiques API envoyées avec succès');
        } else {
            roadpress_debug_log('[ROADPRESS] [API] Erreur API : Code HTTP ' . $response_code);
        }
    }
}

// Schedule the sending of Deepl / OpenAI usage to the API every hour
function roadpress_schedule_api_stats_send() {
    if (!wp_next_scheduled('roadpress_send_api_stats_event')) {
        wp_schedule_event(time(), 'hourly', 'roadpress_send_api_stats_event');
    }
}
add_action('rest_api_init', 'roadpress_schedule_api_stats_send');
add_action('roadpress_send_api_stats_event', 'roadpress_send_api_stats_to_server');


// Schedule the sending of logs to the API every hour
function roadpress_schedule_logs_send() {
	if (!wp_next_scheduled('roadpress_send_logs_event')) {
		wp_schedule_event(time(), 'hourly', 'roadpress_send_logs_event');
	}
}
add_action('init', 'roadpress_schedule_logs_send');

// Schedule the sending of stats to the API every hour
function roadpress_schedule_stats_send() {
	if (!wp_next_scheduled('roadpress_send_stats_event')) {
		wp_schedule_event(time(), 'hourly', 'roadpress_send_stats_event');
	}
}
add_action('init', 'roadpress_schedule_stats_send');

// Function to send logs via the cron event
function roadpress_send_logs_cron() {
	roadpress_send_logs_to_server();
}
add_action('roadpress_send_logs_event', 'roadpress_send_logs_cron');

// Function to send stats via the cron event
function roadpress_send_stats_cron() {
	roadpress_send_stats_to_server();
}
add_action('roadpress_send_stats_event', 'roadpress_send_stats_cron');

// Add a REST API route to manually send logs from the admin side
function roadpress_send_logs_callback($request) {
    roadpress_debug_log('[ROADPRESS] [API] Callback roadpress_send_logs_callback appelé');
    return new WP_REST_Response(['success' => true, 'message' => 'Logs envoyés'], 200);
}

// Add a REST API route to manually send stats from the admin side
function roadpress_send_stats_callback($request) {
    roadpress_debug_log('[ROADPRESS] [API] Callback roadpress_send_stats_callback appelé');
    return new WP_REST_Response(['success' => true, 'message' => 'Statistiques envoyées'], 200);
}

// Add a REST API route to manually send API usage from the admin side
function roadpress_send_api_usage_callback($request) {
    roadpress_debug_log('[ROADPRESS] [API] Callback roadpress_send_api_usage_callback appelé');
    return new WP_REST_Response(['success' => true, 'message' => 'API usage envoyés'], 200);
}

// Schedule a daily license check
function roadpress_schedule_license_check() {
	if (!wp_next_scheduled('roadpress_daily_license_check')) {
		wp_schedule_event(time(), 'daily', 'roadpress_daily_license_check');
	}
}
add_action('roadpress_daily_license_check', 'roadpress_check_license_status');

// Check the license status daily
function roadpress_check_license_status() {
    $license_key = get_option('roadpress_license_key');

    if (!$license_key) {
        roadpress_debug_log('[ROADPRESS] [API] Clé de licence non trouvée. Vérification de la licence annulée.');
        return;
    }

    $api_url = 'https://admin.roadpress.fr/wp-json/roadpress/v1/verify_license';
    $response = wp_remote_post($api_url, [
        'body' => json_encode(['license_key' => $license_key]),
        'headers' => ['Content-Type' => 'application/json'],
    ]);

    if (is_wp_error($response)) {
        roadpress_debug_log('[ROADPRESS] [API] Erreur lors de la vérification de la licence : ' . $response->get_error_message());
        return;
    }

    $body = wp_remote_retrieve_body($response);
    $response_code = wp_remote_retrieve_response_code($response);

    // Added cleaning of PHP notices
    $clean_body = preg_replace('/<br\s*\/?>.*?{/is', '{', $body);
    roadpress_debug_log('[ROADPRESS] [API] Réponse nettoyée pour la vérification de licence : ' . $clean_body);
    
    $decoded_body = json_decode($clean_body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        roadpress_debug_log('[ROADPRESS] [API] Erreur JSON : ' . json_last_error_msg());
        
        // Additional recovery attempt
        if (preg_match('/{.*}/s', $body, $matches)) {
            roadpress_debug_log('[ROADPRESS] [API] Tentative de récupération du JSON valide');
            $decoded_body = json_decode($matches[0], true);
        }
    }

    if (json_last_error() === JSON_ERROR_NONE) {
        $formatted_body = json_encode($decoded_body, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        roadpress_debug_log('[ROADPRESS] [API] Réponse du serveur pour la vérification de la licence : ' . PHP_EOL . $formatted_body);

        if (isset($decoded_body['success']) && $decoded_body['success']) {
            update_option('roadpress_license_status', 'valid');
            roadpress_debug_log('[ROADPRESS] [API] Licence valide. Statut mis à jour avec succès');
        } else {
            update_option('roadpress_license_status', 'invalid');
            roadpress_debug_log('[ROADPRESS] [API] Licence invalide. Statut mis à jour comme invalide');
        }
    } else {
        roadpress_debug_log('[ROADPRESS] [API] Réponse non valide du serveur : ' . $body);
        roadpress_debug_log('[ROADPRESS] [API] Erreur JSON : ' . json_last_error_msg());
    }

    if ($response_code >= 200 && $response_code < 300) {
        roadpress_debug_log('[ROADPRESS] [API] Vérification de la licence réussie avec le code HTTP ' . $response_code);
    } else {
        roadpress_debug_log('[ROADPRESS] [API] Vérification de la licence échouée avec le code HTTP ' . $response_code);
    }
}

// Clear the daily license check when deactivating
function roadpress_clear_license_check() {
	wp_clear_scheduled_hook('roadpress_daily_license_check');
}

// Fetch API keys from the server
function roadpress_fetch_api_keys() {
  
    $license_key = get_option('roadpress_license_key');
    //roadpress_debug_log('[ROADPRESS] [API] Clé de licence récupérée : ' . ($license_key ? $license_key : 'Non définie'));

    if (!roadpress_is_license_valid()) {
        roadpress_debug_log('[ROADPRESS] [API] Licence invalide lors de la tentative de récupération des clés API');
        return new WP_REST_Response(['success' => false, 'message' => 'Licence invalide'], 403);
    }

    $response = roadpress_api_get('provide_api_keys', [
        'license_key' => $license_key,
    ]);

    $result = roadpress_parse_api_response($response);
    
    if (!$result || !isset($result['success']) || !$result['success']) {
        roadpress_debug_log('[ROADPRESS] [API] Erreur lors de la récupération des clés API');
        return new WP_REST_Response(['success' => false, 'message' => 'Erreur lors de la récupération des clés API'], 500);
    }

    $api_keys = isset($result['api_keys']) ? $result['api_keys'] : [];

    if (isset($api_keys['deepl_api_key'])) {
        update_option('roadpress_deepl_api_key', sanitize_text_field($api_keys['deepl_api_key']));
        roadpress_debug_log('[ROADPRESS] [API] Clé API mise à jour : Deepl');
    } else {
        roadpress_debug_log('[ROADPRESS] [API] Clé API Deepl non trouvée dans la réponse');
    }

    if (isset($api_keys['openai_api_key'])) {
        update_option('roadpress_openai_api_key', sanitize_text_field($api_keys['openai_api_key']));
        roadpress_debug_log('[ROADPRESS] [API] Clé API mise à jour : OpenAI');
    } else {
        roadpress_debug_log('[ROADPRESS] [API] Clé API OpenAI non trouvée dans la réponse');
    }

    if (isset($api_keys['brevo_api_key'])) {
        update_option('roadpress_brevo_api_key', sanitize_text_field($api_keys['brevo_api_key']));
        roadpress_debug_log('[ROADPRESS] [API] Clé API mise à jour : Brevo');
    } else {
        roadpress_debug_log('[ROADPRESS] [API] Clé API Brevo non trouvée dans la réponse');
    }
    
    if (isset($api_keys['geonames_username'])) {
        update_option('roadpress_geonames_username', sanitize_text_field($api_keys['geonames_username']));
        roadpress_debug_log('[ROADPRESS] [API] Username Geonames mis à jour');
    } else {
        roadpress_debug_log('[ROADPRESS] [API] Username Geonames non trouvé dans la réponse');
    }
    
    if (isset($api_keys['mapbox_key'])) {
        update_option('roadpress_mapbox_api_key', sanitize_text_field($api_keys['mapbox_key']));
        roadpress_debug_log('[ROADPRESS] [API] Clé API mise à jour : Mapbox');
    } else {
        roadpress_debug_log('[ROADPRESS] [API] Clé API Mapbox non trouvée dans la réponse');
    }

    roadpress_debug_log('[ROADPRESS] [API] Récupération des clés API terminée avec succès');
    return new WP_REST_Response(['success' => true, 'message' => 'Clés API mises à jour'], 200);
}

// Update API keys from the admin side
function roadpress_update_api_keys_callback($request) {

    $deepl_key = sanitize_text_field($request->get_param('deepl_key'));
    $openai_key = sanitize_text_field($request->get_param('openai_key'));
    $brevo_key = sanitize_text_field($request->get_param('brevo_key'));
    $mapbox_key = sanitize_text_field($request->get_param('mapbox_key'));

    update_option('roadpress_deepl_api_key', $deepl_key);
    update_option('roadpress_openai_api_key', $openai_key);
    update_option('roadpress_brevo_api_key', $brevo_key);
    update_option('roadpress_mapbox_api_key', $mapbox_key);

    roadpress_debug_log('[ROADPRESS] [API] Clés API mises à jour (mode forcé) : Deepl, OpenAI, Brevo, Mapbox');

    return new WP_REST_Response(['success' => true, 'message' => 'Clés API mises à jour.'], 200);
}

// Schedule a daily API keys fetch
function roadpress_schedule_api_keys_fetch() {
    if (!wp_next_scheduled('roadpress_daily_api_keys_fetch')) {
        wp_schedule_event(time(), 'daily', 'roadpress_daily_api_keys_fetch');
    }
}
add_action('init', 'roadpress_schedule_api_keys_fetch');
add_action('roadpress_daily_api_keys_fetch', 'roadpress_fetch_api_keys');

// Add a REST API route to update API keys from the admin side
add_action('rest_api_init', function () {
    register_rest_route('roadpress/v1', '/update_api_keys', [
        'methods' => 'POST',
        'callback' => 'roadpress_update_api_keys_callback',
        'permission_callback' => '__return_true',
    ]);
});

// Add a REST API route to fetch API keys from the admin side
add_action('rest_api_init', function () {
    register_rest_route('roadpress/v1', '/fetch_api_keys', [
        'methods' => 'GET',
        'callback' => 'roadpress_fetch_api_keys',
        'permission_callback' => '__return_true',
    ]);
});

// Add a REST API route to manually send logs from the admin side
add_action('rest_api_init', function () {
	register_rest_route('roadpress/v1', '/send_logs', [
		'methods' => 'POST',
		'callback' => 'roadpress_send_logs_to_server',
		'permission_callback' => '__return_true',
	]);
});

// Add a REST API route to manually send stats from the admin side
add_action('rest_api_init', function () {
	register_rest_route('roadpress/v1', '/send_stats', [
		'methods' => 'POST',
		'callback' => 'roadpress_send_stats_to_server',
		'permission_callback' => '__return_true',
	]);
});

// Add a REST API route to manually send API usage from the admin side
add_action('rest_api_init', function () {
	register_rest_route('roadpress/v1', '/send_api_stats', [
		'methods' => 'POST',
		'callback' => 'roadpress_send_api_stats_to_server',
		'permission_callback' => '__return_true',
	]);
});

// Schedule daily sync of POIs to admin server
function roadpress_schedule_poi_sync() {
    if (!wp_next_scheduled('roadpress_sync_pois_event')) {
        wp_schedule_event(time(), 'daily', 'roadpress_sync_pois_event');
    }
}
add_action('init', 'roadpress_schedule_poi_sync');

// Function to send POIs via the cron event
function roadpress_sync_pois_cron() {
    roadpress_send_pois_to_server();
}
add_action('roadpress_sync_pois_event', 'roadpress_sync_pois_cron');

// Send POI data to the admin server
function roadpress_send_pois_to_server() {
    global $wpdb;
    $license_key = get_option('roadpress_license_key');

    if (!roadpress_is_license_valid()) {
        roadpress_debug_log('[ROADPRESS] [API] Licence invalide lors de la synchronisation des POIs');
        return;
    }

    // Retrieve all POIs from the database
    $pois = $wpdb->get_results("
        SELECT * FROM {$wpdb->prefix}roadpress_poi
    ", ARRAY_A);

    if (empty($pois)) {
        roadpress_debug_log('[ROADPRESS] [API] Aucun POI à synchroniser');
        return;
    }

    roadpress_debug_log('[ROADPRESS] [API] Envoi de ' . count($pois) . ' POIs au serveur admin');

    // Add site name for admin identification
    $site_data = [
        'license_key' => $license_key,
        'site_url' => home_url(),
        'site_name' => get_bloginfo('name'),
        'pois' => $pois
    ];

    $response = wp_remote_post('https://admin.roadpress.fr/wp-json/roadpress/v1/sync_pois', [
        'body' => wp_json_encode($site_data),
        'headers' => ['Content-Type' => 'application/json'],
    ]);

    if (is_wp_error($response)) {
        roadpress_debug_log('[ROADPRESS] [API] Erreur lors de l\'envoi des POIs : ' . $response->get_error_message());
    } else {
        $body = wp_remote_retrieve_body($response);
        $response_code = wp_remote_retrieve_response_code($response);
    
        // Clean up the response body to remove PHP notices
        $clean_body = preg_replace('/<br\s*\/?>.*?{/is', '{', $body);
        roadpress_debug_log('[ROADPRESS] [API] Réponse nettoyée pour la synchronisation POI : ' . $clean_body);
        
        $decoded_body = json_decode($clean_body, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            roadpress_debug_log('[ROADPRESS] [API] Erreur JSON : ' . json_last_error_msg());
            
            // Additional recovery attempt
            if (preg_match('/{.*}/s', $body, $matches)) {
                roadpress_debug_log('[ROADPRESS] [API] Tentative de récupération du JSON valide');
                $decoded_body = json_decode($matches[0], true);
            }
        }
        
        if ($response_code >= 200 && $response_code < 300) {
            roadpress_debug_log('[ROADPRESS] [API] POIs synchronisés avec succès');
        } else {
            roadpress_debug_log('[ROADPRESS] [API] Erreur lors de la synchronisation des POIs : Code HTTP ' . $response_code);
        }
    }
}

// Add a REST API route to manually trigger POI sync from the admin side
function roadpress_send_pois_callback($request) {
    roadpress_debug_log('[ROADPRESS] [API] Synchronisation manuelle des POIs initiée');
    roadpress_send_pois_to_server();
    return new WP_REST_Response(['success' => true, 'message' => 'POIs synchronisés'], 200);
}

// Register the REST API route for manual POI sync
add_action('rest_api_init', function () {
    register_rest_route('roadpress/v1', '/send_pois', [
        'methods' => 'POST',
        'callback' => 'roadpress_send_pois_callback',
        'permission_callback' => '__return_true',
    ]);
});

?>