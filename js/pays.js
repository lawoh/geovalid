/**
 * GeoValidator - Pays pris en charge
 * Fichier: js/pays.js
 *
 * v2.0 : configuration par pays et validation par contour réel.
 * Ajouter un pays = une entrée dans PAYS + son contour dans data/contours/<ISO>.geojson
 * (Natural Earth 10m, avec les frontières terrestres séparées des côtes).
 */

// Le long des côtes, un point à moins de cette distance est accepté : le contour simplifié
// coupe les estuaires et les petites îles (ex : Québec, sur le Saint-Laurent).
// Aucune tolérance le long des frontières terrestres.
const TOLERANCE_COTE_KM = 3;

const PAYS = {
    CAN: {
        nom: 'Canada',
        emprise: LIMITES_CANADA,
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Valeur affichée : alias acceptés (codes Statistique Canada, noms)
        regions: {
            AB: ['48', 'Alberta'],
            BC: ['59', 'Colombie-Britannique', 'British Columbia'],
            MB: ['46', 'Manitoba'],
            NB: ['13', 'Nouveau-Brunswick', 'New Brunswick'],
            NL: ['10', 'Terre-Neuve-et-Labrador', 'Newfoundland and Labrador'],
            NS: ['12', 'Nouvelle-Écosse', 'Nova Scotia'],
            NT: ['61', 'Territoires du Nord-Ouest', 'Northwest Territories'],
            NU: ['62', 'Nunavut'],
            ON: ['35', 'Ontario'],
            PE: ['11', 'Île-du-Prince-Édouard', 'Prince Edward Island'],
            QC: ['24', 'Québec', 'Quebec'],
            SK: ['47', 'Saskatchewan'],
            YT: ['60', 'Yukon']
        },
        // Code postal : A1A ou A1A1A1
        codePostal: cp => /^[A-Z]\d[A-Z]$/.test(cp) || /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cp),
        zonesCanada: true
    },
    NER: {
        nom: 'Niger',
        emprise: {
            latitude: { min: 11.69, max: 23.52 },
            longitude: { min: 0.15, max: 15.98 }
        },
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:NE (NE-1 à NE-8)
        regions: {
            'Agadez': ['NE-1', '1', 'Agadès'],
            'Diffa': ['NE-2', '2', 'Difa'],
            'Dosso': ['NE-3', '3'],
            'Maradi': ['NE-4', '4'],
            'Tahoua': ['NE-5', '5'],
            'Tillabéri': ['NE-6', '6', 'Tillabéry', 'Tillabery'],
            'Zinder': ['NE-7', '7', 'Sinder'],
            'Niamey': ['NE-8', '8', 'Communauté urbaine de Niamey', 'CUN']
        },
        // Code postal : 4 chiffres (ex : 8001 Niamey)
        codePostal: cp => /^\d{4}$/.test(cp),
        zonesCanada: false
    }
};

// Pays sélectionné
function paysActif() {
    return PAYS[AppState.pays];
}

// Comparer des textes sans tenir compte des accents, de la casse et des séparateurs
function normaliserTexte(texte) {
    return String(texte).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s_-]+/g, ' ').trim();
}

// Retrouver la région d'une valeur (code, numéro ou nom) ; null si inconnue
// pourDetection : ignore les numéros à un chiffre, trop ambigus pour reconnaître une colonne
function trouverRegion(valeur, pays, pourDetection = false) {
    const v = normaliserTexte(valeur);
    if (!v) return null;
    for (const [region, alias] of Object.entries(pays.regions)) {
        if (normaliserTexte(region) === v) return region;
        for (const a of alias) {
            if (pourDetection && /^\d$/.test(a)) continue;
            if (normaliserTexte(a) === v) return region;
        }
    }
    return null;
}

// Le point est-il dans l'emprise (rectangle) du pays ?
function dansEmprise(pays, lon, lat) {
    const e = pays.emprise;
    return lat >= e.latitude.min && lat <= e.latitude.max && lon >= e.longitude.min && lon <= e.longitude.max;
}

// ============================================
// SUGGESTION DU PAYS
// ============================================

// Quelques points des données (500 au plus), en [lon, lat]
function pointsEchantillon(data, colonnes) {
    const points = [];
    for (const r of data.slice(0, 500)) {
        if (r._geom_) {
            if (listerSommets(r._geom_).length) points.push(pointRepresentatif(r._geom_));
        } else if (colonnes.latitude && colonnes.longitude) {
            const lat = parseCoordinate(r[colonnes.latitude]), lon = parseCoordinate(r[colonnes.longitude]);
            if (!isNaN(lat) && !isNaN(lon)) points.push([lon, lat]);
        }
    }
    return points;
}

// Pays dont l'emprise contient le plus de points (Canada par défaut)
function suggererPays(points) {
    let meilleur = 'CAN', max = 0;
    Object.entries(PAYS).forEach(([iso, pays]) => {
        const n = points.filter(([lon, lat]) => dansEmprise(pays, lon, lat)).length;
        if (n > max) {
            max = n;
            meilleur = iso;
        }
    });
    return meilleur;
}

// ============================================
// CONTOURS
// ============================================

const contoursCharges = {};

// Charger le contour du pays (une seule fois par session)
async function chargerContour(iso) {
    if (contoursCharges[iso]) return;

    const reponse = await fetch(`data/contours/${iso}.geojson?v=2.0.0`);
    if (!reponse.ok) throw new Error(`Contour introuvable pour ${PAYS[iso].nom}`);
    const fc = await reponse.json();
    const contour = fc.features.find(f => f.properties.role === 'contour').geometry.coordinates;
    const frontieres = fc.features.find(f => f.properties.role === 'frontieres').geometry.coordinates;

    // Segments de frontière terrestre, dans les deux sens
    const cle = (a, b) => `${a[0]},${a[1]}|${b[0]},${b[1]}`;
    const segmentsFrontiere = new Set();
    frontieres.forEach(ligne => {
        for (let i = 0; i < ligne.length - 1; i++) {
            segmentsFrontiere.add(cle(ligne[i], ligne[i + 1]));
            segmentsFrontiere.add(cle(ligne[i + 1], ligne[i]));
        }
    });

    // Polygones avec leur emprise, et segments de côte (le contour moins les frontières)
    const polygones = [];
    const cotes = [];
    contour.forEach(anneaux => {
        const xs = anneaux[0].map(c => c[0]), ys = anneaux[0].map(c => c[1]);
        polygones.push({ anneaux, minX: safeMin(xs), maxX: safeMax(xs), minY: safeMin(ys), maxY: safeMax(ys) });
        anneaux.forEach(a => {
            for (let i = 0; i < a.length - 1; i++) {
                if (segmentsFrontiere.has(cle(a[i], a[i + 1]))) continue;
                cotes.push({
                    a: a[i], b: a[i + 1],
                    minX: Math.min(a[i][0], a[i + 1][0]), maxX: Math.max(a[i][0], a[i + 1][0]),
                    minY: Math.min(a[i][1], a[i + 1][1]), maxY: Math.max(a[i][1], a[i + 1][1])
                });
            }
        });
    });

    contoursCharges[iso] = { polygones, cotes };
}

// Le point est-il dans le pays ? (dans le contour, ou à moins de TOLERANCE_COTE_KM d'une côte)
function dansLePays(lon, lat) {
    const c = contoursCharges[AppState.pays];
    if (!c) throw new Error('Contour du pays non chargé');

    const p = [lon, lat];
    for (const poly of c.polygones) {
        if (lon < poly.minX || lon > poly.maxX || lat < poly.minY || lat > poly.maxY) continue;
        if (pointDansAnneau(p, poly.anneaux[0]) && !poly.anneaux.slice(1).some(trou => pointDansAnneau(p, trou))) return true;
    }
    return distanceCoteKm(c, lon, lat) <= TOLERANCE_COTE_KM;
}

// Distance (km) du point à la côte la plus proche, en ne regardant que les côtes voisines
function distanceCoteKm(c, lon, lat) {
    const k = Math.cos(lat * Math.PI / 180);
    const margeLat = TOLERANCE_COTE_KM / 111.32;
    const margeLon = margeLat / Math.max(k, 0.05);
    let min = Infinity;

    for (const s of c.cotes) {
        if (lon < s.minX - margeLon || lon > s.maxX + margeLon || lat < s.minY - margeLat || lat > s.maxY + margeLat) continue;
        // Distance point-segment, coordonnées ramenées en degrés de latitude
        const ax = (s.a[0] - lon) * k, ay = s.a[1] - lat;
        const bx = (s.b[0] - lon) * k, by = s.b[1] - lat;
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
        const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
        min = Math.min(min, Math.hypot(ax + t * dx, ay + t * dy));
    }
    return min * 111.32;
}

// Erreurs d'un point par rapport au pays sélectionné (liste vide s'il est dans le pays)
function erreursPays(lon, lat) {
    const pays = paysActif();
    const e = pays.emprise;
    const erreurs = [];
    if (lat < e.latitude.min || lat > e.latitude.max) erreurs.push(`Latitude hors ${pays.nom}`);
    if (lon < e.longitude.min || lon > e.longitude.max) erreurs.push(`Longitude hors ${pays.nom}`);
    if (erreurs.length === 0 && !dansLePays(lon, lat)) erreurs.push(`Point hors ${pays.nom}`);
    return erreurs;
}
