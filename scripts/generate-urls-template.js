/**
 * Script pentru generarea unui template Excel cu URL-uri sugerate
 *
 * Cum se rulează:
 * 1. Deschide Terminal
 * 2. cd /Users/chrisindanight/pharmacy-tracker
 * 3. node scripts/generate-urls-template.js
 *
 * Scriptul va genera fișierul: products-template.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configurare farmacii cu pattern-uri de URL
const PHARMACIES = [
  {
    name: 'Dr Max',
    baseUrl: 'https://www.drmax.ro/',
    searchUrl: 'https://www.drmax.ro/catalogsearch/result/?q=',
  },
  {
    name: 'Farmacia Tei',
    baseUrl: 'https://comenzi.farmaciatei.ro/',
    searchUrl: 'https://comenzi.farmaciatei.ro/cauta?q=',
  },
  {
    name: 'HelpNet',
    baseUrl: 'https://www.helpnet.ro/',
    searchUrl: 'https://www.helpnet.ro/catalogsearch/result/?q=',
  },
  {
    name: 'Spring Farma',
    baseUrl: 'https://www.springfarma.com/',
    searchUrl: 'https://www.springfarma.com/catalogsearch/result/?q=',
  },
  {
    name: 'Remedium Farm',
    baseUrl: 'https://www.remediumfarm.ro/',
    searchUrl: 'https://www.remediumfarm.ro/catalogsearch/result/?q=',
  },
  {
    name: 'Catena',
    baseUrl: 'https://www.catena.ro/',
    searchUrl: 'https://www.catena.ro/cautare?q=',
  },
  {
    name: 'Biscuit Pharma',
    baseUrl: 'https://www.biscuitpharma.ro/',
    searchUrl: 'https://www.biscuitpharma.ro/search?q=',
  },
  {
    name: 'Farmaciile DAV',
    baseUrl: 'https://www.farmaciiledav.ro/',
    searchUrl: 'https://www.farmaciiledav.ro/catalogsearch/result/?q=',
  },
  {
    name: 'DucFarm',
    baseUrl: 'https://www.ducfarm.ro/',
    searchUrl: 'https://www.ducfarm.ro/catalogsearch/result/?q=',
  },
  {
    name: 'Myosotis',
    baseUrl: 'https://www.farmaciilemyosotis.ro/',
    searchUrl: 'https://www.farmaciilemyosotis.ro/catalogsearch/result/?q=',
  },
  {
    name: 'Al Shefa',
    baseUrl: 'https://al-shefafarm.ro/',
    searchUrl: 'https://al-shefafarm.ro/?s=',
  },
  {
    name: 'PFarma',
    baseUrl: 'https://www.pfarma.ro/',
    searchUrl: 'https://www.pfarma.ro/catalogsearch/result/?q=',
  },
];

function main() {
  console.log('='.repeat(60));
  console.log('  GENERATOR TEMPLATE URL-URI FARMACII');
  console.log('='.repeat(60));
  console.log('');

  // Citește fișierul Excel existent
  const inputFile = path.join(__dirname, '..', 'skus price check.xlsx');

  if (!fs.existsSync(inputFile)) {
    console.error('❌ Nu găsesc fișierul: skus price check.xlsx');
    process.exit(1);
  }

  console.log('📖 Citesc fișierul Excel...');
  const workbook = XLSX.readFile(inputFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Extrag produsele unice
  const products = new Map();
  for (let i = 1; i < data.length; i++) {
    const [categorie, produs, ean, url, farmacie] = data[i];
    if (!ean) continue;

    const eanStr = String(ean);
    if (!products.has(eanStr)) {
      products.set(eanStr, {
        categorie: categorie || '',
        produs: produs || '',
        ean: eanStr,
        urls: {}
      });
    }

    // Salvăm URL-urile existente
    if (farmacie && url) {
      // Normalizăm numele farmaciei
      let normalizedName = farmacie.trim();
      if (normalizedName === 'Dr Max') normalizedName = 'Dr Max';
      if (normalizedName === 'Farmacia Tei') normalizedName = 'Farmacia Tei';

      products.get(eanStr).urls[normalizedName] = url;
    }
  }

  console.log(`📦 Am găsit ${products.size} produse unice`);

  // Generăm Excel-ul cu 2 sheet-uri

  // SHEET 1: Produse cu URL-uri
  const headers1 = ['Categorie', 'Produs', 'EAN', ...PHARMACIES.map(p => p.name)];
  const rows1 = [headers1];

  for (const [ean, product] of products) {
    const row = [
      product.categorie,
      product.produs,
      product.ean,
    ];

    // Pentru fiecare farmacie, punem URL-ul existent sau gol
    for (const pharmacy of PHARMACIES) {
      // Căutăm dacă avem URL existent (cu diferite variante de nume)
      let existingUrl = '';
      for (const [key, value] of Object.entries(product.urls)) {
        if (key.toLowerCase().includes(pharmacy.name.toLowerCase().split(' ')[0].toLowerCase())) {
          existingUrl = value;
          break;
        }
      }
      row.push(existingUrl);
    }

    rows1.push(row);
  }

  // SHEET 2: Link-uri de căutare (helper)
  const headers2 = ['Produs', 'EAN', ...PHARMACIES.map(p => `Caută pe ${p.name}`)];
  const rows2 = [headers2];

  for (const [ean, product] of products) {
    const searchTerm = encodeURIComponent(product.produs);
    const row = [
      product.produs,
      product.ean,
      ...PHARMACIES.map(p => p.searchUrl + searchTerm)
    ];
    rows2.push(row);
  }

  // Creăm workbook-ul
  const newWorkbook = XLSX.utils.book_new();

  // Sheet 1
  const sheet1 = XLSX.utils.aoa_to_sheet(rows1);
  sheet1['!cols'] = [
    { wch: 15 },  // Categorie
    { wch: 45 },  // Produs
    { wch: 15 },  // EAN
    ...PHARMACIES.map(() => ({ wch: 70 }))
  ];
  XLSX.utils.book_append_sheet(newWorkbook, sheet1, 'URL-uri Produse');

  // Sheet 2
  const sheet2 = XLSX.utils.aoa_to_sheet(rows2);
  sheet2['!cols'] = [
    { wch: 45 },  // Produs
    { wch: 15 },  // EAN
    ...PHARMACIES.map(() => ({ wch: 80 }))
  ];
  XLSX.utils.book_append_sheet(newWorkbook, sheet2, 'Link-uri Căutare');

  // Salvăm fișierul
  const outputFile = path.join(__dirname, '..', 'products-template.xlsx');
  XLSX.writeFile(newWorkbook, outputFile);

  console.log('');
  console.log('✅ GATA!');
  console.log('');
  console.log(`📁 Fișierul a fost salvat: products-template.xlsx`);
  console.log('');
  console.log('📋 Fișierul conține 2 sheet-uri:');
  console.log('   1. "URL-uri Produse" - Completează aici URL-urile');
  console.log('   2. "Link-uri Căutare" - Link-uri de căutare pentru fiecare farmacie');
  console.log('');
  console.log('💡 Cum să folosești:');
  console.log('   1. Deschide fișierul în Excel');
  console.log('   2. Pentru produsele fără URL, mergi la sheet-ul "Link-uri Căutare"');
  console.log('   3. Click pe link-ul de căutare pentru farmacie');
  console.log('   4. Găsește produsul și copiază URL-ul');
  console.log('   5. Lipește URL-ul în sheet-ul "URL-uri Produse"');
  console.log('');
}

main();
