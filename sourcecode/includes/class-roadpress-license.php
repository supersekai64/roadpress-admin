<?php
/**
 * License management class for RoadPress Admin
 */
class RoadPress_License {
    
    /**
     * Create a new license
     * 
     * @param string $client_name The client's name
     * @param string $start_date Start date in Y-m-d format
     * @param string $end_date End date in Y-m-d format
     * @return array Result with success status and license key
     */
    public static function create_license($client_name, $start_date, $end_date) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'licenses';
        
        $license_key = self::generate_license_key();
        
        $result = $wpdb->insert($table_name, [
            'license_key' => $license_key,
            'client_name' => $client_name,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'status' => 'inactive',
            'is_associated' => 0,
            'last_update' => current_time('mysql')
        ]);
        
        if ($result) {
            return array(
                'success' => true,
                'license_key' => $license_key
            );
        } else {
            return array(
                'success' => false,
                'message' => 'Échec de la création de la licence'
            );
        }
    }
    
    /**
     * Delete a license by its ID and all associated statistics
     * 
     * @param int $license_id The license ID
     * @return array Result with success status and message
     */
    public static function delete_license($license_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'licenses';

        // Recover license information before deletion
        $license = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $license_id));
        
        if (!$license) {
            return [
                'success' => false,
                'message' => 'Licence non trouvée'
            ];
        }
        
        $license_key = $license->license_key;
        $site_url = $license->site_url;
        
        // Delete license
        $deleted = $wpdb->delete($table_name, ['id' => $license_id]);
        
        if (!$deleted) {
            return [
                'success' => false,
                'message' => 'Échec de la suppression de la licence'
            ];
        }
        
        // Delete all associated statistics
        self::delete_license_statistics($license_key);
        
        // Notify customer site of license disassociation
        if ($site_url) {
            wp_remote_post($site_url . '/wp-json/roadpress/v1/disassociate_license', [
                'body' => [
                    'license_key' => $license_key,
                ],
            ]);
        }
        
        wp_cache_flush();
        
        return [
            'success' => true,
            'message' => 'Licence et statistiques associées supprimées avec succès'
        ];
    }

    /**
     * Delete all statistics for a given license key
     * 
     * @param string $license_key License key
     */
    private static function delete_license_statistics($license_key) {
        global $wpdb;
        
        $stats_tables = [
            $wpdb->prefix . 'license_deepl_stats',
            $wpdb->prefix . 'license_deepl_stats_monthly',
            $wpdb->prefix . 'license_openai_stats',
            $wpdb->prefix . 'license_openai_stats_monthly',
            $wpdb->prefix . 'license_email_stats',
            $wpdb->prefix . 'license_email_stats_monthly',
            $wpdb->prefix . 'license_sms_stats',
            $wpdb->prefix . 'license_sms_stats_monthly',
            $wpdb->prefix . 'license_email_logs', 
            $wpdb->prefix . 'license_sms_logs'
        ];
        
        foreach ($stats_tables as $table) {
            $wpdb->delete($table, ['license_key' => $license_key]);
        }
    }
        
    /**
     * Generate a unique license key
     * 
     * @return string The generated license key
     */
    private static function generate_license_key() {
        return strtoupper(bin2hex(random_bytes(8))); // 16 characters hex string
    }
    
    /**
     * Update license status based on expiration date
     * Sets status to 'expired' for licenses that have passed their end date
     */
    public static function update_license_status() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'licenses';
        
        // Get current date
        $current_date = current_time('Y-m-d');
        
        // Update expired licenses
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE $table_name 
                SET status = 'expired' 
                WHERE end_date < %s AND status != 'expired'",
                $current_date
            )
        );
    }
    
    /**
     * Get all licenses with optional filtering
     * 
     * @param array $args Optional arguments for filtering
     * @return array List of licenses
     */
    public static function get_licenses($args = array()) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'licenses';
        
        $default_args = array(
            'status' => null,
            'client_name' => null,
            'is_associated' => null
        );
        
        $args = wp_parse_args($args, $default_args);
        $where = array();
        $values = array();
        
        // Build where conditions
        if (!is_null($args['status'])) {
            $where[] = 'status = %s';
            $values[] = $args['status'];
        }
        
        if (!is_null($args['client_name'])) {
            $where[] = 'client_name = %s';
            $values[] = $args['client_name'];
        }
        
        if (!is_null($args['is_associated'])) {
            $where[] = 'is_associated = %d';
            $values[] = (int) $args['is_associated'];
        }
        
        // Build the query
        $sql = "SELECT * FROM $table_name";
        
        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
            $sql = $wpdb->prepare($sql, $values);
        }
        
        // Execute and return
        return $wpdb->get_results($sql, ARRAY_A);
    }
}
