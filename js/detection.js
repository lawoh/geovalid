/**
 * GéoValid Québec - Détection Automatique des Colonnes
 * Fichier: js/detection.js
 * 
 * IMPORTANT: La détection se fait principalement par l'ANALYSE DES VALEURS,
 * pas par les noms de colonnes. L'utilisateur peut nommer ses colonnes comme il veut.
 */

// Détecter automatiquement les colonnes en analysant les valeurs
function detectColumns(headers, data) {
    const detected = {
        latitude: null,
        longitude: null,
        codePostal: null,
        province: null
    };
    
    // Nombre d'échantillons à analyser
    const sampleSize = Math.min(data.length, 100);
    const sampleData = data.slice(0, sampleSize);
    
    // Scores pour chaque colonne
    const scores = {};
    
    headers.forEach(header => {
        const values = sampleData.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== '');
        if (values.length === 0) return;
        
        scores[header] = {
            latitude: scoreLatitude(values),
            longitude: scoreLongitude(values),
            codePostal: scoreCodePostal(values),
            province: scoreProvince(values)
        };
    });
    
    // Trouver la meilleure colonne pour latitude
    let bestLatScore = 0;
    headers.forEach(h => {
        if (scores[h] && scores[h].latitude > bestLatScore) {
            bestLatScore = scores[h].latitude;
            detected.latitude = h;
        }
    });
    
    // Trouver la meilleure colonne pour longitude (différente de latitude)
    let bestLonScore = 0;
    headers.forEach(h => {
        if (h !== detected.latitude && scores[h] && scores[h].longitude > bestLonScore) {
            bestLonScore = scores[h].longitude;
            detected.longitude = h;
        }
    });
    
    // Trouver la meilleure colonne pour code postal
    let bestCPScore = 0;
    headers.forEach(h => {
        if (h !== detected.latitude && h !== detected.longitude && scores[h] && scores[h].codePostal > bestCPScore) {
            bestCPScore = scores[h].codePostal;
            detected.codePostal = h;
        }
    });
    
    // Trouver la meilleure colonne pour province
    let bestProvScore = 0;
    headers.forEach(h => {
        if (h !== detected.latitude && h !== detected.longitude && h !== detected.codePostal && scores[h] && scores[h].province > bestProvScore) {
            bestProvScore = scores[h].province;
            detected.province = h;
        }
    });
    
    // Seuils minimums pour validation
    if (bestLatScore < 0.5) detected.latitude = null;
    if (bestLonScore < 0.5) detected.longitude = null;
    if (bestCPScore < 0.15) detected.codePostal = null;
    if (bestProvScore < 0.3) detected.province = null;
    
    // Secours: si une colonne n'est pas détectée par les valeurs,
    // essayer de la détecter par le nom de la colonne (fallback)
    if (!detected.codePostal) {
        const cpNames = ['zipcode', 'zip_code', 'zip', 'postal_code', 'postalcode', 'code_postal', 'codepostal', 'cp', 'postcode'];
        for (const h of headers) {
            if (h === detected.latitude || h === detected.longitude || h === detected.province) continue;
            if (cpNames.includes(h.toLowerCase().replace(/[\s-]/g, ''))) {
                detected.codePostal = h;
                break;
            }
        }
    }
    
    if (!detected.province) {
        const provNames = ['province', 'prov', 'pr', 'state', 'region', 'pruid'];
        for (const h of headers) {
            if (h === detected.latitude || h === detected.longitude || h === detected.codePostal) continue;
            if (provNames.includes(h.toLowerCase().replace(/[\s-]/g, ''))) {
                detected.province = h;
                break;
            }
        }
    }
    
    return detected;
}

// Score pour latitude: valeurs entre -90 et 90, bonus pour plage Canada (40-85)
function scoreLatitude(values) {
    let validCount = 0;
    let canadaCount = 0;
    
    values.forEach(val => {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= -90 && num <= 90) {
            validCount++;
            // Plage typique du Canada
            if (num >= 40 && num <= 85) {
                canadaCount++;
            }
        }
    });
    
    if (values.length === 0) return 0;
    
    const validRatio = validCount / values.length;
    const canadaRatio = canadaCount / values.length;
    
    // Score: validité * 0.5 + bonus Canada * 0.5
    return validRatio * 0.5 + canadaRatio * 0.5;
}

// Score pour longitude: valeurs entre -180 et 180, bonus pour plage Canada (-145 à -50)
function scoreLongitude(values) {
    let validCount = 0;
    let canadaCount = 0;
    
    values.forEach(val => {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= -180 && num <= 180) {
            validCount++;
            // Plage typique du Canada (longitudes négatives ouest)
            if (num >= -145 && num <= -50) {
                canadaCount++;
            }
        }
    });
    
    if (values.length === 0) return 0;
    
    const validRatio = validCount / values.length;
    const canadaRatio = canadaCount / values.length;
    
    return validRatio * 0.5 + canadaRatio * 0.5;
}

// Score pour code postal canadien: format A1A ou A1A1A1
// Reconnaît aussi les formats proches (invalides mais ressemblants) pour mieux détecter la colonne
function scoreCodePostal(values) {
    const patternStrict3 = /^[A-Za-z]\d[A-Za-z]$/;
    const patternStrict6 = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
    // Patterns plus souples: chaînes alphanumériques de 3-7 chars commençant par une lettre
    // avec alternance lettres/chiffres typique des codes postaux
    const patternLoose = /^[A-Za-z]{1,2}\d[A-Za-z]\d?[A-Za-z]?\d?$/;
    
    let strictCount = 0;
    let looseCount = 0;
    
    values.forEach(val => {
        const clean = String(val).trim().replace(/\s/g, '');
        if (patternStrict3.test(clean) || patternStrict6.test(clean)) {
            strictCount++;
            looseCount++;
        } else if (patternLoose.test(clean)) {
            looseCount++;
        }
    });
    
    if (values.length === 0) return 0;
    
    // Score combiné: les matches stricts comptent pleinement, les loose à moitié
    const strictRatio = strictCount / values.length;
    const looseRatio = looseCount / values.length;
    
    return strictRatio * 0.6 + looseRatio * 0.4;
}

// Score pour province canadienne: codes 2 lettres OU codes numériques
function scoreProvince(values) {
    let validCount = 0;
    
    values.forEach(val => {
        const clean = String(val).trim().toUpperCase();
        // Vérifier code texte (AB, QC, ON, etc.)
        if (PROVINCES_CANADA.includes(clean)) {
            validCount++;
        }
        // Vérifier code numérique (10, 11, 12, 13, 24, 35, 46, 47, 48, 59, 60, 61, 62)
        else if (PROVINCES_CODES_NUM_LIST.includes(clean)) {
            validCount++;
        }
    });
    
    return values.length > 0 ? validCount / values.length : 0;
}
