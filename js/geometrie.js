/**
 * GeoValidator - Géométries et projections
 * Fichier: js/geometrie.js
 *
 * v1.2 : lignes, polygones, multi-géométries, validation des géométries,
 * détection du système de projection et reprojection en WGS 84.
 *
 * Les géométries sont manipulées au format GeoJSON, en 2D :
 *   { type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon',
 *     coordinates: [...] }
 */

const TYPES_GEOMETRIE = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];

// ============================================
// PROJECTIONS CONNUES (définitions proj4, vérifiées avec epsg.io)
// ============================================

// Transformation NAD83(CSRS) → WGS 84
const TOWGS84_CSRS = '+towgs84=-0.991,1.9072,0.5129,-1.25033e-07,-4.6785e-08,-5.6529e-08,0';

const PROJECTIONS = {
    4326: { nom: 'WGS 84', def: '+proj=longlat +datum=WGS84 +no_defs' },
    4269: { nom: 'NAD83', def: '+proj=longlat +datum=NAD83 +no_defs' },
    4617: { nom: 'NAD83(CSRS)', def: `+proj=longlat +ellps=GRS80 ${TOWGS84_CSRS} +no_defs` },
    3857: { nom: 'WGS 84 / Pseudo-Mercator', def: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs' },
    3978: { nom: 'NAD83 / Canada Atlas Lambert', def: '+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs' },
    3979: { nom: 'NAD83(CSRS) / Canada Atlas Lambert', def: `+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +ellps=GRS80 ${TOWGS84_CSRS} +units=m +no_defs` },
    32198: { nom: 'NAD83 / Québec Lambert', def: '+proj=lcc +lat_0=44 +lon_0=-68.5 +lat_1=60 +lat_2=46 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs' },
    2154: { nom: 'RGF93 / Lambert-93', def: '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs' }
};

// UTM NAD83 zones 7 à 22 (EPSG:26907 à 26922)
for (let z = 7; z <= 22; z++) {
    PROJECTIONS[26900 + z] = { nom: `NAD83 / UTM zone ${z}N`, def: `+proj=utm +zone=${z} +datum=NAD83 +units=m +no_defs` };
}
// UTM NAD83(CSRS) zones 7 à 22 (codes EPSG non consécutifs)
const UTM_CSRS = { 7: 3154, 8: 3155, 9: 3156, 10: 3157, 11: 2955, 12: 2956, 13: 2957, 14: 3158, 15: 3159, 16: 3160, 17: 2958, 18: 2959, 19: 2960, 20: 2961, 21: 2962, 22: 3761 };
Object.entries(UTM_CSRS).forEach(([z, code]) => {
    PROJECTIONS[code] = { nom: `NAD83(CSRS) / UTM zone ${z}N`, def: `+proj=utm +zone=${z} +ellps=GRS80 ${TOWGS84_CSRS} +units=m +no_defs` };
});
// UTM WGS 84 zones 1 à 60 nord (EPSG:32601 à 32660)
for (let z = 1; z <= 60; z++) {
    PROJECTIONS[32600 + z] = { nom: `WGS 84 / UTM zone ${z}N`, def: `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs` };
}
// MTM NAD83 zones 1 à 10 (Québec et Maritimes, EPSG:32181 à 32190)
// Méridiens centraux : 53° O, 56° O, puis 58,5° O + 3° par zone
for (let z = 1; z <= 10; z++) {
    const meridien = z === 1 ? -53 : z === 2 ? -56 : -(58.5 + 3 * (z - 3));
    PROJECTIONS[32180 + z] = { nom: `NAD83 / MTM zone ${z}`, def: `+proj=tmerc +lat_0=0 +lon_0=${meridien} +k=0.9999 +x_0=304800 +y_0=0 +datum=NAD83 +units=m +no_defs` };
}

// Extraire un code EPSG d'un texte : "EPSG:2154", "urn:ogc:def:crs:EPSG::2154",
// "http://www.opengis.net/def/crs/EPSG/0/2154", "...epsg.xml#2154", "CRS84"
function lireCodeEPSG(texte) {
    if (!texte) return null;
    const t = String(texte).trim();
    if (/CRS:?84$/i.test(t)) return 4326;
    if (!/epsg/i.test(t)) return null;
    const m = t.match(/(\d{4,5})\s*$/);
    return m ? parseInt(m[1]) : null;
}

// Trouver la projection à partir de ce que le fichier indique : { code, wkt }
function resoudreProjection(srs) {
    let code = srs.code || null;
    let nom = null;

    if (!code && srs.wkt) {
        // Le dernier AUTHORITY["EPSG","xxxx"] d'un WKT est celui du système complet
        const autorites = [...srs.wkt.matchAll(/AUTHORITY\s*\[\s*"EPSG"\s*,\s*"?(\d+)"?\s*\]/gi)];
        if (autorites.length) code = parseInt(autorites[autorites.length - 1][1]);
    }
    if (srs.wkt) {
        const m = srs.wkt.match(/^\s*\w+\s*\[\s*"([^"]+)"/);
        if (m) nom = m[1];
    }

    if (code && PROJECTIONS[code]) {
        return { code, nom: PROJECTIONS[code].nom, def: PROJECTIONS[code].def };
    }
    if (srs.wkt && /PROJCS|GEOGCS|PROJCRS|GEOGCRS/i.test(srs.wkt)) {
        // proj4 sait lire directement les définitions WKT (fichiers .prj, GeoPackage)
        return { code, nom: nom || (code ? `EPSG:${code}` : 'Projection du fichier'), def: srs.wkt };
    }
    if (code) {
        return { code, nom: `EPSG:${code}`, def: null };
    }
    return null;
}

// Toutes les coordonnées ressemblent-elles à des degrés (longitude/latitude) ?
function coordonneesEnDegres(geometries) {
    let total = 0;
    for (const g of geometries) {
        for (const [x, y] of listerSommets(g)) {
            if (Math.abs(x) > 180 || Math.abs(y) > 90) return false;
            total++;
        }
    }
    return total > 0;
}

// Charger proj4js à la demande
async function chargerProj4() {
    if (window.proj4) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.9.0/proj4.js';
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Impossible de charger proj4js (reprojection)'));
    });
}

// ============================================
// PRÉPARATION DES DONNÉES GÉOMÉTRIQUES
// ============================================

// Appelée après la lecture du fichier.
// - Fichier sans géométrie : cherche une colonne WKT (ex : CSV avec une colonne "geometry")
// - Détecte la projection, reprojette en WGS 84
// - Ajoute les colonnes d'aperçu _geometrie_ (et _longitude_/_latitude_ si points uniquement)
async function preparerGeometries(result) {
    AppState.projection = null;

    let lignes = result.data.filter(r => r._geom_ !== undefined);

    // Colonne WKT dans un fichier tabulaire
    if (lignes.length === 0) {
        const colonneWKT = detecterColonneWKT(result.headers, result.data);
        if (!colonneWKT) return;
        result.data.forEach(r => {
            const valeur = String(r[colonneWKT] || '').trim();
            r._geom_ = valeur ? lireWKT(valeur) : null;
            if (!result.srs) {
                const srid = valeur.match(/^SRID=(\d+);/i);
                if (srid) result.srs = { code: parseInt(srid[1]) };
            }
        });
        result.headers = result.headers.filter(h => h !== colonneWKT);
        lignes = result.data;
    }

    // Projection : indiquée par le fichier, sinon estimée
    let projection = null;
    let source = 'lue dans le fichier';
    if (result.srs && (result.srs.code || result.srs.wkt)) {
        projection = resoudreProjection(result.srs);
    }
    if (!projection) {
        source = 'estimée';
        if (coordonneesEnDegres(lignes.map(r => r._geom_).filter(Boolean))) {
            projection = { code: 4326, nom: PROJECTIONS[4326].nom, def: PROJECTIONS[4326].def };
        }
    }
    if (!projection) {
        throw new Error('Système de projection inconnu : les coordonnées ne sont pas en degrés et le fichier n\'indique pas sa projection (fichier .prj manquant ?)');
    }
    if (!projection.def) {
        throw new Error(`Projection ${projection.nom} non prise en charge`);
    }

    // Reprojection en WGS 84
    let reprojete = false;
    if (projection.code !== 4326) {
        await chargerProj4();
        const transformation = proj4(projection.def, PROJECTIONS[4326].def);
        lignes.forEach(r => {
            if (r._geom_) r._geom_ = transformerGeometrie(r._geom_, c => transformation.forward([c[0], c[1]]));
        });
        reprojete = true;
    }

    // Colonnes d'aperçu
    const types = new Set();
    lignes.forEach(r => {
        const g = r._geom_;
        types.add(g ? g.type : 'Vide');
        r._geometrie_ = g ? g.type : '(vide)';
        if (g && g.type === 'Point' && g.coordinates.length) {
            r._longitude_ = String(g.coordinates[0]);
            r._latitude_ = String(g.coordinates[1]);
        }
    });
    const pointsSeulement = [...types].every(t => t === 'Point' || t === 'Vide');
    const attributs = result.headers.filter(h => !['_geometrie_', '_longitude_', '_latitude_'].includes(h));
    result.headers = ['_geometrie_', ...(pointsSeulement ? ['_longitude_', '_latitude_'] : []), ...attributs];

    AppState.projection = {
        code: projection.code,
        nom: projection.nom,
        source,
        reprojete,
        types: [...types].filter(t => t !== 'Vide')
    };
}

// Chercher une colonne dont les valeurs sont du WKT
function detecterColonneWKT(headers, data) {
    const echantillon = data.slice(0, 50);
    const motif = /^\s*(SRID=\d+;)?\s*(MULTI)?(POINT|LINESTRING|POLYGON)\b/i;
    for (const h of headers) {
        const valeurs = echantillon.map(r => r[h]).filter(v => v);
        if (valeurs.length && valeurs.filter(v => motif.test(v)).length / valeurs.length >= 0.8) return h;
    }
    return null;
}

// ============================================
// OUTILS SUR LES COORDONNÉES
// ============================================

// Appliquer une fonction à chaque sommet
function transformerGeometrie(geom, fn) {
    const t = c => (c.length === 0 ? c : Array.isArray(c[0]) ? c.map(t) : fn(c));
    return { type: geom.type, coordinates: t(geom.coordinates) };
}

// Liste à plat de tous les sommets
function listerSommets(geom) {
    const sommets = [];
    const parcourir = c => {
        if (c.length === 0) return;
        if (Array.isArray(c[0])) c.forEach(parcourir);
        else sommets.push(c);
    };
    if (geom && Array.isArray(geom.coordinates)) parcourir(geom.coordinates);
    return sommets;
}

// Point représentatif (centre de l'emprise) : sert aux statistiques par zone
function pointRepresentatif(geom) {
    if (geom.type === 'Point') return geom.coordinates;
    const s = listerSommets(geom);
    const xs = s.map(c => c[0]), ys = s.map(c => c[1]);
    return [(safeMin(xs) + safeMax(xs)) / 2, (safeMin(ys) + safeMax(ys)) / 2];
}

// Aire signée d'un anneau (positive = sens anti-horaire)
function aireSignee(anneau) {
    let aire = 0;
    for (let i = 0; i < anneau.length - 1; i++) {
        aire += anneau[i][0] * anneau[i + 1][1] - anneau[i + 1][0] * anneau[i][1];
    }
    return aire / 2;
}

// Le point est-il à l'intérieur de l'anneau ? (lancer de rayon)
function pointDansAnneau(p, anneau) {
    let dedans = false;
    for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
        const [xi, yi] = anneau[i], [xj, yj] = anneau[j];
        if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) dedans = !dedans;
    }
    return dedans;
}

// Regrouper des géométries simples en une géométrie Multi*
function regrouperGeometries(geoms) {
    geoms = geoms.filter(Boolean);
    if (geoms.length === 0) return null;
    if (geoms.length === 1) return geoms[0];
    const bases = new Set(geoms.map(g => g.type.replace('Multi', '')));
    if (bases.size !== 1) return { type: 'GeometryCollection', coordinates: [] };
    const coordonnees = [];
    geoms.forEach(g => {
        if (g.type.startsWith('Multi')) coordonnees.push(...g.coordinates);
        else coordonnees.push(g.coordinates);
    });
    return { type: 'Multi' + [...bases][0], coordinates: coordonnees };
}

// Polygone(s) à partir des anneaux d'un Shapefile
// (anneaux extérieurs dans le sens horaire, trous dans le sens anti-horaire)
function polygoneDepuisAnneaux(anneaux) {
    let exterieurs = anneaux.filter(a => aireSignee(a) < 0);
    let trous = anneaux.filter(a => aireSignee(a) >= 0);
    if (exterieurs.length === 0) {
        exterieurs = anneaux;
        trous = [];
    }
    const polygones = exterieurs.map(e => [e]);
    trous.forEach(t => {
        const parent = polygones.find(p => pointDansAnneau(t[0], p[0])) || polygones[0];
        parent.push(t);
    });
    return polygones.length === 1
        ? { type: 'Polygon', coordinates: polygones[0] }
        : { type: 'MultiPolygon', coordinates: polygones };
}

// ============================================
// VALIDATION DES GÉOMÉTRIES
// ============================================

// Retourne la liste des erreurs d'une géométrie (vide si elle est valide)
function validerGeometrie(geom) {
    if (!geom) return ['Géométrie vide'];
    if (!TYPES_GEOMETRIE.includes(geom.type)) return [`Type de géométrie non supporté (${geom.type})`];

    const sommets = listerSommets(geom);
    if (sommets.length === 0) return ['Géométrie vide'];
    if (sommets.some(c => !Number.isFinite(c[0]) || !Number.isFinite(c[1]))) return ['Coordonnées non numériques'];

    const erreurs = [];
    switch (geom.type) {
        case 'LineString':
            verifierLigne(geom.coordinates, erreurs);
            break;
        case 'MultiLineString':
            geom.coordinates.forEach(l => verifierLigne(l, erreurs));
            break;
        case 'Polygon':
            verifierPolygone(geom.coordinates, erreurs);
            break;
        case 'MultiPolygon':
            geom.coordinates.forEach(p => verifierPolygone(p, erreurs));
            break;
    }

    // Emprise et contour du pays sélectionné (v2.0)
    if (geom.type === 'Point') {
        erreursPays(geom.coordinates[0], geom.coordinates[1]).forEach(e => erreurs.push(e));
    } else if (sommets.some(([lon, lat]) => erreursPays(lon, lat).length > 0)) {
        erreurs.push(`Géométrie hors ${paysActif().nom}`);
    }

    return [...new Set(erreurs)];
}

function verifierLigne(ligne, erreurs) {
    if (ligne.length < 2) erreurs.push('Ligne avec moins de 2 points');
}

function verifierPolygone(anneaux, erreurs) {
    if (anneaux.length === 0) {
        erreurs.push('Polygone vide');
        return;
    }
    anneaux.forEach(anneau => {
        if (anneau.length < 4) {
            erreurs.push('Polygone avec moins de 4 sommets');
            return;
        }
        const premier = anneau[0], dernier = anneau[anneau.length - 1];
        if (premier[0] !== dernier[0] || premier[1] !== dernier[1]) {
            erreurs.push('Polygone non fermé');
            return;
        }
        if (anneauAutoIntersecte(anneau)) erreurs.push('Polygone auto-intersecté');
    });
}

// Un anneau se recoupe-t-il lui-même ?
function anneauAutoIntersecte(anneau) {
    // Retirer les sommets répétés consécutifs
    const pts = anneau.filter((c, i) => i === 0 || c[0] !== anneau[i - 1][0] || c[1] !== anneau[i - 1][1]);
    const n = pts.length - 1; // nombre de segments
    if (n < 3) return false;

    // Segments triés par X minimal pour ne comparer que ceux qui se chevauchent en X
    const segments = [];
    for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[i + 1];
        segments.push({ i, a, b, minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]) });
    }
    segments.sort((s, t) => s.minX - t.minX);

    for (let k = 0; k < segments.length; k++) {
        const s = segments[k];
        for (let m = k + 1; m < segments.length && segments[m].minX <= s.maxX; m++) {
            const t = segments[m];
            const ecart = Math.abs(s.i - t.i);
            if (ecart === 1 || ecart === n - 1) continue; // segments voisins
            if (segmentsSeCroisent(s.a, s.b, t.a, t.b)) return true;
        }
    }
    return false;
}

function orientation(p, q, r) {
    const v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    return v > 0 ? 1 : v < 0 ? -1 : 0;
}

function surSegment(p, q, r) {
    return Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) &&
           Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1]);
}

function segmentsSeCroisent(p1, q1, p2, q2) {
    const o1 = orientation(p1, q1, p2), o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1), o4 = orientation(p2, q2, q1);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && surSegment(p1, p2, q1)) return true;
    if (o2 === 0 && surSegment(p1, q2, q1)) return true;
    if (o3 === 0 && surSegment(p2, p1, q2)) return true;
    if (o4 === 0 && surSegment(p2, q1, q2)) return true;
    return false;
}

// ============================================
// WKB (GeoPackage, Shapefile non, PostGIS)
// ============================================

// Lire une géométrie WKB (ISO ou EWKB, Z et M ignorés)
function lireWKB(bytes, debut = 0) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let pos = debut;

    function lireGeom() {
        const le = view.getUint8(pos) === 1;
        pos += 1;
        let type = view.getUint32(pos, le);
        pos += 4;

        let dim = 2;
        // EWKB (PostGIS) : drapeaux Z, M et SRID dans les bits de poids fort
        if (type & 0x20000000) pos += 4;
        if (type & 0x80000000) dim++;
        if (type & 0x40000000) dim++;
        type = type & 0x0FFFFFFF;
        // ISO : +1000 = Z, +2000 = M, +3000 = ZM
        if (type >= 3000) { dim = 4; type -= 3000; }
        else if (type >= 2000) { dim = 3; type -= 2000; }
        else if (type >= 1000) { dim = 3; type -= 1000; }

        const point = () => {
            const c = [view.getFloat64(pos, le), view.getFloat64(pos + 8, le)];
            pos += 8 * dim;
            return c;
        };
        const nombre = () => {
            const n = view.getUint32(pos, le);
            pos += 4;
            return n;
        };
        const liste = () => {
            const n = nombre(), r = [];
            for (let i = 0; i < n; i++) r.push(point());
            return r;
        };
        const anneaux = () => {
            const n = nombre(), r = [];
            for (let i = 0; i < n; i++) r.push(liste());
            return r;
        };
        const sousGeometries = () => {
            const n = nombre(), r = [];
            for (let i = 0; i < n; i++) r.push(lireGeom());
            return r;
        };

        switch (type) {
            case 1: {
                const c = point();
                return { type: 'Point', coordinates: (isNaN(c[0]) && isNaN(c[1])) ? [] : c };
            }
            case 2: return { type: 'LineString', coordinates: liste() };
            case 3: return { type: 'Polygon', coordinates: anneaux() };
            case 4: return { type: 'MultiPoint', coordinates: sousGeometries().map(g => g.coordinates).filter(c => c.length) };
            case 5: return { type: 'MultiLineString', coordinates: sousGeometries().map(g => g.coordinates) };
            case 6: return { type: 'MultiPolygon', coordinates: sousGeometries().map(g => g.coordinates) };
            case 7:
                sousGeometries();
                return { type: 'GeometryCollection', coordinates: [] };
            default:
                throw new Error(`Type WKB non reconnu (${type})`);
        }
    }

    return lireGeom();
}

// Écrire une géométrie en WKB (little-endian, 2D)
function ecrireWKB(geom) {
    const octets = [];
    const tampon = new DataView(new ArrayBuffer(8));
    const u8 = v => octets.push(v);
    const u32 = v => {
        tampon.setUint32(0, v, true);
        for (let i = 0; i < 4; i++) octets.push(tampon.getUint8(i));
    };
    const f64 = v => {
        tampon.setFloat64(0, v, true);
        for (let i = 0; i < 8; i++) octets.push(tampon.getUint8(i));
    };
    const point = c => { f64(c[0]); f64(c[1]); };
    const liste = l => { u32(l.length); l.forEach(point); };
    const anneaux = p => { u32(p.length); p.forEach(liste); };

    const ecrire = g => {
        u8(1);
        switch (g.type) {
            case 'Point':
                u32(1);
                if (g.coordinates.length) point(g.coordinates);
                else { f64(NaN); f64(NaN); }
                break;
            case 'LineString': u32(2); liste(g.coordinates); break;
            case 'Polygon': u32(3); anneaux(g.coordinates); break;
            case 'MultiPoint':
                u32(4); u32(g.coordinates.length);
                g.coordinates.forEach(c => ecrire({ type: 'Point', coordinates: c }));
                break;
            case 'MultiLineString':
                u32(5); u32(g.coordinates.length);
                g.coordinates.forEach(c => ecrire({ type: 'LineString', coordinates: c }));
                break;
            case 'MultiPolygon':
                u32(6); u32(g.coordinates.length);
                g.coordinates.forEach(c => ecrire({ type: 'Polygon', coordinates: c }));
                break;
        }
    };

    ecrire(geom);
    return new Uint8Array(octets);
}

// ============================================
// WKT
// ============================================

// Lire une géométrie WKT : POINT (1 2), LINESTRING (...), POLYGON ((...)), MULTI*, EMPTY
function lireWKT(texte) {
    const t = String(texte).trim().replace(/^SRID=\d+;/i, '');
    const m = t.match(/^([A-Za-z]+)\s*(ZM|Z|M)?\s*([\s\S]*)$/);
    if (!m) return null;

    const noms = {
        POINT: 'Point', LINESTRING: 'LineString', POLYGON: 'Polygon',
        MULTIPOINT: 'MultiPoint', MULTILINESTRING: 'MultiLineString', MULTIPOLYGON: 'MultiPolygon'
    };
    const type = noms[m[1].toUpperCase()];
    if (!type) return { type: m[1], coordinates: [] };

    const reste = m[3].trim();
    if (/^EMPTY$/i.test(reste) || reste === '') return { type, coordinates: [] };

    const liste = lireParenthesesWKT(reste);
    switch (type) {
        case 'Point': return { type, coordinates: liste[0] || [] };
        case 'MultiPoint': return { type, coordinates: liste.map(e => (Array.isArray(e[0]) ? e[0] : e)) };
        default: return { type, coordinates: liste };
    }
}

// Transformer "(1 2, (3 4, 5 6))" en tableaux imbriqués [[1,2],[[3,4],[5,6]]]
function lireParenthesesWKT(s) {
    let pos = 0;
    function liste() {
        pos++; // "("
        const elements = [];
        while (pos < s.length) {
            const c = s[pos];
            if (c === '(') elements.push(liste());
            else if (c === ')') { pos++; return elements; }
            else if (c === ',' || /\s/.test(c)) pos++;
            else {
                const debut = pos;
                while (pos < s.length && !',()'.includes(s[pos])) pos++;
                const nombres = s.slice(debut, pos).trim().split(/\s+/).map(Number);
                if (nombres.length >= 2) elements.push([nombres[0], nombres[1]]);
            }
        }
        throw new Error('WKT invalide : parenthèse non fermée');
    }
    return liste();
}

// Écrire une géométrie en WKT
function versWKT(geom) {
    if (!geom) return '';
    const point = c => `${c[0]} ${c[1]}`;
    const liste = l => `(${l.map(point).join(', ')})`;
    const anneaux = p => `(${p.map(liste).join(', ')})`;
    const nom = geom.type.toUpperCase();
    if (!geom.coordinates || geom.coordinates.length === 0) return `${nom} EMPTY`;
    switch (geom.type) {
        case 'Point': return `POINT (${point(geom.coordinates)})`;
        case 'LineString': return `LINESTRING ${liste(geom.coordinates)}`;
        case 'Polygon': return `POLYGON ${anneaux(geom.coordinates)}`;
        case 'MultiPoint': return `MULTIPOINT ${liste(geom.coordinates)}`;
        case 'MultiLineString': return `MULTILINESTRING (${geom.coordinates.map(liste).join(', ')})`;
        case 'MultiPolygon': return `MULTIPOLYGON (${geom.coordinates.map(anneaux).join(', ')})`;
    }
    return '';
}

// ============================================
// KML
// ============================================

const TYPES_KML = ['Point', 'LineString', 'LinearRing', 'Polygon', 'MultiGeometry'];

// Lire la géométrie d'un élément KML
function lireGeometrieKML(element) {
    const coords = el => {
        const c = el ? el.getElementsByTagName('coordinates')[0] : null;
        if (!c) return [];
        return c.textContent.trim().split(/\s+/).filter(Boolean).map(t => t.split(',').slice(0, 2).map(Number));
    };

    switch (element.localName) {
        case 'Point':
            return { type: 'Point', coordinates: coords(element)[0] || [] };
        case 'LineString':
            return { type: 'LineString', coordinates: coords(element) };
        case 'LinearRing':
            return { type: 'Polygon', coordinates: [coords(element)] };
        case 'Polygon': {
            const anneaux = [coords(element.getElementsByTagName('outerBoundaryIs')[0])];
            for (const inner of element.getElementsByTagName('innerBoundaryIs')) {
                for (const anneau of inner.getElementsByTagName('LinearRing')) anneaux.push(coords(anneau));
            }
            return { type: 'Polygon', coordinates: anneaux };
        }
        case 'MultiGeometry':
            return regrouperGeometries([...element.children].filter(e => TYPES_KML.includes(e.localName)).map(lireGeometrieKML));
    }
    return null;
}

// Écrire une géométrie en KML
function versKML(geom) {
    const point = c => `${c[0]},${c[1]},0`;
    const liste = l => `<coordinates>${l.map(point).join(' ')}</coordinates>`;
    const polygone = p => {
        let kml = `<Polygon><outerBoundaryIs><LinearRing>${liste(p[0])}</LinearRing></outerBoundaryIs>`;
        p.slice(1).forEach(trou => { kml += `<innerBoundaryIs><LinearRing>${liste(trou)}</LinearRing></innerBoundaryIs>`; });
        return kml + '</Polygon>';
    };
    switch (geom.type) {
        case 'Point': return `<Point><coordinates>${point(geom.coordinates)}</coordinates></Point>`;
        case 'LineString': return `<LineString>${liste(geom.coordinates)}</LineString>`;
        case 'Polygon': return polygone(geom.coordinates);
        case 'MultiPoint': return `<MultiGeometry>${geom.coordinates.map(c => `<Point><coordinates>${point(c)}</coordinates></Point>`).join('')}</MultiGeometry>`;
        case 'MultiLineString': return `<MultiGeometry>${geom.coordinates.map(l => `<LineString>${liste(l)}</LineString>`).join('')}</MultiGeometry>`;
        case 'MultiPolygon': return `<MultiGeometry>${geom.coordinates.map(polygone).join('')}</MultiGeometry>`;
    }
    return '';
}

// ============================================
// GML
// ============================================

const TYPES_GML = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiCurve', 'MultiPolygon', 'MultiSurface'];

// Les srsName de type URN/URL en degrés sont en ordre latitude, longitude
function axesInverses(srsName) {
    if (!srsName || !/urn:|opengis\.net\/def/i.test(srsName)) return false;
    return [4326, 4269, 4617].includes(lireCodeEPSG(srsName));
}

// Lire les positions d'un élément GML (pos, posList ou coordinates)
function lirePositionsGML(el, inverser) {
    let positions = [];
    const posList = el.getElementsByTagNameNS('*', 'posList')[0];
    const coordinates = el.getElementsByTagNameNS('*', 'coordinates')[0];

    if (posList) {
        const dim = parseInt(posList.getAttribute('srsDimension') || '2');
        const n = posList.textContent.trim().split(/\s+/).map(Number);
        for (let i = 0; i + 1 < n.length; i += dim) positions.push([n[i], n[i + 1]]);
    } else if (coordinates) {
        positions = coordinates.textContent.trim().split(/\s+/).filter(Boolean).map(t => t.split(',').slice(0, 2).map(Number));
    } else {
        positions = [...el.getElementsByTagNameNS('*', 'pos')].map(p => p.textContent.trim().split(/\s+/).slice(0, 2).map(Number));
    }
    return inverser ? positions.map(c => [c[1], c[0]]) : positions;
}

// Lire une géométrie GML
function lireGeometrieGML(el, inverser) {
    const enfants = noms => [...el.children].filter(e => noms.includes(e.localName));
    const sous = nom => [...el.getElementsByTagNameNS('*', nom)].map(g => lireGeometrieGML(g, inverser));

    switch (el.localName) {
        case 'Point':
            return { type: 'Point', coordinates: lirePositionsGML(el, inverser)[0] || [] };
        case 'LineString':
            return { type: 'LineString', coordinates: lirePositionsGML(el, inverser) };
        case 'Polygon': {
            const anneaux = [];
            enfants(['exterior', 'outerBoundaryIs']).forEach(b => anneaux.push(lirePositionsGML(b, inverser)));
            enfants(['interior', 'innerBoundaryIs']).forEach(b => anneaux.push(lirePositionsGML(b, inverser)));
            return { type: 'Polygon', coordinates: anneaux };
        }
        case 'MultiPoint': return regrouperGeometries(sous('Point'));
        case 'MultiLineString':
        case 'MultiCurve': return regrouperGeometries(sous('LineString'));
        case 'MultiPolygon':
        case 'MultiSurface': return regrouperGeometries(sous('Polygon'));
    }
    return null;
}

// Écrire une géométrie en GML 2 (srsName EPSG:4326, ordre longitude, latitude)
function versGML(geom) {
    const srs = 'srsName="EPSG:4326"';
    const liste = l => `<gml:coordinates>${l.map(c => `${c[0]},${c[1]}`).join(' ')}</gml:coordinates>`;
    const polygone = (p, attr = '') => {
        let gml = `<gml:Polygon${attr}><gml:outerBoundaryIs><gml:LinearRing>${liste(p[0])}</gml:LinearRing></gml:outerBoundaryIs>`;
        p.slice(1).forEach(trou => { gml += `<gml:innerBoundaryIs><gml:LinearRing>${liste(trou)}</gml:LinearRing></gml:innerBoundaryIs>`; });
        return gml + '</gml:Polygon>';
    };
    switch (geom.type) {
        case 'Point': return `<gml:Point ${srs}>${liste([geom.coordinates])}</gml:Point>`;
        case 'LineString': return `<gml:LineString ${srs}>${liste(geom.coordinates)}</gml:LineString>`;
        case 'Polygon': return polygone(geom.coordinates, ' ' + srs);
        case 'MultiPoint': return `<gml:MultiPoint ${srs}>${geom.coordinates.map(c => `<gml:pointMember><gml:Point>${liste([c])}</gml:Point></gml:pointMember>`).join('')}</gml:MultiPoint>`;
        case 'MultiLineString': return `<gml:MultiLineString ${srs}>${geom.coordinates.map(l => `<gml:lineStringMember><gml:LineString>${liste(l)}</gml:LineString></gml:lineStringMember>`).join('')}</gml:MultiLineString>`;
        case 'MultiPolygon': return `<gml:MultiPolygon ${srs}>${geom.coordinates.map(p => `<gml:polygonMember>${polygone(p)}</gml:polygonMember>`).join('')}</gml:MultiPolygon>`;
    }
    return '';
}

// ============================================
// SHAPEFILE
// ============================================

// Lire un enregistrement .shp (commence au champ "type de forme")
function lireGeometrieSHP(view, pos) {
    const type = view.getInt32(pos, true);
    if (type === 0) return null;
    if (type === 31) return { type: 'MultiPatch', coordinates: [] };
    const base = type % 10; // 1 point, 3 ligne, 5 polygone, 8 multipoint (+10 Z, +20 M)
    const f64 = p => view.getFloat64(p, true);

    if (base === 1) {
        return { type: 'Point', coordinates: [f64(pos + 4), f64(pos + 12)] };
    }
    if (base === 8) {
        const n = view.getInt32(pos + 36, true);
        const points = [];
        for (let i = 0; i < n; i++) points.push([f64(pos + 40 + 16 * i), f64(pos + 48 + 16 * i)]);
        return { type: 'MultiPoint', coordinates: points };
    }
    if (base === 3 || base === 5) {
        const nbParties = view.getInt32(pos + 36, true);
        const nbPoints = view.getInt32(pos + 40, true);
        const debutParties = pos + 44;
        const debutPoints = debutParties + 4 * nbParties;
        const parties = [];
        for (let p = 0; p < nbParties; p++) {
            const debut = view.getInt32(debutParties + 4 * p, true);
            const fin = p < nbParties - 1 ? view.getInt32(debutParties + 4 * (p + 1), true) : nbPoints;
            const points = [];
            for (let i = debut; i < fin; i++) points.push([f64(debutPoints + 16 * i), f64(debutPoints + 16 * i + 8)]);
            parties.push(points);
        }
        if (base === 3) {
            return parties.length === 1
                ? { type: 'LineString', coordinates: parties[0] }
                : { type: 'MultiLineString', coordinates: parties };
        }
        return polygoneDepuisAnneaux(parties);
    }
    return { type: `Forme ${type}`, coordinates: [] };
}

// ============================================
// TOPOJSON
// ============================================

// Convertir une géométrie TopoJSON en GeoJSON
function lireGeometrieTopo(g, topo) {
    const t = topo.transform;
    if (!topo._arcsDecodes) {
        // Arcs quantifiés : coordonnées en écarts successifs
        topo._arcsDecodes = (topo.arcs || []).map(arc => {
            let x = 0, y = 0;
            return arc.map(p => {
                if (!t) return [p[0], p[1]];
                x += p[0];
                y += p[1];
                return [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]];
            });
        });
    }
    const arcs = topo._arcsDecodes;
    const position = p => (t ? [p[0] * t.scale[0] + t.translate[0], p[1] * t.scale[1] + t.translate[1]] : [p[0], p[1]]);
    const arc = i => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
    const ligne = indices => {
        const pts = [];
        indices.forEach((i, k) => pts.push(...(k === 0 ? arc(i) : arc(i).slice(1))));
        return pts;
    };

    switch (g.type) {
        case 'Point': return { type: 'Point', coordinates: g.coordinates ? position(g.coordinates) : [] };
        case 'MultiPoint': return { type: 'MultiPoint', coordinates: (g.coordinates || []).map(position) };
        case 'LineString': return { type: 'LineString', coordinates: ligne(g.arcs) };
        case 'MultiLineString': return { type: 'MultiLineString', coordinates: g.arcs.map(ligne) };
        case 'Polygon': return { type: 'Polygon', coordinates: g.arcs.map(ligne) };
        case 'MultiPolygon': return { type: 'MultiPolygon', coordinates: g.arcs.map(p => p.map(ligne)) };
    }
    return null;
}
