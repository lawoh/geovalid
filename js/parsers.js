/**
 * GeoValidator - Parseurs Multi-Formats
 * Fichier: js/parsers.js
 */

// Fonction principale de lecture
async function parseFile(file, format) {
    switch (format) {
        case 'csv':
        case 'txt':
        case 'tsv':
            return await parseCSV(file);
        case 'xls':
        case 'xlsx':
        case 'ods':
            return await parseExcel(file);
        case 'json':
        case 'geojson':
            return await parseJSON(file);
        case 'topojson':
            return await parseTopoJSON(file);
        case 'xml':
            return await parseXML(file);
        case 'kml':
            return await parseKML(file);
        case 'kmz':
            return await parseKMZ(file);
        case 'gpx':
            return await parseGPX(file);
        case 'gml':
            return await parseGML(file);
        case 'wkt':
            return await parseWKT(file);
        case 'shp':
        case 'zip':
            return await parseShapefile(file);
        case 'dbf':
            return await parseDBF(file);
        case 'gpkg':
            return await parseGeoPackage(file);
        default:
            throw new Error(`Format non supporté: ${format}`);
    }
}

// Parser CSV/TXT/TSV
async function parseCSV(file) {
    const content = await file.text();
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    
    if (lines.length < 2) throw new Error('Fichier vide ou sans données');
    
    // Détecter le séparateur
    const firstLine = lines[0];
    let sep = ',';
    if (firstLine.includes('\t')) sep = '\t';
    else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) sep = ';';
    
    const headers = parseCSVLine(lines[0], sep).map(h => h.replace(/^["']|["']$/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], sep);
        if (values.length > 0 && values.some(v => v.trim())) {
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = (values[idx] || '').replace(/^["']|["']$/g, '');
            });
            data.push(row);
        }
    }
    
    return { headers, data };
}

// Parser Excel
async function parseExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const arrayData = new Uint8Array(e.target.result);
                const workbook = XLSX.read(arrayData, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                
                if (jsonData.length < 2) throw new Error('Fichier Excel vide');
                
                const headers = jsonData[0].map(h => String(h).trim());
                const data = [];
                
                for (let i = 1; i < jsonData.length; i++) {
                    const row = {};
                    headers.forEach((h, idx) => {
                        row[h] = String(jsonData[i][idx] ?? '').trim();
                    });
                    data.push(row);
                }
                
                resolve({ headers, data });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Erreur de lecture Excel'));
        reader.readAsArrayBuffer(file);
    });
}

// Parser JSON / GeoJSON
async function parseJSON(file) {
    const content = await file.text();
    let json = JSON.parse(content);
    
    // GeoJSON : FeatureCollection, Feature seul ou géométrie seule
    if (json.type === 'Feature') json = { type: 'FeatureCollection', features: [json] };
    if (TYPES_GEOMETRIE.includes(json.type)) json = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: json, properties: {} }] };
    
    if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
        const data = [];
        const allKeys = new Set();
        
        json.features.forEach(f => {
            const row = { _geom_: f.geometry || null };
            Object.entries(f.properties || {}).forEach(([k, v]) => {
                row[k] = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v ?? '');
                allKeys.add(k);
            });
            data.push(row);
        });
        
        // Projection déclarée (membre "crs" des anciens GeoJSON)
        const srs = json.crs?.properties?.name ? { code: lireCodeEPSG(json.crs.properties.name) } : null;
        return { headers: Array.from(allKeys), data, srs };
    }
    
    // JSON array
    if (!Array.isArray(json)) {
        const arrayKey = Object.keys(json).find(k => Array.isArray(json[k]));
        if (arrayKey) json = json[arrayKey];
    }
    
    if (!Array.isArray(json) || json.length === 0) {
        throw new Error('Aucune donnée trouvée dans le JSON');
    }
    
    const headers = Object.keys(json[0]);
    const data = json.map(row => {
        const obj = {};
        headers.forEach(h => obj[h] = String(row[h] ?? '').trim());
        return obj;
    });
    
    return { headers, data };
}
// Parser XML
async function parseXML(file) {
    const content = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    
    if (xmlDoc.querySelector('parsererror')) {
        throw new Error('Format XML invalide');
    }
    
    // Trouver les éléments répétitifs
    const elements = xmlDoc.querySelectorAll('*');
    const counts = {};
    elements.forEach(el => {
        counts[el.tagName] = (counts[el.tagName] || 0) + 1;
    });
    
    let recordTag = null;
    let maxCount = 0;
    Object.entries(counts).forEach(([tag, count]) => {
        if (count > maxCount && count > 1 && tag !== xmlDoc.documentElement.tagName) {
            maxCount = count;
            recordTag = tag;
        }
    });
    
    if (!recordTag) throw new Error('Structure XML non reconnue');
    
    const records = xmlDoc.querySelectorAll(recordTag);
    const data = [];
    const allKeys = new Set();
    
    records.forEach(rec => {
        const row = {};
        Array.from(rec.attributes).forEach(attr => {
            row[attr.name] = attr.value;
            allKeys.add(attr.name);
        });
        Array.from(rec.children).forEach(child => {
            row[child.tagName] = child.textContent.trim();
            allKeys.add(child.tagName);
        });
        if (Object.keys(row).length > 0) data.push(row);
    });
    
    return { headers: Array.from(allKeys), data };
}

// Parser KML
async function parseKML(file) {
    const content = await file.text();
    return parseKMLContent(content);
}

// Parser KMZ
async function parseKMZ(file) {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    let kmlContent = null;
    for (const [filename, entry] of Object.entries(zip.files)) {
        if (filename.toLowerCase().endsWith('.kml')) {
            kmlContent = await entry.async('text');
            break;
        }
    }
    
    if (!kmlContent) throw new Error('Aucun fichier KML dans le KMZ');
    return parseKMLContent(kmlContent);
}

function parseKMLContent(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const placemarks = doc.getElementsByTagName('Placemark');
    const data = [];
    const allKeys = new Set();
    
    for (const pm of placemarks) {
        const row = {};
        
        const name = pm.getElementsByTagName('name')[0];
        if (name) { row.name = name.textContent.trim(); allKeys.add('name'); }
        
        // Géométrie : Point, LineString, LinearRing, Polygon ou MultiGeometry
        const geomElement = [...pm.children].find(e => TYPES_KML.includes(e.localName));
        if (!geomElement) continue;
        row._geom_ = lireGeometrieKML(geomElement);
        
        pm.querySelectorAll('ExtendedData Data, SchemaData SimpleData').forEach(d => {
            const fieldName = d.getAttribute('name') || d.tagName;
            const value = d.querySelector('value')?.textContent || d.textContent;
            row[fieldName] = value.trim();
            allKeys.add(fieldName);
        });
        
        data.push(row);
    }
    
    if (data.length === 0) throw new Error('Aucune géométrie trouvée dans le KML');
    // Le KML est toujours en WGS 84
    return { headers: Array.from(allKeys), data, srs: { code: 4326 } };
}
// Parser GPX : waypoints (points), routes et traces (lignes)
async function parseGPX(file) {
    const content = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const data = [];
    const allKeys = new Set(['name']);
    
    const position = pt => [parseFloat(pt.getAttribute('lon')), parseFloat(pt.getAttribute('lat'))];
    const nom = el => [...el.children].find(e => e.localName === 'name')?.textContent.trim() || '';
    
    // Waypoints
    for (const wpt of doc.getElementsByTagName('wpt')) {
        const row = { _geom_: { type: 'Point', coordinates: position(wpt) }, name: nom(wpt) };
        const desc = wpt.getElementsByTagName('desc')[0];
        if (desc) { row.description = desc.textContent.trim(); allKeys.add('description'); }
        data.push(row);
    }
    
    // Routes
    for (const rte of doc.getElementsByTagName('rte')) {
        const points = [...rte.getElementsByTagName('rtept')].map(position);
        data.push({ _geom_: { type: 'LineString', coordinates: points }, name: nom(rte) });
    }
    
    // Traces : un segment = une ligne
    for (const trk of doc.getElementsByTagName('trk')) {
        const segments = [...trk.getElementsByTagName('trkseg')].map(seg => [...seg.getElementsByTagName('trkpt')].map(position));
        const geom = segments.length === 1
            ? { type: 'LineString', coordinates: segments[0] }
            : { type: 'MultiLineString', coordinates: segments };
        data.push({ _geom_: geom, name: nom(trk) });
    }
    
    if (data.length === 0) throw new Error('Aucune géométrie trouvée dans le GPX');
    // Le GPX est toujours en WGS 84
    return { headers: Array.from(allKeys), data, srs: { code: 4326 } };
}

// Parser TopoJSON
async function parseTopoJSON(file) {
    const content = await file.text();
    const topo = JSON.parse(content);
    
    const data = [];
    const allKeys = new Set();
    
    // Parcourir les objets du TopoJSON
    Object.values(topo.objects || {}).forEach(obj => {
        const geometries = obj.type === 'GeometryCollection' ? (obj.geometries || []) : [obj];
        geometries.forEach(geom => {
            const row = { _geom_: lireGeometrieTopo(geom, topo) };
            Object.entries(geom.properties || {}).forEach(([k, v]) => {
                row[k] = String(v ?? '');
                allKeys.add(k);
            });
            data.push(row);
        });
    });
    
    if (data.length === 0) throw new Error('Aucune géométrie trouvée dans le TopoJSON');
    return { headers: Array.from(allKeys), data };
}

// Parser GML (GML 2 et 3)
async function parseGML(file) {
    const content = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    
    const data = [];
    const allKeys = new Set();
    
    // Projection : premier srsName du fichier
    const avecSrs = doc.querySelector('[srsName]');
    const srsName = avecSrs ? avecSrs.getAttribute('srsName') : null;
    
    // Entités : enfants de featureMember / member, ou de featureMembers
    const entites = [];
    ['featureMember', 'member'].forEach(nom => {
        for (const m of doc.getElementsByTagNameNS('*', nom)) {
            if (m.firstElementChild) entites.push(m.firstElementChild);
        }
    });
    for (const m of doc.getElementsByTagNameNS('*', 'featureMembers')) entites.push(...m.children);
    
    entites.forEach(feature => {
        const row = {};
        let geometrie = null;
        
        Array.from(feature.children).forEach(child => {
            // Propriété géométrique : contient un élément Point, LineString, Polygon, Multi*...
            const geomElement = TYPES_GML.includes(child.localName) ? child : [...child.children].find(e => TYPES_GML.includes(e.localName));
            if (geomElement) {
                const srs = geomElement.getAttribute('srsName') || srsName;
                geometrie = lireGeometrieGML(geomElement, axesInverses(srs));
            } else if (child.localName !== 'boundedBy') {
                row[child.localName] = child.textContent.trim();
                allKeys.add(child.localName);
            }
        });
        
        row._geom_ = geometrie;
        data.push(row);
    });
    
    if (data.length === 0) throw new Error('Aucune entité trouvée dans le GML');
    return { headers: Array.from(allKeys), data, srs: srsName ? { code: lireCodeEPSG(srsName) } : null };
}

// Parser WKT (Well-Known Text) : une géométrie par ligne ou à la suite
async function parseWKT(file) {
    const content = await file.text();
    const data = [];
    
    // Repérer chaque géométrie et prendre le texte jusqu'à la parenthèse fermante correspondante
    const regex = /\b(MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|POINT|LINESTRING|POLYGON|GEOMETRYCOLLECTION)\b/gi;
    let match;
    let id = 1;
    
    while ((match = regex.exec(content)) !== null) {
        const debut = match.index;
        let pos = debut + match[0].length;
        let profondeur = 0;
        const vide = /^\s*(ZM|Z|M)?\s*EMPTY/i.exec(content.slice(pos));
        if (vide) {
            pos += vide[0].length;
        } else {
            while (pos < content.length) {
                if (content[pos] === '(') profondeur++;
                if (content[pos] === ')') {
                    profondeur--;
                    if (profondeur === 0) { pos++; break; }
                }
                pos++;
            }
        }
        
        let geom;
        try {
            geom = lireWKT(content.slice(debut, pos));
        } catch (e) {
            geom = { type: 'WKT invalide', coordinates: [] };
        }
        data.push({ _geom_: geom, id: String(id++) });
        regex.lastIndex = pos;
    }
    
    if (data.length === 0) throw new Error('Aucune géométrie trouvée dans le WKT');
    const srid = content.match(/SRID=(\d+);/i);
    return { headers: ['id'], data, srs: srid ? { code: parseInt(srid[1]) } : null };
}

// Parser Shapefile (ZIP contenant .shp, .dbf, .prj)
async function parseShapefile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    let shpFile = null;
    let dbfFile = null;
    let prjTexte = null;
    
    for (const [filename, entry] of Object.entries(zip.files)) {
        const lowerName = filename.toLowerCase();
        if (lowerName.endsWith('.shp')) {
            shpFile = await entry.async('arraybuffer');
        } else if (lowerName.endsWith('.dbf')) {
            dbfFile = await entry.async('arraybuffer');
        } else if (lowerName.endsWith('.prj')) {
            prjTexte = await entry.async('text');
        }
    }
    
    if (!shpFile) throw new Error('Fichier .shp non trouvé dans le ZIP');
    
    const shpView = new DataView(shpFile);
    const data = [];
    const allKeys = new Set();
    
    // Lire les enregistrements SHP (points, lignes, polygones, multipoints)
    let offset = 100;
    while (offset < shpFile.byteLength - 8) {
        const recordLength = shpView.getInt32(offset + 4, false) * 2;
        data.push({ _geom_: lireGeometrieSHP(shpView, offset + 8) });
        offset += 8 + recordLength;
    }
    
    // Si DBF existe, fusionner les attributs
    if (dbfFile && data.length > 0) {
        const dbfData = parseDBFBuffer(dbfFile);
        dbfData.headers.forEach(h => allKeys.add(h));
        
        data.forEach((row, i) => {
            if (dbfData.data[i]) {
                Object.assign(row, dbfData.data[i]);
            }
        });
    }
    
    if (data.length === 0) throw new Error('Aucune entité trouvée dans le Shapefile');
    return { headers: Array.from(allKeys), data, srs: prjTexte ? { wkt: prjTexte.trim() } : null };
}
// Parser DBF
async function parseDBF(file) {
    const arrayBuffer = await file.arrayBuffer();
    return parseDBFBuffer(arrayBuffer);
}

function parseDBFBuffer(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    
    const numRecords = view.getUint32(4, true);
    const headerSize = view.getUint16(8, true);
    const recordSize = view.getUint16(10, true);
    
    // Lire les champs
    const fields = [];
    let offset = 32;
    while (offset < headerSize - 1 && bytes[offset] !== 0x0D) {
        const name = String.fromCharCode(...bytes.slice(offset, offset + 11)).replace(/\0/g, '').trim();
        const type = String.fromCharCode(bytes[offset + 11]);
        const length = bytes[offset + 16];
        fields.push({ name, type, length });
        offset += 32;
    }
    
    const headers = fields.map(f => f.name);
    const data = [];
    
    // Lire les enregistrements
    offset = headerSize;
    for (let i = 0; i < numRecords; i++) {
        if (bytes[offset] !== 0x2A) { // Non supprimé
            const row = {};
            let fieldOffset = offset + 1;
            fields.forEach(field => {
                const value = String.fromCharCode(...bytes.slice(fieldOffset, fieldOffset + field.length)).trim();
                row[field.name] = value;
                fieldOffset += field.length;
            });
            data.push(row);
        }
        offset += recordSize;
    }
    
    return { headers, data };
}

// Parser GeoPackage (.gpkg)
async function parseGeoPackage(file) {
    // Charger sql.js si pas déjà chargé
    if (!window.initSqlJs) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Impossible de charger sql.js'));
        });
    }
    
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    
    const arrayBuffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(arrayBuffer));
    
    // Trouver les tables avec géométrie
    const gpkgContents = db.exec("SELECT table_name, data_type FROM gpkg_contents WHERE data_type = 'features'");
    
    // Récupérer le nom de la table et de la colonne géométrique
    let tableName = null;
    let geomColumn = 'geom';
    
    if (gpkgContents.length && gpkgContents[0].values.length) {
        tableName = gpkgContents[0].values[0][0];
    } else {
        // Chercher une table avec une colonne géométrique
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'gpkg_%' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'rtree_%'");
        if (tables.length && tables[0].values.length) {
            tableName = tables[0].values[0][0];
        }
    }
    
    if (!tableName) throw new Error('Aucune table de features trouvée');
    
    // Colonne géométrique et projection
    let srs = null;
    const geomCols = db.exec(`SELECT column_name, srs_id FROM gpkg_geometry_columns WHERE table_name = '${tableName}'`);
    if (geomCols.length && geomCols[0].values.length) {
        geomColumn = geomCols[0].values[0][0];
        const srsId = geomCols[0].values[0][1];
        const srsInfo = db.exec(`SELECT organization, organization_coordsys_id, definition FROM gpkg_spatial_ref_sys WHERE srs_id = ${parseInt(srsId)}`);
        if (srsInfo.length && srsInfo[0].values.length) {
            const [organisation, codeOrg, definition] = srsInfo[0].values[0];
            srs = {
                code: String(organisation).toUpperCase() === 'EPSG' ? parseInt(codeOrg) : null,
                wkt: definition && definition !== 'undefined' ? definition : null
            };
        }
    }
    
    // Récupérer les colonnes de la table
    const tableInfo = db.exec(`PRAGMA table_info('${tableName}')`);
    const columns = tableInfo[0].values.map(row => row[1]).filter(col => col !== geomColumn);
    
    // Récupérer les données
    const selectCols = columns.length > 0 ? columns.map(c => `"${c}"`).join(', ') + ', ' : '';
    const results = db.exec(`SELECT ${selectCols}"${geomColumn}" FROM "${tableName}"`);
    
    db.close();
    
    if (!results.length) throw new Error('Aucune donnée dans la table');
    
    const data = [];
    results[0].values.forEach(row => {
        const rowData = { _geom_: parseGpkgGeometry(row[row.length - 1]) };
        columns.forEach((col, idx) => {
            rowData[col] = String(row[idx] ?? '');
        });
        data.push(rowData);
    });
    
    return { headers: columns, data, srs };
}

// Parser la géométrie binaire GeoPackage (en-tête GP + WKB)
function parseGpkgGeometry(blob) {
    if (!blob || blob.length < 5) return null;
    
    const bytes = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
    
    try {
        // Sans en-tête GP : WKB standard
        if (bytes[0] !== 0x47 || bytes[1] !== 0x50) {
            return lireWKB(bytes, 0);
        }
        
        // Lire les flags
        const flags = bytes[3];
        if (flags & 0x10) return null; // géométrie vide
        const envelopeType = (flags >> 1) & 0x07;
        
        // Taille de l'enveloppe : 0, 32 (xy), 48 (xyz ou xym), 64 (xyzm)
        const envelopeSize = [0, 32, 48, 48, 64][envelopeType] || 0;
        
        return lireWKB(bytes, 8 + envelopeSize);
    } catch (e) {
        console.error('Erreur lecture géométrie:', e);
        return { type: 'Géométrie illisible', coordinates: [] };
    }
}
