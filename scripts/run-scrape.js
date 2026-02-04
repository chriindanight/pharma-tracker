/**
 * Rulează scraping-ul și salvează prețurile în baza de date
 */

const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Funcție parsare preț
function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.replace(',', '.');
  const price = parseFloat(normalized);
  return isNaN(price) ? null : price;
}

// Extrage prețul din HTML
function extractPrice(html, $, retailerName) {
  let price = null;
  let isInStock = true;

  // JSON-LD
  $('script[type="application/ld+json"]').each((i, el) => {
    if (price) return;
    try {
      const json = JSON.parse($(el).html());
      if (json.offers?.price) {
        price = parseFloat(json.offers.price);
        if (json.offers.availability?.includes('OutOfStock')) isInStock = false;
      }
    } catch (e) {}
  });

  // Meta tags
  if (!price) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content');
    if (metaPrice) price = parsePrice(metaPrice);
  }

  // Selectori specifici per retailer
  if (!price) {
    let selectors = [];

    if (retailerName === 'Remedium Farm' || retailerName === 'DucFarm') {
      selectors = ['.product-summary__info--price-gross', '.product-summary__info--price-box'];
    } else if (retailerName === 'Farmaciile DAV') {
      selectors = ['.pr-price', '.product-price'];
    } else {
      selectors = [
        '[data-price-amount]',
        '.product-price',
        '.price-box .price',
        '.special-price .price',
        '.price',
      ];
    }

    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length) {
        const attr = el.attr('content') || el.attr('data-price-amount');
        if (attr) {
          price = parsePrice(attr);
          if (price) break;
        }
        price = parsePrice(el.text());
        if (price) break;
      }
    }
  }

  // Stock check
  const text = html.toLowerCase();
  if (text.includes('indisponibil') || text.includes('stoc epuizat') || text.includes('out of stock')) {
    isInStock = false;
  }
  if (text.includes('in stoc') || text.includes('în stoc')) {
    isInStock = true;
  }

  return { price, isInStock };
}

async function scrape() {
  console.log('🚀 Pornesc scraping-ul...\n');

  // Luăm URL-urile active
  const { data: urls, error } = await supabase
    .from('product_urls')
    .select(`
      id,
      url,
      product_id,
      retailer_id,
      products(name, ean),
      retailers(name)
    `)
    .eq('is_active', true);

  if (error) {
    console.error('Eroare:', error);
    return;
  }

  // Filtrăm Dr Max (blocat)
  const validUrls = urls.filter(u => !u.url.includes('drmax.ro'));
  console.log('URL-uri de procesat:', validUrls.length, '(exclus Dr Max)\n');

  let success = 0, failed = 0;

  for (const urlData of validUrls) {
    const { url, product_id, retailer_id } = urlData;
    const productName = urlData.products?.name || 'Unknown';
    const retailerName = urlData.retailers?.name || 'Unknown';

    process.stdout.write(productName.substring(0, 30).padEnd(32) + ' @ ' + retailerName.padEnd(18));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.log('❌ HTTP', response.status);
        failed++;
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const { price, isInStock } = extractPrice(html, $, retailerName);

      if (price) {
        // Salvăm în price_history (folosește product_url_id)
        const { error: insertError } = await supabase
          .from('price_history')
          .insert({
            product_url_id: urlData.id,
            price,
            is_in_stock: isInStock,
            scraped_at: new Date().toISOString(),
          });

        if (insertError) {
          console.log('❌ DB:', insertError.message.substring(0, 40));
          failed++;
        } else {
          console.log('✅', price, 'Lei', isInStock ? '' : '(indisponibil)');
          success++;
        }
      } else {
        console.log('⚠️  Preț negăsit');
        failed++;
      }

      // Delay între request-uri
      await new Promise(r => setTimeout(r, 1500));

    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('❌ Timeout');
      } else {
        console.log('❌', e.message?.substring(0, 40) || 'Error');
      }
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('DONE:', success, 'reușite,', failed, 'eșuate');
  console.log('\nPoți vedea datele pe: https://pharma-tracker-sandy.vercel.app/');
}

scrape();
