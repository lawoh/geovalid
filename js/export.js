/**
 * GeoValidator - Export Multi-Formats
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

// v1.2 : géométrie d'une donnée exportée (fichiers tabulaires : point lon/lat)
function geometrieDe(d) {
    return d.geom || { type: 'Point', coordinates: [d.lon, d.lat] };
}

// v1.2 : les données contiennent-elles des lignes ou des polygones ?
function contientFormes(data) {
    return data.some(d => d.geom && d.geom.type !== 'Point');
}

// v1.2 : emprise de toutes les géométries [minX, minY, maxX, maxY]
function emprise(data) {
    const sommets = [];
    data.forEach(d => sommets.push(...listerSommets(geometrieDe(d))));
    const xs = sommets.map(c => c[0]), ys = sommets.map(c => c[1]);
    return [safeMin(xs), safeMin(ys), safeMax(xs), safeMax(ys)];
}

// Export CSV
function exportCSV(data, filename, includeErrors = false) {
    // v1.2 : lignes et polygones exportés en WKT
    const formes = contientFormes(data);
    const colRegion = paysActif().colonneRegion;
    let header = formes ? `wkt,code_postal,${colRegion}` : `longitude,latitude,code_postal,${colRegion}`;
    if (includeErrors) header += ',erreurs';
    
    const rows = data.map(d => {
        let row = formes
            ? `"${versWKT(d.geom)}","${d.zipcode || ''}","${d.pr || ''}"`
            : `${d.lon},${d.lat},"${d.zipcode || ''}","${d.pr || ''}"`;
        if (includeErrors) row += `,"${d.erreurs || ''}"`;
        return row;
    });
    
    const content = header + '\n' + rows.join('\n');
    downloadFile(filename, content, 'text/csv');
}

// Export Excel
function exportExcel(data, filename, includeErrors = false) {
    // v1.2 : lignes et polygones exportés en WKT
    const formes = contientFormes(data);
    const colRegion = paysActif().colonneRegion;
    let header = formes ? ['wkt', 'code_postal', colRegion] : ['longitude', 'latitude', 'code_postal', colRegion];
    if (includeErrors) header.push('erreurs');
    
    const wsData = [header];
    data.forEach(d => {
        let row = formes
            ? [versWKT(d.geom), d.zipcode || '', d.pr || '']
            : [d.lon, d.lat, d.zipcode || '', d.pr || ''];
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
                [paysActif().colonneRegion]: d.pr || ''
            },
            geometry: geometrieDe(d)
        }))
    };
    downloadFile(filename, JSON.stringify(geojson, null, 2), 'application/geo+json');
}

// Export TopoJSON (chaque ligne ou anneau devient un arc, sans topologie partagée)
function exportTopoJSON(data, filename) {
    const arcs = [];
    const ajouterArc = coords => {
        arcs.push(coords);
        return arcs.length - 1;
    };
    const versTopo = g => {
        switch (g.type) {
            case 'LineString': return { type: g.type, arcs: [ajouterArc(g.coordinates)] };
            case 'MultiLineString': return { type: g.type, arcs: g.coordinates.map(l => [ajouterArc(l)]) };
            case 'Polygon': return { type: g.type, arcs: g.coordinates.map(a => [ajouterArc(a)]) };
            case 'MultiPolygon': return { type: g.type, arcs: g.coordinates.map(p => p.map(a => [ajouterArc(a)])) };
            default: return { type: g.type, coordinates: g.coordinates };
        }
    };
    
    const geometries = data.map((d, i) => ({
        ...versTopo(geometrieDe(d)),
        properties: {
            id: i + 1,
            code_postal: d.zipcode || '',
            [paysActif().colonneRegion]: d.pr || ''
        }
    }));
    
    const topojson = {
        type: 'Topology',
        arcs,
        objects: {
            donnees: {
                type: 'GeometryCollection',
                geometries
            }
        }
    };
    
    downloadFile(filename, JSON.stringify(topojson, null, 2), 'application/json');
}

// Export KML
function exportKML(data, filename) {
    let placemarks = data.map((d, i) => `
    <Placemark>
      <name>${geometrieDe(d).type} ${i + 1}</name>
      <description>${d.zipcode || ''} ${d.pr || ''}</description>
      ${versKML(geometrieDe(d))}
    </Placemark>`).join('');
    
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>GeoValidator Export</name>
    ${placemarks}
  </Document>
</kml>`;
    
    downloadFile(filename, kml, 'application/vnd.google-earth.kml+xml');
}

// Export GML
function exportGML(data, filename) {
    let features = data.map((d, i) => `
    <gml:featureMember>
        <Entite gml:id="entite_${i + 1}">
            <code_postal>${d.zipcode || ''}</code_postal>
            <${paysActif().colonneRegion}>${d.pr || ''}</${paysActif().colonneRegion}>
            <geometrie>${versGML(geometrieDe(d))}</geometrie>
        </Entite>
    </gml:featureMember>`).join('');
    
    const [minX, minY, maxX, maxY] = emprise(data);
    const gml = `<?xml version="1.0" encoding="UTF-8"?>
<gml:FeatureCollection 
    xmlns:gml="http://www.opengis.net/gml"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <gml:boundedBy>
        <gml:Box srsName="EPSG:4326">
            <gml:coordinates>${minX},${minY} ${maxX},${maxY}</gml:coordinates>
        </gml:Box>
    </gml:boundedBy>
    ${features}
</gml:FeatureCollection>`;
    
    downloadFile(filename, gml, 'application/gml+xml');
}

// Export GPX : points en waypoints, lignes en traces (le GPX ne gère pas les polygones)
function exportGPX(data, filename) {
    const position = c => `lat="${c[1]}" lon="${c[0]}"`;
    const trace = (segments, nom) => `
  <trk>
    <name>${nom}</name>
    ${segments.map(s => `<trkseg>${s.map(c => `<trkpt ${position(c)}/>`).join('')}</trkseg>`).join('\n    ')}
  </trk>`;
    
    let contenu = '';
    let ignores = 0;
    data.forEach((d, i) => {
        const g = geometrieDe(d);
        const desc = `${d.zipcode || ''} ${d.pr || ''}`;
        if (g.type === 'Point' || g.type === 'MultiPoint') {
            const points = g.type === 'Point' ? [g.coordinates] : g.coordinates;
            points.forEach(c => {
                contenu += `
  <wpt ${position(c)}>
    <name>Point ${i + 1}</name>
    <desc>${desc}</desc>
  </wpt>`;
            });
        } else if (g.type === 'LineString') {
            contenu += trace([g.coordinates], `Ligne ${i + 1}`);
        } else if (g.type === 'MultiLineString') {
            contenu += trace(g.coordinates, `Ligne ${i + 1}`);
        } else {
            ignores++;
        }
    });
    
    if (ignores > 0) {
        showNotification(`GPX : ${ignores} polygone(s) non exporté(s), ce format ne gère que les points et les lignes`, 'info');
    }
    
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GeoValidator" xmlns="http://www.topografix.com/GPX/1/1">
  ${contenu}
</gpx>`;
    
    downloadFile(filename, gpx, 'application/gpx+xml');
}

// Export WKT
function exportWKT(data, filename) {
    const wkt = data.map(d => versWKT(geometrieDe(d))).join('\n');
    downloadFile(filename, wkt, 'text/plain');
}

// Export Shapefile (ZIP avec SHP, SHX, DBF, PRJ)
// v1.2 : un Shapefile ne contient qu'un type de forme → un jeu de fichiers par type
async function exportShapefile(data, filename) {
    const zip = new JSZip();
    
    const familles = [
        { nom: 'points', shapeType: 1, types: ['Point'] },
        { nom: 'multipoints', shapeType: 8, types: ['MultiPoint'] },
        { nom: 'lignes', shapeType: 3, types: ['LineString', 'MultiLineString'] },
        { nom: 'polygones', shapeType: 5, types: ['Polygon', 'MultiPolygon'] }
    ];
    
    familles.forEach(f => {
        const sousEnsemble = data.filter(d => f.types.includes(geometrieDe(d).type));
        if (sousEnsemble.length === 0) return;
        zip.file(`${f.nom}.shp`, generateSHP(sousEnsemble, f.shapeType));
        zip.file(`${f.nom}.shx`, generateSHX(sousEnsemble, f.shapeType));
        zip.file(`${f.nom}.dbf`, generateDBF(sousEnsemble));
        zip.file(`${f.nom}.prj`, generatePRJ());
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadFile(filename, blob, 'application/zip');
}

// Contenu d'un enregistrement SHP (sans l'en-tête de 8 octets)
function contenuEnregistrementSHP(geom, shapeType) {
    const sommets = listerSommets(geom);
    
    if (shapeType === 1) {
        const buffer = new ArrayBuffer(20);
        const view = new DataView(buffer);
        view.setInt32(0, 1, true);
        view.setFloat64(4, geom.coordinates[0], true);
        view.setFloat64(12, geom.coordinates[1], true);
        return new Uint8Array(buffer);
    }
    
    // Parties : lignes, ou anneaux (extérieur sens horaire, trous sens anti-horaire)
    let parties;
    if (shapeType === 8) {
        parties = [];
    } else if (geom.type === 'LineString') {
        parties = [geom.coordinates];
    } else if (geom.type === 'MultiLineString') {
        parties = geom.coordinates;
    } else {
        const polygones = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
        parties = [];
        polygones.forEach(p => p.forEach((anneau, k) => {
            const horaire = aireSignee(anneau) < 0;
            const doitEtreHoraire = k === 0;
            parties.push(horaire === doitEtreHoraire ? anneau : anneau.slice().reverse());
        }));
    }
    
    const points = shapeType === 8 ? sommets : [].concat(...parties);
    const taille = shapeType === 8 ? 40 + 16 * points.length : 44 + 4 * parties.length + 16 * points.length;
    const buffer = new ArrayBuffer(taille);
    const view = new DataView(buffer);
    const xs = sommets.map(c => c[0]), ys = sommets.map(c => c[1]);
    
    view.setInt32(0, shapeType, true);
    view.setFloat64(4, safeMin(xs), true);
    view.setFloat64(12, safeMin(ys), true);
    view.setFloat64(20, safeMax(xs), true);
    view.setFloat64(28, safeMax(ys), true);
    
    let pos;
    if (shapeType === 8) {
        view.setInt32(36, points.length, true);
        pos = 40;
    } else {
        view.setInt32(36, parties.length, true);
        view.setInt32(40, points.length, true);
        pos = 44;
        let indice = 0;
        parties.forEach(p => {
            view.setInt32(pos, indice, true);
            indice += p.length;
            pos += 4;
        });
    }
    points.forEach(c => {
        view.setFloat64(pos, c[0], true);
        view.setFloat64(pos + 8, c[1], true);
        pos += 16;
    });
    
    return new Uint8Array(buffer);
}

// En-tête commun SHP / SHX (100 octets)
function enTeteSHP(view, longueurOctets, shapeType, data) {
    const [minX, minY, maxX, maxY] = emprise(data);
    view.setInt32(0, 9994, false);
    view.setInt32(24, longueurOctets / 2, false);
    view.setInt32(28, 1000, true);
    view.setInt32(32, shapeType, true);
    view.setFloat64(36, minX, true);
    view.setFloat64(44, minY, true);
    view.setFloat64(52, maxX, true);
    view.setFloat64(60, maxY, true);
}

function generateSHP(data, shapeType = 1) {
    const contenus = data.map(d => contenuEnregistrementSHP(geometrieDe(d), shapeType));
    const taille = 100 + contenus.reduce((s, c) => s + 8 + c.length, 0);
    
    const buffer = new ArrayBuffer(taille);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    enTeteSHP(view, taille, shapeType, data);
    
    let offset = 100;
    contenus.forEach((c, i) => {
        view.setInt32(offset, i + 1, false);
        view.setInt32(offset + 4, c.length / 2, false);
        bytes.set(c, offset + 8);
        offset += 8 + c.length;
    });
    
    return bytes;
}

function generateSHX(data, shapeType = 1) {
    const contenus = data.map(d => contenuEnregistrementSHP(geometrieDe(d), shapeType));
    const taille = 100 + data.length * 8;
    
    const buffer = new ArrayBuffer(taille);
    const view = new DataView(buffer);
    enTeteSHP(view, taille, shapeType, data);
    
    let offset = 100;
    let recordOffset = 100;
    contenus.forEach(c => {
        view.setInt32(offset, recordOffset / 2, false);
        view.setInt32(offset + 4, c.length / 2, false);
        offset += 8;
        recordOffset += 8 + c.length;
    });
    
    return new Uint8Array(buffer);
}

function generateDBF(data) {
    const numRecords = data.length;
    const fields = [
        { name: 'CODE_POST', type: 'C', length: 10 },
        { name: paysActif().colonneRegion.toUpperCase(), type: 'C', length: 20 }
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
        if (!window.initSqlJs) {
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
        
        // v1.2 : type de géométrie de la table (GEOMETRY si plusieurs types)
        const types = new Set(data.map(d => geometrieDe(d).type));
        const typeTable = types.size === 1 ? [...types][0].toUpperCase() : 'GEOMETRY';
        const table = typeTable === 'POINT' ? 'points' : 'entites';
        
        db.run(`CREATE TABLE ${table} (
            fid INTEGER PRIMARY KEY AUTOINCREMENT,
            geom BLOB,
            code_postal TEXT,
            ${paysActif().colonneRegion} TEXT
        )`);
        
        const [minX, minY, maxX, maxY] = emprise(data);
        
        db.run(`INSERT INTO gpkg_contents VALUES ('${table}', 'features', '${table}', 'Données validées', datetime('now'), ?, ?, ?, ?, 4326)`,
            [minX, minY, maxX, maxY]);
        
        db.run(`INSERT INTO gpkg_geometry_columns VALUES ('${table}', 'geom', '${typeTable}', 4326, 0, 0)`);
        
        data.forEach(d => {
            db.run(`INSERT INTO ${table} (geom, code_postal, ${paysActif().colonneRegion}) VALUES (?, ?, ?)`,
                [createGpkgBlob(geometrieDe(d)), d.zipcode || '', d.pr || '']);
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

// Géométrie GeoPackage : en-tête GP (8 octets, sans enveloppe, SRID 4326) + WKB
function createGpkgBlob(geom) {
    const wkb = ecrireWKB(geom);
    const bytes = new Uint8Array(8 + wkb.length);
    const view = new DataView(bytes.buffer);
    
    bytes[0] = 0x47; // G
    bytes[1] = 0x50; // P
    bytes[2] = 0x00; // version
    bytes[3] = 0x01; // little-endian, pas d'enveloppe
    view.setInt32(4, 4326, true);
    bytes.set(wkb, 8);
    
    return bytes;
}

// Export carte HTML
function exportMapHTML() {
    if (!AppState.donneesValides || AppState.donneesValides.length === 0) {
        showNotification('Aucune donnée à exporter', 'error');
        return;
    }
    
    const data = AppState.donneesValides;
    const [minLon, minLat, maxLon, maxLat] = emprise(data);
    const bounds = { minLat, maxLat, minLon, maxLon };
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLon = (bounds.minLon + bounds.maxLon) / 2;
    
    const points = data.filter(d => geometrieDe(d).type === 'Point');
    const pointsJS = points.map(d => 
        `{lat:${d.lat},lon:${d.lon},cp:"${d.zipcode||''}",pr:"${d.pr||''}"}`
    ).join(',');
    
    // v1.2 : lignes et polygones
    const formesJS = JSON.stringify(data.filter(d => geometrieDe(d).type !== 'Point').map(d => ({
        type: 'Feature', geometry: d.geom, properties: { type: d.geom.type, cp: d.zipcode || '', pr: d.pr || '' }
    })));
    
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GeoValidator - Carte des points validés</title>
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
        <h1>GeoValidator</h1>
        <span>${data.length} ${AppState.projection ? 'entités validées' : 'points validés'}</span>
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
            m.bindPopup('<div class="popup-title">📍 Point</div>Lat: '+p.lat.toFixed(5)+'<br>Lon: '+p.lon.toFixed(5)+(p.cp?'<br>Code postal: '+p.cp:'')+(p.pr?'<br>${paysActif().libelleRegion}: '+p.pr:''));
            markers.addLayer(m);
        });
        map.addLayer(markers);
        L.geoJSON(${formesJS},{style:{color:'#003DA5',weight:2,fillColor:'#003DA5',fillOpacity:0.25},onEachFeature:(f,l)=>l.bindPopup('<div class="popup-title">'+f.properties.type+'</div>'+(f.properties.cp?'Code postal: '+f.properties.cp+'<br>':'')+(f.properties.pr?'${paysActif().libelleRegion}: '+f.properties.pr:''))}).addTo(map);
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
        pdf.text('GeoValidator - Carte des données validées', pageWidth / 2, 15, { align: 'center' });
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const dateStr = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
        pdf.text(`${AppState.donneesValides.length} ${AppState.projection ? 'entités valides' : 'points valides'} • Exporté le ${dateStr}`, pageWidth / 2, 22, { align: 'center' });
        
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
        pdf.text(AppState.projection ? 'Entité valide' : 'Point valide', legendX + 5, legendY + 1);
        
        pdf.setFontSize(7);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Projection: WGS 84 (EPSG:4326) • Fond de carte: OpenStreetMap', pageWidth / 2, pageHeight - 8, { align: 'center' });
        
        pdf.setFontSize(8);
        pdf.setTextColor(0, 61, 165);
        pdf.setFont('helvetica', 'bold');
        pdf.text('GeoValidator', pageWidth - margin, pageHeight - 8, { align: 'right' });
        
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
