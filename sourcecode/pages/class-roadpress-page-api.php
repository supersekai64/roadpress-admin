<?php
/**
 * API configuration page
 */
class RoadPress_Page_API {
    
    /**
     * Initialize the API settings
     * This needs to be called during plugin initialization
     */
    public static function init() {
        add_action('admin_init', array(__CLASS__, 'register_settings'));
    }
    
    /**
     * Register plugin settings
     */
    public static function register_settings() {
        // Enregistrer le groupe de paramètres
        register_setting('roadpress_api_settings_group', 'roadpress_deepl_api_key');
        register_setting('roadpress_api_settings_group', 'roadpress_openai_api_key');
        register_setting('roadpress_api_settings_group', 'roadpress_brevo_api_key');
        register_setting('roadpress_api_settings_group', 'roadpress_mapbox_api_key');
    }
    
    /**
     * Display the API settings page
     */
    public static function display_page() {
        // Process form submission
        self::handle_form_submission();
        
        // Show any saved settings notices
        settings_errors('roadpress_api_messages');
        ?>
        <div class="wrap">
            <h1>Configuration des clés API</h1>
            
            <form method="post" action="options.php">
                <?php
                // Register API keys settings
                settings_fields('roadpress_api_settings_group');
                do_settings_sections('roadpress-api-settings');
                ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">DeepL API</th>
                        <td>
                            <input type="text" name="roadpress_deepl_api_key" value="<?php echo esc_attr(get_option('roadpress_deepl_api_key')); ?>" style="width: 400px;" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">OpenAI API</th>
                        <td>
                            <input type="text" name="roadpress_openai_api_key" value="<?php echo esc_attr(get_option('roadpress_openai_api_key')); ?>" style="width: 400px;" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Brevo API</th>
                        <td>
                            <input type="text" name="roadpress_brevo_api_key" value="<?php echo esc_attr(get_option('roadpress_brevo_api_key')); ?>" style="width: 400px;" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Mapbox API</th>
                        <td>
                            <input type="text" name="roadpress_mapbox_api_key" value="<?php echo esc_attr(get_option('roadpress_mapbox_api_key')); ?>" style="width: 400px;" />
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>

            <h2>Envoyer les clés API à tous les sites clients associés</h2>
            <form method="post" id="push-api-keys-form">
                <?php wp_nonce_field('roadpress_admin', 'push_api_keys_nonce'); ?>
                <input type="submit" name="push_api_keys_to_clients" class="button button-primary" value="Envoyer les clés">
            </form>
            
            <div id="push-api-keys-result"></div>
            
            <script>
                jQuery(document).ready(function($) {
                    $('#push-api-keys-form').on('submit', function(e) {
                        e.preventDefault();
                        
                        var $resultArea = $('#push-api-keys-result');
                        $resultArea.html('<p>Envoi des clés API aux sites clients...</p>');
                        
                        $.ajax({
                            url: ajaxurl,
                            type: 'POST',
                            data: {
                                action: 'roadpress_push_api_keys',
                                nonce: '<?php echo wp_create_nonce('roadpress_admin'); ?>'
                            },
                            success: function(response) {
                                if (response.success) {
                                    $resultArea.html('<div class="notice notice-success"><p>' + response.data + '</p></div>');
                                } else {
                                    var errorMsg = response.data.message;
                                    if (response.data.errors && response.data.errors.length > 0) {
                                        errorMsg += '<ul>';
                                        $.each(response.data.errors, function(i, error) {
                                            errorMsg += '<li>' + error + '</li>';
                                        });
                                        errorMsg += '</ul>';
                                    }
                                    $resultArea.html('<div class="notice notice-error"><p>' + errorMsg + '</p></div>');
                                }
                            },
                            error: function() {
                                $resultArea.html('<div class="notice notice-error"><p>Erreur de connexion au serveur.</p></div>');
                            }
                        });
                    });
                });
            </script>
        </div>
        <?php
    }
    
    /**
     * Handle form submission directly (not via AJAX)
     */
    private static function handle_form_submission() {
        if (isset($_POST['push_api_keys_to_clients']) && 
            isset($_POST['push_api_keys_nonce']) && 
            wp_verify_nonce($_POST['push_api_keys_nonce'], 'roadpress_admin')) {
            
            $result = RoadPress_API_Manager::push_api_keys_to_clients();
            
            if ($result['success']) {
                add_settings_error(
                    'roadpress_api_messages',
                    'roadpress_api_message',
                    $result['message'],
                    'updated'
                );
            } else {
                add_settings_error(
                    'roadpress_api_messages',
                    'roadpress_api_message',
                    $result['message'],
                    'error'
                );
            }
        }
    }
}