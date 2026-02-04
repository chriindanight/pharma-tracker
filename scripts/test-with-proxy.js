/**
 * Test scraper cu proxy pentru Dr Max
 *
 * Opțiuni proxy gratuite/ieftine:
 * 1. ScraperAPI (5000 credite gratuite) - https://www.scraperapi.com
 * 2. ScrapingBee (1000 credite gratuite) - https://www.scrapingbee.com
 * 3. Bright Data (trial gratuit) - https://brightdata.com
 *
 * Pentru test, folosim ScraperAPI care oferă credite gratuite
 */

const cheerio = require('cheerio');

const DELAY_MS = 2000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// API Key pentru ScraperAPI (obții gratuit de pe site)
// Înlocuiește cu al tău de pe https://www.scraperapi.com
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';

// URL-uri pentru Imodium 2mg 6 capsule
const TEST_URLS = [
  { name: 'Farmacia Tei', url: 'https://comenzi.farmaciatei.ro/otc-new/afectiuni-digestive/antidiaretice/imodium-2mg-6-capsule-johnson-johnson-p321332', useProxy: false },
  { name: 'HelpNet', url: 'https://www.helpnet.ro/imodium-2mg-x-6cps', useProxy: false },
  { name: 'Remedium Farm', url: 'https://www.remediumfarm.ro/diaree/imodium-2mg-6-capsule-mcneil', useProxy: false },
  { name: 'Biscuit Pharma', url: 'https://www.biscuitpharma.ro/imodium-2mg-x-6-capsule-1', useProxy: false },
  { name: 'Spring Farma', url: 'https://www.springfarma.com/imodium-2-mg-6-capsule-afectiuni-digestive.html', useProxy: false },
  { name: 'Dr Max', url: 'https://www.drmax.ro/imodium-2mg-6-capsule-johnson-johnson', useProxy: true },
];

// Parser generic îmbunătățit
function parsePrice(html, $, pharmacyName) {
  let price = null;
  let isInStock = true;

  // Metoda 1: JSON-LD
  $('script[type="application/ld+json"]').each((i, el) => {
    if (price) return;
    try {
      const json = JSON.parse($(el).html());
      if (json.offers?.price) {
        price = parseFloat(json.offers.price);
        if (json.offers.availability?.includes('OutOfStock')) {
          isInStock = false;
        }
      }
      if (json['@graph']) {
        for (const item of json['@graph']) {
          if (item.offers?.price) {
            price = parseFloat(item.offers.price);
            break;
          }
        }
      }
    } catch (e) {}
  });

  // Metoda 2: meta tags
  if (!price) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                      $('meta[itemprop="price"]').attr('content');
    if (metaPrice) price = parseFloat(metaPrice);
  }

  // Metoda 3: data attributes
  if (!price) {
    const dataPrice = $('[data-price-amount]').attr('data-price-amount') ||
                      $('[data-price]').attr('data-price');
    if (dataPrice) price = parseFloat(dataPrice);
  }

  // Metoda 4: Selectori specifici per farmacie
  if (!price) {
    let selectors = [];

    if (pharmacyName === 'Remedium Farm') {
      selectors = [
        '.product-summary__info--price-gross',
        '.product-summary__info--price-box',
      ];
    } else if (pharmacyName === 'Dr Max') {
      selectors = [
        '[data-price-amount]',
        '.product-info-price .price',
        '.price-box .price',
      ];
    } else {
      selectors = [
        '.product-price .price',
        '.price-wrapper .price',
        '.special-price .price',
        '.price-box .price',
        '.current-price',
        '.product-price',
        '.price',
        'span[itemprop="price"]',
      ];
    }

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length) {
        const text = el.attr('content') || el.text().trim();
        const match = text.match(/([\d]+[.,][\d]+)/);
        if (match) {
          price = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }
    }
  }

  // Verificăm stocul
  const htmlLower = html.toLowerCase();
  if (htmlLower.includes('indisponibil') ||
      htmlLower.includes('stoc epuizat') ||
      htmlLower.includes('out of stock') ||
      htmlLower.includes('nu este disponibil') ||
      htmlLower.includes('out-of-stock')) {
    isInStock = false;
  }

  return { price, isInStock };
}

async function fetchWithProxy(url) {
  if (!SCRAPER_API_KEY) {
    throw new Error('SCRAPER_API_KEY nu este setat. Obține unul gratuit de pe https://www.scraperapi.com');
  }

  const proxyUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&country_code=ro`;

  console.log('  Folosind proxy ScraperAPI...');

  const response = await fetch(proxyUrl, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  return response;
}

async function fetchDirect(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
    },
    signal: controller.signal,
  });

  clearTimeout(timeout);
  return response;
}

async function scrapeUrl(pharmacy) {
  console.log(`\n${pharmacy.name.padEnd(20)}`);
  console.log(`URL: ${pharmacy.url}`);

  try {
    let response;

    if (pharmacy.useProxy) {
      response = await fetchWithProxy(pharmacy.url);
    } else {
      response = await fetchDirect(pharmacy.url);
    }

    console.log(`Status: ${response.status}`);

    if (response.status === 403) {
      console.log(`❌ BLOCAT (403 Forbidden)`);
      return { success: false, blocked: true };
    }

    if (response.status !== 200) {
      console.log(`❌ Eroare HTTP ${response.status}`);
      return { success: false };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const { price, isInStock } = parsePrice(html, $, pharmacy.name);

    if (price) {
      console.log(`✅ Preț: ${price} Lei ${isInStock ? '(în stoc)' : '(indisponibil)'}`);
      return { success: true, price, isInStock };
    } else {
      console.log(`⚠️  Preț negăsit - verifică manual`);

      // Debug: afișăm ce găsim
      const priceElements = $('[class*="price"]').slice(0, 3);
      priceElements.each((i, el) => {
        const text = $(el).text().trim().substring(0, 40);
        if (text) console.log(`   [${i}] ${text}`);
      });

      return { success: false, needsManualCheck: true };
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`❌ Timeout (15s)`);
    } else {
      console.log(`❌ Eroare: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  TEST SCRAPER CU PROXY - IMODIUM 2MG 6 CAPSULE');
  console.log('='.repeat(60));

  if (!SCRAPER_API_KEY) {
    console.log('\n⚠️  SCRAPER_API_KEY nu este setat!');
    console.log('   Pentru a testa Dr Max cu proxy:');
    console.log('   1. Mergi la https://www.scraperapi.com și fă cont gratuit');
    console.log('   2. Copiază API key-ul');
    console.log('   3. Rulează: SCRAPER_API_KEY=xxx node scripts/test-with-proxy.js');
    console.log('\n   Voi testa celelalte farmacii fără proxy...\n');
  }

  const results = [];

  for (const pharmacy of TEST_URLS) {
    // Sărim Dr Max dacă nu avem proxy key
    if (pharmacy.useProxy && !SCRAPER_API_KEY) {
      console.log(`\n${pharmacy.name.padEnd(20)}`);
      console.log(`⏭️  Sărit (necesită SCRAPER_API_KEY)`);
      results.push({ ...pharmacy, success: false, skipped: true });
      continue;
    }

    const result = await scrapeUrl(pharmacy);
    results.push({ ...pharmacy, ...result });
    await sleep(DELAY_MS);
  }

  // Sumar
  console.log('\n' + '='.repeat(60));
  console.log('  SUMAR');
  console.log('='.repeat(60));
  console.log('');

  const working = results.filter(r => r.success);
  const blocked = results.filter(r => r.blocked);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => !r.success && !r.blocked && !r.skipped);

  console.log('✅ FUNCȚIONEAZĂ:');
  working.forEach(r => console.log(`   ${r.name}: ${r.price} Lei`));

  if (blocked.length > 0) {
    console.log('\n🚫 BLOCATE:');
    blocked.forEach(r => console.log(`   ${r.name}`));
  }

  if (skipped.length > 0) {
    console.log('\n⏭️  SĂRITE (necesită proxy):');
    skipped.forEach(r => console.log(`   ${r.name}`));
  }

  if (failed.length > 0) {
    console.log('\n⚠️  DE VERIFICAT MANUAL:');
    failed.forEach(r => console.log(`   ${r.name}`));
  }

  console.log('');
}

main().catch(console.error);
