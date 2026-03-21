/**
 * GéoValid - Export Multi-Formats
 * Fichier: js/export.js
 */

// Export principal
async function exportData(type, format) {
    let data, filename;
    
    if (type === 'valid') {
        data = AppState.donneesValides;
        if (!data || data.length === 0) {
            showNotification('Aucune donnée valide à exporter', 'error');
            return;
        }
    } else if (type === 'invalid') {
        data = AppState.donneesInvalides;
        if (!data || data.length === 0) {
            showNotification('Aucune donnée invalide à exporter', 'error');
            return;
        }
    } else if (type === 'map') {
        if (format === 'pdf') {
            await exportMapPDF();
        } else {
            exportMapHTML();
        }
        return;
    }
    
    showNotification('Export en cours...', 'info');
    
    try {
        switch (format) {
            case 'csv':
                filename = `donnees_${type}.csv`;
                exportCSV(data, filename, type === 'invalid');
                break;
            case 'xlsx':
                filename = `donnees_${type}.xlsx`;
                exportExcel(data, filename, type === 'invalid');
                break;
            case 'json':
                filename = `donnees_${type}.json`;
                exportJSON(data, filename);
                break;
            case 'geojson':
                filename = `donnees_${type}.geojson`;
                exportGeoJSON(data, filename);
                break;
            case 'topojson':
                filename = `donnees_${type}.topojson`;
                exportTopoJSON(data, filename);
                break;
            case 'kml':
                filename = `donnees_${type}.kml`;
                exportKML(data, filename);
                break;
            case 'gml':
                filename = `donnees_${type}.gml`;
                exportGML(data, filename);
                break;
            case 'gpx':
                filename = `donnees_${type}.gpx`;
                exportGPX(data, filename);
                break;
            case 'wkt':
                filename = `donnees_${type}.wkt`;
                exportWKT(data, filename);
                break;
            case 'shapefile':
                filename = `donnees_${type}_shapefile.zip`;
                await exportShapefile(data, filename);
                break;
            case 'geopackage':
                filename = `donnees_${type}.gpkg`;
                await exportGeoPackage(data, filename);
                break;
            default:
                showNotification(`Format non supporté: ${format}`, 'error');
                return;
        }
        showNotification(`Export ${format.toUpperCase()} réussi`, 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification(`Erreur d'export: ${error.message}`, 'error');
    }
}

// Export CSV
function exportCSV(data, filename, includeErrors = false) {
    let header = 'longitude,latitude,code_postal,province';
    if (includeErrors) header += ',erreurs';
    
    const rows = data.map(d => {
        let row = `${d.lon},${d.lat},"${d.zipcode || ''}","${d.pr || ''}"`;
        if (includeErrors) row += `,"${d.erreurs || ''}"`;
        return row;
    });
    
    const content = header + '\n' + rows.join('\n');
    downloadFile(filename, content, 'text/csv');
}

// Export Excel
function exportExcel(data, filename, includeErrors = false) {
    let header = ['longitude', 'latitude', 'code_postal', 'province'];
    if (includeErrors) header.push('erreurs');
    
    const wsData = [header];
    data.forEach(d => {
        let row = [d.lon, d.lat, d.zipcode || '', d.pr || ''];
        if (includeErrors) row.push(d.erreurs || '');
        wsData.push(row);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(filename, new Blob([excelBuffer]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// Export JSON
function exportJSON(data, filename) {
    const content = JSON.stringify(data, null, 2);
    downloadFile(filename, content, 'application/json');
}

// Export GeoJSON
function exportGeoJSON(data, filename) {
    const geojson = {
        type: 'FeatureCollection',
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: data.map((d, i) => ({
            type: 'Feature',
            id: i + 1,
            properties: {
                id: i + 1,
                code_postal: d.zipcode || '',
                province: d.pr || ''
            },
            geometry: {
                type: 'Point',
                coordinates: [d.lon, d.lat]
            }
        }))
    };
    downloadFile(filename, JSON.stringify(geojson, null, 2), 'application/geo+json');
}

// Export TopoJSON
function exportTopoJSON(data, filename) {
    const features = data.map((d, i) => ({
        type: 'Feature',
        id: i + 1,
        properties: {
            id: i + 1,
            code_postal: d.zipcode || '',
            province: d.pr || ''
        },
        geometry: {
            type: 'Point',
            coordinates: [d.lon, d.lat]
        }
    }));
    
    const topojson = {
        type: 'Topology',
        objects: {
            points: {
                type: 'GeometryCollection',
                geometries: features.map(f => ({
                    type: 'Point',
                    coordinates: f.geometry.coordinates,
                    properties: f.properties
                }))
            }
        }
    };
    
    downloadFile(filename, JSON.stringify(topojson, null, 2), 'application/json');
}

// Export KML
function exportKML(data, filename) {
    let placemarks = data.map((d, i) => `
    <Placemark>
      <name>Point ${i + 1}</name>
      <description>${d.zipcode || ''} ${d.pr || ''}</description>
      <Point><coordinates>${d.lon},${d.lat},0</coordinates></Point>
    </Placemark>`).join('');
    
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GéoValid Export</name>
    ${placemarks}
  </Document>
</kml>`;
    
    downloadFile(filename, kml, 'application/vnd.google-earth.kml+xml');
}

// Export GML
function exportGML(data, filename) {
    let features = data.map((d, i) => `
    <gml:featureMember>
        <Point gml:id="point_${i + 1}">
            <code_postal>${d.zipcode || ''}</code_postal>
            <province>${d.pr || ''}</province>
            <gml:pointProperty>
                <gml:Point srsName="EPSG:4326">
                    <gml:coordinates>${d.lon},${d.lat}</gml:coordinates>
                </gml:Point>
            </gml:pointProperty>
        </Point>
    </gml:featureMember>`).join('');
    
    const gml = `<?xml version="1.0" encoding="UTF-8"?>
<gml:FeatureCollection 
    xmlns:gml="http://www.opengis.net/gml"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <gml:boundedBy>
        <gml:Envelope srsName="EPSG:4326">
            <gml:lowerCorner>${safeMin(data.map(d => d.lon))} ${safeMin(data.map(d => d.lat))}</gml:lowerCorner>
            <gml:upperCorner>${safeMax(data.map(d => d.lon))} ${safeMax(data.map(d => d.lat))}</gml:upperCorner>
        </gml:Envelope>
    </gml:boundedBy>
    ${features}
</gml:FeatureCollection>`;
    
    downloadFile(filename, gml, 'application/gml+xml');
}

// Export GPX
function exportGPX(data, filename) {
    let waypoints = data.map((d, i) => `
  <wpt lat="${d.lat}" lon="${d.lon}">
    <name>Point ${i + 1}</name>
    <desc>${d.zipcode || ''} ${d.pr || ''}</desc>
  </wpt>`).join('');
    
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GéoValid">
  ${waypoints}
</gpx>`;
    
    downloadFile(filename, gpx, 'application/gpx+xml');
}

// Export WKT
function exportWKT(data, filename) {
    const wkt = data.map(d => `POINT(${d.lon} ${d.lat})`).join('\n');
    downloadFile(filename, wkt, 'text/plain');
}

// Export Shapefile (ZIP avec SHP, SHX, DBF, PRJ)
async function exportShapefile(data, filename) {
    const zip = new JSZip();
    
    const shp = generateSHP(data);
    const shx = generateSHX(data);
    const dbf = generateDBF(data);
    const prj = generatePRJ();
    
    zip.file('points.shp', shp);
    zip.file('points.shx', shx);
    zip.file('points.dbf', dbf);
    zip.file('points.prj', prj);
    
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadFile(filename, blob, 'application/zip');
}

function generateSHP(data) {
    const headerSize = 100;
    const recordSize = 28;
    const fileLength = (headerSize + data.length * recordSize) / 2;
    
    const minX = safeMin(data.map(d => d.lon));
    const maxX = safeMax(data.map(d => d.lon));
    const minY = safeMin(data.map(d => d.lat));
    const maxY = safeMax(data.map(d => d.lat));
    
    const buffer = new ArrayBuffer(headerSize + data.length * recordSize);
    const view = new DataView(buffer);
    
    view.setInt32(0, 9994, false);
    view.setInt32(24, fileLength, false);
    view.setInt32(28, 1000, true);
    view.setInt32(32, 1, true);
    view.setFloat64(36, minX, true);
    view.setFloat64(44, minY, true);
    view.setFloat64(52, maxX, true);
    view.setFloat64(60, maxY, true);
    
    let offset = 100;
    data.forEach((d, i) => {
        view.setInt32(offset, i + 1, false);
        view.setInt32(offset + 4, 10, false);
        view.setInt32(offset + 8, 1, true);
        view.setFloat64(offset + 12, d.lon, true);
        view.setFloat64(offset + 20, d.lat, true);
        offset += 28;
    });
    
    return new Uint8Array(buffer);
}

function generateSHX(data) {
    const headerSize = 100;
    const fileLength = (headerSize + data.length * 8) / 2;
    
    const minX = safeMin(data.map(d => d.lon));
    const maxX = safeMax(data.map(d => d.lon));
    const minY = safeMin(data.map(d => d.lat));
    const maxY = safeMax(data.map(d => d.lat));
    
    const buffer = new ArrayBuffer(headerSize + data.length * 8);
    const view = new DataView(buffer);
    
    view.setInt32(0, 9994, false);
    view.setInt32(24, fileLength, false);
    view.setInt32(28, 1000, true);
    view.setInt32(32, 1, true);
    view.setFloat64(36, minX, true);
    view.setFloat64(44, minY, true);
    view.setFloat64(52, maxX, true);
    view.setFloat64(60, maxY, true);
    
    let offset = 100;
    let recordOffset = 50;
    data.forEach((d, i) => {
        view.setInt32(offset, recordOffset, false);
        view.setInt32(offset + 4, 10, false);
        offset += 8;
        recordOffset += 14;
    });
    
    return new Uint8Array(buffer);
}

function generateDBF(data) {
    const numRecords = data.length;
    const fields = [
        { name: 'CODE_POST', type: 'C', length: 10 },
        { name: 'PROVINCE', type: 'C', length: 20 }
    ];
    
    const headerSize = 32 + (fields.length * 32) + 1;
    const recordSize = 1 + fields.reduce((sum, f) => sum + f.length, 0);
    const fileSize = headerSize + (numRecords * recordSize);
    
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    
    view.setUint8(0, 0x03);
    const now = new Date();
    view.setUint8(1, now.getFullYear() - 1900);
    view.setUint8(2, now.getMonth() + 1);
    view.setUint8(3, now.getDate());
    view.setUint32(4, numRecords, true);
    view.setUint16(8, headerSize, true);
    view.setUint16(10, recordSize, true);
    
    let fieldOffset = 32;
    fields.forEach(field => {
        for (let i = 0; i < 11; i++) {
            bytes[fieldOffset + i] = i < field.name.length ? field.name.charCodeAt(i) : 0;
        }
        bytes[fieldOffset + 11] = field.type.charCodeAt(0);
        bytes[fieldOffset + 16] = field.length;
        fieldOffset += 32;
    });
    bytes[fieldOffset] = 0x0D;
    
    let recordOffset = headerSize;
    data.forEach(d => {
        bytes[recordOffset] = 0x20;
        let pos = recordOffset + 1;
        
        const cp = (d.zipcode || '').substring(0, 10).padEnd(10, ' ');
        for (let i = 0; i < 10; i++) {
            bytes[pos + i] = cp.charCodeAt(i);
        }
        pos += 10;
        
        const prov = (d.pr || '').substring(0, 20).padEnd(20, ' ');
        for (let i = 0; i < 20; i++) {
            bytes[pos + i] = prov.charCodeAt(i);
        }
        
        recordOffset += recordSize;
    });
    
    return new Uint8Array(buffer);
}

function generatePRJ() {
    return 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';
}

// Export GeoPackage
async function exportGeoPackage(data, filename) {
    showNotification('Génération du GeoPackage...', 'info');
    
    try {
        const initSqlJs = window.initSqlJs;
        if (!initSqlJs) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }
        
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        const db = new SQL.Database();
        
        db.run(`CREATE TABLE gpkg_spatial_ref_sys (
            srs_name TEXT NOT NULL,
            srs_id INTEGER NOT NULL PRIMARY KEY,
            organization TEXT NOT NULL,
            organization_coordsys_id INTEGER NOT NULL,
            definition TEXT NOT NULL,
            description TEXT
        )`);
        
        db.run(`INSERT INTO gpkg_spatial_ref_sys VALUES 
            ('WGS 84', 4326, 'EPSG', 4326, 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]', 'WGS 84')`);
        
        db.run(`CREATE TABLE gpkg_contents (
            table_name TEXT NOT NULL PRIMARY KEY,
            data_type TEXT NOT NULL,
            identifier TEXT UNIQUE,
            description TEXT DEFAULT '',
            last_change DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
            min_x DOUBLE,
            min_y DOUBLE,
            max_x DOUBLE,
            max_y DOUBLE,
            srs_id INTEGER
        )`);
        
        db.run(`CREATE TABLE gpkg_geometry_columns (
            table_name TEXT NOT NULL,
            column_name TEXT NOT NULL,
            geometry_type_name TEXT NOT NULL,
            srs_id INTEGER NOT NULL,
            z INTEGER NOT NULL,
            m INTEGER NOT NULL
        )`);
        
        db.run(`CREATE TABLE points (
            fid INTEGER PRIMARY KEY AUTOINCREMENT,
            geom BLOB,
            code_postal TEXT,
            province TEXT
        )`);
        
        const minX = safeMin(data.map(d => d.lon));
        const maxX = safeMax(data.map(d => d.lon));
        const minY = safeMin(data.map(d => d.lat));
        const maxY = safeMax(data.map(d => d.lat));
        
        db.run(`INSERT INTO gpkg_contents VALUES ('points', 'features', 'points', 'Points validés', datetime('now'), ?, ?, ?, ?, 4326)`,
            [minX, minY, maxX, maxY]);
        
        db.run(`INSERT INTO gpkg_geometry_columns VALUES ('points', 'geom', 'POINT', 4326, 0, 0)`);
        
        data.forEach(d => {
            const geomBlob = createGpkgPointBlob(d.lon, d.lat);
            db.run(`INSERT INTO points (geom, code_postal, province) VALUES (?, ?, ?)`,
                [geomBlob, d.zipcode || '', d.pr || '']);
        });
        
        const dbData = db.export();
        const blob = new Blob([dbData], { type: 'application/geopackage+sqlite3' });
        downloadFile(filename, blob, 'application/geopackage+sqlite3');
        
        db.close();
    } catch (error) {
        console.error('Erreur GeoPackage:', error);
        showNotification('Erreur lors de la création du GeoPackage', 'error');
    }
}

function createGpkgPointBlob(lon, lat) {
    const buffer = new ArrayBuffer(37);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    
    bytes[0] = 0x47;
    bytes[1] = 0x50;
    view.setUint8(2, 0x00);
    view.setUint8(3, 0x01);
    view.setInt32(4, 4326, true);
    
    view.setUint8(8, 0x01);
    view.setFloat64(9, lon, true);
    view.setFloat64(17, lat, true);
    
    return bytes;
}

// Export carte HTML
function exportMapHTML() {
    if (!AppState.donneesValides || AppState.donneesValides.length === 0) {
        showNotification('Aucune donnée à exporter', 'error');
        return;
    }
    
    const data = AppState.donneesValides;
    const bounds = {
        minLat: safeMin(data.map(d => d.lat)),
        maxLat: safeMax(data.map(d => d.lat)),
        minLon: safeMin(data.map(d => d.lon)),
        maxLon: safeMax(data.map(d => d.lon))
    };
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLon = (bounds.minLon + bounds.maxLon) / 2;
    
    const pointsJS = data.map(d => 
        `{lat:${d.lat},lon:${d.lon},cp:"${d.zipcode||''}",pr:"${d.pr||''}"}`
    ).join(',');
    
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GéoValid - Carte des points validés</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css"/>
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"/>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:system-ui,-apple-system,sans-serif}
        #header{background:#003DA5;color:#fff;padding:1rem 2rem;display:flex;align-items:center;gap:1rem}
        #header h1{font-size:1.3rem;font-weight:600}
        #header span{opacity:0.8;font-size:0.9rem}
        #map{height:calc(100vh - 60px);width:100%}
        .leaflet-popup-content{font-family:system-ui;font-size:13px}
        .popup-title{font-weight:600;color:#003DA5;margin-bottom:6px}
    </style>
</head>
<body>
    <div id="header">
        <h1>GéoValid</h1>
        <span>${data.length} points validés</span>
    </div>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
    <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"><\/script>
    <script>
        const points=[${pointsJS}];
        const map=L.map('map').setView([${centerLat},${centerLon}],5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
        L.control.scale({metric:true,imperial:false}).addTo(map);
        const markers=L.markerClusterGroup({maxClusterRadius:50});
        points.forEach(p=>{
            const m=L.circleMarker([p.lat,p.lon],{radius:6,fillColor:'#003DA5',color:'#fff',weight:2,fillOpacity:0.8});
            m.bindPopup('<div class="popup-title">📍 Point</div>Lat: '+p.lat.toFixed(5)+'<br>Lon: '+p.lon.toFixed(5)+(p.cp?'<br>Code postal: '+p.cp:'')+(p.pr?'<br>Province: '+p.pr:''));
            markers.addLayer(m);
        });
        map.addLayer(markers);
        map.fitBounds([[${bounds.minLat},${bounds.minLon}],[${bounds.maxLat},${bounds.maxLon}]],{padding:[30,30]});
    <\/script>
</body>
</html>`;
    
    downloadFile('carte_geovalid.html', html, 'text/html');
}

// Export carte PDF avec éléments cartographiques
async function exportMapPDF() {
    if (!AppState.donneesValides || AppState.donneesValides.length === 0) {
        showNotification('Aucune donnée à exporter', 'error');
        return;
    }
    
    showNotification('Génération du PDF en cours...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const margin = 15;
        const mapWidth = pageWidth - 2 * margin;
        const mapHeight = pageHeight - 60;
        
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 61, 165);
        pdf.text('GéoValid - Carte des données validées', pageWidth / 2, 15, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const dateStr = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
        pdf.text(`${AppState.donneesValides.length} points valides • Exporté le ${dateStr}`, pageWidth / 2, 22, { align: 'center' });
        
        const mapContainer = document.getElementById('map');
        const canvas = await html2canvas(mapContainer, {
            useCORS: true,
            allowTaint: true,
            scale: 2
        });
        
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, 28, mapWidth, mapHeight);
        
        pdf.setDrawColor(0, 61, 165);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, 28, mapWidth, mapHeight);
        
        const northX = pageWidth - margin - 12;
        const northY = 35;
        pdf.setFillColor(0, 61, 165);
        pdf.triangle(northX, northY, northX - 4, northY + 10, northX + 4, northY + 10, 'F');
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 61, 165);
        pdf.text('N', northX, northY + 16, { align: 'center' });
        
        const bounds = AppState.map.getBounds();
        const mapWidthKm = bounds.getNorthWest().distanceTo(bounds.getNorthEast()) / 1000;
        const scaleKm = Math.round(mapWidthKm / 4);
        const scaleBarWidth = mapWidth / 4;
        
        const scaleY = pageHeight - 25;
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(1);
        pdf.line(margin, scaleY, margin + scaleBarWidth, scaleY);
        pdf.setLineWidth(0.5);
        pdf.line(margin, scaleY - 2, margin, scaleY + 2);
        pdf.line(margin + scaleBarWidth, scaleY - 2, margin + scaleBarWidth, scaleY + 2);
        pdf.line(margin + scaleBarWidth / 2, scaleY - 1, margin + scaleBarWidth / 2, scaleY + 1);
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text('0', margin, scaleY + 5, { align: 'center' });
        pdf.text(`${scaleKm} km`, margin + scaleBarWidth, scaleY + 5, { align: 'center' });
        
        const legendX = pageWidth / 2 - 20;
        const legendY = pageHeight - 18;
        
        pdf.setFillColor(0, 61, 165);
        pdf.circle(legendX, legendY, 2, 'F');
        pdf.setFontSize(9);
        pdf.text('Point valide', legendX + 5, legendY + 1);
        
        pdf.setFontSize(7);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Projection: WGS 84 (EPSG:4326) • Fond de carte: OpenStreetMap', pageWidth / 2, pageHeight - 8, { align: 'center' });
        
        pdf.setFontSize(8);
        pdf.setTextColor(0, 61, 165);
        pdf.setFont('helvetica', 'bold');
        pdf.text('GéoValid', pageWidth - margin, pageHeight - 8, { align: 'right' });
        
        pdf.save('carte_geovalid.pdf');
        showNotification('Export PDF réussi', 'success');
        
    } catch (error) {
        console.error('Erreur export PDF:', error);
        showNotification('Erreur lors de l\'export PDF', 'error');
    }
}

// Téléchargement de fichier avec encodage UTF-8
function downloadFile(filename, content, mimeType) {
    let blob;
    
    if (content instanceof Blob) {
        blob = content;
    } else {
        const needsBOM = mimeType.includes('text') || mimeType.includes('csv') || 
                         mimeType.includes('json') || mimeType.includes('xml') ||
                         mimeType.includes('kml') || mimeType.includes('gpx') ||
                         mimeType.includes('gml');
        
        if (needsBOM) {
            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const textEncoder = new TextEncoder();
            const contentBytes = textEncoder.encode(content);
            const combined = new Uint8Array(bom.length + contentBytes.length);
            combined.set(bom);
            combined.set(contentBytes, bom.length);
            blob = new Blob([combined], { type: `${mimeType};charset=utf-8` });
        } else {
            blob = new Blob([content], { type: mimeType });
        }
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
