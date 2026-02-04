/**
 * Import toate produsele și URL-urile din Excel în Supabase
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Lipsesc credențialele Supabase în .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping între coloanele din Excel și numele farmaciilor
const PHARMACY_MAPPING = {
  'Dr Max': 'Dr Max',
  'Farmacia Tei': 'Farmacia Tei',
  'HelpNet': 'HelpNet',
  'Spring Farma': 'Spring Farma',
  'Remedium Farm': 'Remedium Farm',
  'Catena': 'Catena',
  'Biscuit Pharma': 'Biscuit Pharma',
  'Farmaciile DAV': 'Farmaciile DAV',
  'DucFarm': 'DucFarm',
  'Myosotis': 'Myosotis',
  'Al Shefa': 'Al Shefa Farm',
  'PFarma': 'PFarma',
};

async function main() {
  console.log('='.repeat(60));
  console.log('  IMPORT PRODUSE ȘI URL-URI DIN EXCEL');
  console.log('='.repeat(60));

  // 1. Citim Excel-ul
  console.log('\n📖 Citesc Excel-ul...');
  const workbook = XLSX.readFile('products-template.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`   ${data.length} produse găsite`);

  // 2. Creăm/verificăm retailerii
  console.log('\n🏪 Verific retailerii...');
  const retailerIds = {};

  for (const [colName, retailerName] of Object.entries(PHARMACY_MAPPING)) {
    // Verificăm dacă există deja
    const { data: existing } = await supabase
      .from('retailers')
      .select('id')
      .eq('name', retailerName)
      .single();

    if (existing) {
      retailerIds[colName] = existing.id;
      console.log(`   ✓ ${retailerName} (existent)`);
    } else {
      // Creăm retailer-ul
      const { data: newRetailer, error } = await supabase
        .from('retailers')
        .insert({
          name: retailerName,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`   ❌ Eroare la ${retailerName}:`, error.message);
      } else {
        retailerIds[colName] = newRetailer.id;
        console.log(`   + ${retailerName} (creat)`);
      }
    }
  }

  // 3. Verificăm/creăm produsele
  console.log('\n📦 Verific produse...');
  let productsCreated = 0;
  let productsExisting = 0;
  const productIds = {};

  for (const row of data) {
    const ean = String(row.EAN || '').trim();
    const name = row.Produs?.trim();

    if (!name || !ean) continue;

    // Verificăm dacă există
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('ean', ean)
      .single();

    if (existing) {
      productIds[ean] = existing.id;
      productsExisting++;
    } else {
      // Creăm produsul
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert({
          name,
          ean,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error(`   ❌ Eroare la ${name}:`, error.message);
      } else {
        productIds[ean] = newProduct.id;
        productsCreated++;
      }
    }
  }

  console.log(`   ✓ ${productsCreated} produse noi create`);
  console.log(`   ✓ ${productsExisting} produse existente`);

  // 4. Importăm URL-urile
  console.log('\n🔗 Import URL-uri...');
  let urlsCreated = 0;
  let urlsUpdated = 0;
  let urlsNA = 0;

  for (const row of data) {
    const ean = String(row.EAN || '').trim();
    const productId = productIds[ean];

    if (!productId) continue;

    for (const [colName, retailerName] of Object.entries(PHARMACY_MAPPING)) {
      const url = row[colName]?.trim();
      const retailerId = retailerIds[colName];

      if (!retailerId) continue;

      // Skip dacă N/A sau gol
      if (!url || url === 'N/A' || url === '') {
        urlsNA++;
        continue;
      }

      // Verificăm dacă URL-ul există deja
      const { data: existing } = await supabase
        .from('product_urls')
        .select('id, url')
        .eq('product_id', productId)
        .eq('retailer_id', retailerId)
        .single();

      if (existing) {
        // Actualizăm URL-ul dacă e diferit
        if (existing.url !== url) {
          await supabase
            .from('product_urls')
            .update({ url, is_active: true })
            .eq('id', existing.id);
          urlsUpdated++;
        }
      } else {
        // Creăm URL-ul
        const { error } = await supabase
          .from('product_urls')
          .insert({
            product_id: productId,
            retailer_id: retailerId,
            url,
            is_active: true,
          });

        if (error) {
          console.error(`   ❌ Eroare URL pentru ${ean} @ ${colName}:`, error.message);
        } else {
          urlsCreated++;
        }
      }
    }
  }

  console.log(`   ✓ ${urlsCreated} URL-uri noi create`);
  console.log(`   ✓ ${urlsUpdated} URL-uri actualizate`);
  console.log(`   ⏭️  ${urlsNA} URL-uri goale/N/A ignorate`);

  // 5. Statistici finale
  console.log('\n' + '='.repeat(60));
  console.log('  SUMAR');
  console.log('='.repeat(60));

  const { count: totalProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  const { count: totalUrls } = await supabase
    .from('product_urls')
    .select('*', { count: 'exact', head: true });

  const { count: totalRetailers } = await supabase
    .from('retailers')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total în baza de date:`);
  console.log(`   ${totalRetailers} retaileri`);
  console.log(`   ${totalProducts} produse`);
  console.log(`   ${totalUrls} URL-uri\n`);

  // Afișăm statistici per retailer
  console.log('📈 URL-uri per retailer:');
  for (const [colName, retailerName] of Object.entries(PHARMACY_MAPPING)) {
    const retailerId = retailerIds[colName];
    if (!retailerId) continue;

    const { count } = await supabase
      .from('product_urls')
      .select('*', { count: 'exact', head: true })
      .eq('retailer_id', retailerId);

    console.log(`   ${retailerName.padEnd(20)} ${count} URL-uri`);
  }
  console.log('');
}

main().catch(console.error);
