/**
 * GeoValidator - Gestion de l'Interface
 * Fichier: js/ui.js
 */

// Éléments du DOM
const UI = {
    // Sections
    sectionImport: document.getElementById('sectionImport'),
    sectionPreview: document.getElementById('sectionPreview'),
    sectionResults: document.getElementById('sectionResults'),
    
    // Import
    inputFile: document.getElementById('inputFile'),
    dropZone: document.getElementById('dropZone'),
    
    // Preview
    loadedFileIcon: document.getElementById('loadedFileIcon'),
    loadedFileName: document.getElementById('loadedFileName'),
    loadedFileMeta: document.getElementById('loadedFileMeta'),
    btnChangerFichier: document.getElementById('btnChangerFichier'),
    detectedTags: document.getElementById('detectedTags'),
    previewTable: document.getElementById('previewTable'),
    previewCount: document.getElementById('previewCount'),
    btnAnalyser: document.getElementById('btnAnalyser'),
    analyzeMessage: document.getElementById('analyzeMessage'),
    progressBox: document.getElementById('progressBox'),
    progressText: document.getElementById('progressText'),
    progressPercent: document.getElementById('progressPercent'),
    progressFill: document.getElementById('progressFill'),
    
    // Results
    statTotal: document.getElementById('statTotal'),
    statValid: document.getElementById('statValid'),
    statInvalid: document.getElementById('statInvalid'),
    validPercent: document.getElementById('validPercent'),
    invalidPercent: document.getElementById('invalidPercent'),
    tabContent: document.getElementById('tabContent'),
    mapPts: document.getElementById('mapPts'),
    btnNouvelleAnalyse: document.getElementById('btnNouvelleAnalyse')
};

// Afficher la section import (état initial)
function showImportSection() {
    UI.sectionImport.classList.remove('hidden');
    UI.sectionPreview.classList.add('hidden');
    UI.sectionResults.classList.add('hidden');
}

// Afficher la section aperçu (après chargement fichier)
function showPreviewSection() {
    UI.sectionImport.classList.add('hidden');
    UI.sectionPreview.classList.remove('hidden');
    UI.sectionResults.classList.add('hidden');
}

// Afficher la section résultats (après analyse)
function showResultsSection() {
    UI.sectionImport.classList.add('hidden');
    UI.sectionPreview.classList.add('hidden');
    UI.sectionResults.classList.remove('hidden');
}

// Afficher les infos du fichier chargé
function displayFileInfo(file, format, rowCount) {
    UI.loadedFileIcon.textContent = FORMATS_ENTREE[format]?.icone || format.toUpperCase();
    UI.loadedFileName.textContent = file.name;
    UI.loadedFileMeta.textContent = `${rowCount} lignes • ${formatFileSize(file.size)}`;
}

// Afficher les colonnes détectées
function displayDetectedColumns(detected) {
    UI.detectedTags.innerHTML = '';
    
    // v1.2 : fichier avec géométries → types de géométrie et projection
    if (AppState.projection) {
        const p = AppState.projection;
        const geomTag = document.createElement('span');
        geomTag.className = 'tag ok';
        geomTag.textContent = `Géométrie: ${p.types.join(', ') || 'aucune'}`;
        UI.detectedTags.appendChild(geomTag);
        
        const projTag = document.createElement('span');
        projTag.className = 'tag ok';
        const code = p.code ? `EPSG:${p.code} – ` : '';
        projTag.textContent = `Projection: ${code}${p.nom} (${p.source})` + (p.reprojete ? ' → reprojetée en WGS 84' : '');
        UI.detectedTags.appendChild(projTag);
    }
    
    // Latitude et longitude (obligatoires sauf si le fichier contient des géométries)
    if (!AppState.projection) {
        const latTag = document.createElement('span');
        latTag.className = `tag ${detected.latitude ? 'ok' : 'missing'}`;
        latTag.textContent = detected.latitude ? `Latitude: ${detected.latitude}` : 'Latitude: non détectée';
        UI.detectedTags.appendChild(latTag);
    
        // Longitude (obligatoire)
        const lonTag = document.createElement('span');
        lonTag.className = `tag ${detected.longitude ? 'ok' : 'missing'}`;
        lonTag.textContent = detected.longitude ? `Longitude: ${detected.longitude}` : 'Longitude: non détectée';
        UI.detectedTags.appendChild(lonTag);
    }
    
    // Code postal (optionnel)
    if (detected.codePostal) {
        const cpTag = document.createElement('span');
        cpTag.className = 'tag ok';
        cpTag.textContent = `Code postal: ${detected.codePostal}`;
        UI.detectedTags.appendChild(cpTag);
    }
    
    // Province (optionnel)
    if (detected.province) {
        const provTag = document.createElement('span');
        provTag.className = 'tag ok';
        provTag.textContent = `${paysActif().libelleRegion}: ${detected.province}`;
        UI.detectedTags.appendChild(provTag);
    }
}

// Afficher l'aperçu des données (10 premières lignes)
function displayPreviewTable(headers, data, detected) {
    const previewData = data.slice(0, 10);
    
    // En-têtes
    let html = '<thead><tr>';
    headers.forEach(h => {
        const isDetected = Object.values(detected).includes(h);
        html += `<th class="${isDetected ? 'detected' : ''}">${escapeHtml(h)}</th>`;
    });
    html += '</tr></thead>';
    
    // Corps
    html += '<tbody>';
    previewData.forEach(row => {
        html += '<tr>';
        headers.forEach(h => {
            html += `<td title="${escapeHtml(row[h])}">${escapeHtml(truncate(row[h], 25))}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';
    
    UI.previewTable.innerHTML = html;
    UI.previewCount.textContent = `(${Math.min(10, data.length)} sur ${data.length} lignes)`;
}

// Mettre à jour le bouton analyser
function updateAnalyzeButton(canAnalyze, message, isError = false) {
    UI.btnAnalyser.disabled = !canAnalyze;
    UI.analyzeMessage.textContent = message;
    UI.analyzeMessage.className = `analyze-message ${isError ? 'error' : 'ok'}`;
}

// Afficher/masquer la progression
function showProgress(show) {
    UI.progressBox.classList.toggle('hidden', !show);
}

function updateProgress(percent, text) {
    UI.progressFill.style.width = `${percent}%`;
    UI.progressPercent.textContent = `${percent}%`;
    UI.progressText.textContent = text;
}

// Afficher les statistiques
function displayStats(stats) {
    const total = stats.total;
    const validPct = total > 0 ? Math.round((stats.valides / total) * 100) : 0;
    const invalidPct = total > 0 ? Math.round((stats.invalides / total) * 100) : 0;
    
    animateNumber(UI.statTotal, stats.total);
    animateNumber(UI.statValid, stats.valides);
    animateNumber(UI.statInvalid, stats.invalides);
    
    UI.validPercent.textContent = `${validPct}%`;
    UI.invalidPercent.textContent = `${invalidPct}%`;
    
    // v2.0 : « Provinces » ou « Régions » selon le pays
    document.querySelector('.tab[data-tab="provinces"]').textContent = paysActif().libelleRegions;
}

// v2.0 : liste des pays, positionnée sur le pays sélectionné
function afficherChoixPays() {
    const select = document.getElementById('selectPays');
    if (select.options.length === 0) {
        Object.entries(PAYS)
            .sort((a, b) => a[1].nom.localeCompare(b[1].nom, 'fr'))
            .forEach(([iso, p]) => select.add(new Option(p.nom, iso)));
    }
    select.value = AppState.pays;
    document.getElementById('paysSuggestion').textContent =
        AppState.pays === AppState.paysSuggere ? 'Suggéré d\'après les coordonnées' : '';
    document.getElementById('headerPays').textContent = paysActif().nom;
}

// Afficher le contenu des onglets
function displayTabContent(tabName, stats) {
    let html = '';
    
    if (tabName === 'provinces') {
        const entries = Object.entries(stats.parProvince).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            html = '<p style="color: var(--gray-400); font-size: 0.8rem; text-align: center; padding: 1rem;">Aucune ${paysActif().libelleRegion.toLowerCase()} détectée dans les données.<br>Utilisez un fichier avec une colonne ${paysActif().libelleRegion.toLowerCase()} pour voir cette statistique.</p>';
        } else {
            entries.forEach(([prov, count]) => {
                const pct = stats.valides > 0 ? Math.round((count / stats.valides) * 100) : 0;
                html += `<div class="stat-item"><span class="stat-item-label">${prov}</span><span class="stat-item-value">${count} <small style="color:var(--gray-400)">(${pct}%)</small></span></div>`;
            });
        }
    } else if (tabName === 'prefixes') {
        const entries = Object.entries(stats.parPrefixe).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            html = '<p style="color: var(--gray-400); font-size: 0.8rem; text-align: center; padding: 1rem;">Aucun préfixe postal détecté dans les données.<br>Utilisez un fichier avec une colonne code postal pour voir cette statistique.</p>';
        } else {
            entries.forEach(([prefix, count]) => {
                const pct = stats.valides > 0 ? Math.round((count / stats.valides) * 100) : 0;
                html += `<div class="stat-item"><span class="stat-item-label">${prefix}</span><span class="stat-item-value">${count} <small style="color:var(--gray-400)">(${pct}%)</small></span></div>`;
            });
        }
    } else if (tabName === 'zones') {
        const entries = Object.entries(stats.parZone || {}).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            html = '<p style="color: var(--gray-400); font-size: 0.8rem; text-align: center; padding: 1rem;">Aucune zone géographique calculée</p>';
        } else {
            entries.forEach(([zone, count]) => {
                const pct = stats.valides > 0 ? Math.round((count / stats.valides) * 100) : 0;
                html += `<div class="stat-item"><span class="stat-item-label">${zone}</span><span class="stat-item-value">${count} <small style="color:var(--gray-400)">(${pct}%)</small></span></div>`;
            });
        }
    } else if (tabName === 'erreurs') {
        const entries = Object.entries(stats.parErreur).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
            html = '<p style="color: var(--gray-400); font-size: 0.8rem; text-align: center; padding: 1rem;">Aucune erreur</p>';
        } else {
            entries.forEach(([err, count]) => {
                const pct = stats.invalides > 0 ? Math.round((count / stats.invalides) * 100) : 0;
                html += `<div class="stat-item"><span class="stat-item-label">${err}</span><span class="stat-item-value">${count} <small style="color:var(--gray-400)">(${pct}%)</small></span></div>`;
            });
        }
    }
    
    UI.tabContent.innerHTML = html;
}
