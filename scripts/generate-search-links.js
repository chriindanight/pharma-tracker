/**
 * Generează un fișier HTML cu link-uri de căutare pentru toate produsele
 *
 * Cum se rulează:
 * 1. cd /Users/chrisindanight/pharmacy-tracker
 * 2. node scripts/generate-search-links.js
 * 3. Deschide fișierul search-links.html în browser
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const PHARMACIES = [
  { name: 'HelpNet', searchUrl: (q) => `https://www.helpnet.ro/catalogsearch/result/?q=${q}` },
  { name: 'Dr Max', searchUrl: (q) => `https://www.drmax.ro/catalogsearch/result/?q=${q}` },
  { name: 'Farmacia Tei', searchUrl: (q) => `https://comenzi.farmaciatei.ro/cauta?q=${q}` },
  { name: 'Spring Farma', searchUrl: (q) => `https://www.springfarma.com/catalogsearch/result/?q=${q}` },
  { name: 'Catena', searchUrl: (q) => `https://www.catena.ro/cautare?q=${q}` },
  { name: 'Remedium Farm', searchUrl: (q) => `https://www.remediumfarm.ro/catalogsearch/result/?q=${q}` },
  { name: 'Biscuit Pharma', searchUrl: (q) => `https://www.biscuitpharma.ro/search?q=${q}` },
  { name: 'PFarma', searchUrl: (q) => `https://www.pfarma.ro/catalogsearch/result/?q=${q}` },
];

function main() {
  console.log('Generez fișierul cu link-uri de căutare...\n');

  const inputFile = path.join(__dirname, '..', 'skus price check.xlsx');
  const workbook = XLSX.readFile(inputFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Extrag produsele unice
  const products = new Map();
  for (let i = 1; i < data.length; i++) {
    const [categorie, produs, ean] = data[i];
    if (!ean || !produs) continue;
    const eanStr = String(ean);
    if (!products.has(eanStr)) {
      products.set(eanStr, { produs, ean: eanStr, categorie });
    }
  }

  // Generăm HTML
  let html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link-uri Căutare Farmacii</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      background: #1a1a2e;
      color: #eee;
    }
    h1 { color: #4ecca3; text-align: center; }
    .info {
      background: #16213e;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .product {
      background: #16213e;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .product-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 1px solid #333;
      padding-bottom: 10px;
    }
    .product-name { font-weight: bold; color: #4ecca3; font-size: 16px; }
    .product-ean { color: #888; font-size: 14px; }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .link {
      display: inline-block;
      padding: 8px 15px;
      background: #0f3460;
      color: #fff;
      text-decoration: none;
      border-radius: 5px;
      font-size: 13px;
      transition: background 0.2s;
    }
    .link:hover { background: #4ecca3; color: #000; }
    .link-ean { background: #533483; }
    .link-ean:hover { background: #7952b3; color: #fff; }
    .search-box {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
    .search-box input {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 5px;
      font-size: 16px;
    }
    .counter {
      text-align: center;
      color: #888;
      margin-bottom: 20px;
    }
    .copy-btn {
      background: #e94560;
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-left: 10px;
    }
    .copy-btn:hover { background: #ff6b6b; }
  </style>
</head>
<body>
  <h1>🔍 Link-uri Căutare Farmacii</h1>

  <div class="info">
    <strong>Cum să folosești:</strong><br>
    1. Click pe link-ul farmaciei dorite (se deschide în tab nou)<br>
    2. Găsește produsul pe site<br>
    3. Copiază URL-ul din browser<br>
    4. Lipește în Excel (products-template.xlsx)<br><br>
    <strong>Tip:</strong> Link-urile mov (EAN) caută după codul de bare - încearcă-le întâi!
  </div>

  <div class="search-box">
    <input type="text" id="search" placeholder="Caută produs..." onkeyup="filterProducts()">
  </div>

  <div class="counter">Total: ${products.size} produse</div>

  <div id="products">
`;

  for (const [ean, product] of products) {
    const encodedName = encodeURIComponent(product.produs);
    const encodedEan = encodeURIComponent(ean);

    html += `
    <div class="product" data-name="${product.produs.toLowerCase()}">
      <div class="product-header">
        <span class="product-name">${product.produs}</span>
        <span class="product-ean">EAN: ${ean} <button class="copy-btn" onclick="copyToClipboard('${ean}')">Copiază EAN</button></span>
      </div>
      <div class="links">
`;

    for (const pharmacy of PHARMACIES) {
      // Link cu numele produsului
      const searchByName = pharmacy.searchUrl(encodedName);
      html += `        <a href="${searchByName}" target="_blank" class="link">${pharmacy.name}</a>\n`;

      // Link cu EAN (dacă farmacia suportă)
      const searchByEan = pharmacy.searchUrl(encodedEan);
      html += `        <a href="${searchByEan}" target="_blank" class="link link-ean">${pharmacy.name} (EAN)</a>\n`;
    }

    html += `      </div>
    </div>
`;
  }

  html += `
  </div>

  <script>
    function filterProducts() {
      const search = document.getElementById('search').value.toLowerCase();
      const products = document.querySelectorAll('.product');
      let visible = 0;
      products.forEach(p => {
        const name = p.getAttribute('data-name');
        if (name.includes(search)) {
          p.style.display = 'block';
          visible++;
        } else {
          p.style.display = 'none';
        }
      });
      document.querySelector('.counter').textContent = 'Afișate: ' + visible + ' / ${products.size} produse';
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      alert('EAN copiat: ' + text);
    }
  </script>
</body>
</html>`;

  const outputFile = path.join(__dirname, '..', 'search-links.html');
  fs.writeFileSync(outputFile, html);

  console.log('✅ GATA!');
  console.log('');
  console.log('📁 Fișier creat: search-links.html');
  console.log('');
  console.log('👉 Deschide fișierul în browser:');
  console.log('   open /Users/chrisindanight/pharmacy-tracker/search-links.html');
  console.log('');
}

main();
