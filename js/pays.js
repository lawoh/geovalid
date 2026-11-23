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
// Aucune tolérance si le segment le plus proche est une frontière terrestre (ex : Detroit, Monaco).
const TOLERANCE_COTE_KM = 3;

// Régions métropolitaines françaises (codes ISO 3166-2:FR)
const REGIONS_FRANCE_METROPOLE = {
    'Auvergne-Rhône-Alpes': ['FR-ARA', 'ARA'],
    'Bourgogne-Franche-Comté': ['FR-BFC', 'BFC'],
    'Bretagne': ['FR-BRE', 'BRE'],
    'Centre-Val de Loire': ['FR-CVL', 'CVL'],
    'Corse': ['FR-20R', '20R', 'COR'],
    'Grand Est': ['FR-GES', 'GES'],
    'Hauts-de-France': ['FR-HDF', 'HDF'],
    'Île-de-France': ['FR-IDF', 'IDF'],
    'Normandie': ['FR-NOR', 'NOR'],
    'Nouvelle-Aquitaine': ['FR-NAQ', 'NAQ'],
    'Occitanie': ['FR-OCC', 'OCC'],
    'Pays de la Loire': ['FR-PDL', 'PDL'],
    "Provence-Alpes-Côte d'Azur": ['FR-PAC', 'PAC', 'PACA']
};

const PAYS = {
    CAN: {
        nom: 'Canada',
        emprises: [LIMITES_CANADA],
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
        emprises: [
            { latitude: { min: 11.69, max: 23.52 }, longitude: { min: 0.15, max: 15.98 } }
        ],
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
    },
    MAR: {
        nom: 'Maroc',
        // Contour Natural Earth « point de vue du Maroc » : Sahara occidental, Ceuta et Melilla inclus
        emprises: [
            { latitude: { min: 20.76, max: 35.93 }, longitude: { min: -17.11, max: -1.03 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:MA (MA-01 à MA-12, découpage de 2015)
        regions: {
            'Tanger-Tétouan-Al Hoceïma': ['MA-01', '01'],
            "L'Oriental": ['MA-02', '02', 'Oriental'],
            'Fès-Meknès': ['MA-03', '03'],
            'Rabat-Salé-Kénitra': ['MA-04', '04'],
            'Béni Mellal-Khénifra': ['MA-05', '05'],
            'Casablanca-Settat': ['MA-06', '06'],
            'Marrakech-Safi': ['MA-07', '07'],
            'Drâa-Tafilalet': ['MA-08', '08', 'Drâa-Tafilalt'],
            'Souss-Massa': ['MA-09', '09'],
            'Guelmim-Oued Noun': ['MA-10', '10'],
            'Laâyoune-Sakia El Hamra': ['MA-11', '11'],
            'Dakhla-Oued Ed-Dahab': ['MA-12', '12']
        },
        // Code postal : 5 chiffres (ex : 20000 Casablanca)
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    FXX: {
        nom: 'France métropolitaine',
        emprises: [
            { latitude: { min: 41.36, max: 51.09 }, longitude: { min: -5.14, max: 9.57 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:FR des 13 régions métropolitaines (Corse comprise)
        regions: REGIONS_FRANCE_METROPOLE,
        // Code postal : 5 chiffres
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    FRA: {
        nom: 'France (avec outre-mer)',
        nomCourt: 'France',
        // Métropole et Corse, Antilles (Guadeloupe, Martinique), Guyane, La Réunion, Mayotte
        emprises: [
            { latitude: { min: 41.36, max: 51.09 }, longitude: { min: -5.14, max: 9.57 } },
            { latitude: { min: 14.40, max: 16.52 }, longitude: { min: -61.81, max: -60.80 } },
            { latitude: { min: 2.11, max: 5.75 }, longitude: { min: -54.62, max: -51.64 } },
            { latitude: { min: -21.38, max: -20.86 }, longitude: { min: 55.22, max: 55.86 } },
            { latitude: { min: -13.00, max: -12.64 }, longitude: { min: 45.04, max: 45.30 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // 13 régions métropolitaines + 5 régions d'outre-mer (codes ISO 3166-2:FR)
        regions: Object.assign({}, REGIONS_FRANCE_METROPOLE, {
            'Guadeloupe': ['FR-971', '971', 'GP'],
            'Martinique': ['FR-972', '972', 'MQ'],
            'Guyane': ['FR-973', '973', 'GF', 'Guyane française'],
            'La Réunion': ['FR-974', '974', 'RE', 'Réunion'],
            'Mayotte': ['FR-976', '976', 'YT']
        }),
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    // ---------- Lot 1 Afrique de l'Ouest et du Centre (contours Natural Earth 10m)
    MLI: {
        nom: 'Mali',
        emprises: [
            { latitude: { min: 10.14, max: 25.0 }, longitude: { min: -12.27, max: 4.24 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:ML (10 régions + district de Bamako ; le découpage national de 2023 n'y figure pas encore)
        regions: {
            'Kayes': ['ML-1'],
            'Koulikoro': ['ML-2'],
            'Sikasso': ['ML-3'],
            'Ségou': ['ML-4'],
            'Mopti': ['ML-5'],
            'Tombouctou': ['ML-6', 'Timbuktu'],
            'Gao': ['ML-7'],
            'Kidal': ['ML-8'],
            'Ménaka': ['ML-9'],
            'Taoudénit': ['ML-10', 'Taoudenni', 'Taoudéni'],
            'Bamako': ['ML-BKO', 'District de Bamako']
        },
        // Pas de format de code postal officiel confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    BFA: {
        nom: 'Burkina Faso',
        emprises: [
            { latitude: { min: 9.39, max: 15.08 }, longitude: { min: -5.53, max: 2.4 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:BF (13 régions ; le découpage national de 2025 n'y figure pas encore)
        regions: {
            'Boucle du Mouhoun': ['BF-01'],
            'Cascades': ['BF-02'],
            'Centre': ['BF-03'],
            'Centre-Est': ['BF-04'],
            'Centre-Nord': ['BF-05'],
            'Centre-Ouest': ['BF-06'],
            'Centre-Sud': ['BF-07'],
            'Est': ['BF-08'],
            'Hauts-Bassins': ['BF-09'],
            'Nord': ['BF-10'],
            'Plateau-Central': ['BF-11'],
            'Sahel': ['BF-12'],
            'Sud-Ouest': ['BF-13']
        },
        // Code postal : 5 chiffres (ex : 10010 Ouagadougou, source UPU)
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    SEN: {
        nom: 'Sénégal',
        emprises: [
            { latitude: { min: 12.3, max: 16.7 }, longitude: { min: -17.54, max: -11.37 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:SN (14 régions)
        regions: {
            'Dakar': ['SN-DK'],
            'Diourbel': ['SN-DB'],
            'Fatick': ['SN-FK'],
            'Kaffrine': ['SN-KA'],
            'Kaolack': ['SN-KL'],
            'Kédougou': ['SN-KE'],
            'Kolda': ['SN-KD'],
            'Louga': ['SN-LG'],
            'Matam': ['SN-MT'],
            'Saint-Louis': ['SN-SL'],
            'Sédhiou': ['SN-SE'],
            'Tambacounda': ['SN-TC'],
            'Thiès': ['SN-TH'],
            'Ziguinchor': ['SN-ZG']
        },
        // Pas de format de code postal officiel confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    CIV: {
        nom: 'Côte d\'Ivoire',
        emprises: [
            { latitude: { min: 4.34, max: 10.73 }, longitude: { min: -8.62, max: -2.5 } }
        ],
        libelleRegion: 'District',
        libelleRegions: 'Districts',
        colonneRegion: 'district',
        // Codes ISO 3166-2:CI (12 districts + 2 districts autonomes)
        regions: {
            'Abidjan': ['CI-AB', 'District autonome d\'Abidjan'],
            'Yamoussoukro': ['CI-YM', 'District autonome de Yamoussoukro'],
            'Bas-Sassandra': ['CI-BS'],
            'Comoé': ['CI-CM'],
            'Denguélé': ['CI-DN'],
            'Gôh-Djiboua': ['CI-GD'],
            'Lacs': ['CI-LC'],
            'Lagunes': ['CI-LG'],
            'Montagnes': ['CI-MG'],
            'Sassandra-Marahoué': ['CI-SM'],
            'Savanes': ['CI-SV'],
            'Vallée du Bandama': ['CI-VB'],
            'Woroba': ['CI-WR'],
            'Zanzan': ['CI-ZZ']
        },
        // Pas de format de code postal officiel confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    BEN: {
        nom: 'Bénin',
        emprises: [
            { latitude: { min: 6.21, max: 12.4 }, longitude: { min: 0.75, max: 3.84 } }
        ],
        libelleRegion: 'Département',
        libelleRegions: 'Départements',
        colonneRegion: 'departement',
        // Codes ISO 3166-2:BJ (12 départements)
        regions: {
            'Alibori': ['BJ-AL'],
            'Atacora': ['BJ-AK'],
            'Atlantique': ['BJ-AQ'],
            'Borgou': ['BJ-BO'],
            'Collines': ['BJ-CO'],
            'Couffo': ['BJ-KO'],
            'Donga': ['BJ-DO'],
            'Littoral': ['BJ-LI'],
            'Mono': ['BJ-MO'],
            'Ouémé': ['BJ-OU'],
            'Plateau': ['BJ-PL'],
            'Zou': ['BJ-ZO']
        },
        // Pas de format de code postal officiel confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    TGO: {
        nom: 'Togo',
        emprises: [
            { latitude: { min: 6.1, max: 11.14 }, longitude: { min: -0.17, max: 1.79 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:TG (5 régions)
        regions: {
            'Centrale': ['TG-C'],
            'Kara': ['TG-K'],
            'Maritime': ['TG-M'],
            'Plateaux': ['TG-P'],
            'Savanes': ['TG-S']
        },
        // Pas de format de code postal officiel confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    GIN: {
        nom: 'Guinée',
        emprises: [
            { latitude: { min: 7.19, max: 12.68 }, longitude: { min: -15.09, max: -7.66 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:GN (7 régions + gouvernorat de Conakry)
        regions: {
            'Boké': ['GN-B'],
            'Faranah': ['GN-F'],
            'Kankan': ['GN-K'],
            'Kindia': ['GN-D'],
            'Labé': ['GN-L'],
            'Mamou': ['GN-M'],
            'Nzérékoré': ['GN-N', 'N\'Zérékoré'],
            'Conakry': ['GN-C']
        },
        // Pas de format de code postal officiel confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    TCD: {
        nom: 'Tchad',
        emprises: [
            { latitude: { min: 7.45, max: 23.45 }, longitude: { min: 13.44, max: 23.99 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:TD (23 provinces)
        regions: {
            'Bahr el Ghazal': ['TD-BG', 'Barh-el-Ghazal'],
            'Batha': ['TD-BA'],
            'Borkou': ['TD-BO'],
            'Chari-Baguirmi': ['TD-CB'],
            'Ennedi-Est': ['TD-EE'],
            'Ennedi-Ouest': ['TD-EO'],
            'Guéra': ['TD-GR'],
            'Hadjer-Lamis': ['TD-HL'],
            'Kanem': ['TD-KA'],
            'Lac': ['TD-LC'],
            'Logone-Occidental': ['TD-LO'],
            'Logone-Oriental': ['TD-LR'],
            'Mandoul': ['TD-MA'],
            'Mayo-Kebbi-Est': ['TD-ME'],
            'Mayo-Kebbi-Ouest': ['TD-MO'],
            'Moyen-Chari': ['TD-MC'],
            'Ouaddaï': ['TD-OD'],
            'Salamat': ['TD-SA'],
            'Sila': ['TD-SI'],
            'Tandjilé': ['TD-TA'],
            'Tibesti': ['TD-TI'],
            'N\'Djamena': ['TD-ND', 'Ville de Ndjamena', 'Ndjamena'],
            'Wadi Fira': ['TD-WF']
        },
        // Pas de format de code postal officiel confirmé : valeur gardée sans contrôle
        codePostal: null,
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

// Le point est-il dans l'emprise du pays (un rectangle par territoire) ?
function dansEmprise(pays, lon, lat) {
    return pays.emprises.some(e => lat >= e.latitude.min && lat <= e.latitude.max && lon >= e.longitude.min && lon <= e.longitude.max);
}

// Surface totale des emprises (en degrés carrés) : départage deux pays qui se recouvrent
function surfaceEmprises(pays) {
    return pays.emprises.reduce((s, e) => s + (e.latitude.max - e.latitude.min) * (e.longitude.max - e.longitude.min), 0);
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

// Pays dont l'emprise contient le plus de points (Canada par défaut).
// À égalité, le pays à l'emprise la plus petite (ex : France métropolitaine plutôt qu'avec outre-mer)
function suggererPays(points) {
    let meilleur = 'CAN', max = 0;
    Object.entries(PAYS).forEach(([iso, pays]) => {
        const n = points.filter(([lon, lat]) => dansEmprise(pays, lon, lat)).length;
        if (n > max || (n === max && n > 0 && surfaceEmprises(pays) < surfaceEmprises(PAYS[meilleur]))) {
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

    // Polygones avec leur emprise ; segments de côte et de frontière avec leur emprise
    const segment = (a, b) => ({
        a, b,
        minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]),
        minY: Math.min(a[1], b[1]), maxY: Math.max(a[1], b[1])
    });
    const polygones = [];
    const cotes = [];
    const segmentsTerrestres = [];
    contour.forEach(anneaux => {
        const xs = anneaux[0].map(c => c[0]), ys = anneaux[0].map(c => c[1]);
        polygones.push({ anneaux, minX: safeMin(xs), maxX: safeMax(xs), minY: safeMin(ys), maxY: safeMax(ys) });
        anneaux.forEach(a => {
            for (let i = 0; i < a.length - 1; i++) {
                if (segmentsFrontiere.has(cle(a[i], a[i + 1]))) segmentsTerrestres.push(segment(a[i], a[i + 1]));
                else cotes.push(segment(a[i], a[i + 1]));
            }
        });
    });

    contoursCharges[iso] = { polygones, cotes, frontieres: segmentsTerrestres };
}

// Le point est-il dans le pays ? (dans le contour, ou près d'une côte plus que d'une frontière)
function dansLePays(lon, lat) {
    const c = contoursCharges[AppState.pays];
    if (!c) throw new Error('Contour du pays non chargé');

    const p = [lon, lat];
    for (const poly of c.polygones) {
        if (lon < poly.minX || lon > poly.maxX || lat < poly.minY || lat > poly.maxY) continue;
        if (pointDansAnneau(p, poly.anneaux[0]) && !poly.anneaux.slice(1).some(trou => pointDansAnneau(p, trou))) return true;
    }
    const dCote = distanceKm(c.cotes, lon, lat);
    return dCote <= TOLERANCE_COTE_KM && dCote < distanceKm(c.frontieres, lon, lat);
}

// Distance (km) du point au segment le plus proche, en ne regardant que les segments voisins
// (Infinity si aucun segment à moins de TOLERANCE_COTE_KM)
function distanceKm(segments, lon, lat) {
    const k = Math.cos(lat * Math.PI / 180);
    const margeLat = TOLERANCE_COTE_KM / 111.32;
    const margeLon = margeLat / Math.max(k, 0.05);
    let min = Infinity;

    for (const s of segments) {
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
    const nom = pays.nomCourt || pays.nom;
    const erreurs = [];
    if (pays.emprises.length === 1) {
        // Un seul territoire : on précise si c'est la latitude ou la longitude qui sort
        const e = pays.emprises[0];
        if (lat < e.latitude.min || lat > e.latitude.max) erreurs.push(`Latitude hors ${nom}`);
        if (lon < e.longitude.min || lon > e.longitude.max) erreurs.push(`Longitude hors ${nom}`);
    } else if (!dansEmprise(pays, lon, lat)) {
        erreurs.push(`Point hors ${nom}`);
    }
    if (erreurs.length === 0 && !dansLePays(lon, lat)) erreurs.push(`Point hors ${nom}`);
    return erreurs;
}
