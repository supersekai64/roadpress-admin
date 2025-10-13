<?php
if (!defined('ABSPATH')) {
    exit;
}

// Afficher la page de la carte des POIs
function roadpress_poi_map_display() {
    global $wpdb;
    
    // Récupérer la clé API Mapbox
    $mapbox_api_key = get_option('roadpress_mapbox_api_key');
    
    if (empty($mapbox_api_key)) {
        echo '<div class="notice notice-error"><p>La clé API Mapbox n\'est pas configurée.</p></div>';
        return;
    }
    
    // Récupérer tous les POIs
    $pois = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}client_pois", ARRAY_A);
    ?>
    <div class="wrap">
        <h1>Carte des POIs de tous les clients</h1>
        
        <p>Cette carte affiche tous les Points d'Intérêt synchronisés depuis les sites clients.</p>
        
        <div id="roadpress-poi-map" style="width: 100%; height: 700px;"></div>
        
        <script src='https://api.mapbox.com/mapbox-gl-js/v2.9.1/mapbox-gl.js'></script>
        <link href='https://api.mapbox.com/mapbox-gl-js/v2.9.1/mapbox-gl.css' rel='stylesheet' />
        
        <script>
            mapboxgl.accessToken = '<?php echo esc_js($mapbox_api_key); ?>';
            
            const map = new mapboxgl.Map({
                container: 'roadpress-poi-map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [2.213749, 46.227638], // Centre de la France
                zoom: 5
            });
            
            map.addControl(new mapboxgl.NavigationControl());
            
            // Ajouter les POIs à la carte
            const pois = <?php echo json_encode($pois); ?>;
            
            // Grouper les POIs par client pour les couleurs
            const clientColors = {};
            const clients = [...new Set(pois.map(poi => poi.client_name))];
            
            // Générer des couleurs aléatoires pour chaque client
            clients.forEach((client, index) => {
                const hue = (index * 137) % 360; // Formule pour une bonne distribution de couleurs
                clientColors[client] = `hsl(${hue}, 70%, 50%)`;
            });
            
            map.on('load', () => {
                pois.forEach(poi => {
                    // Créer un élément DOM personnalisé pour le marqueur
                    const el = document.createElement('div');
                    el.className = 'marker';
                    el.style.backgroundColor = clientColors[poi.client_name];
                    el.style.width = '15px';
                    el.style.height = '15px';
                    el.style.borderRadius = '50%';
                    el.style.border = '2px solid white';
                    el.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.2)';
                    
                    // Ajouter le marqueur à la carte
                    const marker = new mapboxgl.Marker(el)
                        .setLngLat([parseFloat(poi.longitude), parseFloat(poi.latitude)])
                        .setPopup(new mapboxgl.Popup({ offset: 25 })
                            .setHTML(`
                                <h3>${poi.name}</h3>
                                <p><strong>Client:</strong> ${poi.client_name}</p>
                                <p><strong>Site:</strong> ${poi.site_name}</p>
                                <p><strong>Type:</strong> ${poi.type}</p>
                                <p><strong>Adresse:</strong> ${poi.address}</p>
                                <p><strong>Visites:</strong> ${poi.visit_count}</p>
                            `))
                        .addTo(map);
                });
                
                // Ajouter une légende pour les clients
                const legend = document.createElement('div');
                legend.className = 'map-legend';
                legend.style.position = 'absolute';
                legend.style.bottom = '25px';
                legend.style.right = '10px';
                legend.style.backgroundColor = 'white';
                legend.style.padding = '10px';
                legend.style.borderRadius = '5px';
                legend.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
                legend.style.maxHeight = '200px';
                legend.style.overflowY = 'auto';
                
                legend.innerHTML = '<h4 style="margin-top: 0;">Clients</h4>';
                
                Object.entries(clientColors).forEach(([client, color]) => {
                    const item = document.createElement('div');
                    item.style.marginBottom = '5px';
                    
                    const colorBox = document.createElement('span');
                    colorBox.style.display = 'inline-block';
                    colorBox.style.width = '12px';
                    colorBox.style.height = '12px';
                    colorBox.style.backgroundColor = color;
                    colorBox.style.marginRight = '5px';
                    
                    item.appendChild(colorBox);
                    item.appendChild(document.createTextNode(client));
                    legend.appendChild(item);
                });
                
                document.getElementById('roadpress-poi-map').appendChild(legend);
            });
        </script>
    </div>
    <?php
}