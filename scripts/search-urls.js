/**
 * Script pentru căutarea automată a URL-urilor produselor pe farmacii
 *
 * Cum se rulează:
 * 1. Deschide Terminal
 * 2. cd /Users/chrisindanight/pharmacy-tracker
 * 3. node scripts/search-urls.js
 *
 * Scriptul va genera fișierul: products-with-urls.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configurare farmacii
const PHARMACIES = [
  { name: 'Dr Max', domain: 'drmax.ro', searchPrefix: 'site:drmax.ro' },
  { name: 'Farmacia Tei', domain: 'comenzi.farmaciatei.ro', searchPrefix: 'site:comenzi.farmaciatei.ro' },
  { name: 'HelpNet', domain: 'helpnet.ro', searchPrefix: 'site:helpnet.ro' },
  { name: 'Spring Farma', domain: 'springfarma.com', searchPrefix: 'site:springfarma.com' },
];

// Delay între request-uri (pentru a nu fi blocat)
const DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Funcție pentru căutare Google (folosind API-ul gratuit)
async function searchGoogle(query) {
  try {
    // Folosim un endpoint de search simplu
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.google.com/search?q=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      }
    });

    const html = await response.text();
    return html;
  } catch (error) {
    console.error(`Eroare la căutare: ${error.message}`);
    return null;
  }
}

// Extrage URL-ul din rezultatele Google
function extractUrlFromResults(html, domain) {
  if (!html) return null;

  // Căutăm URL-uri care conțin domeniul
  const urlRegex = new RegExp(`https?://[^"\\s]*${domain.replace('.', '\\.')}[^"\\s]*`, 'gi');
  const matches = html.match(urlRegex);

  if (matches && matches.length > 0) {
    // Filtrăm URL-urile care par a fi pagini de produs
    for (const match of matches) {
      // Excludem paginile de căutare, categorii, etc.
      if (match.includes('/search') ||
          match.includes('/catalogsearch') ||
          match.includes('/category') ||
          match.includes('?q=')) {
        continue;
      }
      // Curățăm URL-ul
      const cleanUrl = match.replace(/&amp;/g, '&').split('&')[0];
      return cleanUrl;
    }
    // Dacă nu am găsit unul bun, returnăm primul
    return matches[0].replace(/&amp;/g, '&').split('&')[0];
  }

  return null;
}

// Funcție alternativă: construiește URL direct din pattern-uri cunoscute
function buildDirectUrl(productName, pharmacy) {
  const slug = productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);

  switch (pharmacy.domain) {
    case 'drmax.ro':
      return `https://www.drmax.ro/${slug}`;
    case 'helpnet.ro':
      return `https://www.helpnet.ro/${slug}`;
    case 'springfarma.com':
      return `https://www.springfarma.com/${slug}.html`;
    default:
      return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  CĂUTARE AUTOMATĂ URL-URI FARMACII');
  console.log('='.repeat(60));
  console.log('');

  // Citește fișierul Excel existent
  const inputFile = path.join(__dirname, '..', 'skus price check.xlsx');

  if (!fs.existsSync(inputFile)) {
    console.error('❌ Nu găsesc fișierul: skus price check.xlsx');
    console.log('   Asigură-te că fișierul este în folderul pharmacy-tracker');
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
      const farmacieNormalized = farmacie.trim();
      products.get(eanStr).urls[farmacieNormalized] = url;
    }
  }

  console.log(`📦 Am găsit ${products.size} produse unice`);
  console.log('');

  // Pentru fiecare produs, căutăm URL-uri lipsă
  let processed = 0;
  const total = products.size;

  for (const [ean, product] of products) {
    processed++;
    console.log(`\n[${processed}/${total}] ${product.produs}`);

    for (const pharmacy of PHARMACIES) {
      // Verificăm dacă avem deja URL pentru această farmacie
      const existingUrl = Object.entries(product.urls).find(
        ([key]) => key.toLowerCase().includes(pharmacy.name.toLowerCase().split(' ')[0])
      );

      if (existingUrl) {
        console.log(`  ✓ ${pharmacy.name}: deja există`);
        // Normalizăm numele farmaciei
        product.urls[pharmacy.name] = existingUrl[1];
        continue;
      }

      // Construim URL direct din numele produsului (mai rapid)
      const directUrl = buildDirectUrl(product.produs, pharmacy);
      if (directUrl) {
        product.urls[pharmacy.name] = directUrl;
        console.log(`  → ${pharmacy.name}: ${directUrl.substring(0, 60)}...`);
      } else {
        product.urls[pharmacy.name] = 'N/A';
        console.log(`  ✗ ${pharmacy.name}: N/A`);
      }

      // Mic delay pentru a nu supraîncărca
      await sleep(100);
    }
  }

  // Generăm noul Excel
  console.log('\n' + '='.repeat(60));
  console.log('📝 Generez fișierul Excel...');

  // Creăm datele pentru Excel
  const headers = ['Categorie', 'Produs', 'EAN', ...PHARMACIES.map(p => p.name)];
  const rows = [headers];

  for (const [ean, product] of products) {
    const row = [
      product.categorie,
      product.produs,
      product.ean,
      ...PHARMACIES.map(p => product.urls[p.name] || 'N/A')
    ];
    rows.push(row);
  }

  // Creăm workbook-ul
  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.aoa_to_sheet(rows);

  // Setăm lățimea coloanelor
  newSheet['!cols'] = [
    { wch: 15 },  // Categorie
    { wch: 40 },  // Produs
    { wch: 15 },  // EAN
    { wch: 60 },  // Dr Max
    { wch: 60 },  // Farmacia Tei
    { wch: 60 },  // HelpNet
    { wch: 60 },  // Spring Farma
  ];

  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Produse');

  // Salvăm fișierul
  const outputFile = path.join(__dirname, '..', 'products-with-urls.xlsx');
  XLSX.writeFile(newWorkbook, outputFile);

  console.log('');
  console.log('✅ GATA!');
  console.log(`📁 Fișierul a fost salvat: products-with-urls.xlsx`);
  console.log('');
  console.log('⚠️  IMPORTANT: Verifică URL-urile generate!');
  console.log('   Unele pot fi incorecte și trebuie corectate manual.');
  console.log('');
}

main().catch(console.error);
