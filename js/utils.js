/**
 * GéoValid Québec - Utilitaires
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
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
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
