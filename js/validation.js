/**
 * GeoValidator - Validation des Données
 * Fichier: js/validation.js
 * 
 * v1.1: Support des coordonnées DMS (Degrés Minutes Secondes)
 * v1.2: Validation des géométries (lignes, polygones, multi-géométries)
 * v2.0: Validation selon le pays sélectionné (emprise, contour réel, régions, code postal)
 */

// Valider toutes les données
function validateData(data, colonnesDetectees) {
    const valides = [];
    const invalides = [];
    const statsProvinces = {};
    const statsPrefixes = {};
    const statsErreurs = {};
    const statsZones = {};
    
    data.forEach(row => {
        const erreurs = [];
        
        // Extraire les valeurs selon les colonnes détectées
        const latStr = colonnesDetectees.latitude ? String(row[colonnesDetectees.latitude] || '').trim() : '';
        const lonStr = colonnesDetectees.longitude ? String(row[colonnesDetectees.longitude] || '').trim() : '';
        const cpStr = colonnesDetectees.codePostal ? String(row[colonnesDetectees.codePostal] || '').trim() : '';
        const provStr = colonnesDetectees.province ? String(row[colonnesDetectees.province] || '').trim().toUpperCase() : '';
        
        // v1.2 : fichier avec géométries (points, lignes, polygones, multi)
        const geom = row._geom_;
        let lat = null;
        let lon = null;
        if (geom !== undefined) {
            validerGeometrie(geom).forEach(e => erreurs.push(e));
            if (geom && erreurs.length === 0) {
                [lon, lat] = pointRepresentatif(geom);
            }
        }
        
        // Valider latitude (obligatoire) - v1.1: support DMS
        else if (!latStr) {
            erreurs.push('Latitude manquante');
        } else {
            lat = parseCoordinate(latStr); // Supporte DD et DMS
            if (isNaN(lat)) {
                erreurs.push('Latitude invalide (format non reconnu)');
            }
        }
        
        // Valider longitude (obligatoire) - v1.1: support DMS
        if (geom !== undefined) {
            // déjà validée avec la géométrie
        } else if (!lonStr) {
            erreurs.push('Longitude manquante');
        } else {
            lon = parseCoordinate(lonStr); // Supporte DD et DMS
            if (isNaN(lon)) {
                erreurs.push('Longitude invalide (format non reconnu)');
            }
        }
        
        // v2.0 : emprise et contour réel du pays sélectionné
        if (geom === undefined && erreurs.length === 0) {
            erreursPays(lon, lat).forEach(e => erreurs.push(e));
        }
        
        // Valider code postal (optionnel mais vérifié si fourni)
        let cp = '';
        if (cpStr) {
            const cpClean = cpStr.replace(/\s/g, '').toUpperCase();
            const cpValid = paysActif().codePostal(cpClean);
            if (!cpValid) {
                erreurs.push('Format code postal invalide');
            } else {
                cp = cpClean;
            }
        }
        
        // Province / région (optionnelle) : code, numéro ou nom ramené à la valeur de référence du pays
        const region = provStr ? trouverRegion(provStr, paysActif()) : null;
        let prov = region || provStr;
        
        // Classer la donnée
        if (erreurs.length === 0) {
            valides.push({
                lat: lat,
                lon: lon,
                zipcode: cp,
                pr: prov,
                geom: geom
            });
            
            // Stats par province
            if (prov) {
                statsProvinces[prov] = (statsProvinces[prov] || 0) + 1;
            }
            
            // Stats par préfixe postal
            if (cp && cp.length >= 3) {
                const prefix = cp.substring(0, 3);
                statsPrefixes[prefix] = (statsPrefixes[prefix] || 0) + 1;
            }
            
            // Stats par zone géographique
            const zone = paysActif().zonesCanada ? getGeoZone(lat, lon) : null;
            if (zone) {
                statsZones[zone] = (statsZones[zone] || 0) + 1;
            }
        } else {
            invalides.push({
                lat: latStr,
                lon: lonStr,
                zipcode: cpStr,
                pr: provStr,
                geom: geom,
                erreurs: erreurs.join('; ')
            });
            
            // Stats erreurs
            erreurs.forEach(err => {
                statsErreurs[err] = (statsErreurs[err] || 0) + 1;
            });
        }
    });
    
    return {
        valides,
        invalides,
        statistiques: {
            total: data.length,
            valides: valides.length,
            invalides: invalides.length,
            parProvince: statsProvinces,
            parPrefixe: statsPrefixes,
            parErreur: statsErreurs,
            parZone: statsZones
        }
    };
}

// Déterminer la zone géographique approximative à partir des coordonnées
function getGeoZone(lat, lon) {
    if (lat === null || lon === null) return null;
    
    // Zones basées sur les régions géographiques du Canada
    if (lat >= 60) return 'Nord (>60°N)';
    if (lat >= 54) {
        if (lon < -120) return 'Nord-Ouest';
        if (lon < -90) return 'Prairies Nord';
        if (lon < -70) return 'Nord ontarien/québécois';
        return 'Nord-Est';
    }
    if (lat >= 48) {
        if (lon < -120) return 'Colombie-Brit.';
        if (lon < -100) return 'Prairies';
        if (lon < -75) return 'Centre (ON/QC)';
        return 'Atlantique';
    }
    // Sud du Canada (< 48°N)
    if (lon < -120) return 'Sud C.-B.';
    if (lon < -100) return 'Sud Prairies';
    if (lon < -75) return 'Sud ON/QC';
    return 'Sud Atlantique';
}
