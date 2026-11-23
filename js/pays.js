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
    },
    // ---------- Lot 2 Afrique de l'Ouest et du Centre (contours Natural Earth 10m)
    MRT: {
        nom: 'Mauritanie',
        emprises: [
            { latitude: { min: 14.73, max: 27.29 }, longitude: { min: -17.09, max: -4.82 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:MR (15 régions, dont les 3 de Nouakchott)
        regions: {
            'Adrar': ['MR-07'],
            'Assaba': ['MR-03'],
            'Brakna': ['MR-05'],
            'Dakhlet Nouâdhibou': ['MR-08', 'Dakhlet Nouadhibou'],
            'Gorgol': ['MR-04'],
            'Guidimaka': ['MR-10'],
            'Hodh ech Chargui': ['MR-01'],
            'Hodh el Gharbi': ['MR-02'],
            'Inchiri': ['MR-12'],
            'Nouakchott-Nord': ['MR-14'],
            'Nouakchott-Ouest': ['MR-13'],
            'Nouakchott-Sud': ['MR-15'],
            'Tagant': ['MR-09'],
            'Tiris Zemmour': ['MR-11'],
            'Trarza': ['MR-06']
        },
        // Pas de système de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    CMR: {
        nom: 'Cameroun',
        emprises: [
            { latitude: { min: 1.65, max: 13.09 }, longitude: { min: 8.5, max: 16.21 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:CM (10 régions, noms français et anglais)
        regions: {
            'Adamaoua': ['CM-AD', 'Adamawa'],
            'Centre': ['CM-CE'],
            'Est': ['CM-ES', 'East'],
            'Extrême-Nord': ['CM-EN', 'Far North'],
            'Littoral': ['CM-LT'],
            'Nord': ['CM-NO', 'North'],
            'Nord-Ouest': ['CM-NW', 'North-West'],
            'Sud': ['CM-SU', 'South'],
            'Sud-Ouest': ['CM-SW', 'South-West'],
            'Ouest': ['CM-OU', 'West']
        },
        // Pas de système de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    CAF: {
        nom: 'Centrafrique',
        emprises: [
            { latitude: { min: 2.23, max: 11.01 }, longitude: { min: 14.38, max: 27.45 } }
        ],
        libelleRegion: 'Préfecture',
        libelleRegions: 'Préfectures',
        colonneRegion: 'prefecture',
        // Codes ISO 3166-2:CF (14 préfectures, 2 préfectures économiques, commune de Bangui ; le découpage de 2020 n'y figure pas encore)
        regions: {
            'Bamingui-Bangoran': ['CF-BB'],
            'Bangui': ['CF-BGF'],
            'Basse-Kotto': ['CF-BK'],
            'Gribingui': ['CF-KB', 'Nana-Grébizi'],
            'Haut-Mbomou': ['CF-HM'],
            'Haute-Kotto': ['CF-HK'],
            'Mambéré-Kadéï': ['CF-HS', 'Haute-Sangha'],
            'Kémo-Gribingui': ['CF-KG', 'Kémo'],
            'Lobaye': ['CF-LB'],
            'Mbomou': ['CF-MB'],
            'Nana-Mambéré': ['CF-NM'],
            'Ombella-Mpoko': ['CF-MP', 'Ombella-M\'Poko'],
            'Ouaka': ['CF-UK'],
            'Ouham': ['CF-AC'],
            'Ouham-Pendé': ['CF-OP'],
            'Sangha': ['CF-SE', 'Sangha-Mbaéré'],
            'Vakaga': ['CF-VK']
        },
        // Pas de système de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    GAB: {
        nom: 'Gabon',
        emprises: [
            { latitude: { min: -3.94, max: 2.33 }, longitude: { min: 8.69, max: 14.5 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:GA (9 provinces)
        regions: {
            'Estuaire': ['GA-1'],
            'Haut-Ogooué': ['GA-2'],
            'Moyen-Ogooué': ['GA-3'],
            'Ngounié': ['GA-4'],
            'Nyanga': ['GA-5'],
            'Ogooué-Ivindo': ['GA-6'],
            'Ogooué-Lolo': ['GA-7'],
            'Ogooué-Maritime': ['GA-8'],
            'Woleu-Ntem': ['GA-9']
        },
        // Pas de système de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    COG: {
        nom: 'Congo',
        emprises: [
            { latitude: { min: -5.02, max: 3.71 }, longitude: { min: 11.11, max: 18.65 } }
        ],
        libelleRegion: 'Département',
        libelleRegions: 'Départements',
        colonneRegion: 'departement',
        // Codes ISO 3166-2:CG (12 départements)
        regions: {
            'Bouenza': ['CG-11'],
            'Brazzaville': ['CG-BZV'],
            'Cuvette': ['CG-8'],
            'Cuvette-Ouest': ['CG-15'],
            'Kouilou': ['CG-5'],
            'Lékoumou': ['CG-2'],
            'Likouala': ['CG-7'],
            'Niari': ['CG-9'],
            'Plateaux': ['CG-14'],
            'Pointe-Noire': ['CG-16'],
            'Pool': ['CG-12'],
            'Sangha': ['CG-13']
        },
        // Pas de système de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    COD: {
        nom: 'RD Congo',
        emprises: [
            { latitude: { min: -13.46, max: 5.38 }, longitude: { min: 12.21, max: 31.29 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:CD (26 provinces, découpage de 2015)
        regions: {
            'Bas-Uélé': ['CD-BU'],
            'Équateur': ['CD-EQ'],
            'Haut-Katanga': ['CD-HK'],
            'Haut-Lomami': ['CD-HL'],
            'Haut-Uélé': ['CD-HU'],
            'Ituri': ['CD-IT'],
            'Kasaï': ['CD-KS'],
            'Kasaï Central': ['CD-KC'],
            'Kasaï Oriental': ['CD-KE'],
            'Kinshasa': ['CD-KN'],
            'Kongo Central': ['CD-BC'],
            'Kwango': ['CD-KG'],
            'Kwilu': ['CD-KL'],
            'Lomami': ['CD-LO'],
            'Lualaba': ['CD-LU'],
            'Mai-Ndombe': ['CD-MN'],
            'Maniema': ['CD-MA'],
            'Mongala': ['CD-MO'],
            'Nord-Kivu': ['CD-NK'],
            'Nord-Ubangi': ['CD-NU'],
            'Sankuru': ['CD-SA'],
            'Sud-Kivu': ['CD-SK'],
            'Sud-Ubangi': ['CD-SU'],
            'Tanganyika': ['CD-TA'],
            'Tshopo': ['CD-TO'],
            'Tshuapa': ['CD-TU']
        },
        // Pas de système de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    GNB: {
        nom: 'Guinée-Bissau',
        emprises: [
            { latitude: { min: 10.92, max: 12.68 }, longitude: { min: -16.73, max: -13.66 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:GW (8 régions + secteur autonome de Bissau)
        regions: {
            'Bafatá': ['GW-BA'],
            'Biombo': ['GW-BM'],
            'Bissau': ['GW-BS', 'Setor Autónomo de Bissau'],
            'Bolama': ['GW-BL', 'Bolama-Bijagós'],
            'Cacheu': ['GW-CA'],
            'Gabú': ['GW-GA'],
            'Oio': ['GW-OI'],
            'Quinara': ['GW-QU'],
            'Tombali': ['GW-TO']
        },
        // Pas de système de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    GMB: {
        nom: 'Gambie',
        emprises: [
            { latitude: { min: 13.06, max: 13.82 }, longitude: { min: -16.83, max: -13.81 } }
        ],
        libelleRegion: 'Division',
        libelleRegions: 'Divisions',
        colonneRegion: 'division',
        // Codes ISO 3166-2:GM (5 divisions + ville de Banjul)
        regions: {
            'Banjul': ['GM-B'],
            'Central River': ['GM-M'],
            'Lower River': ['GM-L'],
            'North Bank': ['GM-N'],
            'Upper River': ['GM-U'],
            'West Coast': ['GM-W', 'Western']
        },
        // Pas de système de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    // ---------- Lot 3 Afrique du Nord (contours Natural Earth 10m)
    DZA: {
        nom: 'Algérie',
        emprises: [
            { latitude: { min: 18.97, max: 37.1 }, longitude: { min: -8.69, max: 11.97 } }
        ],
        libelleRegion: 'Wilaya',
        libelleRegions: 'Wilayas',
        colonneRegion: 'wilaya',
        // Codes ISO 3166-2:DZ (58 wilayas, numéros acceptés)
        regions: {
            'Adrar': ['DZ-01', '01'],
            'Chlef': ['DZ-02', '02'],
            'Laghouat': ['DZ-03', '03'],
            'Oum el Bouaghi': ['DZ-04', '04'],
            'Batna': ['DZ-05', '05'],
            'Béjaïa': ['DZ-06', '06'],
            'Biskra': ['DZ-07', '07'],
            'Béchar': ['DZ-08', '08'],
            'Blida': ['DZ-09', '09'],
            'Bouira': ['DZ-10', '10'],
            'Tamanrasset': ['DZ-11', '11'],
            'Tébessa': ['DZ-12', '12'],
            'Tlemcen': ['DZ-13', '13'],
            'Tiaret': ['DZ-14', '14'],
            'Tizi Ouzou': ['DZ-15', '15'],
            'Alger': ['DZ-16', '16', 'Algiers'],
            'Djelfa': ['DZ-17', '17'],
            'Jijel': ['DZ-18', '18'],
            'Sétif': ['DZ-19', '19'],
            'Saïda': ['DZ-20', '20'],
            'Skikda': ['DZ-21', '21'],
            'Sidi Bel Abbès': ['DZ-22', '22'],
            'Annaba': ['DZ-23', '23'],
            'Guelma': ['DZ-24', '24'],
            'Constantine': ['DZ-25', '25'],
            'Médéa': ['DZ-26', '26'],
            'Mostaganem': ['DZ-27', '27'],
            'M\'sila': ['DZ-28', '28'],
            'Mascara': ['DZ-29', '29'],
            'Ouargla': ['DZ-30', '30'],
            'Oran': ['DZ-31', '31'],
            'El Bayadh': ['DZ-32', '32'],
            'Illizi': ['DZ-33', '33'],
            'Bordj Bou Arréridj': ['DZ-34', '34'],
            'Boumerdès': ['DZ-35', '35'],
            'El Tarf': ['DZ-36', '36'],
            'Tindouf': ['DZ-37', '37'],
            'Tissemsilt': ['DZ-38', '38'],
            'El Oued': ['DZ-39', '39'],
            'Khenchela': ['DZ-40', '40'],
            'Souk Ahras': ['DZ-41', '41'],
            'Tipaza': ['DZ-42', '42'],
            'Mila': ['DZ-43', '43'],
            'Aïn Defla': ['DZ-44', '44'],
            'Naama': ['DZ-45', '45'],
            'Aïn Témouchent': ['DZ-46', '46'],
            'Ghardaïa': ['DZ-47', '47'],
            'Relizane': ['DZ-48', '48'],
            'Timimoun': ['DZ-49', '49'],
            'Bordj Badji Mokhtar': ['DZ-50', '50'],
            'Ouled Djellal': ['DZ-51', '51'],
            'Béni Abbès': ['DZ-52', '52'],
            'In Salah': ['DZ-53', '53'],
            'In Guezzam': ['DZ-54', '54'],
            'Touggourt': ['DZ-55', '55'],
            'Djanet': ['DZ-56', '56'],
            'El Meghaier': ['DZ-57', '57'],
            'El Meniaa': ['DZ-58', '58']
        },
        // Code postal : 5 chiffres, numéro de wilaya + 3 chiffres (ex : 16000 Alger)
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    TUN: {
        nom: 'Tunisie',
        emprises: [
            { latitude: { min: 30.22, max: 37.35 }, longitude: { min: 7.47, max: 11.57 } }
        ],
        libelleRegion: 'Gouvernorat',
        libelleRegions: 'Gouvernorats',
        colonneRegion: 'gouvernorat',
        // Codes ISO 3166-2:TN (24 gouvernorats)
        regions: {
            'Béja': ['TN-31'],
            'Ben Arous': ['TN-13'],
            'Bizerte': ['TN-23'],
            'Gabès': ['TN-81'],
            'Gafsa': ['TN-71'],
            'Jendouba': ['TN-32'],
            'Kairouan': ['TN-41'],
            'Kasserine': ['TN-42'],
            'Kébili': ['TN-73'],
            'L\'Ariana': ['TN-12', 'Ariana'],
            'La Manouba': ['TN-14', 'Manouba'],
            'Le Kef': ['TN-33', 'Kef'],
            'Mahdia': ['TN-53'],
            'Médenine': ['TN-82'],
            'Monastir': ['TN-52'],
            'Nabeul': ['TN-21'],
            'Sfax': ['TN-61'],
            'Sidi Bouzid': ['TN-43'],
            'Siliana': ['TN-34'],
            'Sousse': ['TN-51'],
            'Tataouine': ['TN-83'],
            'Tozeur': ['TN-72'],
            'Tunis': ['TN-11'],
            'Zaghouan': ['TN-22']
        },
        // Code postal : 4 chiffres (ex : 1002 Tunis, source UPU)
        codePostal: cp => /^\d{4}$/.test(cp),
        zonesCanada: false
    },
    LBY: {
        nom: 'Libye',
        emprises: [
            { latitude: { min: 19.49, max: 33.19 }, longitude: { min: 9.28, max: 25.16 } }
        ],
        libelleRegion: 'District',
        libelleRegions: 'Districts',
        colonneRegion: 'district',
        // Codes ISO 3166-2:LY (22 districts, noms translittérés et usuels)
        regions: {
            'Al Buţnān': ['LY-BU', 'Butnan'],
            'Al Jabal al Akhḑar': ['LY-JA', 'Jabal al Akhdar'],
            'Al Jabal al Gharbī': ['LY-JG', 'Jabal al Gharbi'],
            'Al Jafārah': ['LY-JI', 'Jafara'],
            'Al Jufrah': ['LY-JU', 'Jufra'],
            'Al Kufrah': ['LY-KF', 'Kufra'],
            'Al Marj': ['LY-MJ', 'Marj'],
            'Al Marqab': ['LY-MB', 'Murqub'],
            'Al Wāḩāt': ['LY-WA', 'Wahat'],
            'An Nuqāţ al Khams': ['LY-NQ', 'Nuqat al Khams'],
            'Az Zāwiyah': ['LY-ZA', 'Zawiya'],
            'Banghāzī': ['LY-BA', 'Benghazi'],
            'Darnah': ['LY-DR', 'Derna'],
            'Ghāt': ['LY-GT', 'Ghat'],
            'Mişrātah': ['LY-MI', 'Misrata'],
            'Murzuq': ['LY-MQ'],
            'Nālūt': ['LY-NL', 'Nalut'],
            'Sabhā': ['LY-SB', 'Sabha'],
            'Surt': ['LY-SR', 'Sirte'],
            'Ţarābulus': ['LY-TB', 'Tripoli'],
            'Wādī al Ḩayāt': ['LY-WD', 'Wadi al Hayaa'],
            'Wādī ash Shāţi\'': ['LY-WS', 'Wadi al Shatii']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    EGY: {
        nom: 'Égypte',
        emprises: [
            { latitude: { min: 21.99, max: 31.66 }, longitude: { min: 24.68, max: 36.9 } }
        ],
        libelleRegion: 'Gouvernorat',
        libelleRegions: 'Gouvernorats',
        colonneRegion: 'gouvernorat',
        // Codes ISO 3166-2:EG (27 gouvernorats) ; triangle de Hala'ib inclus (choix de Natural Earth)
        regions: {
            'Ad Daqahlīyah': ['EG-DK', 'Dakahlia'],
            'Al Baḩr al Aḩmar': ['EG-BA', 'Red Sea', 'Mer Rouge'],
            'Al Buḩayrah': ['EG-BH', 'Beheira'],
            'Al Fayyūm': ['EG-FYM', 'Faiyum', 'Fayoum'],
            'Al Gharbīyah': ['EG-GH', 'Gharbia'],
            'Al Iskandarīyah': ['EG-ALX', 'Alexandria', 'Alexandrie'],
            'Al Ismā\'īlīyah': ['EG-IS', 'Ismailia'],
            'Al Jīzah': ['EG-GZ', 'Giza', 'Gizeh'],
            'Al Minūfīyah': ['EG-MNF', 'Monufia'],
            'Al Minyā': ['EG-MN', 'Minya'],
            'Al Qāhirah': ['EG-C', 'Cairo', 'Le Caire'],
            'Al Qalyūbīyah': ['EG-KB', 'Qalyubia'],
            'Al Uqşur': ['EG-LX', 'Luxor', 'Louxor'],
            'Al Wādī al Jadīd': ['EG-WAD', 'New Valley'],
            'As Suways': ['EG-SUZ', 'Suez'],
            'Ash Sharqīyah': ['EG-SHR', 'Sharqia'],
            'Aswān': ['EG-ASN', 'Assouan'],
            'Asyūţ': ['EG-AST', 'Asyut', 'Assiout'],
            'Banī Suwayf': ['EG-BNS', 'Beni Suef'],
            'Būr Sa\'īd': ['EG-PTS', 'Port Said', 'Port-Saïd'],
            'Dumyāţ': ['EG-DT', 'Damietta', 'Damiette'],
            'Janūb Sīnā\'': ['EG-JS', 'South Sinai'],
            'Kafr ash Shaykh': ['EG-KFS', 'Kafr el-Sheikh'],
            'Maţrūḩ': ['EG-MT', 'Matruh'],
            'Qinā': ['EG-KN', 'Qena'],
            'Shamāl Sīnā\'': ['EG-SIN', 'North Sinai'],
            'Sūhāj': ['EG-SHG', 'Sohag']
        },
        // Code postal : 5 ou 7 chiffres (les deux formats circulent)
        codePostal: cp => /^\d{5}(\d{2})?$/.test(cp),
        zonesCanada: false
    },
    SDN: {
        nom: 'Soudan',
        emprises: [
            { latitude: { min: 8.68, max: 22.23 }, longitude: { min: 21.8, max: 38.61 } }
        ],
        libelleRegion: 'État',
        libelleRegions: 'États',
        colonneRegion: 'etat',
        // Codes ISO 3166-2:SD (18 États) ; Abyei et Kafia Kingi inclus (choix de Natural Earth)
        regions: {
            'Al Baḩr al Aḩmar': ['SD-RS', 'Red Sea'],
            'Al Jazīrah': ['SD-GZ', 'Gezira'],
            'Al Kharţūm': ['SD-KH', 'Khartoum'],
            'Al Qaḑārif': ['SD-GD', 'Gedaref'],
            'An Nīl al Abyaḑ': ['SD-NW', 'White Nile'],
            'An Nīl al Azraq': ['SD-NB', 'Blue Nile'],
            'Ash Shamālīyah': ['SD-NO', 'Northern'],
            'Gharb Dārfūr': ['SD-DW', 'West Darfur'],
            'Gharb Kurdufān': ['SD-GK', 'West Kordofan'],
            'Janūb Dārfūr': ['SD-DS', 'South Darfur'],
            'Janūb Kurdufān': ['SD-KS', 'South Kordofan'],
            'Kassalā': ['SD-KA', 'Kassala'],
            'Nahr an Nīl': ['SD-NR', 'River Nile'],
            'Shamāl Dārfūr': ['SD-DN', 'North Darfur'],
            'Shamāl Kurdufān': ['SD-KN', 'North Kordofan'],
            'Sharq Dārfūr': ['SD-DE', 'East Darfur'],
            'Sinnār': ['SD-SI', 'Sennar'],
            'Wasaţ Dārfūr': ['SD-DC', 'Central Darfur']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    SSD: {
        nom: 'Soudan du Sud',
        emprises: [
            { latitude: { min: 3.49, max: 12.22 }, longitude: { min: 24.12, max: 35.93 } }
        ],
        libelleRegion: 'État',
        libelleRegions: 'États',
        colonneRegion: 'etat',
        // Codes ISO 3166-2:SS (10 États)
        regions: {
            'Central Equatoria': ['SS-EC'],
            'Eastern Equatoria': ['SS-EE'],
            'Jonglei': ['SS-JG'],
            'Lakes': ['SS-LK'],
            'Northern Bahr el Ghazal': ['SS-BN'],
            'Unity': ['SS-UY'],
            'Upper Nile': ['SS-NU'],
            'Warrap': ['SS-WR'],
            'Western Bahr el Ghazal': ['SS-BW'],
            'Western Equatoria': ['SS-EW']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    // ---------- Lot 4 Afrique de l'Est (contours Natural Earth 10m)
    ETH: {
        nom: 'Éthiopie',
        emprises: [
            { latitude: { min: 3.4, max: 14.88 }, longitude: { min: 32.98, max: 47.98 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:ET (régions et villes à charte ; la division de 2023 des Peuples du Sud n'y figure pas encore)
        regions: {
            'Addis-Abeba': ['ET-AA', 'Addis Ababa', 'Ādīs Ābeba'],
            'Afar': ['ET-AF', 'Āfar'],
            'Amhara': ['ET-AM', 'Āmara'],
            'Benishangul-Gumuz': ['ET-BE', 'Bīnshangul Gumuz'],
            'Dire Dawa': ['ET-DD', 'Dirē Dawa'],
            'Gambela': ['ET-GA', 'Gambēla Hizboch'],
            'Harari': ['ET-HA', 'Hārerī Hizb'],
            'Oromia': ['ET-OR', 'Oromīya'],
            'Sidama': ['ET-SI', 'Sīdama'],
            'Somali': ['ET-SO', 'Sumalē'],
            'Tigray': ['ET-TI'],
            'Peuples du Sud': ['ET-SN', 'SNNPR', 'YeDebub Bihēroch Bihēreseboch na Hizboch'],
            'Peuples du Sud-Ouest de l\'Éthiopie': ['ET-SW', 'South West Ethiopia', 'YeDebub M\'irab Ītyop\'iya Hizboch']
        },
        // Code postal : 4 chiffres (ex : 1000 Addis-Abeba, source UPU)
        codePostal: cp => /^\d{4}$/.test(cp),
        zonesCanada: false
    },
    ERI: {
        nom: 'Érythrée',
        emprises: [
            { latitude: { min: 12.36, max: 18.01 }, longitude: { min: 36.42, max: 43.13 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:ER (6 régions)
        regions: {
            'Maekel': ['ER-MA', 'Central', 'Al Awsaţ'],
            'Debub': ['ER-DU', 'Southern', 'Al Janūbī'],
            'Anseba': ['ER-AN', 'Ansabā'],
            'Debubawi Keyih Bahri': ['ER-DK', 'Southern Red Sea'],
            'Gash-Barka': ['ER-GB', 'Qāsh-Barkah'],
            'Semenawi Keyih Bahri': ['ER-SK', 'Northern Red Sea']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    DJI: {
        nom: 'Djibouti',
        emprises: [
            { latitude: { min: 10.92, max: 12.71 }, longitude: { min: 41.74, max: 43.42 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:DJ (5 régions + ville de Djibouti)
        regions: {
            'Ali Sabieh': ['DJ-AS'],
            'Arta': ['DJ-AR'],
            'Dikhil': ['DJ-DI'],
            'Djibouti': ['DJ-DJ'],
            'Obock': ['DJ-OB'],
            'Tadjourah': ['DJ-TA']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    SOM: {
        nom: 'Somalie',
        emprises: [
            { latitude: { min: -1.7, max: 11.99 }, longitude: { min: 40.96, max: 51.42 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:SO (18 régions) ; contour sans le Somaliland (choix de Natural Earth)
        regions: {
            'Bakool': ['SO-BK'],
            'Banaadir': ['SO-BN', 'Benadir'],
            'Bari': ['SO-BR'],
            'Bay': ['SO-BY'],
            'Galguduud': ['SO-GA'],
            'Gedo': ['SO-GE'],
            'Hiiraan': ['SO-HI'],
            'Jubbada Dhexe': ['SO-JD', 'Middle Juba'],
            'Jubbada Hoose': ['SO-JH', 'Lower Juba'],
            'Mudug': ['SO-MU'],
            'Nugaal': ['SO-NU'],
            'Shabeellaha Dhexe': ['SO-SD', 'Middle Shabelle'],
            'Shabeellaha Hoose': ['SO-SH', 'Lower Shabelle'],
            'Awdal': ['SO-AW'],
            'Woqooyi Galbeed': ['SO-WO'],
            'Togdheer': ['SO-TO'],
            'Sanaag': ['SO-SA'],
            'Sool': ['SO-SO']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    SOL: {
        nom: 'Somaliland',
        emprises: [
            { latitude: { min: 7.99, max: 11.5 }, longitude: { min: 42.64, max: 48.94 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Entité à part dans Natural Earth (pas de code ISO) ; régions nord de la liste ISO 3166-2:SO
        regions: {
            'Awdal': ['SO-AW'],
            'Woqooyi Galbeed': ['SO-WO'],
            'Togdheer': ['SO-TO'],
            'Sanaag': ['SO-SA'],
            'Sool': ['SO-SO']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    KEN: {
        nom: 'Kenya',
        emprises: [
            { latitude: { min: -4.68, max: 5.04 }, longitude: { min: 33.89, max: 41.89 } }
        ],
        libelleRegion: 'Comté',
        libelleRegions: 'Comtés',
        colonneRegion: 'comte',
        // Codes ISO 3166-2:KE (47 comtés, numéros acceptés) ; triangle d'Ilemi inclus (choix de Natural Earth)
        regions: {
            'Baringo': ['KE-01', '01'],
            'Bomet': ['KE-02', '02'],
            'Bungoma': ['KE-03', '03'],
            'Busia': ['KE-04', '04'],
            'Elgeyo/Marakwet': ['KE-05', '05', 'Elgeyo-Marakwet'],
            'Embu': ['KE-06', '06'],
            'Garissa': ['KE-07', '07'],
            'Homa Bay': ['KE-08', '08'],
            'Isiolo': ['KE-09', '09'],
            'Kajiado': ['KE-10', '10'],
            'Kakamega': ['KE-11', '11'],
            'Kericho': ['KE-12', '12'],
            'Kiambu': ['KE-13', '13'],
            'Kilifi': ['KE-14', '14'],
            'Kirinyaga': ['KE-15', '15'],
            'Kisii': ['KE-16', '16'],
            'Kisumu': ['KE-17', '17'],
            'Kitui': ['KE-18', '18'],
            'Kwale': ['KE-19', '19'],
            'Laikipia': ['KE-20', '20'],
            'Lamu': ['KE-21', '21'],
            'Machakos': ['KE-22', '22'],
            'Makueni': ['KE-23', '23'],
            'Mandera': ['KE-24', '24'],
            'Marsabit': ['KE-25', '25'],
            'Meru': ['KE-26', '26'],
            'Migori': ['KE-27', '27'],
            'Mombasa': ['KE-28', '28'],
            'Murang\'a': ['KE-29', '29'],
            'Nairobi City': ['KE-30', '30', 'Nairobi'],
            'Nakuru': ['KE-31', '31'],
            'Nandi': ['KE-32', '32'],
            'Narok': ['KE-33', '33'],
            'Nyamira': ['KE-34', '34'],
            'Nyandarua': ['KE-35', '35'],
            'Nyeri': ['KE-36', '36'],
            'Samburu': ['KE-37', '37'],
            'Siaya': ['KE-38', '38'],
            'Taita/Taveta': ['KE-39', '39', 'Taita-Taveta'],
            'Tana River': ['KE-40', '40'],
            'Tharaka-Nithi': ['KE-41', '41'],
            'Trans Nzoia': ['KE-42', '42'],
            'Turkana': ['KE-43', '43'],
            'Uasin Gishu': ['KE-44', '44'],
            'Vihiga': ['KE-45', '45'],
            'Wajir': ['KE-46', '46'],
            'West Pokot': ['KE-47', '47']
        },
        // Code postal : 5 chiffres (ex : 00100 Nairobi)
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    UGA: {
        nom: 'Ouganda',
        emprises: [
            { latitude: { min: -1.48, max: 4.22 }, longitude: { min: 29.54, max: 35.01 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:UG (4 régions)
        regions: {
            'Central': ['UG-C', 'Centre'],
            'Eastern': ['UG-E', 'Est'],
            'Northern': ['UG-N', 'Nord'],
            'Western': ['UG-W', 'Ouest']
        },
        // Code postal : 5 chiffres (source UPU)
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    RWA: {
        nom: 'Rwanda',
        emprises: [
            { latitude: { min: -2.83, max: -1.05 }, longitude: { min: 28.85, max: 30.89 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:RW (Kigali + 4 provinces)
        regions: {
            'Kigali': ['RW-01', 'City of Kigali', 'Ville de Kigali'],
            'Est': ['RW-02', 'Eastern'],
            'Nord': ['RW-03', 'Northern'],
            'Ouest': ['RW-04', 'Western'],
            'Sud': ['RW-05', 'Southern']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    BDI: {
        nom: 'Burundi',
        emprises: [
            { latitude: { min: -4.47, max: -2.3 }, longitude: { min: 28.98, max: 30.84 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:BI (18 provinces ; le découpage de 2025 n'y figure pas encore)
        regions: {
            'Bubanza': ['BI-BB'],
            'Bujumbura Mairie': ['BI-BM'],
            'Bujumbura Rural': ['BI-BL'],
            'Bururi': ['BI-BR'],
            'Cankuzo': ['BI-CA'],
            'Cibitoke': ['BI-CI'],
            'Gitega': ['BI-GI'],
            'Karuzi': ['BI-KR'],
            'Kayanza': ['BI-KY'],
            'Kirundo': ['BI-KI'],
            'Makamba': ['BI-MA'],
            'Muramvya': ['BI-MU'],
            'Muyinga': ['BI-MY'],
            'Mwaro': ['BI-MW'],
            'Ngozi': ['BI-NG'],
            'Rumonge': ['BI-RM'],
            'Rutana': ['BI-RT'],
            'Ruyigi': ['BI-RY']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    TZA: {
        nom: 'Tanzanie',
        emprises: [
            { latitude: { min: -11.74, max: -0.98 }, longitude: { min: 29.32, max: 40.45 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:TZ (31 régions)
        regions: {
            'Arusha': ['TZ-01'],
            'Dar es Salaam': ['TZ-02'],
            'Dodoma': ['TZ-03'],
            'Geita': ['TZ-27'],
            'Iringa': ['TZ-04'],
            'Kagera': ['TZ-05'],
            'Kaskazini Pemba': ['TZ-06', 'Pemba North'],
            'Kaskazini Unguja': ['TZ-07', 'Zanzibar North'],
            'Katavi': ['TZ-28'],
            'Kigoma': ['TZ-08'],
            'Kilimanjaro': ['TZ-09'],
            'Kusini Pemba': ['TZ-10', 'Pemba South'],
            'Kusini Unguja': ['TZ-11', 'Zanzibar South'],
            'Lindi': ['TZ-12'],
            'Manyara': ['TZ-26'],
            'Mara': ['TZ-13'],
            'Mbeya': ['TZ-14'],
            'Mjini Magharibi': ['TZ-15', 'Zanzibar Urban/West'],
            'Morogoro': ['TZ-16'],
            'Mtwara': ['TZ-17'],
            'Mwanza': ['TZ-18'],
            'Njombe': ['TZ-29'],
            'Pwani': ['TZ-19', 'Coast'],
            'Rukwa': ['TZ-20'],
            'Ruvuma': ['TZ-21'],
            'Shinyanga': ['TZ-22'],
            'Simiyu': ['TZ-30'],
            'Singida': ['TZ-23'],
            'Songwe': ['TZ-31'],
            'Tabora': ['TZ-24'],
            'Tanga': ['TZ-25']
        },
        // Code postal : 5 chiffres (source TCRA)
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    // ---------- Lot 5 Afrique australe (contours Natural Earth 10m)
    AGO: {
        nom: 'Angola',
        emprises: [
            { latitude: { min: -18.04, max: -4.39 }, longitude: { min: 11.66, max: 24.07 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:AO (18 provinces, Cabinda comprise ; le découpage de 2024 n'y figure pas encore)
        regions: {
            'Bengo': ['AO-BGO'],
            'Benguela': ['AO-BGU'],
            'Bié': ['AO-BIE'],
            'Cabinda': ['AO-CAB'],
            'Cuando Cubango': ['AO-CCU', 'Kuando Kubango'],
            'Cuanza Norte': ['AO-CNO', 'Kwanza Norte'],
            'Cuanza Sul': ['AO-CUS', 'Kwanza Sul'],
            'Cunene': ['AO-CNN'],
            'Huambo': ['AO-HUA'],
            'Huíla': ['AO-HUI'],
            'Luanda': ['AO-LUA'],
            'Lunda Norte': ['AO-LNO'],
            'Lunda Sul': ['AO-LSU'],
            'Malanje': ['AO-MAL', 'Malange'],
            'Moxico': ['AO-MOX'],
            'Namibe': ['AO-NAM'],
            'Uíge': ['AO-UIG'],
            'Zaire': ['AO-ZAI']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    ZMB: {
        nom: 'Zambie',
        emprises: [
            { latitude: { min: -18.07, max: -8.19 }, longitude: { min: 21.97, max: 33.68 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:ZM (10 provinces)
        regions: {
            'Central': ['ZM-02'],
            'Copperbelt': ['ZM-08'],
            'Eastern': ['ZM-03'],
            'Luapula': ['ZM-04'],
            'Lusaka': ['ZM-09'],
            'Muchinga': ['ZM-10'],
            'North-Western': ['ZM-06'],
            'Northern': ['ZM-05'],
            'Southern': ['ZM-07'],
            'Western': ['ZM-01']
        },
        // Code postal : 5 chiffres (ex : 10101 Lusaka)
        codePostal: cp => /^\d{5}$/.test(cp),
        zonesCanada: false
    },
    MWI: {
        nom: 'Malawi',
        emprises: [
            { latitude: { min: -17.14, max: -9.38 }, longitude: { min: 32.66, max: 35.91 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:MW (3 régions)
        regions: {
            'Northern': ['MW-N', 'Chakumpoto', 'Nord'],
            'Central': ['MW-C', 'Chapakati', 'Centre'],
            'Southern': ['MW-S', 'Chakumwera', 'Sud']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    MOZ: {
        nom: 'Mozambique',
        emprises: [
            { latitude: { min: -26.87, max: -10.46 }, longitude: { min: 30.21, max: 40.85 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:MZ (10 provinces + ville de Maputo)
        regions: {
            'Cabo Delgado': ['MZ-P'],
            'Gaza': ['MZ-G'],
            'Inhambane': ['MZ-I'],
            'Manica': ['MZ-B'],
            'Maputo (ville)': ['MZ-MPM', 'Maputo City', 'Cidade de Maputo'],
            'Maputo (province)': ['MZ-L', 'Província de Maputo'],
            'Nampula': ['MZ-N'],
            'Niassa': ['MZ-A'],
            'Sofala': ['MZ-S'],
            'Tete': ['MZ-T'],
            'Zambézia': ['MZ-Q']
        },
        // Code postal : 4 chiffres (ex : 1100 Maputo, source UPU)
        codePostal: cp => /^\d{4}$/.test(cp),
        zonesCanada: false
    },
    ZWE: {
        nom: 'Zimbabwe',
        emprises: [
            { latitude: { min: -22.4, max: -15.61 }, longitude: { min: 25.21, max: 33.05 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:ZW (8 provinces + 2 villes)
        regions: {
            'Bulawayo': ['ZW-BU'],
            'Harare': ['ZW-HA'],
            'Manicaland': ['ZW-MA'],
            'Mashonaland Central': ['ZW-MC'],
            'Mashonaland East': ['ZW-ME'],
            'Mashonaland West': ['ZW-MW'],
            'Masvingo': ['ZW-MV'],
            'Matabeleland North': ['ZW-MN'],
            'Matabeleland South': ['ZW-MS'],
            'Midlands': ['ZW-MI']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    BWA: {
        nom: 'Botswana',
        emprises: [
            { latitude: { min: -26.9, max: -17.78 }, longitude: { min: 19.97, max: 29.36 } }
        ],
        libelleRegion: 'District',
        libelleRegions: 'Districts',
        colonneRegion: 'district',
        // Codes ISO 3166-2:BW (districts, villes et communes)
        regions: {
            'Central': ['BW-CE'],
            'Chobe': ['BW-CH'],
            'Francistown': ['BW-FR'],
            'Gaborone': ['BW-GA'],
            'Ghanzi': ['BW-GH'],
            'Jwaneng': ['BW-JW'],
            'Kgalagadi': ['BW-KG'],
            'Kgatleng': ['BW-KL'],
            'Kweneng': ['BW-KW'],
            'Lobatse': ['BW-LO'],
            'North East': ['BW-NE'],
            'North West': ['BW-NW'],
            'Selibe Phikwe': ['BW-SP'],
            'South East': ['BW-SE'],
            'Southern': ['BW-SO'],
            'Sowa Town': ['BW-ST']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    NAM: {
        nom: 'Namibie',
        emprises: [
            { latitude: { min: -28.96, max: -16.95 }, longitude: { min: 11.71, max: 25.26 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:NA (14 régions)
        regions: {
            'Erongo': ['NA-ER'],
            'Hardap': ['NA-HA'],
            '//Karas': ['NA-KA', 'Karas', 'ǁKaras'],
            'Kavango East': ['NA-KE'],
            'Kavango West': ['NA-KW'],
            'Khomas': ['NA-KH'],
            'Kunene': ['NA-KU'],
            'Ohangwena': ['NA-OW'],
            'Omaheke': ['NA-OH'],
            'Omusati': ['NA-OS'],
            'Oshana': ['NA-ON'],
            'Oshikoto': ['NA-OT'],
            'Otjozondjupa': ['NA-OD'],
            'Zambezi': ['NA-CA', 'Caprivi']
        },
        // Pas de format de code postal confirmé : valeur gardée sans contrôle
        codePostal: null,
        zonesCanada: false
    },
    ZAF: {
        nom: 'Afrique du Sud',
        // Continent, îles du Prince-Édouard
        emprises: [
            { latitude: { min: -34.83, max: -22.12 }, longitude: { min: 16.46, max: 32.9 } },
            { latitude: { min: -46.97, max: -46.59 }, longitude: { min: 37.57, max: 37.98 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:ZA (9 provinces) ; le Lesotho est un trou dans le contour
        regions: {
            'Eastern Cape': ['ZA-EC'],
            'Free State': ['ZA-FS'],
            'Gauteng': ['ZA-GP'],
            'KwaZulu-Natal': ['ZA-KZN'],
            'Limpopo': ['ZA-LP'],
            'Mpumalanga': ['ZA-MP'],
            'North West': ['ZA-NW', 'North-West'],
            'Northern Cape': ['ZA-NC'],
            'Western Cape': ['ZA-WC']
        },
        // Code postal : 4 chiffres (source UPU)
        codePostal: cp => /^\d{4}$/.test(cp),
        zonesCanada: false
    },
    LSO: {
        nom: 'Lesotho',
        emprises: [
            { latitude: { min: -30.66, max: -28.57 }, longitude: { min: 27.0, max: 29.44 } }
        ],
        libelleRegion: 'District',
        libelleRegions: 'Districts',
        colonneRegion: 'district',
        // Codes ISO 3166-2:LS (10 districts)
        regions: {
            'Berea': ['LS-D'],
            'Botha-Bothe': ['LS-B', 'Butha-Buthe'],
            'Leribe': ['LS-C'],
            'Mafeteng': ['LS-E'],
            'Maseru': ['LS-A'],
            'Mohale\'s Hoek': ['LS-F'],
            'Mokhotlong': ['LS-J'],
            'Qacha\'s Nek': ['LS-H'],
            'Quthing': ['LS-G'],
            'Thaba-Tseka': ['LS-K']
        },
        // Code postal : 3 chiffres (ex : 100 Maseru, source UPU)
        codePostal: cp => /^\d{3}$/.test(cp),
        zonesCanada: false
    },
    SWZ: {
        nom: 'Eswatini',
        emprises: [
            { latitude: { min: -27.32, max: -25.73 }, longitude: { min: 30.78, max: 32.12 } }
        ],
        libelleRegion: 'Région',
        libelleRegions: 'Régions',
        colonneRegion: 'region',
        // Codes ISO 3166-2:SZ (4 régions)
        regions: {
            'Hhohho': ['SZ-HH'],
            'Lubombo': ['SZ-LU'],
            'Manzini': ['SZ-MA'],
            'Shiselweni': ['SZ-SH']
        },
        // Code postal : lettre de la région (H, L, M, S) + 3 chiffres
        codePostal: cp => /^[HLMS]\d{3}$/.test(cp),
        zonesCanada: false
    },
    MDG: {
        nom: 'Madagascar',
        emprises: [
            { latitude: { min: -25.6, max: -11.94 }, longitude: { min: 43.22, max: 50.51 } }
        ],
        libelleRegion: 'Province',
        libelleRegions: 'Provinces',
        colonneRegion: 'province',
        // Codes ISO 3166-2:MG (6 anciennes provinces ; les 23 régions actuelles n'y figurent pas)
        regions: {
            'Antananarivo': ['MG-T'],
            'Antsiranana': ['MG-D'],
            'Fianarantsoa': ['MG-F'],
            'Mahajanga': ['MG-M'],
            'Toamasina': ['MG-A'],
            'Toliara': ['MG-U']
        },
        // Code postal : 3 chiffres (ex : 101 Antananarivo)
        codePostal: cp => /^\d{3}$/.test(cp),
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

// Pays qui contient le plus de points (Canada par défaut).
// 1) Candidats : pays dont l'emprise contient au moins un point
// 2) S'il y en a plusieurs, on compte les points dans leur contour réel (ex : la Gambie,
//    enclavée dans l'emprise du Sénégal). À égalité, le pays à la plus petite emprise
//    (ex : France métropolitaine plutôt qu'avec outre-mer)
async function suggererPays(points) {
    const candidats = Object.keys(PAYS).filter(iso => points.some(([lon, lat]) => dansEmprise(PAYS[iso], lon, lat)));
    if (candidats.length === 0) return 'CAN';
    if (candidats.length === 1) return candidats[0];

    let meilleur = candidats[0], max = -1;
    for (const iso of candidats) {
        await chargerContour(iso);
        const n = points.filter(([lon, lat]) => dansEmprise(PAYS[iso], lon, lat) && dansLePays(lon, lat, iso)).length;
        if (n > max || (n === max && surfaceEmprises(PAYS[iso]) < surfaceEmprises(PAYS[meilleur]))) {
            max = n;
            meilleur = iso;
        }
    }
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
function dansLePays(lon, lat, iso = AppState.pays) {
    const c = contoursCharges[iso];
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
