/**
 * GéoValid Québec - Module de Conversion SIG
 * Fichier: js/conversion.js
 * Formats: GeoJSON, GeoPackage, Shapefile
 */

// État de la conversion
const ConversionState = {
    enabled: false,
    formatSelectionne: 'geojson'
};

// Formats de conversion
const FORMATS_CONVERSION = {
    geojson: {
        nom: 'GeoJSON',
        extension: '.geojson',
        description: '🌐 Format standard pour les données géospatiales web',
        icone: '🌐'
    },
    geopackage: {
        nom: 'GeoPackage',
        extension: '.gpkg',
        description: '📦 Format SQLite pour données géospatiales (OGC)',
        icone: '📦'
    },
    shapefile: {
        nom: 'Shapefile (ZIP)',
        extension: '.zip',
        description: '🗂️ Format ESRI classique (SHP, DBF, SHX, PRJ)',
        icone: '🗂️'
    }
};

// Initialisation du module
function initConversionModule() {
    const toggleConversion = document.getElementById('toggleConversion');
    const conversionOptions = document.getElementById('conversionOptions');
    const formatSelect = document.getElementById('formatConversion');
    const formatDescription = document.getElementById('formatDescription');
    const btnConvertir = document.getElementById('btnConvertir');
    
    if (!toggleConversion) return;
    
    // Toggle activation
    toggleConversion.addEventListener('change', (e) => {
        ConversionState.enabled = e.target.checked;
        conversionOptions.classList.toggle('hidden', !e.target.checked);
        
        if (e.target.checked) {
            formatSelect.value = 'geojson';
            ConversionState.formatSelectionne = 'geojson';
            formatDescription.textContent = FORMATS_CONVERSION.geojson.description;
        }
    });
    
    // Changement de format
    formatSelect.addEventListener('change', (e) => {
        ConversionState.formatSelectionne = e.target.value;
        formatDescription.textContent = FORMATS_CONVERSION[e.target.value].description;
    });
    
    // Bouton convertir
    btnConvertir.addEventListener('click', convertirDonnees);
}

// Fonction principale de conversion
async function convertirDonnees() {
    if (!AppState.donneesValides || AppState.donneesValides.length === 0) {
        showNotification('Aucune donnée valide à convertir', 'error');
        return;
    }
    
    const btnConvertir = document.getElementById('btnConvertir');
    const originalHTML = btnConvertir.innerHTML;
    
    try {
        btnConvertir.disabled = true;
        btnConvertir.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conversion...';
        
        let resultat;
        
        switch (ConversionState.formatSelectionne) {
            case 'geojson':
                resultat = convertirGeoJSON(AppState.donneesValides);
                break;
            case 'geopackage':
                resultat = await convertirGeoPackage(AppState.donneesValides);
                break;
            case 'shapefile':
                resultat = await convertirShapefile(AppState.donneesValides);
                break;
        }
        
        downloadFile(resultat.nom, resultat.contenu, resultat.type);
        showNotification(`Conversion ${FORMATS_CONVERSION[ConversionState.formatSelectionne].nom} réussie !`, 'success');
        
    } catch (error) {
        console.error('Erreur conversion:', error);
        showNotification(`Erreur: ${error.message}`, 'error');
    } finally {
        btnConvertir.disabled = false;
        btnConvertir.innerHTML = originalHTML;
    }
}

// Conversion GeoJSON
function convertirGeoJSON(donnees) {
    const geojson = {
        type: "FeatureCollection",
        name: "donnees_valides_geovalid",
        crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
        features: donnees.map((d, i) => ({
            type: "Feature",
            id: i + 1,
            properties: {
                id: i + 1,
                zipcode: d.zipcode || '',
                province: d.pr || '',
                longitude: d.lon,
                latitude: d.lat
            },
            geometry: {
                type: "Point",
                coordinates: [d.lon, d.lat]
            }
        }))
    };
    
    return {
        nom: 'donnees_valides.geojson',
        contenu: JSON.stringify(geojson, null, 2),
        type: 'application/geo+json'
    };
}

// Conversion GeoPackage
async function convertirGeoPackage(donnees) {
    // Charger sql.js
    if (typeof initSqlJs === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    
    const db = new SQL.Database();
    
    // Tables système GeoPackage
    db.run(`CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT, srs_id INTEGER PRIMARY KEY, organization TEXT, organization_coordsys_id INTEGER, definition TEXT, description TEXT)`);
    db.run(`INSERT INTO gpkg_spatial_ref_sys VALUES ('WGS 84', 4326, 'EPSG', 4326, 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]', 'WGS 84')`);
    
    db.run(`CREATE TABLE gpkg_contents (table_name TEXT PRIMARY KEY, data_type TEXT, identifier TEXT, description TEXT, last_change DATETIME, min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER)`);
    db.run(`CREATE TABLE gpkg_geometry_columns (table_name TEXT, column_name TEXT, geometry_type_name TEXT, srs_id INTEGER, z TINYINT, m TINYINT, PRIMARY KEY (table_name, column_name))`);
    
    // Table de données
    db.run(`CREATE TABLE points (fid INTEGER PRIMARY KEY, geom BLOB, zipcode TEXT, province TEXT, lon REAL, lat REAL)`);
    
    const minX = safeMin(donnees.map(d => d.lon));
    const maxX = safeMax(donnees.map(d => d.lon));
    const minY = safeMin(donnees.map(d => d.lat));
    const maxY = safeMax(donnees.map(d => d.lat));
    
    db.run(`INSERT INTO gpkg_contents VALUES ('points', 'features', 'points', 'Points exportés', datetime('now'), ${minX}, ${minY}, ${maxX}, ${maxY}, 4326)`);
    db.run(`INSERT INTO gpkg_geometry_columns VALUES ('points', 'geom', 'POINT', 4326, 0, 0)`);
    
    // Insérer les données
    const stmt = db.prepare('INSERT INTO points (geom, zipcode, province, lon, lat) VALUES (?, ?, ?, ?, ?)');
    donnees.forEach(d => {
        const wkb = createWKBPoint(d.lon, d.lat);
        stmt.run([wkb, d.zipcode || '', d.pr || '', d.lon, d.lat]);
    });
    stmt.free();
    
    const dbArray = db.export();
    db.close();
    
    return {
        nom: 'donnees_valides.gpkg',
        contenu: new Blob([dbArray]),
        type: 'application/geopackage+sqlite3'
    };
}

function createWKBPoint(lon, lat) {
    const buffer = new ArrayBuffer(21);
    const view = new DataView(buffer);
    view.setUint8(0, 1);
    view.setUint32(1, 1, true);
    view.setFloat64(5, lon, true);
    view.setFloat64(13, lat, true);
    return new Uint8Array(buffer);
}

// Conversion Shapefile
async function convertirShapefile(donnees) {
    const zip = new JSZip();
    
    const shp = genererSHP(donnees);
    const shx = genererSHX(donnees);
    const dbf = genererDBF(donnees);
    const prj = genererPRJ();
    
    zip.file('donnees_valides.shp', shp);
    zip.file('donnees_valides.shx', shx);
    zip.file('donnees_valides.dbf', dbf);
    zip.file('donnees_valides.prj', prj);
    
    const blob = await zip.generateAsync({ type: 'blob' });
    
    return {
        nom: 'donnees_valides_shapefile.zip',
        contenu: blob,
        type: 'application/zip'
    };
}

function genererSHP(donnees) {
    const headerSize = 100;
    const recordSize = 28;
    const fileLength = (headerSize + donnees.length * recordSize) / 2;
    
    const minX = safeMin(donnees.map(d => d.lon));
    const maxX = safeMax(donnees.map(d => d.lon));
    const minY = safeMin(donnees.map(d => d.lat));
    const maxY = safeMax(donnees.map(d => d.lat));
    
    const buffer = new ArrayBuffer(headerSize + donnees.length * recordSize);
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
    donnees.forEach((d, i) => {
        view.setInt32(offset, i + 1, false);
        view.setInt32(offset + 4, 10, false);
        view.setInt32(offset + 8, 1, true);
        view.setFloat64(offset + 12, d.lon, true);
        view.setFloat64(offset + 20, d.lat, true);
        offset += 28;
    });
    
    return new Uint8Array(buffer);
}

function genererSHX(donnees) {
    const headerSize = 100;
    const fileLength = (headerSize + donnees.length * 8) / 2;
    
    const minX = safeMin(donnees.map(d => d.lon));
    const maxX = safeMax(donnees.map(d => d.lon));
    const minY = safeMin(donnees.map(d => d.lat));
    const maxY = safeMax(donnees.map(d => d.lat));
    
    const buffer = new ArrayBuffer(headerSize + donnees.length * 8);
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
    let shpOffset = 50;
    donnees.forEach(() => {
        view.setInt32(offset, shpOffset, false);
        view.setInt32(offset + 4, 10, false);
        offset += 8;
        shpOffset += 14;
    });
    
    return new Uint8Array(buffer);
}

function genererDBF(donnees) {
    const champs = [
        { nom: 'ZIPCODE', type: 'C', longueur: 10 },
        { nom: 'PROVINCE', type: 'C', longueur: 2 },
        { nom: 'LONGITUDE', type: 'N', longueur: 12, decimales: 6 },
        { nom: 'LATITUDE', type: 'N', longueur: 12, decimales: 6 }
    ];
    
    const headerSize = 32 + champs.length * 32 + 1;
    const recordSize = 1 + champs.reduce((s, c) => s + c.longueur, 0);
    const fileSize = headerSize + donnees.length * recordSize + 1;
    
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    
    view.setUint8(0, 3);
    const now = new Date();
    view.setUint8(1, now.getFullYear() - 1900);
    view.setUint8(2, now.getMonth() + 1);
    view.setUint8(3, now.getDate());
    view.setUint32(4, donnees.length, true);
    view.setUint16(8, headerSize, true);
    view.setUint16(10, recordSize, true);
    
    let offset = 32;
    champs.forEach(c => {
        for (let i = 0; i < 11; i++) bytes[offset + i] = i < c.nom.length ? c.nom.charCodeAt(i) : 0;
        bytes[offset + 11] = c.type.charCodeAt(0);
        view.setUint8(offset + 16, c.longueur);
        view.setUint8(offset + 17, c.decimales || 0);
        offset += 32;
    });
    bytes[offset++] = 0x0D;
    
    donnees.forEach(d => {
        bytes[offset++] = 0x20;
        const zip = (d.zipcode || '').padEnd(10, ' ');
        for (let i = 0; i < 10; i++) bytes[offset++] = zip.charCodeAt(i);
        const prov = (d.pr || '').padEnd(2, ' ');
        for (let i = 0; i < 2; i++) bytes[offset++] = prov.charCodeAt(i);
        const lon = d.lon.toFixed(6).padStart(12, ' ');
        for (let i = 0; i < 12; i++) bytes[offset++] = lon.charCodeAt(i);
        const lat = d.lat.toFixed(6).padStart(12, ' ');
        for (let i = 0; i < 12; i++) bytes[offset++] = lat.charCodeAt(i);
    });
    bytes[offset] = 0x1A;
    
    return new Uint8Array(buffer);
}

function genererPRJ() {
    return new TextEncoder().encode('GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]');
}
