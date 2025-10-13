<?php
/**
 * API management class for RoadPress Admin
 * Handles API keys and REST endpoints
 */
class RoadPress_API_Manager {
    
    /**
     * Register all REST API endpoints
     */
    public static function register_endpoints() {
        // Update license endpoint
        register_rest_route('roadpress/v1', '/update_license', [
            'methods' => 'POST',
            'callback' => array('RoadPress_API_Manager', 'update_license_callback'),
            'permission_callback' => '__return_true',
        ]);
        
        // Provide API keys endpoint
        register_rest_route('roadpress/v1', '/provide_api_keys', [
            'methods' => 'GET',
            'callback' => array('RoadPress_API_Manager', 'provide_api_keys_callback'),
            'permission_callback' => '__return_true',
        ]);
    }
    
    /**
     * Allow RoadPress API routes without authentication
     * 
     * @param mixed $result Authentication result
     * @return mixed Modified result
     */
    public static function allow_api_routes($result) {
        if (!empty($result)) {
            return $result;
        }

        // Allow access to all routes under /wp-json/roadpress/v1/
        if (strpos($_SERVER['REQUEST_URI'], '/wp-json/roadpress/v1/') !== false) {
            return true;
        }

        return $result;
    }
    
    /**
     * Callback for updating license with client site information
     * 
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response Response object
     */
    public static function update_license_callback($request) {
        global $wpdb;

        $license_key = sanitize_text_field($request['license_key']);
        $site_url = esc_url($request['site_url']);
        $table_name = $wpdb->prefix . 'licenses';

        // Update license association
        $updated = $wpdb->update(
            $table_name,
            ['site_url' => $site_url, 'is_associated' => 1],
            ['license_key' => $license_key]
        );

        if ($updated !== false) {
            return new WP_REST_Response(['success' => true, 'message' => 'La licence a été mise à jour avec succès'], 200);
        } else {
            return new WP_REST_Response(['success' => false, 'message' => 'Échec de la mise à jour de la licence'], 500);
        }
    }
    
    /**
     * Callback for providing API keys to client sites
     * 
     * @param WP_REST_Request $request The request object
     * @return WP_REST_Response Response object
     */
    public static function provide_api_keys_callback($request) {
        global $wpdb;
        $license_key = $request->get_param('license_key');

        // Verify if the license key is valid
        $table_name = $wpdb->prefix . 'licenses';
        $license = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE license_key = %s AND status = 'active'",
            $license_key
        ));

        // Return error if license is not found or not active
        if (!$license) {
            return new WP_REST_Response(['success' => false, 'message' => 'Licence invalide ou inactive'], 403);
        }

        // Get stored API keys
        $deepl_key = get_option('roadpress_deepl_api_key');
        $openai_key = get_option('roadpress_openai_api_key');
        $brevo_key = get_option('roadpress_brevo_api_key');
        $mapbox_key = get_option('roadpress_mapbox_api_key');

        // Check if main API keys are available
        if (empty($deepl_key) || empty($openai_key) || empty($brevo_key)) {
            return new WP_REST_Response(['success' => false, 'message' => 'Les clés d\'API sont manquantes'], 400);
        }

        // Return API keys if license is valid
        return new WP_REST_Response([
            'success' => true,
            'deepl_key' => $deepl_key,
            'openai_key' => $openai_key,
            'brevo_key' => $brevo_key,
            'mapbox_key' => $mapbox_key
        ], 200);
    }
    
    /**
     * Push API keys to all connected client sites
     * 
     * @return array Result with success status and message
     */
    public static function push_api_keys_to_clients() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'licenses';
        $deepl_key = get_option('roadpress_deepl_api_key');
        $openai_key = get_option('roadpress_openai_api_key');
        $brevo_key = get_option('roadpress_brevo_api_key');
        $mapbox_key = get_option('roadpress_mapbox_api_key');

        // Check if required API keys are available
        if (empty($deepl_key) || empty($openai_key) || empty($brevo_key)) {
            return [
                'success' => false,
                'message' => 'Veuillez remplir les clés API avant d\'envoyer les mises à jour.'
            ];
        }

        // Get all associated client sites
        $client_sites = $wpdb->get_results("SELECT site_url, license_key FROM $table_name WHERE is_associated = 1");
        
        if (empty($client_sites)) {
            return [
                'success' => false,
                'message' => 'Aucun site client associé n\'a été trouvé.'
            ];
        }

        $success_count = 0;
        $error_count = 0;
        $error_messages = [];

        foreach ($client_sites as $client_site) {
            // Skip sites without a valid URL
            if (empty($client_site->site_url) || !filter_var($client_site->site_url, FILTER_VALIDATE_URL)) {
                $error_count++;
                $error_messages[] = 'URL invalide pour la clé de licence : ' . $client_site->license_key;
                continue;
            }

            // Send request to client site
            $response = wp_remote_post($client_site->site_url . '/wp-json/roadpress/v1/update_api_keys', [
                'body' => json_encode([
                    'deepl_key' => $deepl_key,
                    'openai_key' => $openai_key,
                    'brevo_key' => $brevo_key,
                    'mapbox_key' => $mapbox_key,
                ]),
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'timeout' => 30,
            ]);

            if (is_wp_error($response)) {
                $error_count++;
                $error_messages[] = 'Erreur pour ' . $client_site->site_url . ' : ' . $response->get_error_message();
            } else {
                $success_count++;
            }
        }

        return [
            'success' => ($error_count === 0),
            'message' => sprintf(
                'Les clés API ont été envoyées à %d sites clients, %d ont échoué.',
                $success_count,
                $error_count
            ),
            'errors' => $error_messages
        ];
    }
    
    /**
     * Trigger client stats sync from all active client sites
     */
    public static function trigger_client_stats_send() {
        global $wpdb;

        // Get all active licenses with their URLs
        $licenses = $wpdb->get_results("SELECT license_key, client_name, site_url FROM {$wpdb->prefix}licenses WHERE status = 'active'");

        if (empty($licenses)) {
            return [
                'success' => false,
                'message' => 'Aucun client actif trouvé'
            ];
        }

        $success_count = 0;
        $error_count = 0;
        $client_details = [];

        foreach ($licenses as $license) {
            // Retrieve last synchronization date
            $last_sync = get_option('roadpress_last_stats_sync_' . $license->license_key, '1970-01-01');
            
            $api_url = trailingslashit($license->site_url) . 'wp-json/roadpress/v1/send_stats';
            $license_key = $license->license_key;

            // Skip sites without a valid URL
            if (empty($license->site_url) || !filter_var($license->site_url, FILTER_VALIDATE_URL)) {
                error_log("[ROADPRESS] [API] URL invalide pour la licence {$license->license_key} : {$license->site_url}");
                $error_count++;
                continue;
            }

            // Send request to client with last_sync parameter
            $response = wp_remote_post($api_url, [
                'body' => wp_json_encode([
                    'license_key' => $license_key,
                    'last_sync' => $last_sync,
                    'limit' => 500
                ]),
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'timeout' => 30,
            ]);

            if (is_wp_error($response)) {
                error_log("[ROADPRESS] [API] Erreur pour le client {$license->client_name} : " . $response->get_error_message());
                $error_count++;
                continue;
            }

            $body = wp_remote_retrieve_body($response);
            $response_code = wp_remote_retrieve_response_code($response);
            $decoded_body = json_decode($body, true);

            if ($response_code >= 200 && $response_code < 300) {
                $success_count++;
                $client_email_count = 0;
                $client_sms_count = 0;
                
                // Update last synchronization date
                update_option('roadpress_last_stats_sync_' . $license->license_key, current_time('mysql'));
                
                // Update statistics in respective tables
                if (!empty($decoded_body['email_stats'])) {
                    $client_email_count = intval($decoded_body['email_stats']);
                    
                    $wpdb->replace("{$wpdb->prefix}license_email_stats", [
                        'license_key' => $license->license_key,
                        'client_name' => $license->client_name,
                        'email_stats' => $decoded_body['email_stats'],
                        'last_update' => current_time('mysql'),
                    ]);
                }

                if (!empty($decoded_body['sms_stats'])) {
                    foreach ($decoded_body['sms_stats'] as $sms_stat) {
                        $client_sms_count += intval($sms_stat['sms_count']);
                        
                        $wpdb->replace("{$wpdb->prefix}license_sms_stats", [
                            'license_key' => $license->license_key,
                            'client_name' => $license->client_name,
                            'country' => $sms_stat['country'],
                            'sms_sent' => $sms_stat['sms_count'],
                            'last_update' => current_time('mysql'),
                        ]);
                    }
                }
                
                // Enregistrer les détails du client
                $client_details[] = [
                    'name' => $license->client_name,
                    'emails' => $client_email_count,
                    'sms' => $client_sms_count
                ];
            } else {
                error_log("[ROADPRESS] [API] Erreur pour {$license->client_name} : code HTTP $response_code");
                $error_count++;
            }
        }
        
        // Exécuter l'agrégation après la synchronisation
        if (class_exists('RoadPress_Stats')) {
            RoadPress_Stats::aggregate_logs_to_stats();
        }
        
        // Récupérer les statistiques totales depuis la base de données
        $total_emails = $wpdb->get_var("SELECT SUM(email_stats) FROM {$wpdb->prefix}license_email_stats");
        $total_sms = $wpdb->get_var("SELECT SUM(sms_sent) FROM {$wpdb->prefix}license_sms_stats");
        
        // Utiliser ces valeurs réelles au lieu des compteurs d'incrémentation
        $email_count = intval($total_emails);
        $sms_count = intval($total_sms);
        
        // Préparer un message plus détaillé
        $details_message = '';
        if (!empty($client_details)) {
            $details_message = '<br><br><strong>Détails par client :</strong><ul>';
            foreach ($client_details as $detail) {
                $details_message .= sprintf(
                    '<li><strong>%s</strong> : %d email(s), %d SMS</li>',
                    esc_html($detail['name']),
                    $detail['emails'],
                    $detail['sms']
                );
            }
            $details_message .= '</ul>';
        }

        return [
            'success' => true,
            'message' => sprintf(
                'Statistiques récupérées auprès de %d clients, %d échecs.<br>Total : %d email(s), %d SMS récupérés.%s',
                $success_count,
                $error_count,
                $email_count,
                $sms_count,
                $details_message
            ),
            'email_count' => $email_count,
            'sms_count' => $sms_count,
            'client_details' => $client_details
        ];
    }
    
    /**
     * Trigger client logs sync from all active client sites
     */
    public static function trigger_client_logs_send() {
        global $wpdb;

        // Count logs before synchronization to calculate the difference afterwards
        $initial_email_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}license_email_logs");
        $initial_sms_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}license_sms_logs");
        
        // Marquer le début de la synchronisation pour pouvoir filtrer les nouveaux logs
        $sync_start_time = current_time('mysql');
    
        // Get all active licenses with their URLs
        $licenses = $wpdb->get_results("SELECT id, license_key, client_name, site_url FROM {$wpdb->prefix}licenses WHERE status = 'active'");
    
        if (empty($licenses)) {
            return [
                'success' => false,
                'message' => 'Aucun client actif trouvé'
            ];
        }
    
        $success_count = 0;
        $error_count = 0;
        
        // Nous reconstruirons ce tableau plus tard
        $client_details = [];

        foreach ($licenses as $license) {
            // Retrieve last synchronization date
            $last_sync = get_option('roadpress_last_logs_sync_' . $license->license_key, '1970-01-01');
            
            $api_url = trailingslashit($license->site_url) . 'wp-json/roadpress/v1/send_logs';
            $license_key = $license->license_key;

            // Skip sites without a valid URL
            if (empty($license->site_url) || !filter_var($license->site_url, FILTER_VALIDATE_URL)) {
                error_log("[ROADPRESS] [API] URL invalide pour la licence {$license->license_key} : {$license->site_url}");
                $error_count++;
                continue;
            }

            // Send request to client with last_sync parameter
            $response = wp_remote_post($api_url, [
                'body' => wp_json_encode([
                    'license_key' => $license_key,
                    'last_sync' => $last_sync,
                    'limit' => 500
                ]),
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'timeout' => 30,
            ]);

            if (is_wp_error($response)) {
                error_log("[ROADPRESS] [API] Erreur pour le client {$license->client_name} : " . $response->get_error_message());
                $error_count++;
                continue;
            }

            $body = wp_remote_retrieve_body($response);
            $response_code = wp_remote_retrieve_response_code($response);
            $decoded_body = json_decode($body, true);

            if ($response_code >= 200 && $response_code < 300) {
                $success_count++;
                $client_email_count = !empty($decoded_body['email_logs']) ? count($decoded_body['email_logs']) : 0;
                $client_sms_count = !empty($decoded_body['sms_logs']) ? count($decoded_body['sms_logs']) : 0;
                
                // Update last synchronization date
                update_option('roadpress_last_logs_sync_' . $license->license_key, current_time('mysql'));
                
                // Update logs in respective tables
                if (!empty($decoded_body['email_logs'])) {
                    $client_email_count = count($decoded_body['email_logs']);
                    
                    foreach ($decoded_body['email_logs'] as $log) {
                        $wpdb->replace("{$wpdb->prefix}license_email_logs", [
                            'client_id' => $license->id,
                            'license_key' => $license->license_key,
                            'client_name' => $license->client_name,
                            'send_date' => $log['send_date'],
                        ]);
                    }
                }

                if (!empty($decoded_body['sms_logs'])) {
                    $client_sms_count = count($decoded_body['sms_logs']);
                    
                    foreach ($decoded_body['sms_logs'] as $log) {
                        $wpdb->replace("{$wpdb->prefix}license_sms_logs", [
                            'client_id' => $license->id,
                            'license_key' => $license->license_key,
                            'client_name' => $license->client_name,
                            'phone' => $log['phone'],
                            'country' => $log['country'],
                            'send_date' => $log['send_date'],
                        ]);
                    }
                }
                
                // Enregistrer les détails du client
                $client_details[] = [
                    'name' => $license->client_name,
                    'emails' => $client_email_count,
                    'sms' => $client_sms_count
                ];
                
                // Si des données supplémentaires sont disponibles, continuer la synchronisation par lots
                if (!empty($decoded_body['has_more']) && $decoded_body['has_more'] === true) {
                    $page_results = self::sync_client_logs_paginated($license, $last_sync);
                    
                    // Mettre à jour les détails du client
                    foreach ($client_details as $key => $detail) {
                        if ($detail['name'] === $license->client_name) {
                            $client_details[$key]['emails'] += $page_results['emails'] ?? 0;
                            $client_details[$key]['sms'] += $page_results['sms'] ?? 0;
                            break;
                        }
                    }
                }
            } else {
                error_log("[ROADPRESS] [API] Erreur pour {$license->client_name} : code HTTP $response_code");
                $error_count++;
            }
        }

        // Exécuter l'agrégation après la synchronisation
        if (class_exists('RoadPress_Stats')) {
            RoadPress_Stats::aggregate_logs_to_stats();
        }

        // Calculer uniquement les nouvelle entrées ajoutées pendant cette synchronisation
        $final_email_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}license_email_logs");
        $final_sms_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}license_sms_logs");
        
        $new_email_count = $final_email_count - $initial_email_count;
        $new_sms_count = $final_sms_count - $initial_sms_count;
        
        // Récupérer les détails par client uniquement s'il y a de nouvelles entrées
        $client_details = [];
        $details_message = '';
        
        if ($new_email_count > 0 || $new_sms_count > 0) {
            // Récupérer tous les clients qui ont des logs ajoutés depuis le début de la synchronisation
            $clients = $wpdb->get_results("
                SELECT DISTINCT client_name FROM {$wpdb->prefix}license_email_logs 
                WHERE created_at >= '$sync_start_time'
                UNION 
                SELECT DISTINCT client_name FROM {$wpdb->prefix}license_sms_logs 
                WHERE created_at >= '$sync_start_time'
            ");
            
            foreach ($clients as $client) {
                // Compter les emails ajoutés pour ce client pendant cette synchronisation
                $emails = $wpdb->get_var($wpdb->prepare("
                    SELECT COUNT(*) FROM {$wpdb->prefix}license_email_logs 
                    WHERE client_name = %s AND created_at >= %s
                ", $client->client_name, $sync_start_time));
                
                // Compter les SMS ajoutés pour ce client pendant cette synchronisation
                $sms = $wpdb->get_var($wpdb->prepare("
                    SELECT COUNT(*) FROM {$wpdb->prefix}license_sms_logs 
                    WHERE client_name = %s AND created_at >= %s
                ", $client->client_name, $sync_start_time));
                
                $client_details[] = [
                    'name' => $client->client_name,
                    'emails' => (int)$emails,
                    'sms' => (int)$sms
                ];
            }
            
            // Préparer un message plus détaillé seulement s'il y a de nouveaux logs
            if (!empty($client_details)) {
                $details_message = '<br><br><strong>Détails par client :</strong><ul>';
                foreach ($client_details as $detail) {
                    $details_message .= sprintf(
                        '<li><strong>%s</strong> : %d email(s), %d SMS</li>',
                        esc_html($detail['name']),
                        $detail['emails'],
                        $detail['sms']
                    );
                }
                $details_message .= '</ul>';
            }
        }
        
        // Ne plus ajouter de clients avec des valeurs à 0 si aucun nouveau log n'a été récupéré
        
        return [
            'success' => true,
            'message' => sprintf(
                'Journaux récupérés auprès de %d clients, %d échecs.<br>Total : %d email(s), %d SMS récupérés.%s',
                $success_count,
                $error_count,
                $new_email_count,
                $new_sms_count,
                $details_message
            ),
            'email_count' => $new_email_count,
            'sms_count' => $new_sms_count,
            'client_details' => $client_details
        ];
    }
    
    /**
     * Batch synchronize customer logs to manage large amounts of data
     * 
     * @param object $license Objet licence
     * @param string $last_sync Date de dernière synchronisation
     * @return array Compteurs des emails et SMS récupérés
     */
    public static function sync_client_logs_paginated($license, $last_sync) {
        global $wpdb;
        
        $api_url = trailingslashit($license->site_url) . 'wp-json/roadpress/v1/send_logs';
        $license_key = $license->license_key;
        $page = 2; // We start on page 2 because page 1 has already been processed.
        $limit = 500;
        $has_more = true;
        $max_pages = 10; // Safety limit to avoid an infinite loop
        
        // Variables pour le comptage
        $email_count = 0;
        $sms_count = 0;
        
        while ($has_more && $page <= $max_pages) {
            $response = wp_remote_post($api_url, [
                'body' => wp_json_encode([
                    'license_key' => $license_key,
                    'last_sync' => $last_sync,
                    'limit' => $limit,
                    'page' => $page
                ]),
                'headers' => ['Content-Type' => 'application/json'],
                'timeout' => 30
            ]);
            
            if (is_wp_error($response)) {
                error_log("[ROADPRESS] [API] Erreur pour le client {$license->client_name} (page $page) : " . $response->get_error_message());
                break;
            }
            
            $response_code = wp_remote_retrieve_response_code($response);
            if ($response_code < 200 || $response_code >= 300) {
                error_log("[ROADPRESS] [API] Erreur pour {$license->client_name} : code HTTP $response_code (page $page)");
                break;
            }
            
            $decoded_body = json_decode(wp_remote_retrieve_body($response), true);
            
            // Traiter les logs de cette page
            if (!empty($decoded_body['email_logs'])) {
                $email_count += count($decoded_body['email_logs']);
                
                foreach ($decoded_body['email_logs'] as $log) {
                    $wpdb->replace("{$wpdb->prefix}license_email_logs", [
                        'client_id' => $license->id,
                        'license_key' => $license->license_key,
                        'client_name' => $license->client_name,
                        'send_date' => $log['send_date'],
                    ]);
                }
            }

            if (!empty($decoded_body['sms_logs'])) {
                $sms_count += count($decoded_body['sms_logs']);
                
                foreach ($decoded_body['sms_logs'] as $log) {
                    $wpdb->replace("{$wpdb->prefix}license_sms_logs", [
                        'client_id' => $license->id,
                        'license_key' => $license->license_key,
                        'client_name' => $license->client_name,
                        'phone' => $log['phone'],
                        'country' => $log['country'],
                        'send_date' => $log['send_date'],
                    ]);
                }
            }
            
            // Vérifier s'il y a encore plus de données
            $has_more = !empty($decoded_body['has_more']) && $decoded_body['has_more'] === true;
            $page++;
        }
        
        // Retourner les compteurs pour pouvoir les ajouter aux totaux
        return [
            'emails' => $email_count,
            'sms' => $sms_count
        ];
    }

    /**
     * Trigger API stats sync from all active client sites
     */
    public static function trigger_client_api_stats_send() {
        global $wpdb;
    
        // Récupérer les totaux avant synchronisation
        $initial_deepl = $wpdb->get_var("SELECT SUM(tokens_used) FROM {$wpdb->prefix}license_deepl_stats");
        $initial_openai = $wpdb->get_var("SELECT SUM(tokens_used) FROM {$wpdb->prefix}license_openai_stats");
        $initial_deepl = intval($initial_deepl);
        $initial_openai = intval($initial_openai);
    
        // Marquer le début de la synchronisation pour filtrer les nouvelles entrées
        $sync_start_time = current_time('mysql');
    
        // Get all active licenses with their URLs
        $licenses = $wpdb->get_results("SELECT license_key, client_name, site_url FROM {$wpdb->prefix}licenses WHERE status = 'active'");
    
        if (empty($licenses)) {
            return [
                'success' => false,
                'message' => 'Aucun client actif trouvé'
            ];
        }
    
        $success_count = 0;
        $error_count = 0;
        $client_details = []; // On initialise ici plutôt que d'utiliser temp_client_details
    
        foreach ($licenses as $license) {
            // Retrieve last synchronization date
            $last_sync = get_option('roadpress_last_api_sync_' . $license->license_key, '1970-01-01');
            
            $api_url = trailingslashit($license->site_url) . 'wp-json/roadpress/v1/send_api_stats';
            $license_key = $license->license_key;
    
            // Skip sites without a valid URL
            if (empty($license->site_url) || !filter_var($license->site_url, FILTER_VALIDATE_URL)) {
                error_log("[ROADPRESS] [API] URL invalide pour la licence {$license->license_key} : {$license->site_url}");
                $error_count++;
                continue;
            }
    
            // Send request to client with last_sync parameter
            $response = wp_remote_post($api_url, [
                'body' => wp_json_encode([
                    'license_key' => $license_key,
                    'last_sync' => $last_sync
                ]),
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'timeout' => 30,
            ]);
    
            if (is_wp_error($response)) {
                error_log("[ROADPRESS] [API] Erreur pour le client {$license->client_name} : " . $response->get_error_message());
                $error_count++;
                continue;
            }
    
            $body = wp_remote_retrieve_body($response);
            $response_code = wp_remote_retrieve_response_code($response);
            $decoded_body = json_decode($body, true);
    
            if ($response_code >= 200 && $response_code < 300) {
                $success_count++;
                $client_deepl_tokens = 0;
                $client_openai_tokens = 0;
                
                // Update last synchronization date
                update_option('roadpress_last_api_sync_' . $license->license_key, current_time('mysql'));
                
                // Update DeepL stats
                if (!empty($decoded_body['deepl_stats'])) {
                    $client_deepl_tokens = intval($decoded_body['deepl_stats']['tokens_used']);
                    
                    $wpdb->replace("{$wpdb->prefix}license_deepl_stats", [
                        'license_key' => $license->license_key,
                        'client_name' => $license->client_name,
                        'tokens_used' => intval($decoded_body['deepl_stats']['tokens_used']),
                        'estimated_cost' => floatval($decoded_body['deepl_stats']['estimated_cost']),
                        'last_update' => current_time('mysql'),
                    ]);
                }
    
                // Update OpenAI stats
                if (!empty($decoded_body['openai_stats'])) {
                    $client_openai_tokens = intval($decoded_body['openai_stats']['tokens_used']);
                    
                    $wpdb->replace("{$wpdb->prefix}license_openai_stats", [
                        'license_key' => $license->license_key,
                        'client_name' => $license->client_name,
                        'tokens_used' => intval($decoded_body['openai_stats']['tokens_used']),
                        'estimated_cost' => floatval($decoded_body['openai_stats']['estimated_cost']),
                        'last_update' => current_time('mysql'),
                    ]);
                }
    
                // Update monthly stats
                if (!empty($decoded_body['deepl_stats']) && !empty($decoded_body['openai_stats'])) {
                    $current_month = date('Y-m');
                    
                    // Monthly DeepL
                    $wpdb->replace("{$wpdb->prefix}license_deepl_stats_monthly", [
                        'license_key' => $license->license_key,
                        'client_name' => $license->client_name,
                        'stat_year_month' => $current_month,
                        'tokens_used' => intval($decoded_body['deepl_stats']['tokens_used']),
                        'estimated_cost' => floatval($decoded_body['deepl_stats']['estimated_cost']),
                        'last_update' => current_time('mysql'),
                    ]);
                    
                    // Monthly OpenAI
                    $wpdb->replace("{$wpdb->prefix}license_openai_stats_monthly", [
                        'license_key' => $license->license_key,
                        'client_name' => $license->client_name,
                        'stat_year_month' => $current_month,
                        'tokens_used' => intval($decoded_body['openai_stats']['tokens_used']),
                        'estimated_cost' => floatval($decoded_body['openai_stats']['estimated_cost']),
                        'last_update' => current_time('mysql'),
                    ]);
                }
                
                // Enregistrer les détails du client
                $client_details[] = [
                    'name' => $license->client_name,
                    'deepl' => $client_deepl_tokens,
                    'openai' => $client_openai_tokens
                ];
            } else {
                error_log("[ROADPRESS] [API] Erreur pour {$license->client_name} : code HTTP $response_code");
                $error_count++;
            }
        }
        
        // Récupérer les statistiques réelles depuis la base de données
        $total_deepl = $wpdb->get_var("SELECT SUM(tokens_used) FROM {$wpdb->prefix}license_deepl_stats");
        $total_openai = $wpdb->get_var("SELECT SUM(tokens_used) FROM {$wpdb->prefix}license_openai_stats");
        
        // Calculer uniquement les nouvelles données
        $new_deepl_tokens = intval($total_deepl) - $initial_deepl;
        $new_openai_tokens = intval($total_openai) - $initial_openai;
        
        // Récupérer les détails par client uniquement s'il y a de nouvelles entrées
        $client_details = [];
        $details_message = '';
        
        if ($new_deepl_tokens > 0 || $new_openai_tokens > 0) {
            // Récupérer les clients avec des stats mises à jour pendant cette synchronisation
            $clients = $wpdb->get_results("
                SELECT DISTINCT client_name FROM {$wpdb->prefix}license_deepl_stats 
                WHERE last_update >= '$sync_start_time'
                UNION 
                SELECT DISTINCT client_name FROM {$wpdb->prefix}license_openai_stats 
                WHERE last_update >= '$sync_start_time'
            ");
            
            foreach ($clients as $client) {
                // Trouver les tokens DeepL pour ce client
                $deepl = $wpdb->get_var($wpdb->prepare("
                    SELECT tokens_used FROM {$wpdb->prefix}license_deepl_stats 
                    WHERE client_name = %s AND last_update >= %s
                ", $client->client_name, $sync_start_time));
                
                // Trouver les tokens OpenAI pour ce client
                $openai = $wpdb->get_var($wpdb->prepare("
                    SELECT tokens_used FROM {$wpdb->prefix}license_openai_stats 
                    WHERE client_name = %s AND last_update >= %s
                ", $client->client_name, $sync_start_time));
                
                $client_details[] = [
                    'name' => $client->client_name,
                    'deepl' => (int)$deepl,
                    'openai' => (int)$openai
                ];
            }
            
            // Préparer un message plus détaillé seulement s'il y a de nouveaux tokens
            if (!empty($client_details)) {
                $details_message = '<br><br><strong>Détails par client :</strong><ul>';
                foreach ($client_details as $detail) {
                    $details_message .= sprintf(
                        '<li><strong>%s</strong> : %s tokens DeepL, %s tokens OpenAI</li>',
                        esc_html($detail['name']),
                        number_format($detail['deepl']),
                        number_format($detail['openai'])
                    );
                }
                $details_message .= '</ul>';
            }
        }
    
        return [
            'success' => true,
            'message' => sprintf(
                'Statistiques des APIs récupérées auprès de %d clients, %d ont échoué.<br>Total : %s tokens DeepL, %s tokens OpenAI.%s',
                $success_count,
                $error_count,
                number_format($new_deepl_tokens),
                number_format($new_openai_tokens),
                $details_message
            ),
            'deepl_tokens' => $new_deepl_tokens,
            'openai_tokens' => $new_openai_tokens,
            'client_details' => $client_details
        ];
    }

    /**
     * Trigger POI sync from all active client sites
     */
    public static function trigger_client_poi_sync() {
        global $wpdb;
        
        // Compter les POIs avant synchronisation
        $initial_poi_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}client_pois");
        $initial_poi_count = intval($initial_poi_count);
        
        // Marquer le début de la synchronisation
        $sync_start_time = current_time('mysql');
    
        // Get all active licenses with their URLs
        $licenses = $wpdb->get_results("SELECT license_key, client_name, site_url FROM {$wpdb->prefix}licenses WHERE status = 'active'");
    
        if (empty($licenses)) {
            return [
                'success' => false,
                'message' => 'Aucun client actif trouvé'
            ];
        }
    
        $success_count = 0;
        $error_count = 0;
        $client_details = [];
    
        foreach ($licenses as $license) {
            // Retrieve last synchronization date
            $last_sync = get_option('roadpress_last_poi_sync_' . $license->license_key, '1970-01-01');
            
            $api_url = trailingslashit($license->site_url) . 'wp-json/roadpress/v1/send_pois';
    
            // Skip sites without a valid URL
            if (empty($license->site_url) || !filter_var($license->site_url, FILTER_VALIDATE_URL)) {
                error_log("[ROADPRESS] [POI] URL invalide pour la licence {$license->license_key} : {$license->site_url}");
                $error_count++;
                continue;
            }
    
            // Send request to client with last_sync parameter et limit
            $response = wp_remote_post($api_url, [
                'body' => wp_json_encode([
                    'license_key' => $license->license_key,
                    'last_sync' => $last_sync,
                    'limit' => 200
                ]),
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'timeout' => 60,
            ]);
    
            if (is_wp_error($response)) {
                error_log("[ROADPRESS] [POI] Erreur pour le client {$license->client_name} : " . $response->get_error_message());
                $error_count++;
            } else {
                $response_code = wp_remote_retrieve_response_code($response);
                $body = wp_remote_retrieve_body($response);
                $decoded_body = json_decode($body, true);
                
                if ($response_code >= 200 && $response_code < 300) {
                    $success_count++;
                    $client_poi_count = !empty($decoded_body['pois_count']) ? intval($decoded_body['pois_count']) : 0;
                    
                    // Update last synchronization date
                    update_option('roadpress_last_poi_sync_' . $license->license_key, current_time('mysql'));
                    
                    // Enregistrer les détails du client
                    $client_details[] = [
                        'name' => $license->client_name,
                        'pois' => $client_poi_count
                    ];
                    
                    // If additional data are available, continue batch synchronization
                    if (!empty($decoded_body['has_more']) && $decoded_body['has_more'] === true) {
                        $page_results = self::sync_client_pois_paginated($license, $last_sync);
                        
                        // Mettre à jour les détails du client
                        foreach ($client_details as $key => $detail) {
                            if ($detail['name'] === $license->client_name) {
                                $client_details[$key]['pois'] += $page_results['pois'] ?? 0;
                                break;
                            }
                        }
                    }
                } else {
                    $error_count++;
                }
            }
        }
        
        // Calculer uniquement les nouveaux POIs ajoutés pendant cette synchronisation
        $final_poi_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}client_pois");
        $new_poi_count = intval($final_poi_count) - $initial_poi_count;
        
        // Récupérer les détails par client uniquement s'il y a de nouveaux POIs
        $client_details = [];
        $details_message = '';
        
        if ($new_poi_count > 0) {
            // Récupérer les clients qui ont des POIs ajoutés pendant cette synchronisation
            $clients = $wpdb->get_results("
                SELECT DISTINCT client_name FROM {$wpdb->prefix}client_pois
                WHERE sync_date >= '$sync_start_time'
            ");
            
            foreach ($clients as $client) {
                // Compter les POIs ajoutés pour ce client pendant cette synchronisation
                $pois = $wpdb->get_var($wpdb->prepare("
                    SELECT COUNT(*) FROM {$wpdb->prefix}client_pois 
                    WHERE client_name = %s AND sync_date >= %s
                ", $client->client_name, $sync_start_time));
                
                $client_details[] = [
                    'name' => $client->client_name,
                    'pois' => (int)$pois
                ];
            }
            
            // Préparer un message plus détaillé seulement s'il y a de nouveaux POIs
            if (!empty($client_details)) {
                $details_message = '<br><br><strong>Détails par client :</strong><ul>';
                foreach ($client_details as $detail) {
                    $details_message .= sprintf(
                        '<li><strong>%s</strong> : %d POI(s)</li>',
                        esc_html($detail['name']),
                        $detail['pois']
                    );
                }
                $details_message .= '</ul>';
            }
        }
        
        return [
            'success' => true,
            'message' => sprintf(
                'La synchronisation des POIs a été demandée à %d clients, %d ont échoué.<br>Total : %d POI(s) synchronisés.%s',
                $success_count,
                $error_count,
                $new_poi_count,
                $details_message
            ),
            'pois_count' => $new_poi_count,
            'client_details' => $client_details
        ];
    }
    
    /**
     * Synchronize customer POIs in batches to manage large amounts of data
     * 
     * @param object $license License object
     * @param string $last_sync Date of last synchronization
     * @return array Compteur des POIs récupérés
     */
    public static function sync_client_pois_paginated($license, $last_sync) {
        $api_url = trailingslashit($license->site_url) . 'wp-json/roadpress/v1/send_pois';
        $license_key = $license->license_key;
        $page = 2; // We start on page 2 because page 1 has already been processed.
        $limit = 200;
        $has_more = true;
        $max_pages = 20; // Safety limit to avoid an infinite loop
        $poi_count = 0;
        
        while ($has_more && $page <= $max_pages) {
            $response = wp_remote_post($api_url, [
                'body' => wp_json_encode([
                    'license_key' => $license_key,
                    'last_sync' => $last_sync,
                    'limit' => $limit,
                    'page' => $page
                ]),
                'headers' => ['Content-Type' => 'application/json'],
                'timeout' => 60
            ]);
            
            if (is_wp_error($response)) {
                error_log("[ROADPRESS] [POI] Erreur pour le client {$license->client_name} (page $page) : " . $response->get_error_message());
                break;
            }
            
            $response_code = wp_remote_retrieve_response_code($response);
            if ($response_code < 200 || $response_code >= 300) {
                error_log("[ROADPRESS] [POI] Erreur pour {$license->client_name} : code HTTP $response_code (page $page)");
                break;
            }
            
            $decoded_body = json_decode(wp_remote_retrieve_body($response), true);
            
            // Ajouter au compteur de POIs
            if (!empty($decoded_body['pois_count'])) {
                $poi_count += intval($decoded_body['pois_count']);
            }
            
            // Check for more data
            $has_more = !empty($decoded_body['has_more']) && $decoded_body['has_more'] === true;
            $page++;
        }
        
        return [
            'pois' => $poi_count
        ];
    }
}