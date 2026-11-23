/**
 * GeoValidator - Utilitaires
 * Fichier: js/utils.js
 */

// Formater la taille d'un fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Ko';
    const k = 1024;
    const sizes = ['octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Échapper le HTML
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Tronquer un texte
function truncate(text, maxLen) {
    if (!text) return '';
    const str = String(text);
    return str.length <= maxLen ? str : str.substring(0, maxLen - 2) + '…';
}

// Pause asynchrone
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Notification
function showNotification(message, type = 'info') {
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">×</button>`;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notif.remove(), 300);
        }
    }, 4000);
}

// Animer un nombre
function animateNumber(element, targetValue, duration = 500) {
    const start = parseInt(element.textContent) || 0;
    const range = targetValue - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(start + range * easeProgress);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Parser une ligne CSV (gère les guillemets)
function parseCSVLine(line, separator) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            const suite = line.slice(i + 1).trimStart();
            if (inQuotes && line[i + 1] === '"') {
                // Guillemet doublé "" dans un champ entre guillemets
                current += '"';
                i++;
            } else if (!inQuotes && current.trim() === '') {
                // Guillemet en début de champ : ouverture
                inQuotes = true;
            } else if (inQuotes && (suite === '' || suite[0] === separator)) {
                // Guillemet suivi d'un séparateur ou de la fin de ligne : fermeture
                inQuotes = false;
            } else {
                // Guillemet dans une valeur (ex: secondes DMS 45°30'15"N)
                current += '"';
            }
        } else if (char === separator && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// downloadFile est définie dans export.js (version avec BOM UTF-8)

// Fonctions utilitaires pour éviter le stack overflow avec Math.min/max sur de grands tableaux
// (le spread operator ...array peut dépasser la taille maximale de la call stack)
function safeMin(arr) {
    let min = Infinity;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] < min) min = arr[i];
    }
    return min;
}

function safeMax(arr) {
    let max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > max) max = arr[i];
    }
    return max;
}

// ============================================
// SUPPORT DMS (Degrés Minutes Secondes) - v1.1
// ============================================

// Patterns pour détecter les coordonnées DMS
const DMS_PATTERNS = [
    // 45°30'15"N ou 45°30'15.5"N
    /^([NSEW]?)\s*(-?\d+)[°d]\s*(\d+)[′']\s*(\d+(?:\.\d+)?)[″"]\s*([NSEW]?)$/i,
    // 45° 30' 15" N (avec espaces)
    /^([NSEW]?)\s*(-?\d+)\s*°\s*(\d+)\s*[′']\s*(\d+(?:\.\d+)?)\s*[″"]\s*([NSEW]?)$/i,
    // 45 30 15 N (espaces comme séparateurs)
    /^([NSEW]?)\s*(-?\d+)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*([NSEW]?)$/i,
    // 45-30-15-N (tirets comme séparateurs)
    /^([NSEW]?)\s*(-?\d+)-(\d+)-(\d+(?:\.\d+)?)-?([NSEW]?)$/i,
    // 45d30m15s ou 45d30m15.5sN
    /^([NSEW]?)\s*(-?\d+)d\s*(\d+)m\s*(\d+(?:\.\d+)?)s\s*([NSEW]?)$/i,
    // Format sans secondes: 45°30'N ou 45°30.5'N
    /^([NSEW]?)\s*(-?\d+)[°d]\s*(\d+(?:\.\d+)?)[′']\s*([NSEW]?)$/i,
    // Format sans secondes avec espaces: 45 30.5 N
    /^([NSEW]?)\s*(-?\d+)\s+(\d+(?:\.\d+)?)\s*([NSEW]?)$/i
];

// Vérifier si une valeur est en format DMS
function isDMSFormat(value) {
    if (!value) return false;
    const str = String(value).trim();
    
    // Si c'est un nombre décimal simple, ce n'est pas DMS
    if (/^-?\d+\.?\d*$/.test(str)) return false;
    
    // Tester les patterns DMS
    for (const pattern of DMS_PATTERNS) {
        if (pattern.test(str)) return true;
    }
    return false;
}

// Convertir DMS en degrés décimaux
function dmsToDecimal(value) {
    if (!value) return NaN;
    const str = String(value).trim();
    
    // Si c'est déjà un nombre décimal, le retourner directement
    if (/^-?\d+\.?\d*$/.test(str)) {
        return parseFloat(str);
    }
    
    let degrees = 0, minutes = 0, seconds = 0;
    let direction = '';
    let matched = false;
    
    // Tester chaque pattern
    for (const pattern of DMS_PATTERNS) {
        const match = str.match(pattern);
        if (match) {
            // Patterns avec secondes (index: dir1, deg, min, sec, dir2)
            if (match.length === 6) {
                direction = (match[1] || match[5] || '').toUpperCase();
                degrees = parseFloat(match[2]);
                minutes = parseFloat(match[3]);
                seconds = parseFloat(match[4]);
                matched = true;
                break;
            }
            // Patterns sans secondes (index: dir1, deg, min, dir2)
            else if (match.length === 5) {
                direction = (match[1] || match[4] || '').toUpperCase();
                degrees = parseFloat(match[2]);
                minutes = parseFloat(match[3]);
                seconds = 0;
                matched = true;
                break;
            }
        }
    }
    
    if (!matched) return NaN;
    
    // Calculer les degrés décimaux
    let decimal = Math.abs(degrees) + (minutes / 60) + (seconds / 3600);
    
    // Appliquer le signe selon la direction ou le signe original
    if (direction === 'S' || direction === 'W' || degrees < 0) {
        decimal = -decimal;
    }
    
    return decimal;
}

// Convertir une coordonnée (DD ou DMS) en degrés décimaux
function parseCoordinate(value) {
    if (!value) return NaN;
    const str = String(value).trim();
    
    // Essayer d'abord comme nombre décimal
    const decimal = parseFloat(str);
    if (!isNaN(decimal) && /^-?\d+\.?\d*$/.test(str)) {
        return decimal;
    }
    
    // Sinon essayer comme DMS
    return dmsToDecimal(str);
}

// Détecter le format de coordonnées dans un tableau de valeurs
function detectCoordinateFormat(values) {
    let ddCount = 0;
    let dmsCount = 0;
    
    values.forEach(val => {
        if (!val) return;
        const str = String(val).trim();
        if (/^-?\d+\.?\d*$/.test(str)) {
            ddCount++;
        } else if (isDMSFormat(str)) {
            dmsCount++;
        }
    });
    
    if (dmsCount > ddCount) return 'DMS';
    if (ddCount > 0) return 'DD';
    return 'unknown';
}
