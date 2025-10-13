<?php
/**
 * Admin menu management for RoadPress Admin
 */
class RoadPress_Admin_Menu {
    
    /**
     * Register all admin menus and submenus
     */
    public static function register_menus() {
        // Main admin menu
        add_menu_page(
            'Roadpress',
            'Roadpress',
            'manage_options',
            'roadpress-admin',
            null,
            'dashicons-admin-network',
            6
        );

        // Licences submenu
        add_submenu_page(
            'roadpress-admin',
            'Gestion des licences',
            'Gestion des licences',
            'manage_options',
            'roadpress-admin',
            array('RoadPress_Page_Licenses', 'display_page')
        );

        // API statistics submenu
        add_submenu_page(
            'roadpress-admin',
            'Statistiques API',
            'Statistiques API',
            'manage_options',
            'roadpress-api-statistics',
            array('RoadPress_Page_Stats', 'display_page')
        );

        // API configuration submenu
        add_submenu_page(
            'roadpress-admin',
            'Clés API',
            'Clés API',
            'manage_options',
            'roadpress-api-settings',
            array('RoadPress_Page_API', 'display_page')
        );

        // POI map submenu
        add_submenu_page(
            'roadpress-admin',
            'POI Map', 
            'Carte des POIs',
            'manage_options',
            'roadpress-poi-map',
            array('RoadPress_Page_POI_Map', 'display_page')
        );
    }
}