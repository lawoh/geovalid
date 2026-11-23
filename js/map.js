/**
 * GeoValidator - Carte Leaflet
 * Fichier: js/map.js
 */

// Initialiser la carte
function initMap() {
    if (AppState.map) {
        AppState.map.remove();
    }
    
    // Emprise du pays sélectionné (v2.0)
    const e = paysActif().emprise;
    AppState.map = L.map('map').fitBounds([[e.latitude.min, e.longitude.min], [e.latitude.max, e.longitude.max]]);
    
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
    
    // v1.2 : couche des lignes et polygones
    AppState.geometriesLayer = L.featureGroup();
}

// Afficher les points valides sur la carte
function displayPointsOnMap(donnees) {
    if (!AppState.map) initMap();
    
    // Nettoyer les anciens marqueurs
    if (AppState.markersLayer) {
        AppState.markersLayer.clearLayers();
    }
    if (AppState.geometriesLayer) {
        AppState.geometriesLayer.clearLayers();
    }
    
    const bounds = [];
    
    donnees.forEach(d => {
        // v1.2 : lignes, polygones et multi-géométries
        if (d.geom && d.geom.type !== 'Point') {
            const forme = L.geoJSON(d.geom, {
                style: { color: '#003DA5', weight: 2, fillColor: '#003DA5', fillOpacity: 0.25 },
                pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 6, fillColor: '#003DA5', color: '#FFFFFF', weight: 2, fillOpacity: 0.8 })
            });
            let contenu = `<div style="font-family: var(--font-body); min-width: 150px;">
                <div style="font-weight: 600; color: #003DA5; margin-bottom: 6px;">${d.geom.type}</div>
                <table style="font-size: 12px; width: 100%;">
                    <tr><td style="color: #666;">Sommets</td><td style="font-weight: 500;">${listerSommets(d.geom).length}</td></tr>`;
            if (d.zipcode) contenu += `<tr><td style="color: #666;">Code postal</td><td style="font-weight: 500;">${d.zipcode}</td></tr>`;
            if (d.pr) contenu += `<tr><td style="color: #666;">${paysActif().libelleRegion}</td><td style="font-weight: 500;">${d.pr}</td></tr>`;
            contenu += '</table></div>';
            forme.bindPopup(contenu);
            
            AppState.geometriesLayer.addLayer(forme);
            const b = forme.getBounds();
            bounds.push(b.getSouthWest(), b.getNorthEast());
            return;
        }
        
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
            popupContent += `<tr><td style="color: #666;">${paysActif().libelleRegion}</td><td style="font-weight: 500;">${d.pr}</td></tr>`;
        }
        
        popupContent += '</table></div>';
        marker.bindPopup(popupContent);
        
        AppState.markersLayer.addLayer(marker);
        bounds.push([d.lat, d.lon]);
    });
    
    AppState.map.addLayer(AppState.markersLayer);
    AppState.map.addLayer(AppState.geometriesLayer);
    
    // Ajuster la vue avec zoom réduit
    if (bounds.length > 0) {
        AppState.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 5 });
    }
    
    // Mettre à jour le compteur
    document.getElementById('mapPts').textContent = `${donnees.length} ${AppState.projection ? 'entités' : 'pts'}`;
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
