<?php
/*
Plugin Name: RoadPress - Administration
Description: Plugin for managing RoadPress user licenses and statistics
Version: 1.1.0
Author: RoadPress
*/

// Security: prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('ROADPRESS_ADMIN_VERSION', '1.1.0');
define('ROADPRESS_ADMIN_PATH', plugin_dir_path(__FILE__));
define('ROADPRESS_ADMIN_URL', plugin_dir_url(__FILE__));

/**
 * Main class to bootstrap the RoadPress Admin plugin
 */
class RoadPress_Admin {
    /**
     * Initialize the plugin
     */
    public static function init() {
        // Load required files
        self::load_files();
        
        // Initialize database on activation
        register_activation_hook(__FILE__, array('RoadPress_Database', 'init_tables'));
        
        // Check and create tables if necessary during plugin initialization
        add_action('plugins_loaded', function() {
            if (class_exists('RoadPress_Database')) {
                RoadPress_Database::check_and_create_tables();
            }
        });
        
        // Check plugin version and trigger updates if necessary
        add_action('plugins_loaded', function() {
            $current_version = get_option('roadpress_admin_version', '0.0');
            if (version_compare($current_version, ROADPRESS_ADMIN_VERSION, '<')) {
                // Update stored version
                update_option('roadpress_admin_version', ROADPRESS_ADMIN_VERSION);
                
                // Execute specific update actions if necessary
                if (class_exists('RoadPress_Database')) {
                    RoadPress_Database::check_and_create_tables();
                }
                
                // Force statistics aggregation after update
                if (class_exists('RoadPress_Stats')) {
                    RoadPress_Stats::aggregate_logs_to_stats();
                }
            }
        });
        
        // Initialize admin menu
        add_action('admin_menu', array('RoadPress_Admin_Menu', 'register_menus'));
        
        // Initialize REST API endpoints
        add_action('rest_api_init', array('RoadPress_API_Manager', 'register_endpoints'));
        
        // Allow API routes without authentication
        add_filter('rest_authentication_errors', array('RoadPress_API_Manager', 'allow_api_routes'));
        
        // Handle form submissions
        add_action('admin_init', array('RoadPress_Stats', 'handle_export'));
        
        // Initialize the plugin settings
        add_action('admin_init', array('RoadPress_Page_API', 'register_settings'));

        // Schedule stats aggregation
        function roadpress_schedule_stats_aggregation() {
            if (!wp_next_scheduled('roadpress_aggregate_stats')) {
                wp_schedule_event(time(), 'hourly', 'roadpress_aggregate_stats');
            }
        }
        add_action('wp', 'roadpress_schedule_stats_aggregation');

        // Hook for stats aggregation
        function roadpress_do_stats_aggregation() {
            RoadPress_Stats::aggregate_logs_to_stats();
        }
        add_action('roadpress_aggregate_stats', 'roadpress_do_stats_aggregation');
    }
    
    /**
     * Load required files
     */
    private static function load_files() {
        // Include core classes
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-database.php';
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-license.php';
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-api-manager.php';
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-stats.php';
        
        // Admin classes
        require_once ROADPRESS_ADMIN_PATH . 'admin/class-roadpress-admin-menu.php';
        require_once ROADPRESS_ADMIN_PATH . 'admin/class-roadpress-admin-ajax.php';
        
        // API classes
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-logs-api.php';
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-stats-api.php';
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-licenses-api.php';
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-openai-deepl-api.php';
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-poi-api.php';
        require_once ROADPRESS_ADMIN_PATH . 'includes/class-roadpress-sms-pricing.php';
        
        // Page templates 
        require_once ROADPRESS_ADMIN_PATH . 'pages/class-roadpress-page-licenses.php';
        require_once ROADPRESS_ADMIN_PATH . 'pages/class-roadpress-page-stats.php';
        require_once ROADPRESS_ADMIN_PATH . 'pages/class-roadpress-page-api.php';
        require_once ROADPRESS_ADMIN_PATH . 'pages/class-roadpress-page-poi-map.php';
    }
}

// Initialize the plugin
RoadPress_Admin::init();