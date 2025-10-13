<?php
/**
 * Database management class for RoadPress Admin
 * Handles table creation and structure
 */
class RoadPress_Database {
    
    /**
     * Initialize all database tables
     */
    public static function init_tables() {
        self::create_license_table();
        self::create_email_stats_table();
        self::create_monthly_email_stats_table();
        self::create_sms_stats_table();
        self::create_monthly_sms_stats_table();
        self::create_email_logs_table();
        self::create_sms_logs_table();
        self::create_deepl_stats_table();
        self::create_openai_stats_table();
        self::create_client_pois_table();
        self::create_monthly_deepl_stats_table();
        self::create_monthly_openai_stats_table();
    }
    
    /**
     * Create the main license table
     */
    private static function create_license_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'licenses';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            status varchar(50) DEFAULT 'inactive',
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            start_date date NOT NULL,
            end_date date NOT NULL,
            site_url varchar(255) DEFAULT NULL,
            is_associated tinyint(1) DEFAULT 0,
            last_update datetime DEFAULT CURRENT_TIMESTAMP,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the email statistics table
     */
    private static function create_email_stats_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_email_stats';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            email_stats int(11) DEFAULT 0,
            last_update datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            KEY license_key (license_key)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the monthly email statistics table
     */
    private static function create_monthly_email_stats_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_email_stats_monthly';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            stat_year int(4) NOT NULL,
            stat_month int(2) NOT NULL,
            email_stats int(11) DEFAULT 0,
            last_update datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_license_month (license_key, client_name, stat_year, stat_month),
            KEY license_key (license_key)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the SMS statistics table
     */
    private static function create_sms_stats_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_sms_stats';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            sms_sent int(11) DEFAULT 0,
            country varchar(255) DEFAULT NULL,
            last_update datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            KEY license_key (license_key),
            KEY country (country)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the monthly SMS statistics table
     */
    private static function create_monthly_sms_stats_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_sms_stats_monthly';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            country varchar(255) NOT NULL,
            stat_year int(4) NOT NULL,
            stat_month int(2) NOT NULL,
            sms_sent int(11) DEFAULT 0,
            last_update datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_lic_client_country_month (license_key, client_name, country, stat_year, stat_month),
            KEY license_key (license_key),
            KEY country (country)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the email logs table
     */
    private static function create_email_logs_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_email_logs';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            client_id INT NOT NULL,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            send_date datetime NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_log (client_id, send_date),
            KEY license_key (license_key)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the SMS logs table
     */
    private static function create_sms_logs_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_sms_logs';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            client_id INT NOT NULL,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            phone varchar(20) NOT NULL,
            country varchar(255) NOT NULL,
            send_date datetime NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_log (client_id, phone, send_date),
            KEY license_key (license_key),
            KEY country (country)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the DeepL statistics table
     */
    private static function create_deepl_stats_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_deepl_stats';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            tokens_used int(11) DEFAULT 0,
            estimated_cost float(10,2) DEFAULT 0.00,
            last_update datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_license_key (license_key)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the OpenAI statistics table
     */
    private static function create_openai_stats_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_openai_stats';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            tokens_used int(11) DEFAULT 0,
            estimated_cost float(10,2) DEFAULT 0.00,
            last_update datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_license_key (license_key)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the POI table for client points of interest
     */
    private static function create_client_pois_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'client_pois';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            client_id INT NOT NULL,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            site_url varchar(255) NOT NULL,
            site_name varchar(255) NOT NULL,
            poi_id int(11) NOT NULL,
            name varchar(255) NOT NULL,
            type varchar(50) DEFAULT '',
            address text,
            latitude decimal(10,6) NOT NULL,
            longitude decimal(10,6) NOT NULL,
            visit_count int(11) DEFAULT 0,
            season_data text,
            created_at datetime DEFAULT NULL,
            updated_at datetime DEFAULT NULL,
            sync_date datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY client_id (client_id),
            KEY license_key (license_key),
            KEY latitude (latitude),
            KEY longitude (longitude)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the monthly DeepL statistics table
     */
    private static function create_monthly_deepl_stats_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_deepl_stats_monthly';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            stat_year_month varchar(7) NOT NULL,
            tokens_used int(11) NOT NULL DEFAULT 0,
            estimated_cost float(10,2) NOT NULL DEFAULT 0.00,
            last_update datetime NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_license_month (license_key, stat_year_month)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Create the monthly OpenAI statistics table
     */
    private static function create_monthly_openai_stats_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'license_openai_stats_monthly';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            license_key varchar(255) NOT NULL,
            client_name varchar(255) NOT NULL,
            stat_year_month varchar(7) NOT NULL,
            tokens_used int(11) NOT NULL DEFAULT 0,
            estimated_cost float(10,2) NOT NULL DEFAULT 0.00,
            last_update datetime NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_license_month (license_key, stat_year_month)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Check and create tables if they don't exist
     */
    public static function check_and_create_tables() {
        global $wpdb;
        
        // Check license table
        $license_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}licenses'");
        if (!$license_exists) {
            self::create_license_table();
        }
        
        // Check email stats table
        $email_stats_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_email_stats'");
        if (!$email_stats_exists) {
            self::create_email_stats_table();
        }
        
        // Check monthly email stats table
        $email_monthly_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_email_stats_monthly'");
        if (!$email_monthly_exists) {
            self::create_monthly_email_stats_table();
        }
        
        // Check SMS stats table
        $sms_stats_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_sms_stats'");
        if (!$sms_stats_exists) {
            self::create_sms_stats_table();
        }
        
        // Check monthly SMS stats table
        $sms_monthly_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_sms_stats_monthly'");
        if (!$sms_monthly_exists) {
            self::create_monthly_sms_stats_table();
        }
        
        // Check email logs table
        $email_logs_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_email_logs'");
        if (!$email_logs_exists) {
            self::create_email_logs_table();
        }
        
        // Check SMS logs table
        $sms_logs_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_sms_logs'");
        if (!$sms_logs_exists) {
            self::create_sms_logs_table();
        }
        
        // Check DeepL stats table
        $deepl_stats_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_deepl_stats'");
        if (!$deepl_stats_exists) {
            self::create_deepl_stats_table();
        }
        
        // Check monthly DeepL stats table
        $deepl_monthly_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_deepl_stats_monthly'");
        if (!$deepl_monthly_exists) {
            self::create_monthly_deepl_stats_table();
        }
        
        // Check OpenAI stats table
        $openai_stats_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_openai_stats'");
        if (!$openai_stats_exists) {
            self::create_openai_stats_table();
        }
        
        // Check monthly OpenAI stats table
        $openai_monthly_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}license_openai_stats_monthly'");
        if (!$openai_monthly_exists) {
            self::create_monthly_openai_stats_table();
        }
        
        // Check client POIs table
        $client_pois_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}client_pois'");
        if (!$client_pois_exists) {
            self::create_client_pois_table();
        }
        
        // Vérifier si la colonne last_update existe dans la table licenses
        $has_last_update = $wpdb->get_var("SHOW COLUMNS FROM {$wpdb->prefix}licenses LIKE 'last_update'");
        if (!$has_last_update) {
            $wpdb->query("ALTER TABLE {$wpdb->prefix}licenses ADD COLUMN last_update datetime DEFAULT CURRENT_TIMESTAMP");
        }
        
        // Vérifier si la colonne created_at existe dans la table licenses
        $has_created_at = $wpdb->get_var("SHOW COLUMNS FROM {$wpdb->prefix}licenses LIKE 'created_at'");
        if (!$has_created_at) {
            $wpdb->query("ALTER TABLE {$wpdb->prefix}licenses ADD COLUMN created_at datetime DEFAULT CURRENT_TIMESTAMP");
        }
        
        // Vérifier si created_at existe dans la table email_logs
        $has_email_created_at = $wpdb->get_var("SHOW COLUMNS FROM {$wpdb->prefix}license_email_logs LIKE 'created_at'");
        if (!$has_email_created_at) {
            $wpdb->query("ALTER TABLE {$wpdb->prefix}license_email_logs ADD COLUMN created_at datetime DEFAULT CURRENT_TIMESTAMP");
        }
        
        // Vérifier si created_at existe dans la table sms_logs
        $has_sms_created_at = $wpdb->get_var("SHOW COLUMNS FROM {$wpdb->prefix}license_sms_logs LIKE 'created_at'");
        if (!$has_sms_created_at) {
            $wpdb->query("ALTER TABLE {$wpdb->prefix}license_sms_logs ADD COLUMN created_at datetime DEFAULT CURRENT_TIMESTAMP");
        }
        
        // Vérifier si created_at existe dans email_stats
        $has_email_stats_created_at = $wpdb->get_var("SHOW COLUMNS FROM {$wpdb->prefix}license_email_stats LIKE 'created_at'");
        if (!$has_email_stats_created_at) {
            $wpdb->query("ALTER TABLE {$wpdb->prefix}license_email_stats ADD COLUMN created_at datetime DEFAULT CURRENT_TIMESTAMP");
        }
        
        // Vérifier si created_at existe dans sms_stats
        $has_sms_stats_created_at = $wpdb->get_var("SHOW COLUMNS FROM {$wpdb->prefix}license_sms_stats LIKE 'created_at'");
        if (!$has_sms_stats_created_at) {
            $wpdb->query("ALTER TABLE {$wpdb->prefix}license_sms_stats ADD COLUMN created_at datetime DEFAULT CURRENT_TIMESTAMP");
        }
        
        // Vérifier si created_at existe dans deepl_stats
        $has_deepl_stats_created_at = $wpdb->get_var("SHOW COLUMNS FROM {$wpdb->prefix}license_deepl_stats LIKE 'created_at'");
        if (!$has_deepl_stats_created_at) {
            $wpdb->query("ALTER TABLE {$wpdb->prefix}license_deepl_stats ADD COLUMN created_at datetime DEFAULT CURRENT_TIMESTAMP");
        }
        
        // Vérifier si created_at existe dans openai_stats
        $has_openai_stats_created_at = $wpdb->get_var("SHOW COLUMNS FROM {$wpdb->prefix}license_openai_stats LIKE 'created_at'");
        if (!$has_openai_stats_created_at) {
            $wpdb->query("ALTER TABLE {$wpdb->prefix}license_openai_stats ADD COLUMN created_at datetime DEFAULT CURRENT_TIMESTAMP");
        }
    }

    /**
     * Update a site URL for a license
     * 
     * @param string $license_key License key
     * @param string $site_url Site URL
     * @return bool Update success
     */
    public static function update_license_site_url($license_key, $site_url) {
        global $wpdb;
        
        // First, mark the other licenses for this site as "overridden"
        $wpdb->query($wpdb->prepare(
            "UPDATE {$wpdb->prefix}licenses 
             SET status = 'overridden', 
                 last_update = %s
             WHERE site_url = %s 
             AND license_key != %s 
             AND status = 'active'",
            current_time('mysql'),
            $site_url,
            $license_key
        ));
        
        // Then update the current license
        $result = $wpdb->update(
            "{$wpdb->prefix}licenses",
            [
                'site_url' => $site_url,
                'status' => 'active',
                'is_associated' => 1,
                'last_update' => current_time('mysql')
            ],
            ['license_key' => $license_key]
        );
        
        return $result !== false;
    }
}