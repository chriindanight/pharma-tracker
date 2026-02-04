/**
 * Script pentru căutarea automată a URL-urilor folosind EAN
 *
 * Acest script încearcă să găsească produsele pe fiecare farmacie
 * folosind codul de bare (EAN) și verifică dacă URL-ul există.
 *
 * Cum se rulează:
 * 1. Deschide Terminal
 * 2. cd /Users/chrisindanight/pharmacy-tracker
 * 3. node scripts/search-by-ean.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Delay între request-uri pentru a nu fi blocat
const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Verifică dacă un URL există (returnează status code)
async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.status;
  } catch (error) {
    return 0;
  }
}

// Verifică dacă pagina conține produsul (GET request)
async function checkPageContent(url, productName) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status !== 200) {
      return { valid: false, status: response.status };
    }

    const html = await response.text();

    // Verificăm dacă pagina conține informații despre produs
    // (nu e pagină de eroare sau "nu există")
    const hasProduct = !html.includes('nu a fost găsit') &&
                      !html.includes('nu am gasit') &&
                      !html.includes('no results') &&
                      !html.includes('0 rezultate') &&
                      !html.includes('Pagina nu există') &&
                      (html.includes('add-to-cart') ||
                       html.includes('adauga-in-cos') ||
                       html.includes('price') ||
                       html.includes('pret') ||
                       html.includes('Lei'));

    return { valid: hasProduct, status: response.status };
  } catch (error) {
    return { valid: false, status: 0, error: error.message };
  }
}

// Configurare farmacii cu funcții de generare URL
const PHARMACIES = [
  {
    name: 'Dr Max',
    // Dr Max: https://www.drmax.ro/SLUG
    generateUrls: (productName, ean) => {
      const slug = productName
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      return [
        `https://www.drmax.ro/${slug}`,
      ];
    }
  },
  {
    name: 'Farmacia Tei',
    // Farmacia Tei are ID-uri în URL, nu putem genera
    generateUrls: () => []
  },
  {
    name: 'HelpNet',
    // HelpNet: https://www.helpnet.ro/SLUG
    generateUrls: (productName, ean) => {
      const slug = productName
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/(\d+)\s*mg/gi, '$1mg')
        .replace(/(\d+)\s*ml/gi, '$1ml')
        .replace(/(\d+)\s*g/gi, '$1g')
        .trim();

      // Încercăm mai multe variante
      const variations = [
        slug,
        slug.replace(/-/g, ''),
        slug.replace(/capsule|caps/g, 'cps'),
        slug.replace(/comprimate|comp/g, 'cpr'),
        slug.replace(/plicuri|satch/g, 'plic'),
      ];

      return [...new Set(variations)].map(v => `https://www.helpnet.ro/${v}`);
    }
  },
  {
    name: 'Spring Farma',
    // Spring Farma: https://www.springfarma.com/SLUG.html
    generateUrls: (productName, ean) => {
      const slug = productName
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      return [
        `https://www.springfarma.com/${slug}.html`,
      ];
    }
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('  CĂUTARE URL-URI DUPĂ EAN / NUME PRODUS');
  console.log('='.repeat(60));
  console.log('');

  // Citește fișierul Excel
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

    if (farmacie && url) {
      products.get(eanStr).urls[farmacie.trim()] = url;
    }
  }

  console.log(`📦 ${products.size} produse găsite`);
  console.log('');
  console.log('🔍 Încep căutarea... (poate dura câteva minute)');
  console.log('');

  let processed = 0;
  let found = 0;
  let notFound = 0;

  for (const [ean, product] of products) {
    processed++;
    console.log(`\n[${processed}/${products.size}] ${product.produs}`);

    for (const pharmacy of PHARMACIES) {
      // Verificăm dacă avem deja URL
      const hasUrl = Object.keys(product.urls).some(
        key => key.toLowerCase().includes(pharmacy.name.toLowerCase().split(' ')[0].toLowerCase())
      );

      if (hasUrl) {
        console.log(`  ✓ ${pharmacy.name}: deja există`);
        continue;
      }

      // Generăm URL-uri posibile
      const possibleUrls = pharmacy.generateUrls(product.produs, product.ean);

      if (possibleUrls.length === 0) {
        product.urls[pharmacy.name] = 'MANUAL';
        console.log(`  ⚠ ${pharmacy.name}: necesită căutare manuală`);
        continue;
      }

      // Testăm fiecare URL
      let foundUrl = null;
      for (const url of possibleUrls) {
        await sleep(DELAY_MS);

        const result = await checkPageContent(url, product.produs);

        if (result.valid) {
          foundUrl = url;
          found++;
          break;
        }
      }

      if (foundUrl) {
        product.urls[pharmacy.name] = foundUrl;
        console.log(`  ✓ ${pharmacy.name}: GĂSIT`);
      } else {
        product.urls[pharmacy.name] = 'N/A';
        notFound++;
        console.log(`  ✗ ${pharmacy.name}: nu s-a găsit`);
      }
    }
  }

  // Generăm Excel-ul final
  console.log('\n' + '='.repeat(60));
  console.log('📝 Generez fișierul Excel...');

  const headers = ['Categorie', 'Produs', 'EAN', ...PHARMACIES.map(p => p.name)];
  const rows = [headers];

  for (const [ean, product] of products) {
    const row = [
      product.categorie,
      product.produs,
      product.ean,
    ];

    for (const pharmacy of PHARMACIES) {
      // Căutăm URL-ul pentru această farmacie
      let url = product.urls[pharmacy.name] || '';

      // Verificăm și cu numele original din fișier
      if (!url) {
        for (const [key, value] of Object.entries(product.urls)) {
          if (key.toLowerCase().includes(pharmacy.name.toLowerCase().split(' ')[0].toLowerCase())) {
            url = value;
            break;
          }
        }
      }

      row.push(url || 'N/A');
    }

    rows.push(row);
  }

  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.aoa_to_sheet(rows);
  newSheet['!cols'] = [
    { wch: 15 },
    { wch: 45 },
    { wch: 15 },
    ...PHARMACIES.map(() => ({ wch: 70 }))
  ];
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Produse');

  const outputFile = path.join(__dirname, '..', 'products-found-urls.xlsx');
  XLSX.writeFile(newWorkbook, outputFile);

  console.log('');
  console.log('✅ GATA!');
  console.log('');
  console.log(`📊 Statistici:`);
  console.log(`   URL-uri găsite automat: ${found}`);
  console.log(`   URL-uri negăsite:       ${notFound}`);
  console.log('');
  console.log(`📁 Fișier salvat: products-found-urls.xlsx`);
  console.log('');
  console.log('⚠️  IMPORTANT:');
  console.log('   - Verifică URL-urile marcate cu "N/A" sau "MANUAL"');
  console.log('   - Unele URL-uri găsite automat pot fi incorecte');
  console.log('');
}

main().catch(console.error);
