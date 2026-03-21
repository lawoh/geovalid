/**
 * GéoValid Québec - Configuration et État Global
 * Fichier: js/config.js
 */

// Limites géographiques du Canada
const LIMITES_CANADA = {
    latitude: { min: 41.6723, max: 83.1114 },
    longitude: { min: -141.0000, max: -52.6167 }
};

// Codes de provinces canadiennes valides (texte)
const PROVINCES_CANADA = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

// Codes numériques des provinces (Statistique Canada)
const PROVINCES_CODES_NUM = {
    '10': 'NL',  // Terre-Neuve-et-Labrador
    '11': 'PE',  // Île-du-Prince-Édouard
    '12': 'NS',  // Nouvelle-Écosse
    '13': 'NB',  // Nouveau-Brunswick
    '24': 'QC',  // Québec
    '35': 'ON',  // Ontario
    '46': 'MB',  // Manitoba
    '47': 'SK',  // Saskatchewan
    '48': 'AB',  // Alberta
    '59': 'BC',  // Colombie-Britannique
    '60': 'YT',  // Yukon
    '61': 'NT',  // Territoires du Nord-Ouest
    '62': 'NU'   // Nunavut
};

// Liste des codes numériques valides
const PROVINCES_CODES_NUM_LIST = Object.keys(PROVINCES_CODES_NUM);

// Formats de fichiers supportés en ENTRÉE
const FORMATS_ENTREE = {
    // Formats tabulaires
    csv: { nom: 'CSV', icone: 'CSV', type: 'tabular' },
    txt: { nom: 'Texte', icone: 'TXT', type: 'tabular' },
    tsv: { nom: 'TSV', icone: 'TSV', type: 'tabular' },
    xls: { nom: 'Excel 97', icone: 'XLS', type: 'tabular' },
    xlsx: { nom: 'Excel', icone: 'XLSX', type: 'tabular' },
    ods: { nom: 'OpenDocument', icone: 'ODS', type: 'tabular' },
    // Formats JSON
    json: { nom: 'JSON', icone: 'JSON', type: 'json' },
    geojson: { nom: 'GeoJSON', icone: 'GEO', type: 'geojson' },
    topojson: { nom: 'TopoJSON', icone: 'TOPO', type: 'topojson' },
    // Formats XML/KML
    xml: { nom: 'XML', icone: 'XML', type: 'xml' },
    kml: { nom: 'KML', icone: 'KML', type: 'kml' },
    kmz: { nom: 'KMZ', icone: 'KMZ', type: 'kmz' },
    // Formats GPS
    gpx: { nom: 'GPX', icone: 'GPX', type: 'gpx' },
    // Formats SIG
    shp: { nom: 'Shapefile', icone: 'SHP', type: 'shapefile' },
    dbf: { nom: 'dBASE', icone: 'DBF', type: 'dbf' },
    gml: { nom: 'GML', icone: 'GML', type: 'gml' },
    wkt: { nom: 'WKT', icone: 'WKT', type: 'wkt' }
};

// Formats de fichiers supportés en SORTIE
const FORMATS_SORTIE = {
    // Formats tabulaires
    csv: { nom: 'CSV', extension: '.csv', description: 'Valeurs séparées par virgules' },
    xlsx: { nom: 'Excel', extension: '.xlsx', description: 'Microsoft Excel' },
    // Formats JSON
    json: { nom: 'JSON', extension: '.json', description: 'JavaScript Object Notation' },
    geojson: { nom: 'GeoJSON', extension: '.geojson', description: 'Format géospatial JSON' },
    topojson: { nom: 'TopoJSON', extension: '.topojson', description: 'TopoJSON compact' },
    // Formats XML/KML
    kml: { nom: 'KML', extension: '.kml', description: 'Google Earth' },
    gml: { nom: 'GML', extension: '.gml', description: 'Geography Markup Language' },
    // Formats GPS
    gpx: { nom: 'GPX', extension: '.gpx', description: 'GPS Exchange Format' },
    // Formats SIG
    shapefile: { nom: 'Shapefile', extension: '.zip', description: 'ESRI Shapefile (ZIP)' },
    geopackage: { nom: 'GeoPackage', extension: '.gpkg', description: 'OGC GeoPackage' },
    wkt: { nom: 'WKT', extension: '.wkt', description: 'Well-Known Text' }
};

// État global de l'application
const AppState = {
    fichier: null,
    formatFichier: null,
    headers: [],
    donneesBrutes: [],
    colonnesDetectees: {
        latitude: null,
        longitude: null,
        codePostal: null,
        province: null
    },
    donneesValides: [],
    donneesInvalides: [],
    statistiques: null,
    map: null,
    markersLayer: null,
    baseLayers: {}
};

// Réinitialiser l'état
function resetAppState() {
    AppState.fichier = null;
    AppState.formatFichier = null;
    AppState.headers = [];
    AppState.donneesBrutes = [];
    AppState.colonnesDetectees = { latitude: null, longitude: null, codePostal: null, province: null };
    AppState.donneesValides = [];
    AppState.donneesInvalides = [];
    AppState.statistiques = null;
}
