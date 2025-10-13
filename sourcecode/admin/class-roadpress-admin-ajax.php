<?php
/**
 * Admin AJAX handler class for RoadPress
 * Handles AJAX requests from the admin interface
 */
class RoadPress_Admin_Ajax {
    
    /**
     * Register AJAX hooks
     */
    public static function init() {
        // Admin AJAX actions
        add_action('wp_ajax_roadpress_delete_license', array(__CLASS__, 'delete_license'));
        add_action('wp_ajax_roadpress_create_license', array(__CLASS__, 'create_license'));
        add_action('wp_ajax_roadpress_push_api_keys', array(__CLASS__, 'push_api_keys'));
        add_action('wp_ajax_roadpress_trigger_client_stats', array(__CLASS__, 'trigger_client_stats'));
        add_action('wp_ajax_roadpress_trigger_client_logs', array(__CLASS__, 'trigger_client_logs'));
        add_action('wp_ajax_roadpress_trigger_client_api_stats', array(__CLASS__, 'trigger_client_api_stats'));
        add_action('wp_ajax_roadpress_trigger_client_poi_sync', array(__CLASS__, 'trigger_client_poi_sync'));
    }
    
    /**
     * AJAX handler for license deletion
     */
    public static function delete_license() {
        // Check nonce and permissions
        check_ajax_referer('roadpress_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        $license_id = intval($_POST['license_id']);
        $result = RoadPress_License::delete_license($license_id);
        
        if ($result['success']) {
            wp_send_json_success($result['message']);
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * AJAX handler for license creation
     */
    public static function create_license() {
        // Check nonce and permissions
        check_ajax_referer('roadpress_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        $client_name = sanitize_text_field($_POST['client_name']);
        $start_date = sanitize_text_field($_POST['start_date']);
        $end_date = sanitize_text_field($_POST['end_date']);
        
        // Validate inputs
        if (empty($client_name) || empty($start_date) || empty($end_date)) {
            wp_send_json_error('All fields are required');
            return;
        }
        
        $result = RoadPress_License::create_license($client_name, $start_date, $end_date);
        
        if ($result['success']) {
            wp_send_json_success([
                'message' => 'License created successfully',
                'license_key' => $result['license_key']
            ]);
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * AJAX handler for pushing API keys to client sites
     */
    public static function push_api_keys() {
        // Check nonce and permissions
        check_ajax_referer('roadpress_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        $result = RoadPress_API_Manager::push_api_keys_to_clients();
        
        if ($result['success']) {
            wp_send_json_success($result['message']);
        } else {
            wp_send_json_error([
                'message' => $result['message'],
                'errors' => !empty($result['errors']) ? $result['errors'] : []
            ]);
        }
    }
    
    /**
     * AJAX handler for triggering client statistics sync
     */
    public static function trigger_client_stats() {
        // Check nonce and permissions
        check_ajax_referer('roadpress_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        $result = RoadPress_API_Manager::trigger_client_stats_send();
        
        if ($result['success']) {
            wp_send_json_success($result['message']);
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * AJAX handler for triggering client logs sync
     */
    public static function trigger_client_logs() {
        // Check nonce and permissions
        check_ajax_referer('roadpress_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        $result = RoadPress_API_Manager::trigger_client_logs_send();
        
        if ($result['success']) {
            wp_send_json_success($result['message']);
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * AJAX handler for triggering client API stats sync
     */
    public static function trigger_client_api_stats() {
        // Check nonce and permissions
        check_ajax_referer('roadpress_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        $result = RoadPress_API_Manager::trigger_client_api_stats_send();
        
        if ($result['success']) {
            wp_send_json_success($result['message']);
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * AJAX handler for triggering client POI sync
     */
    public static function trigger_client_poi_sync() {
        // Check nonce and permissions
        check_ajax_referer('roadpress_admin', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
            return;
        }
        
        $result = RoadPress_API_Manager::trigger_client_poi_sync();
        
        if ($result['success']) {
            wp_send_json_success($result['message']);
        } else {
            wp_send_json_error($result['message']);
        }
    }
}

// Initialize AJAX handlers
add_action('init', array('RoadPress_Admin_Ajax', 'init'));
