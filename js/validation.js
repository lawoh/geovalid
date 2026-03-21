/**
 * GéoValid Québec - Validation des Données
 * Fichier: js/validation.js
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
        
        // Valider latitude (obligatoire)
        let lat = null;
        if (!latStr) {
            erreurs.push('Latitude manquante');
        } else {
            lat = parseFloat(latStr);
            if (isNaN(lat)) {
                erreurs.push('Latitude non numérique');
            } else if (lat < LIMITES_CANADA.latitude.min || lat > LIMITES_CANADA.latitude.max) {
                erreurs.push('Latitude hors Canada');
            }
        }
        
        // Valider longitude (obligatoire)
        let lon = null;
        if (!lonStr) {
            erreurs.push('Longitude manquante');
        } else {
            lon = parseFloat(lonStr);
            if (isNaN(lon)) {
                erreurs.push('Longitude non numérique');
            } else if (lon < LIMITES_CANADA.longitude.min || lon > LIMITES_CANADA.longitude.max) {
                erreurs.push('Longitude hors Canada');
            }
        }
        
        // Valider code postal (optionnel mais vérifié si fourni)
        let cp = '';
        if (cpStr) {
            const cpClean = cpStr.replace(/\s/g, '').toUpperCase();
            const cpValid = /^[A-Z]\d[A-Z]$/.test(cpClean) || /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cpClean);
            if (!cpValid) {
                erreurs.push('Format code postal invalide');
            } else {
                cp = cpClean;
            }
        }
        
        // Province (optionnelle, convertir code numérique en texte si nécessaire)
        let prov = provStr;
        if (prov) {
            // Si c'est un code numérique, le convertir en code texte
            if (PROVINCES_CODES_NUM[prov]) {
                prov = PROVINCES_CODES_NUM[prov];
            }
            // Vérifier que c'est un code valide
            else if (!PROVINCES_CANADA.includes(prov)) {
                // Code province invalide, on le garde mais on note
                prov = provStr; // Garder la valeur originale
            }
        }
        
        // Classer la donnée
        if (erreurs.length === 0) {
            valides.push({
                lat: lat,
                lon: lon,
                zipcode: cp,
                pr: prov
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
            
            // Stats par zone géographique (toujours disponible)
            const zone = getGeoZone(lat, lon);
            if (zone) {
                statsZones[zone] = (statsZones[zone] || 0) + 1;
            }
        } else {
            invalides.push({
                lat: latStr,
                lon: lonStr,
                zipcode: cpStr,
                pr: provStr,
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
