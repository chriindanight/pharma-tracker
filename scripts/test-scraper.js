/**
 * Test scraper pe un URL
 */

const cheerio = require('cheerio');

async function testScrape(url) {
  console.log('Testing:', url);
  console.log('');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ro-RO,ro;q=0.9,en;q=0.8',
      }
    });

    console.log('Status:', response.status);

    if (response.status !== 200) {
      console.log('❌ Pagina nu este accesibilă');
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Încercăm să găsim prețul
    const priceSelectors = [
      '.product-price',
      '.price',
      '[data-price]',
      '.current-price',
      '.special-price',
      'span[itemprop="price"]',
      '.product-info-price .price',
      '.price-box .price',
      '.product-price-value',
      '.price-wrapper .price',
    ];

    let price = null;
    let priceSelector = null;

    for (const selector of priceSelectors) {
      const el = $(selector).first();
      if (el.length) {
        let text = el.attr('content') || el.attr('data-price') || el.text();
        text = text.trim();
        const match = text.match(/([\d.,]+)/);
        if (match) {
          price = match[1].replace(',', '.');
          priceSelector = selector;
          break;
        }
      }
    }

    // Căutăm în data attributes
    if (!price) {
      const priceAttr = $('[data-price-amount]').attr('data-price-amount');
      if (priceAttr) {
        price = priceAttr;
        priceSelector = '[data-price-amount]';
      }
    }

    // Căutăm în meta tags
    if (!price) {
      const metaPrice = $('meta[property="product:price:amount"]').attr('content');
      if (metaPrice) {
        price = metaPrice;
        priceSelector = 'meta[property="product:price:amount"]';
      }
    }

    // Căutăm în JSON-LD
    if (!price) {
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const json = JSON.parse($(el).html());
          if (json.offers && json.offers.price) {
            price = json.offers.price;
            priceSelector = 'JSON-LD';
          } else if (json['@graph']) {
            for (const item of json['@graph']) {
              if (item.offers && item.offers.price) {
                price = item.offers.price;
                priceSelector = 'JSON-LD @graph';
                break;
              }
            }
          }
        } catch (e) {}
      });
    }

    console.log('');
    if (price) {
      console.log('✅ Preț găsit:', price, 'Lei');
      console.log('   Selector:', priceSelector);
    } else {
      console.log('❌ Preț NU s-a găsit');
      console.log('   Încerc să afișez HTML-ul relevant...');

      // Afișăm ce găsim cu clasa "price"
      const priceElements = $('[class*="price"]').slice(0, 5);
      priceElements.each((i, el) => {
        console.log(`   [${i}] ${$(el).attr('class')}: "${$(el).text().trim().substring(0, 50)}"`);
      });
    }

    // Verificăm stocul
    const outOfStock = html.toLowerCase().includes('out-of-stock') ||
                       html.toLowerCase().includes('indisponibil') ||
                       html.toLowerCase().includes('stoc epuizat') ||
                       html.toLowerCase().includes('nu este in stoc') ||
                       html.toLowerCase().includes('nu este disponibil');

    console.log('');
    console.log('📦 În stoc:', outOfStock ? 'NU' : 'DA (probabil)');

    // Verificăm titlul paginii
    const title = $('title').text().trim();
    console.log('📄 Titlu:', title.substring(0, 60) + '...');

  } catch (error) {
    console.log('❌ Eroare:', error.message);
  }
}

// Testăm pe Dr Max
const testUrl = process.argv[2] || 'https://www.drmax.ro/imodium-2mg-6-capsule-johnson-johnson';
testScrape(testUrl);
