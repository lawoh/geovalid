# GéoValid

Application web de validation et visualisation de données géographiques canadiennes.

Importez vos fichiers de coordonnées, validez automatiquement les données (coordonnées, codes postaux, provinces), visualisez les points sur une carte interactive et exportez les résultats dans le format de votre choix.

## Fonctionnalités

- **Détection automatique des colonnes** par analyse des valeurs
- **Validation géographique** des coordonnées, codes postaux et provinces canadiennes
- **Carte interactive** avec clustering et multiples fonds de carte
- **Statistiques** par province, préfixe postal, zone géographique et type d'erreur
- **17 formats d'entrée** — CSV, TSV, TXT, XLS, XLSX, ODS, JSON, GeoJSON, TopoJSON, XML, KML, KMZ, GML, GPX, Shapefile, DBF, WKT
- **11 formats d'export** — CSV, Excel, JSON, GeoJSON, TopoJSON, KML, GML, GPX, WKT, Shapefile (ZIP), GeoPackage

## Utilisation

Ouvrez `index.html` dans votre navigateur — aucune installation requise.

1. Glissez-déposez un fichier ou cliquez pour parcourir
2. Vérifiez la détection automatique des colonnes
3. Lancez l'analyse
4. Explorez la carte et les statistiques
5. Exportez les données valides ou invalides

## Structure

```
geovalid/
├── index.html
├── css/
├── js/
│   ├── app.js           # Orchestration
│   ├── config.js        # Configuration
│   ├── detection.js     # Détection des colonnes
│   ├── validation.js    # Validation des données
│   ├── parsers.js       # Import multi-formats
│   ├── export.js        # Export multi-formats
│   ├── map.js           # Carte Leaflet
│   └── ui.js            # Interface
├── pages/
└── exemples/
```

## Dépendances

Toutes chargées via CDN : [Leaflet](https://leafletjs.com/), [SheetJS](https://sheetjs.com/), [JSZip](https://stuk.github.io/jszip/), [jsPDF](https://github.com/parallax/jsPDF), [html2canvas](https://html2canvas.hertzen.com/), [sql.js](https://sql.js.org/), [Font Awesome](https://fontawesome.com/).
