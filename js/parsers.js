/**
 * GéoValid Québec - Parseurs Multi-Formats
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
    
    // GeoJSON FeatureCollection
    if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
        const data = [];
        const allKeys = new Set();
        
        json.features.forEach(f => {
            if (f.geometry && f.geometry.type === 'Point') {
                const [lon, lat] = f.geometry.coordinates;
                const row = { _longitude_: String(lon), _latitude_: String(lat) };
                Object.entries(f.properties || {}).forEach(([k, v]) => {
                    row[k] = String(v ?? '');
                    allKeys.add(k);
                });
                data.push(row);
            }
        });
        
        const headers = ['_longitude_', '_latitude_', ...Array.from(allKeys)];
        return { headers, data };
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
    const placemarks = doc.querySelectorAll('Placemark');
    const data = [];
    const allKeys = new Set(['_longitude_', '_latitude_']);
    
    placemarks.forEach(pm => {
        const row = {};
        
        const name = pm.querySelector('name');
        if (name) { row.name = name.textContent.trim(); allKeys.add('name'); }
        
        const coords = pm.querySelector('coordinates');
        if (coords) {
            const parts = coords.textContent.trim().split(',');
            if (parts.length >= 2) {
                row._longitude_ = parts[0].trim();
                row._latitude_ = parts[1].trim();
            }
        }
        
        pm.querySelectorAll('ExtendedData Data, SchemaData SimpleData').forEach(d => {
            const fieldName = d.getAttribute('name') || d.tagName;
            const value = d.querySelector('value')?.textContent || d.textContent;
            row[fieldName] = value.trim();
            allKeys.add(fieldName);
        });
        
        if (row._longitude_ && row._latitude_) data.push(row);
    });
    
    if (data.length === 0) throw new Error('Aucun point trouvé dans le KML');
    return { headers: Array.from(allKeys), data };
}

// Parser GPX
async function parseGPX(file) {
    const content = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    const data = [];
    const allKeys = new Set(['_longitude_', '_latitude_']);
    
    // Waypoints
    doc.querySelectorAll('wpt').forEach(wpt => {
        const row = {
            _latitude_: wpt.getAttribute('lat'),
            _longitude_: wpt.getAttribute('lon')
        };
        const name = wpt.querySelector('name');
        if (name) { row.name = name.textContent.trim(); allKeys.add('name'); }
        const desc = wpt.querySelector('desc');
        if (desc) { row.description = desc.textContent.trim(); allKeys.add('description'); }
        data.push(row);
    });
    
    // Trackpoints
    doc.querySelectorAll('trkpt').forEach(trkpt => {
        data.push({
            _latitude_: trkpt.getAttribute('lat'),
            _longitude_: trkpt.getAttribute('lon')
        });
    });
    
    if (data.length === 0) throw new Error('Aucun point trouvé dans le GPX');
    return { headers: Array.from(allKeys), data };
}

// Parser TopoJSON
async function parseTopoJSON(file) {
    const content = await file.text();
    const topo = JSON.parse(content);
    
    const data = [];
    const allKeys = new Set(['_longitude_', '_latitude_']);
    
    // Parcourir les objets du TopoJSON
    Object.values(topo.objects || {}).forEach(obj => {
        if (obj.geometries) {
            obj.geometries.forEach(geom => {
                if (geom.type === 'Point' && geom.coordinates) {
                    const [x, y] = geom.coordinates;
                    // Convertir les coordonnées arc en coordonnées réelles
                    const lon = topo.transform ? x * topo.transform.scale[0] + topo.transform.translate[0] : x;
                    const lat = topo.transform ? y * topo.transform.scale[1] + topo.transform.translate[1] : y;
                    
                    const row = { _longitude_: String(lon), _latitude_: String(lat) };
                    Object.entries(geom.properties || {}).forEach(([k, v]) => {
                        row[k] = String(v ?? '');
                        allKeys.add(k);
                    });
                    data.push(row);
                }
            });
        }
    });
    
    if (data.length === 0) throw new Error('Aucun point trouvé dans le TopoJSON');
    return { headers: Array.from(allKeys), data };
}

// Parser GML
async function parseGML(file) {
    const content = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    
    const data = [];
    const allKeys = new Set(['_longitude_', '_latitude_']);
    
    // Chercher les éléments Point
    const namespaces = {
        gml: 'http://www.opengis.net/gml',
        gml32: 'http://www.opengis.net/gml/3.2'
    };
    
    // Points GML
    doc.querySelectorAll('Point, gml\\:Point').forEach(point => {
        const pos = point.querySelector('pos, gml\\:pos, coordinates, gml\\:coordinates');
        if (pos) {
            const coords = pos.textContent.trim().split(/[\s,]+/);
            if (coords.length >= 2) {
                const row = {
                    _longitude_: coords[0],
                    _latitude_: coords[1]
                };
                // Récupérer les propriétés du parent
                const feature = point.closest('featureMember, gml\\:featureMember')?.firstElementChild;
                if (feature) {
                    Array.from(feature.children).forEach(child => {
                        if (!child.querySelector('Point, gml\\:Point')) {
                            row[child.localName] = child.textContent.trim();
                            allKeys.add(child.localName);
                        }
                    });
                }
                data.push(row);
            }
        }
    });
    
    if (data.length === 0) throw new Error('Aucun point trouvé dans le GML');
    return { headers: Array.from(allKeys), data };
}

// Parser WKT (Well-Known Text)
async function parseWKT(file) {
    const content = await file.text();
    const data = [];
    const allKeys = new Set(['_longitude_', '_latitude_']);
    
    // Regex pour POINT
    const pointRegex = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/gi;
    let match;
    let id = 1;
    
    while ((match = pointRegex.exec(content)) !== null) {
        data.push({
            _longitude_: match[1],
            _latitude_: match[2],
            id: String(id++)
        });
    }
    allKeys.add('id');
    
    if (data.length === 0) throw new Error('Aucun POINT trouvé dans le WKT');
    return { headers: Array.from(allKeys), data };
}

// Parser Shapefile (ZIP contenant .shp, .dbf, etc.)
async function parseShapefile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    let shpFile = null;
    let dbfFile = null;
    
    for (const [filename, entry] of Object.entries(zip.files)) {
        const lowerName = filename.toLowerCase();
        if (lowerName.endsWith('.shp')) {
            shpFile = await entry.async('arraybuffer');
        } else if (lowerName.endsWith('.dbf')) {
            dbfFile = await entry.async('arraybuffer');
        }
    }
    
    if (!shpFile) throw new Error('Fichier .shp non trouvé dans le ZIP');
    
    // Parser le SHP
    const shpView = new DataView(shpFile);
    const shapeType = shpView.getInt32(32, true);
    
    if (shapeType !== 1 && shapeType !== 11 && shapeType !== 21) {
        throw new Error('Seuls les Shapefiles de points sont supportés');
    }
    
    const data = [];
    const allKeys = new Set(['_longitude_', '_latitude_']);
    
    // Lire les enregistrements SHP
    let offset = 100;
    let id = 0;
    while (offset < shpFile.byteLength - 8) {
        const recordLength = shpView.getInt32(offset + 4, false) * 2;
        const recordType = shpView.getInt32(offset + 8, true);
        
        if (recordType === 1) { // Point
            const x = shpView.getFloat64(offset + 12, true);
            const y = shpView.getFloat64(offset + 20, true);
            data.push({
                _longitude_: String(x),
                _latitude_: String(y),
                _id_: String(++id)
            });
        }
        
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
    
    allKeys.add('_id_');
    if (data.length === 0) throw new Error('Aucun point trouvé dans le Shapefile');
    return { headers: Array.from(allKeys), data };
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
