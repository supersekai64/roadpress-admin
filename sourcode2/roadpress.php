<?php
/*
Plugin Name: Roadpress
Description: Generate unique travel books with the power of AI and your data
Version: 1.0.0
Author: Roadpress
Author URI: https://roadpress.fr
Text Domain: roadpress
Domain Path: /languages
*/
	
// Security: preventing direct access
if ( !defined('ABSPATH') ) {
	exit;
}

// Define version constant
if (!defined('ROADPRESS_VERSION')) {
    define('ROADPRESS_VERSION', '1.0.0');
}

// Define constants for file paths
if (!defined('ROADPRESS_PLUGIN_DIR')) {
    define('ROADPRESS_PLUGIN_DIR', plugin_dir_path(__FILE__));
}
if (!defined('ROADPRESS_PLUGIN_URL')) {
    define('ROADPRESS_PLUGIN_URL', plugin_dir_url(__FILE__));
}

// Include the vendors files
require ROADPRESS_PLUGIN_DIR . 'vendor/autoload.php';

// Include API configuration
require_once ROADPRESS_PLUGIN_DIR . 'config.php';

// Initialize OpenAI client with API key
$openaiApiKey = get_option('roadpress_openai_api_key');
$client = \OpenAI::client($openaiApiKey);

// Initialize Brevo client with API key
use Brevo\Client\Configuration;
use Brevo\Client\Api\AccountApi;

$brevoApiKey = get_option('roadpress_brevo_api_key');
$config = Configuration::getDefaultConfiguration()->setApiKey('api-key', $brevoApiKey);
$apiInstance = new AccountApi(null, $config);

// Include the core files
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-tables.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-admin-menu.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-licence.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-api-cron.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-taxonomy-playlist.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-meta-fields.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-roles.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-user.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-shortcode.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-flow.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-statistics.php';
require_once ROADPRESS_PLUGIN_DIR . 'core/class-roadpress-core-utilities.php';


// Include the admin pages files
if (is_admin()) {
    require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-page-dashboard.php';
	require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-page-roadpress.php';
	require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-page-statistics.php';
    require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-page-playlists.php';
	require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-page-flow.php';
	require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-page-parameters.php';
	require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-page-licence.php';
    require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-page-debug.php';
	require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-scripts.php';
	require_once ROADPRESS_PLUGIN_DIR . 'admin/class-roadpress-admin-ajax-handlers.php';
}

// Function to execute when the plugin is activated
register_activation_hook(__FILE__, 'roadpress_activate_plugin');
function roadpress_activate_plugin() {
	// Create or update the tables, roles and login page
    create_or_update_roadpress_tables();
    create_roadpress_role();
    create_roadpress_login_page();

    // Recover API keys immediately upon activation
    roadpress_fetch_api_keys();

    // Schedule recurring tasks
    roadpress_schedule_license_check();
    roadpress_schedule_logs_send();
    roadpress_schedule_stats_send();
    roadpress_schedule_api_keys_fetch();
}

// Records plugin cron events
function roadpress_register_cron_events() {
}
register_activation_hook(__FILE__, 'roadpress_register_cron_events');

add_action('init', function() {
    if (!wp_next_scheduled('roadpress_process_pois_event')) {
    }
});

// Add new image sizes
add_image_size('roadpress-playlist-thumb', 200, 132, true);

// Query vars
function roadpress_add_query_vars($vars) {
    $vars[] = 'roadpress_id';
    $vars[] = 'lang';
    return $vars;
}
add_filter('query_vars', 'roadpress_add_query_vars');

// Redirect to the custom template
function roadpress_template_redirect() {
    if (get_query_var('roadpress_id')) {
        $roadpress_id = sanitize_text_field(get_query_var('roadpress_id'));
        $lang = sanitize_text_field(get_query_var('lang'));
        $template = ROADPRESS_PLUGIN_DIR . 'public/templates/01/template.php';
        status_header(200);
        include($template);
        exit;
    }
}
add_action('template_redirect', 'roadpress_template_redirect');

// Adding rewriting rules
function roadpress_add_rewrite_rules() {
    add_rewrite_rule(
        '^roadpress=([^/]+)?(?:/([^/]+))?/?$',
        'index.php?roadpress_id=$matches[1]&lang=$matches[2]',
        'top'
    );
    add_rewrite_tag('%roadpress_id%', '([^&]+)');
    add_rewrite_tag('%lang%', '([^&]+)');
}
add_action('init', 'roadpress_add_rewrite_rules');

// Flush rewrite rules when the plugin is activated
function roadpress_flush_rewrite_rules() {
	roadpress_add_rewrite_rules();
	flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'roadpress_flush_rewrite_rules');

// Function to execute when the plugin is deactivated
register_deactivation_hook(__FILE__, 'roadpress_deactivate_plugin');
function roadpress_deactivate_plugin() {
    delete_option('roadpress_rewrite_rules_added');
	delete_option('roadpress_openai_api_key');
    delete_option('roadpress_brevo_api_key');
	delete_option('roadpress_deepl_api_key');
    delete_option('roadpress_mapbox_api_key');
    flush_rewrite_rules();
}

?>