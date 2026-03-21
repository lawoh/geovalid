/**
 * GéoValid Québec - Carte Leaflet
 * Fichier: js/map.js
 */

// Initialiser la carte
function initMap() {
    if (AppState.map) {
        AppState.map.remove();
    }
    
    // Centre du Canada
    AppState.map = L.map('map').setView([56.13, -106.35], 3);
    
    // Couches de base
    AppState.baseLayers = {
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri'
        }),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap'
        }),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO'
        })
    };
    
    // Ajouter OSM par défaut
    AppState.baseLayers.osm.addTo(AppState.map);
    
    // Échelle en bas à droite
    L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(AppState.map);
    
    // Coordonnées de la souris en bas à gauche
    const coordsControl = L.control({ position: 'bottomleft' });
    coordsControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'leaflet-control-coords');
        div.innerHTML = 'Lat: -- | Lon: --';
        div.style.cssText = 'background: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; color: #333; box-shadow: 0 1px 4px rgba(0,0,0,0.2);';
        return div;
    };
    coordsControl.addTo(AppState.map);
    
    // Mettre à jour les coordonnées au mouvement de la souris
    AppState.map.on('mousemove', function(e) {
        const coordsDiv = document.querySelector('.leaflet-control-coords');
        if (coordsDiv) {
            coordsDiv.innerHTML = `Lat: ${e.latlng.lat.toFixed(5)} | Lon: ${e.latlng.lng.toFixed(5)}`;
        }
    });
    
    AppState.map.on('mouseout', function() {
        const coordsDiv = document.querySelector('.leaflet-control-coords');
        if (coordsDiv) {
            coordsDiv.innerHTML = 'Lat: -- | Lon: --';
        }
    });
    
    // Cluster layer
    AppState.markersLayer = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true
    });
}

// Afficher les points valides sur la carte
function displayPointsOnMap(donnees) {
    if (!AppState.map) initMap();
    
    // Nettoyer les anciens marqueurs
    if (AppState.markersLayer) {
        AppState.markersLayer.clearLayers();
    }
    
    const bounds = [];
    
    donnees.forEach(d => {
        const marker = L.circleMarker([d.lat, d.lon], {
            radius: 6,
            fillColor: '#003DA5',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });
        
        let popupContent = `<div style="font-family: var(--font-body); min-width: 150px;">
            <div style="font-weight: 600; color: #003DA5; margin-bottom: 6px;">📍 Point</div>
            <table style="font-size: 12px; width: 100%;">
                <tr><td style="color: #666;">Lat</td><td style="font-weight: 500;">${d.lat.toFixed(5)}</td></tr>
                <tr><td style="color: #666;">Lon</td><td style="font-weight: 500;">${d.lon.toFixed(5)}</td></tr>`;
        
        if (d.zipcode) {
            popupContent += `<tr><td style="color: #666;">Code postal</td><td style="font-weight: 500;">${d.zipcode}</td></tr>`;
        }
        if (d.pr) {
            popupContent += `<tr><td style="color: #666;">Province</td><td style="font-weight: 500;">${d.pr}</td></tr>`;
        }
        
        popupContent += '</table></div>';
        marker.bindPopup(popupContent);
        
        AppState.markersLayer.addLayer(marker);
        bounds.push([d.lat, d.lon]);
    });
    
    AppState.map.addLayer(AppState.markersLayer);
    
    // Ajuster la vue avec zoom réduit
    if (bounds.length > 0) {
        AppState.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 5 });
    }
    
    // Mettre à jour le compteur
    document.getElementById('mapPts').textContent = `${donnees.length} pts`;
}

// Changer le fond de carte
function changeMapLayer(layerName) {
    if (!AppState.map || !AppState.baseLayers[layerName]) return;
    
    Object.values(AppState.baseLayers).forEach(layer => {
        if (AppState.map.hasLayer(layer)) {
            AppState.map.removeLayer(layer);
        }
    });
    
    AppState.baseLayers[layerName].addTo(AppState.map);
}
