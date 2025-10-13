<?php
/**
 * API Statistics page
 * Displays usage statistics for DeepL and OpenAI APIs
 */
class RoadPress_Page_Stats {
    
    /**
     * Display the API statistics page
     */
    public static function display_page() {
        global $wpdb;
        
        // Gestion de l'exportation CSV
        if (isset($_POST['export_api_stats']) && $_POST['export_api_stats'] == '1') {
            self::export_simple_stats_to_csv();
        }
        
        // Get filters
        $selected_client = isset($_GET['client']) ? sanitize_text_field($_GET['client']) : 'all';
        $selected_year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
        
        // Get client list
        $clients = RoadPress_Stats::get_clients();
        
        // Get available years
        $years = RoadPress_Stats::get_years();
        
        // Get API statistics
        $api_stats = RoadPress_Stats::get_api_statistics($selected_client, $selected_year);
        $deepl_stats = $api_stats['deepl_stats'];
        $openai_stats = $api_stats['openai_stats'];

        // Recover email statistics
        if ($selected_client !== 'all') {
            $email_stats = $wpdb->get_results($wpdb->prepare("
                SELECT 
                    client_name,
                    DATE_FORMAT(last_update, '%%Y-%%m') as stat_year_month,
                    SUM(email_stats) as emails_sent
                FROM 
                    {$wpdb->prefix}license_email_stats
                WHERE 
                    YEAR(last_update) = %d
                    AND client_name = %s
                GROUP BY 
                    client_name, stat_year_month
                ORDER BY 
                    stat_year_month, client_name
            ", $selected_year, $selected_client), ARRAY_A);
        } else {
            $email_stats = $wpdb->get_results($wpdb->prepare("
                SELECT 
                    client_name,
                    DATE_FORMAT(last_update, '%%Y-%%m') as stat_year_month,
                    SUM(email_stats) as emails_sent
                FROM 
                    {$wpdb->prefix}license_email_stats
                WHERE 
                    YEAR(last_update) = %d
                GROUP BY 
                    client_name, stat_year_month
                ORDER BY 
                    stat_year_month, client_name
            ", $selected_year), ARRAY_A);
        }

        // Retrieve SMS statistics
        if ($selected_client !== 'all') {
            $sms_stats = $wpdb->get_results($wpdb->prepare("
                SELECT 
                    client_name,
                    DATE_FORMAT(last_update, '%%Y-%%m') as stat_year_month,
                    country,
                    SUM(sms_sent) as sms_sent
                FROM 
                    {$wpdb->prefix}license_sms_stats
                WHERE 
                    YEAR(last_update) = %d
                    AND client_name = %s
                GROUP BY 
                    client_name, stat_year_month, country
                ORDER BY 
                    stat_year_month, client_name, country
            ", $selected_year, $selected_client), ARRAY_A);
        } else {
            $sms_stats = $wpdb->get_results($wpdb->prepare("
                SELECT 
                    client_name,
                    DATE_FORMAT(last_update, '%%Y-%%m') as stat_year_month,
                    country,
                    SUM(sms_sent) as sms_sent
                FROM 
                    {$wpdb->prefix}license_sms_stats
                WHERE 
                    YEAR(last_update) = %d
                GROUP BY 
                    client_name, stat_year_month, country
                ORDER BY 
                    stat_year_month, client_name, country
            ", $selected_year), ARRAY_A);
        }
        
        // Prepare data for charts
        $months = [];
        $deepl_data = [];
        $openai_data = [];
        $total_deepl = 0;
        $total_openai = 0;
        
        // Initialize data for all months of the year
        for ($m = 1; $m <= 12; $m++) {
            $month_key = sprintf('%04d-%02d', $selected_year, $m);
            $months[] = date('M', strtotime($month_key . '-01'));
            $deepl_data[$month_key] = 0;
            $openai_data[$month_key] = 0;
            $email_data[$month_key] = 0;
            $sms_data[$month_key] = 0;
        }
        
        // Fill DeepL data
        foreach ($deepl_stats as $stat) {
            $month_key = $stat['stat_year_month'];
            if (!isset($deepl_data[$month_key])) {
                $deepl_data[$month_key] = 0;
            }
            $deepl_data[$month_key] += intval($stat['tokens_used']); // Additionne au lieu d'écraser
            $total_deepl += intval($stat['tokens_used']);
        }

        // Fill OpenAI data
        foreach ($openai_stats as $stat) {
            $month_key = $stat['stat_year_month'];
            if (!isset($openai_data[$month_key])) {
                $openai_data[$month_key] = 0;
            }
            $openai_data[$month_key] += intval($stat['tokens_used']); // Additionne au lieu d'écraser
            $total_openai += intval($stat['tokens_used']);
        }
        
        // Sort data by month
        ksort($deepl_data);
        ksort($openai_data);
        
        // Convert to arrays for charts
        $deepl_values = array_values($deepl_data);
        $openai_values = array_values($openai_data);

        // Prepare data for email and SMS graphics
        $email_values = array_fill(0, 12, 0);
        $sms_values = array_fill(0, 12, 0);
        $total_emails = 0;
        $total_sms = 0;
        $total_sms_cost = 0;

        // Fill in data for emails
        if (!empty($email_stats)) {
            foreach ($email_stats as $stat) {
                $month = intval(substr($stat['stat_year_month'], -2)) - 1; // Convert MM to index 0-11
                $email_values[$month] += intval($stat['emails_sent']);
                $total_emails += intval($stat['emails_sent']);
            }
        }

        // Fill in SMS data and calculate costs per country
        if (!empty($sms_stats)) {
            foreach ($sms_stats as $stat) {
                $month = intval(substr($stat['stat_year_month'], -2)) - 1; // Convert MM to index 0-11
                $sms_count = intval($stat['sms_sent']);
                $country = $stat['country'];
                
                $sms_values[$month] += $sms_count;
                $total_sms += $sms_count;
                
                // Calculate the cost using the country tariff
                $sms_cost = RoadPress_SMS_Pricing::calculate_sms_cost($country, $sms_count);
                $total_sms_cost += $sms_cost;
                
                // Add unit cost and total cost to statistics
                $stat['unit_price'] = RoadPress_SMS_Pricing::get_sms_price($country);
                $stat['total_cost'] = $sms_cost;
            }
        }
        
        ?>
        <div class="wrap">
            <h1>Statistiques d'utilisation des API</h1>
            
            <!-- Filters -->
            <div class="tablenav top" style="margin-bottom: 20px;">
                <form method="get">
                    <input type="hidden" name="page" value="roadpress-api-statistics">
                    
                    <div style="float: left; margin-right: 10px;">
                        <label for="client">Client :</label>
                        <select name="client" id="client">
                            <option value="all" <?php selected($selected_client, 'all'); ?>>Tous</option>
                            <?php foreach ($clients as $client): ?>
                                <option value="<?php echo esc_attr($client->client_name); ?>" <?php selected($selected_client, $client->client_name); ?>>
                                    <?php echo esc_html($client->client_name); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <div style="float: left; margin-right: 10px;">
                        <label for="year">Année :</label>
                        <select name="year" id="year">
                            <?php foreach ($years as $year): ?>
                                <option value="<?php echo $year; ?>" <?php selected($selected_year, $year); ?>>
                                    <?php echo $year; ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    
                    <input type="submit" class="button action" value="Filtrer">
                </form>
            </div>
            <div style="clear:both;"></div>
            
            <!-- Summary -->
            <div class="api-stats-summary" style="margin-bottom: 30px;">
                <h2>Résumé pour <?php echo $selected_year; ?></h2>
                <div class="stats-cards" style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div class="stats-card" style="flex: 1; min-width: 200px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="margin-top: 0;">DeepL</h3>
                        <div class="stats-value"><?php echo number_format($total_deepl); ?> tokens</div>
                        <div class="stats-cost">≈ <?php echo number_format($total_deepl * 0.00002, 2); ?>€</div>
                    </div>
                    <div class="stats-card" style="flex: 1; min-width: 200px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="margin-top: 0;">OpenAI</h3>
                        <div class="stats-value"><?php echo number_format($total_openai); ?> tokens</div>
                        <div class="stats-cost">≈ <?php echo number_format($total_openai * 0.0000016, 2); ?>€</div>
                    </div>
                    <div class="stats-card" style="flex: 1; min-width: 200px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="margin-top: 0;">Brevo (SMS)</h3>
                        <div class="stats-value"><?php echo number_format($total_sms); ?> SMS</div>
                        <div class="stats-cost">≈ <?php echo number_format($total_sms_cost, 2); ?>€</div>
                    </div>
                    <div class="stats-card" style="flex: 1; min-width: 200px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="margin-top: 0;">Brevo (E-mail)</h3>
                        <div class="stats-value"><?php echo number_format($total_emails); ?> emails</div>
                        <div class="stats-cost"></div>
                    </div>
                </div>
            </div>
            
            <!-- Charts - First row: DeepL and OpenAI -->
            <div class="api-stats-charts" style="margin-bottom: 40px;">
                <div class="charts-row" style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
                    <div class="chart-container" style="flex: 1; min-width: 45%;">
                        <h3>DeepL - Consommation mensuelle</h3>
                        <canvas id="deeplChart" width="400" height="200"></canvas>
                    </div>
                    <div class="chart-container" style="flex: 1; min-width: 45%;">
                        <h3>OpenAI - Consommation mensuelle</h3>
                        <canvas id="openaiChart" width="400" height="200"></canvas>
                    </div>
                </div>
                <!-- Charts - Second row: Email and SMS -->
                <div class="charts-row" style="display: flex; flex-wrap: wrap; gap: 20px;">
                    <div class="chart-container" style="flex: 1; min-width: 45%;">
                        <h3>E-mails (Brevo) - Consommation mensuelle</h3>
                        <canvas id="emailChart" width="400" height="200"></canvas>
                    </div>
                    <div class="chart-container" style="flex: 1; min-width: 45%;">
                        <h3>SMS (Brevo) - Consommation mensuelle</h3>
                        <canvas id="smsChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Detailed tables -->
            <div class="api-stats-tables">
                <h2>Détails</h2>
                
                <h3>DeepL</h3>
                <table class="widefat fixed" style="margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="width: 20%;">Client</th>
                            <th style="width: 15%;">Mois</th>
                            <th style="width: 15%;">Tokens utilisés</th>
                            <th style="width: 15%;"></th>
                            <th style="width: 15%;"></th>
                            <th style="width: 20%;">Coût estimé (€)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($deepl_stats)): ?>
                        <tr>
                            <td colspan="4">Pas de données disponibles</td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($deepl_stats as $stat): ?>
                            <tr>
                                <td><?php echo esc_html($stat['client_name']); ?></td>
                                <td><?php echo esc_html(date('F Y', strtotime($stat['stat_year_month'] . '-01'))); ?></td>
                                <td><?php echo number_format($stat['tokens_used']); ?></td>
                                <td></td>
                                <td></td>
                                <td><?php echo number_format(floatval($stat['estimated_cost']), 2); ?>€</td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
                
                <h3>OpenAI</h3>
                <table class="widefat fixed" style="margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="width: 20%;">Client</th>
                            <th style="width: 15%;">Mois</th>
                            <th style="width: 15%;">Tokens utilisés</th>
                            <th style="width: 15%;"></th>
                            <th style="width: 15%;"></th>
                            <th style="width: 20%;">Coût estimé (€)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($openai_stats)): ?>
                        <tr>
                            <td colspan="4">Pas de données disponibles</td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($openai_stats as $stat): ?>
                            <tr>
                                <td><?php echo esc_html($stat['client_name']); ?></td>
                                <td><?php echo esc_html(date('F Y', strtotime($stat['stat_year_month'] . '-01'))); ?></td>
                                <td><?php echo number_format($stat['tokens_used']); ?></td>
                                <td></td>
                                <td></td>
                                <td><?php echo number_format(floatval($stat['tokens_used']) * 0.0000016, 2); ?>€</td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>

                <h3>Brevo - E-mail</h3>
                <table class="widefat fixed" style="margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="width: 20%;">Client</th>
                            <th style="width: 15%;">Mois</th>
                            <th style="width: 15%;">E-mails envoyés</th>
                            <th style="width: 15%;"></th>
                            <th style="width: 15%;"></th>
                            <th style="width: 20%;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($email_stats)): ?>
                        <tr>
                            <td colspan="3">Pas de données disponibles</td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($email_stats as $stat): ?>
                            <tr>
                                <td><?php echo esc_html($stat['client_name']); ?></td>
                                <td><?php echo esc_html(date('F Y', strtotime($stat['stat_year_month'] . '-01'))); ?></td>
                                <td><?php echo number_format($stat['emails_sent']); ?></td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
                
                <h3>Brevo - SMS</h3>
                <table class="widefat fixed" style="margin-bottom: 30px;">
                    <thead>
                        <tr>
                            <th style="width: 20%;">Client</th>
                            <th style="width: 15%;">Mois</th>
                            <th style="width: 15%;">SMS envoyés</th>
                            <th style="width: 15%;">Pays</th>
                            <th style="width: 15%;">Prix unitaire</th>
                            <th style="width: 20%;">Coût estimé (€)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($sms_stats)): ?>
                        <tr>
                            <td colspan="6">Pas de données disponibles</td>
                        </tr>
                        <?php else: ?>
                            <?php foreach ($sms_stats as $stat): ?>
                            <tr>
                                <td><?php echo esc_html($stat['client_name']); ?></td>
                                <td><?php echo esc_html(date('F Y', strtotime($stat['stat_year_month'] . '-01'))); ?></td>
                                <td><?php echo number_format($stat['sms_sent']); ?></td>
                                <td><?php echo esc_html($stat['country']); ?></td>
                                <td><?php echo number_format(RoadPress_SMS_Pricing::get_sms_price($stat['country']), 4); ?>€</td>
                                <td><?php echo number_format(RoadPress_SMS_Pricing::calculate_sms_cost($stat['country'], $stat['sms_sent']), 2); ?>€</td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
                
                <!-- CSV Export button -->
                <form method="post" style="margin-top: 20px;">
                    <input type="hidden" name="export_api_stats" value="1">
                    <input type="hidden" name="client" value="<?php echo esc_attr($selected_client); ?>">
                    <input type="hidden" name="year" value="<?php echo esc_attr($selected_year); ?>">
                    <input type="submit" class="button button-primary" value="Exporter en CSV">
                </form>
            </div>
            
            <!-- Scripts for charts -->
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    // DeepL chart configuration
                    var ctxDeepl = document.getElementById('deeplChart').getContext('2d');
                    var deeplChart = new Chart(ctxDeepl, {
                        type: 'bar',
                        data: {
                            labels: <?php echo json_encode($months); ?>,
                            datasets: [{
                                label: 'DeepL Tokens',
                                data: <?php echo json_encode($deepl_values); ?>,
                                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Tokens utilisés'
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'DeepL Consumption ' + <?php echo json_encode($selected_year); ?>
                                }
                            }
                        }
                    });
                    
                    // OpenAI chart configuration
                    var ctxOpenAI = document.getElementById('openaiChart').getContext('2d');
                    var openaiChart = new Chart(ctxOpenAI, {
                        type: 'bar',
                        data: {
                            labels: <?php echo json_encode($months); ?>,
                            datasets: [{
                                label: 'OpenAI Tokens',
                                data: <?php echo json_encode($openai_values); ?>,
                                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Tokens utilisés'
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'OpenAI - Consommation ' + <?php echo json_encode($selected_year); ?>
                                }
                            }
                        }
                    });

                    // Email chart configuration
                    var ctxEmail = document.getElementById('emailChart').getContext('2d');
                    var emailChart = new Chart(ctxEmail, {
                        type: 'bar',
                        data: {
                            labels: <?php echo json_encode($months); ?>,
                            datasets: [{
                                label: 'E-mails envoyés',
                                data: <?php echo json_encode($email_values); ?>,
                                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                                borderColor: 'rgba(255, 159, 64, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'E-mails envoyés'
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'E-mail (Brevo) - Consommation ' + <?php echo json_encode($selected_year); ?>
                                }
                            }
                        }
                    });
                    
                    // SMS chart configuration
                    var ctxSMS = document.getElementById('smsChart').getContext('2d');
                    var smsChart = new Chart(ctxSMS, {
                        type: 'bar',
                        data: {
                            labels: <?php echo json_encode($months); ?>,
                            datasets: [{
                                label: 'SMS envoyés',
                                data: <?php echo json_encode($sms_values); ?>,
                                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                                borderColor: 'rgba(153, 102, 255, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'SMS envoyés'
                                    }
                                }
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'SMS (Brevo) - Consommation ' + <?php echo json_encode($selected_year); ?>
                                }
                            }
                        }
                    });

                });
            </script>
        </div>
        <?php
    }

    /**
    * Export API statistics in CSV format, organized by client and month
    */
    public static function export_simple_stats_to_csv() {
        global $wpdb;
        
        // Supprime toute sortie déjà générée
        ob_end_clean();
        
        // Récupérer les paramètres de filtre
        $selected_client = isset($_POST['client']) ? sanitize_text_field($_POST['client']) : 'all';
        $selected_year = isset($_POST['year']) ? intval($_POST['year']) : date('Y');
        
        // Configurer les en-têtes pour le téléchargement
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=roadpress_stats_' . $selected_year . '.csv');
        header('Pragma: no-cache');
        header('Expires: 0');
        
        // Ouvrir le flux de sortie
        $output = fopen('php://output', 'w');
        
        // BOM UTF-8 pour Excel
        fputs($output, "\xEF\xBB\xBF");
        
        // Récupération de toutes les données
        $where_client = $selected_client !== 'all' ? "AND client_name = '$selected_client'" : "";
        
        // 1. Récupérer tous les clients concernés
        if ($selected_client === 'all') {
            $clients = $wpdb->get_col("
                SELECT DISTINCT client_name FROM (
                    SELECT DISTINCT client_name FROM {$wpdb->prefix}license_deepl_stats WHERE YEAR(last_update) = $selected_year
                    UNION
                    SELECT DISTINCT client_name FROM {$wpdb->prefix}license_openai_stats WHERE YEAR(last_update) = $selected_year
                    UNION
                    SELECT DISTINCT client_name FROM {$wpdb->prefix}license_email_stats WHERE YEAR(last_update) = $selected_year
                    UNION
                    SELECT DISTINCT client_name FROM {$wpdb->prefix}license_sms_stats WHERE YEAR(last_update) = $selected_year
                ) as clients
                ORDER BY client_name
            ");
        } else {
            $clients = array($selected_client);
        }
        
        // 2. Pour chaque client, obtenir les données par mois
        foreach ($clients as $client) {
            // Écrire l'en-tête du client
            fputcsv($output, array($client));
            fputcsv($output, array()); // Ligne vide
            
            // Récupérer tous les mois où le client a des données
            $all_months = $wpdb->get_col($wpdb->prepare("
                SELECT DISTINCT DATE_FORMAT(last_update, '%%Y-%%m') as month FROM (
                    SELECT last_update FROM {$wpdb->prefix}license_deepl_stats WHERE YEAR(last_update) = %d AND client_name = %s
                    UNION
                    SELECT last_update FROM {$wpdb->prefix}license_openai_stats WHERE YEAR(last_update) = %d AND client_name = %s
                    UNION
                    SELECT last_update FROM {$wpdb->prefix}license_email_stats WHERE YEAR(last_update) = %d AND client_name = %s
                    UNION
                    SELECT last_update FROM {$wpdb->prefix}license_sms_stats WHERE YEAR(last_update) = %d AND client_name = %s
                ) as dates
                ORDER BY month
            ", $selected_year, $client, $selected_year, $client, $selected_year, $client, $selected_year, $client));
            
            // Si aucun mois trouvé, utiliser les 12 mois de l'année
            if (empty($all_months)) {
                for ($m = 1; $m <= 12; $m++) {
                    $all_months[] = sprintf('%04d-%02d', $selected_year, $m);
                }
            }
            
            foreach ($all_months as $month) {
                $month_name = date('F Y', strtotime($month . '-01'));
                
                // Écrire l'en-tête du mois
                fputcsv($output, array($month_name));
                
                // En-tête des services
                fputcsv($output, array('Service', 'Consommation', 'Prix unitaire', 'Coût estimé (€)'));
                
                // 1. DeepL
                $deepl_stats = $wpdb->get_row($wpdb->prepare("
                    SELECT 
                        SUM(tokens_used) as tokens,
                        SUM(tokens_used * 0.00002) as cost
                    FROM {$wpdb->prefix}license_deepl_stats
                    WHERE YEAR(last_update) = %d 
                    AND MONTH(last_update) = %d
                    AND client_name = %s
                ", $selected_year, substr($month, 5, 2), $client), ARRAY_A);
                
                $deepl_tokens = isset($deepl_stats['tokens']) ? $deepl_stats['tokens'] : 0;
                $deepl_cost = isset($deepl_stats['cost']) ? $deepl_stats['cost'] : 0;
                
                fputcsv($output, array(
                    'DeepL', 
                    number_format($deepl_tokens) . ' tokens',
                    '0.00002 €',
                    number_format($deepl_cost, 2)
                ));
                
                // 2. OpenAI
                $openai_stats = $wpdb->get_row($wpdb->prepare("
                    SELECT 
                        SUM(tokens_used) as tokens,
                        SUM(tokens_used * 0.0000016) as cost
                    FROM {$wpdb->prefix}license_openai_stats
                    WHERE YEAR(last_update) = %d 
                    AND MONTH(last_update) = %d
                    AND client_name = %s
                ", $selected_year, substr($month, 5, 2), $client), ARRAY_A);
                
                $openai_tokens = isset($openai_stats['tokens']) ? $openai_stats['tokens'] : 0;
                $openai_cost = isset($openai_stats['cost']) ? $openai_stats['cost'] : 0;
                
                fputcsv($output, array(
                    'OpenAI', 
                    number_format($openai_tokens) . ' tokens',
                    '0.0000016 €',
                    number_format($openai_cost, 2)
                ));
                
                // 3. Brevo SMS
                $sms_stats = $wpdb->get_results($wpdb->prepare("
                    SELECT 
                        country,
                        SUM(sms_sent) as sms_count
                    FROM {$wpdb->prefix}license_sms_stats
                    WHERE YEAR(last_update) = %d 
                    AND MONTH(last_update) = %d
                    AND client_name = %s
                    GROUP BY country
                ", $selected_year, substr($month, 5, 2), $client), ARRAY_A);
                
                if (!empty($sms_stats)) {
                    foreach ($sms_stats as $sms_stat) {
                        $country = $sms_stat['country'];
                        $sms_count = $sms_stat['sms_count'];
                        
                        $unit_price = RoadPress_SMS_Pricing::get_sms_price($country);
                        $sms_cost = RoadPress_SMS_Pricing::calculate_sms_cost($country, $sms_count);
                        
                        fputcsv($output, array(
                            'Brevo (SMS)', 
                            number_format($sms_count) . ' SMS',
                            $country . ' - ' . number_format($unit_price, 4) . ' €',
                            number_format($sms_cost, 2)
                        ));
                    }
                } else {
                    fputcsv($output, array(
                        'Brevo (SMS)', 
                        '0 SMS',
                        'N/A',
                        '0.00'
                    ));
                }
                
                // 4. Brevo Email
                $email_stats = $wpdb->get_row($wpdb->prepare("
                    SELECT 
                        SUM(email_stats) as email_count
                    FROM {$wpdb->prefix}license_email_stats
                    WHERE YEAR(last_update) = %d 
                    AND MONTH(last_update) = %d
                    AND client_name = %s
                ", $selected_year, substr($month, 5, 2), $client), ARRAY_A);
                
                $email_count = isset($email_stats['email_count']) ? $email_stats['email_count'] : 0;
                
                fputcsv($output, array(
                    'Brevo (Email)', 
                    number_format($email_count) . ' emails',
                    'N/A',
                    'N/A'
                ));
                
                // Ligne vide entre les mois
                fputcsv($output, array());
            }
            
            // Ligne vide entre les clients
            fputcsv($output, array());
            fputcsv($output, array());
        }
        
        fclose($output);
        exit;
    }
        
}