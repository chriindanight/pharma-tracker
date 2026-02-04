/**
 * Test scraper complet pe toate URL-urile din baza de date
 */

const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DELAY_MS = 2000; // 2 secunde între request-uri

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parser pentru Farmacia Tei
function parseFarmaciaTei($, html) {
  let price = null;
  let originalPrice = null;
  let isInStock = true;

  // Preț curent
  const priceEl = $('.price').first();
  if (priceEl.length) {
    const priceText = priceEl.text().trim();
    const match = priceText.match(/([\d.,]+)/);
    if (match) {
      price = parseFloat(match[1].replace(',', '.'));
    }
  }

  // Preț original (dacă e promoție)
  const oldPriceEl = $('.old-price, .was-price, .price-old').first();
  if (oldPriceEl.length) {
    const oldPriceText = oldPriceEl.text().trim();
    const match = oldPriceText.match(/([\d.,]+)/);
    if (match) {
      originalPrice = parseFloat(match[1].replace(',', '.'));
    }
  }

  // Verificăm stocul
  const htmlLower = html.toLowerCase();
  if (htmlLower.includes('indisponibil') ||
      htmlLower.includes('stoc epuizat') ||
      htmlLower.includes('out-of-stock') ||
      htmlLower.includes('nu este disponibil')) {
    isInStock = false;
  }

  return { price, originalPrice, isInStock };
}

// Parser pentru Dr Max (de backup, deși probabil nu funcționează)
function parseDrMax($, html) {
  let price = null;
  let originalPrice = null;
  let isInStock = true;

  // Căutăm în JSON-LD
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (json.offers) {
        price = parseFloat(json.offers.price);
        if (json.offers.availability && json.offers.availability.includes('OutOfStock')) {
          isInStock = false;
        }
      }
    } catch (e) {}
  });

  if (!price) {
    const priceEl = $('[data-price-amount]').first();
    if (priceEl.length) {
      price = parseFloat(priceEl.attr('data-price-amount'));
    }
  }

  return { price, originalPrice, isInStock };
}

async function scrapeUrl(url, retailerName) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      }
    });

    if (response.status !== 200) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let result;
    if (retailerName.includes('Tei')) {
      result = parseFarmaciaTei($, html);
    } else if (retailerName.includes('Max')) {
      result = parseDrMax($, html);
    } else {
      // Generic parser
      result = parseFarmaciaTei($, html);
    }

    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  TEST SCRAPER COMPLET');
  console.log('='.repeat(60));
  console.log('');

  // Obținem URL-urile din baza de date
  const { data: urls, error } = await supabase
    .from('product_urls')
    .select(`
      id,
      url,
      products (name, ean),
      retailers (name)
    `)
    .eq('is_active', true)
    .limit(20); // Testăm doar primele 20

  if (error) {
    console.error('❌ Eroare la citire din DB:', error.message);
    return;
  }

  console.log(`🔍 Testez ${urls.length} URL-uri...\n`);

  let successful = 0;
  let failed = 0;

  for (const item of urls) {
    const productName = item.products?.name || 'Unknown';
    const retailerName = item.retailers?.name || 'Unknown';

    console.log(`${productName.substring(0, 35).padEnd(35)} @ ${retailerName.padEnd(15)}`);

    const result = await scrapeUrl(item.url, retailerName);

    if (result.success && result.price) {
      console.log(`   ✅ ${result.price} Lei ${result.isInStock ? '(în stoc)' : '(indisponibil)'}`);
      successful++;

      // Salvăm în price_history
      await supabase.from('price_history').insert({
        product_url_id: item.id,
        price: result.price,
        original_price: result.originalPrice,
        promo_percentage: result.originalPrice
          ? Math.round((1 - result.price / result.originalPrice) * 100)
          : null,
        is_in_stock: result.isInStock,
        scraped_at: new Date().toISOString(),
      });

    } else {
      console.log(`   ❌ ${result.error || 'Preț negăsit'}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`✅ Reușite: ${successful}`);
  console.log(`❌ Eșuate:  ${failed}`);
  console.log('');
  console.log('🌐 Verifică dashboard-ul:');
  console.log('   https://pharma-tracker-sandy.vercel.app/');
}

main().catch(console.error);
