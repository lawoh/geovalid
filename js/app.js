/**
 * GéoValid Québec - Application Principale
 * Fichier: js/app.js
 * Orchestration et gestion des événements
 */

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', init);

function init() {
    // État initial : seulement header + zone import visible
    showImportSection();
    
    // Event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Zone de dépôt de fichier
    UI.dropZone.addEventListener('click', () => UI.inputFile.click());
    
    UI.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        UI.dropZone.classList.add('drag-over');
    });
    
    UI.dropZone.addEventListener('dragleave', () => {
        UI.dropZone.classList.remove('drag-over');
    });
    
    UI.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        UI.dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // Input file
    UI.inputFile.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // Bouton changer de fichier
    UI.btnChangerFichier.addEventListener('click', () => {
        resetAppState();
        showImportSection();
        UI.inputFile.value = '';
    });
    
    // Bouton analyser
    UI.btnAnalyser.addEventListener('click', runAnalysis);
    
    // Onglets statistiques
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            displayTabContent(tab.dataset.tab, AppState.statistiques);
        });
    });
    
    // Changement de fond de carte
    UI.mapLayerSelect.addEventListener('change', (e) => {
        changeMapLayer(e.target.value);
    });
    
    // Boutons export
    document.querySelectorAll('.btn-export').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await exportData(btn.dataset.type, btn.dataset.format);
            } catch (error) {
                console.error('Erreur export:', error);
                showNotification(`Erreur d'export: ${error.message}`, 'error');
            }
        });
    });
    
    // Nouvelle analyse
    UI.btnNouvelleAnalyse.addEventListener('click', () => {
        resetAppState();
        showImportSection();
        UI.inputFile.value = '';
        
        if (AppState.map) {
            AppState.map.remove();
            AppState.map = null;
        }
    });
}

// Gestion du fichier sélectionné
async function handleFileSelect(file) {
    // Détecter le format
    const ext = file.name.split('.').pop().toLowerCase();
    if (!FORMATS_ENTREE[ext]) {
        showNotification(`Format non supporté: .${ext}`, 'error');
        return;
    }
    
    AppState.fichier = file;
    AppState.formatFichier = ext;
    
    showNotification('Lecture du fichier...', 'info');
    
    try {
        // Parser le fichier
        const result = await parseFile(file, ext);
        AppState.headers = result.headers;
        AppState.donneesBrutes = result.data;
        
        if (result.data.length === 0) {
            showNotification('Le fichier ne contient aucune donnée', 'error');
            return;
        }
        
        // Détecter les colonnes automatiquement par VALEURS
        AppState.colonnesDetectees = detectColumns(result.headers, result.data);
        
        // Afficher la section aperçu
        showPreviewSection();
        
        // Afficher les infos fichier
        displayFileInfo(file, ext, result.data.length);
        
        // Afficher les colonnes détectées
        displayDetectedColumns(AppState.colonnesDetectees);
        
        // Afficher l'aperçu (10 premières lignes)
        displayPreviewTable(result.headers, result.data, AppState.colonnesDetectees);
        
        // Vérifier si on peut analyser (lat + lon obligatoires)
        if (AppState.colonnesDetectees.latitude && AppState.colonnesDetectees.longitude) {
            updateAnalyzeButton(true, 'Prêt pour l\'analyse. Cliquez sur le bouton ci-dessus.');
        } else {
            let missing = [];
            if (!AppState.colonnesDetectees.latitude) missing.push('latitude');
            if (!AppState.colonnesDetectees.longitude) missing.push('longitude');
            updateAnalyzeButton(false, `Colonnes manquantes: ${missing.join(', ')}. Vérifiez vos données.`, true);
        }
        
        showNotification(`Fichier chargé: ${result.data.length} lignes`, 'success');
        
    } catch (error) {
        console.error('Erreur lecture fichier:', error);
        showNotification(`Erreur: ${error.message}`, 'error');
    }
}

// Lancer l'analyse
async function runAnalysis() {
    if (!AppState.colonnesDetectees.latitude || !AppState.colonnesDetectees.longitude) {
        showNotification('Latitude et longitude non détectées', 'error');
        return;
    }
    
    UI.btnAnalyser.disabled = true;
    showProgress(true);
    
    try {
        // Étape 1: Préparation
        updateProgress(10, 'Préparation des données...');
        await sleep(100);
        
        // Étape 2: Validation
        updateProgress(40, 'Validation des coordonnées...');
        await sleep(100);
        
        const result = validateData(AppState.donneesBrutes, AppState.colonnesDetectees);
        
        AppState.donneesValides = result.valides;
        AppState.donneesInvalides = result.invalides;
        AppState.statistiques = result.statistiques;
        
        // Étape 3: Génération de la carte
        updateProgress(70, 'Génération de la carte...');
        await sleep(100);
        
        // Afficher la section résultats
        showResultsSection();
        
        // Afficher les stats
        displayStats(result.statistiques);
        
        // Mettre à jour les compteurs d'export
        const exportValidCount = document.getElementById('exportValidCount');
        const exportInvalidCount = document.getElementById('exportInvalidCount');
        if (exportValidCount) exportValidCount.textContent = `${result.valides.length} lignes`;
        if (exportInvalidCount) exportInvalidCount.textContent = `${result.invalides.length} lignes`;
        
        // Afficher le premier onglet pertinent
        let defaultTab = 'provinces';
        if (Object.keys(result.statistiques.parProvince).length === 0) {
            defaultTab = 'zones';
        }
        // Activer visuellement le bon onglet
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === defaultTab);
        });
        displayTabContent(defaultTab, result.statistiques);
        
        // Initialiser et afficher la carte
        initMap();
        displayPointsOnMap(result.valides);
        
        updateProgress(100, 'Terminé !');
        
        showNotification(`Analyse terminée: ${result.valides.length} valides, ${result.invalides.length} invalides`, 'success');
        
        setTimeout(() => showProgress(false), 1000);
        
    } catch (error) {
        console.error('Erreur analyse:', error);
        showNotification(`Erreur: ${error.message}`, 'error');
        showProgress(false);
    }
    
    UI.btnAnalyser.disabled = false;
}
