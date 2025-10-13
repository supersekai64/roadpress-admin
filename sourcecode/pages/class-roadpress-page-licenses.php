<?php
/**
 * License management page
 */
class RoadPress_Page_Licenses {
    
    /**
     * Display the license management page
     */
    public static function display_page() {
        // Update license status before displaying the page
        RoadPress_License::update_license_status();
        
        ?>
        <div class="wrap">
            <h1>Gestion des licences</h1>
            
            <!-- License creation form -->
            <form method="post" id="create-license-form">
                <h2>Créer une nouvelle licence</h2>
                <table class="form-table">
                    <tr>
                        <th style="padding: 5px 0;"><label for="client_name">Nom du client</label></th>
                        <td style="padding: 5px 0;"><input type="text" name="client_name" id="client_name" required /></td>
                    </tr>
                    <tr>
                        <th style="padding: 5px 0;"><label for="start_date">Date de début</label></th>
                        <td style="padding: 5px 0;"><input type="date" name="start_date" id="start_date" required /></td>
                    </tr>
                    <tr>
                        <th style="padding: 5px 0;"><label for="end_date">Date de fin</label></th>
                        <td style="padding: 5px 0;"><input type="date" name="end_date" id="end_date" required /></td>
                    </tr>
                </table>
                <?php wp_nonce_field('roadpress_create_license', 'roadpress_license_nonce'); ?>
                <p class="submit">
                    <input type="submit" name="submit" id="submit" class="button button-primary" value="Créer la licence">
                </p>
            </form>
            
            <div id="license-creation-message"></div>
            
            <!-- Existing licenses -->
            <hr />
            <h2>Licences existantes</h2>
            <?php self::display_licenses(); ?>
            
            <!-- Manual statistics retrieval forms -->
            <div class="sync-forms">
                <h2>Synchronisation manuelle</h2>

                <form method="post" id="logs" action="">
                    <?php wp_nonce_field('roadpress_admin', 'logs_nonce'); ?>
                    <input type="submit" name="trigger_client_logs_send" class="button button-primary" value="Consommation Brevo">
                </form>

                <form method="post" id="api-usage" action="">
                    <?php wp_nonce_field('roadpress_admin', 'api_stats_nonce'); ?>
                    <input type="submit" name="trigger_client_api_stats_send" class="button button-primary" value="Consommation OpenAI / DeepL">
                </form>

                <form method="post" id="poi-sync" action="">
                    <?php wp_nonce_field('roadpress_admin', 'poi_sync_nonce'); ?>
                    <input type="submit" name="trigger_client_poi_sync" class="button button-primary" value="Données des POIs">
                </form>
            </div>
            
            <?php
            // Handle form submissions for synchronization        
            if (isset($_POST['trigger_client_logs_send']) && 
                wp_verify_nonce($_POST['logs_nonce'], 'roadpress_admin')) {
                $result = RoadPress_API_Manager::trigger_client_logs_send();
                $class = $result['success'] ? 'updated' : 'error';
                echo '<div class="' . $class . '"><p>' . wp_kses_post($result['message']) . '</p></div>';
            }
            
            if (isset($_POST['trigger_client_api_stats_send']) && 
                wp_verify_nonce($_POST['api_stats_nonce'], 'roadpress_admin')) {
                $result = RoadPress_API_Manager::trigger_client_api_stats_send();
                $class = $result['success'] ? 'updated' : 'error';
                echo '<div class="' . $class . '"><p>' . wp_kses_post($result['message']) . '</p></div>';
            }
            
            if (isset($_POST['trigger_client_poi_sync']) && 
                wp_verify_nonce($_POST['poi_sync_nonce'], 'roadpress_admin')) {
                $result = RoadPress_API_Manager::trigger_client_poi_sync();
                $class = $result['success'] ? 'updated' : 'error';
                echo '<div class="' . $class . '"><p>' . wp_kses_post($result['message']) . '</p></div>';
            }
            ?>
            
            <script>
                jQuery(document).ready(function($) {
                    // Handle license creation via AJAX
                    $('#create-license-form').on('submit', function(e) {
                        e.preventDefault();
                        
                        var formData = new FormData(this);
                        formData.append('action', 'roadpress_create_license');
                        formData.append('nonce', '<?php echo wp_create_nonce('roadpress_admin'); ?>');
                        
                        $.ajax({
                            url: ajaxurl,
                            type: 'POST',
                            data: formData,
                            contentType: false,
                            processData: false,
                            success: function(response) {
                                if (response.success) {
                                    $('#license-creation-message').html('<div class="notice notice-success"><p>Licence créée avec succès. Clé de licence : <strong>' + response.data.license_key + '</strong></p></div>');
                                    $('#create-license-form')[0].reset();
                                } else {
                                    $('#license-creation-message').html('<div class="notice notice-error"><p>' + response.data + '</p></div>');
                                }
                            }
                        });
                    });
                    
                    // Handle license deletion via AJAX
                    $('.delete-license').on('click', function(e) {
                        e.preventDefault();
                        
                        if (!confirm('Etes-vous certain de vouloir supprimer cette licence ?')) {
                            return;
                        }
                        
                        var licenseId = $(this).data('license-id');
                        
                        $.ajax({
                            url: ajaxurl,
                            type: 'POST',
                            data: {
                                action: 'roadpress_delete_license',
                                license_id: licenseId,
                                nonce: '<?php echo wp_create_nonce('roadpress_admin'); ?>'
                            },
                            success: function(response) {
                                if (response.success) {
                                    location.reload();
                                } else {
                                    alert('Error: ' + response.data);
                                }
                            }
                        });
                    });
                });
            </script>
        </div>
        <?php
    }
    
    /**
     * Display all existing licenses
     */
    private static function display_licenses() {
        $licenses = RoadPress_License::get_licenses();
        
        if (empty($licenses)) {
            echo '<p>Aucune licence trouvée.</p>';
            return;
        }
        
        ?>
        <style>
            table.licence-table {
                border: 2px solid #aaa;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            .licence-table th, .licence-table td {
                text-align: left;
                border: 1px solid #ccc;
                vertical-align: middle;
                padding: 8px 10px;
            }
            .licence-table th {
                font-weight: bold;
                background: #eee;
            }
            .licence-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .licence-table tr:hover {
                background-color: #f0f0f0;
            }
            
            /* Status badges */
            .status-badge {
                display: inline-block;
                padding: 5px 0px;
                border-radius: 3px;
                color: #000;
                text-align: center;
                min-width: 80px;
            }
            .status-active {
                background-color: rgb(185, 251, 192)
            }
            .status-inactive {
                background-color: #999;
            }
            .status-expired {
                background-color: rgb(255, 207, 210)
            }
            .status-overridden {
                background-color: rgb(253, 228, 207)
            }
            
            /* Sync forms */
            .sync-forms {
                margin-top: 30px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .sync-forms form {
                display: inline-block;
                margin-right: 10px;
            }
        </style>
        
        <table class="widefat fixed licence-table" cellspacing="0">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Statut</th>
                    <th>Clé de licence</th>
                    <th>Nom du client</th>
                    <th>Date de début</th>
                    <th>Date de fin</th>
                    <th>Synchronisé</th>
                    <th>Site internet</th>
                    <th style="text-align: center;">Action</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($licenses as $license): ?>
                    <?php 
                    // Handle association status display
                    if ($license['is_associated'] == 1) {
                        $association = 'Oui';
                    } elseif ($license['status'] === 'overridden') {
                        $association = 'Écrasé';
                    } else {
                        $association = 'Non';
                    }
                    
                    // Prepare status display
                    $status_class = 'status-' . strtolower($license['status']);
                    $status_label = '';
                    
                    switch ($license['status']) {
                        case 'active':
                            $status_label = 'Actif';
                            break;
                        case 'inactive':
                            $status_label = 'Inactif';
                            break;
                        case 'expired':
                            $status_label = 'Expiré';
                            break;
                        case 'overridden':
                            $status_label = 'Écrasée';
                            break;
                        default:
                            $status_label = ucfirst($license['status']);
                    }
                    
                    $site_url = !empty($license['site_url']) ? esc_url($license['site_url']) : 'N/A';
                    ?>
                    <tr>
                        <td><?php echo esc_html($license['id']); ?></td>
                        <td><span class="status-badge <?php echo $status_class; ?>"><?php echo $status_label; ?></span></td>
                        <td><?php echo esc_html($license['license_key']); ?></td>
                        <td><?php echo esc_html($license['client_name']); ?></td>
                        <td><?php echo esc_html($license['start_date']); ?></td>
                        <td><?php echo esc_html($license['end_date']); ?></td>
                        <td><?php echo esc_html($association); ?></td>
                        <td>
                            <?php if (!empty($license['site_url'])): ?>
                                <a href="<?php echo $site_url; ?>" target="_blank"><?php echo $site_url; ?></a>
                            <?php else: ?>
                                N/A
                            <?php endif; ?>
                        </td>
                        <td style="text-align: center;">
                            <button class="button delete-license" data-license-id="<?php echo esc_attr($license['id']); ?>">Supprimer</button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <div class="license-legend">
            <h4>Légende des statuts</h4>
            <p>
                <span class="status-badge status-active">Actif</span> Licence valide et associée à un site
                <span class="status-badge status-inactive" style="margin-left: 15px;">Inactif</span> Licence valide mais non associée
                <span class="status-badge status-expired" style="margin-left: 15px;">Expiré</span> Licence expirée
                <span class="status-badge status-overridden" style="margin-left: 15px;">Écrasée</span> Licence remplacée par une nouvelle
            </p>
        </div>
        <?php
    }
}