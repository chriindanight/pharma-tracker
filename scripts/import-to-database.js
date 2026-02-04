/**
 * Script pentru importul datelor din Excel în baza de date Supabase
 *
 * Cum se rulează:
 * 1. Completează fișierul products-template.xlsx cu toate URL-urile
 * 2. Deschide Terminal
 * 3. cd /Users/chrisindanight/pharmacy-tracker
 * 4. node scripts/import-to-database.js
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configurare Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variabilele de mediu nu sunt setate!');
  console.log('   Verifică fișierul .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Lista de farmacii (trebuie să corespundă cu coloanele din Excel)
const PHARMACY_COLUMNS = [
  'Dr Max',
  'Farmacia Tei',
  'HelpNet',
  'Spring Farma',
  'Remedium Farm',
  'Catena',
  'Biscuit Pharma',
  'Farmaciile DAV',
  'DucFarm',
  'Myosotis',
  'Al Shefa',
  'PFarma',
];

async function main() {
  console.log('='.repeat(60));
  console.log('  IMPORT DATE ÎN BAZA DE DATE');
  console.log('='.repeat(60));
  console.log('');

  // Citește fișierul Excel
  const inputFile = path.join(__dirname, '..', 'products-template.xlsx');

  if (!fs.existsSync(inputFile)) {
    console.error('❌ Nu găsesc fișierul: products-template.xlsx');
    console.log('   Rulează mai întâi: node scripts/generate-urls-template.js');
    process.exit(1);
  }

  console.log('📖 Citesc fișierul Excel...');
  const workbook = XLSX.readFile(inputFile);
  const sheet = workbook.Sheets['URL-uri Produse'];

  if (!sheet) {
    console.error('❌ Nu găsesc sheet-ul "URL-uri Produse"');
    process.exit(1);
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = data[0];

  console.log('Headers găsiți:', headers.slice(0, 5), '...');
  console.log('');

  // Verificăm conexiunea la Supabase
  console.log('🔌 Verific conexiunea la Supabase...');
  const { data: testData, error: testError } = await supabase
    .from('retailers')
    .select('count')
    .limit(1);

  if (testError) {
    console.error('❌ Nu mă pot conecta la Supabase:', testError.message);
    process.exit(1);
  }
  console.log('✓ Conexiune OK');
  console.log('');

  // PASUL 1: Adăugăm retailerii
  console.log('📦 Pas 1: Adaug retailerii...');

  const retailerIds = {};

  for (const pharmacyName of PHARMACY_COLUMNS) {
    // Verificăm dacă retailerul există deja
    const { data: existing } = await supabase
      .from('retailers')
      .select('id')
      .eq('name', pharmacyName)
      .single();

    if (existing) {
      retailerIds[pharmacyName] = existing.id;
      console.log(`  ✓ ${pharmacyName} există deja`);
    } else {
      // Adăugăm retailerul
      const { data: newRetailer, error } = await supabase
        .from('retailers')
        .insert({ name: pharmacyName, is_active: true })
        .select()
        .single();

      if (error) {
        console.error(`  ✗ Eroare la ${pharmacyName}:`, error.message);
      } else {
        retailerIds[pharmacyName] = newRetailer.id;
        console.log(`  + ${pharmacyName} adăugat`);
      }
    }
  }

  console.log('');

  // PASUL 2: Adăugăm produsele și URL-urile
  console.log('📦 Pas 2: Adaug produsele și URL-urile...');

  let productsAdded = 0;
  let urlsAdded = 0;
  let skipped = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const [categorie, produs, ean, ...urls] = row;

    if (!produs || !ean) {
      skipped++;
      continue;
    }

    // Verificăm dacă produsul există
    let productId;
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('ean', String(ean))
      .single();

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      // Adăugăm produsul
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert({
          name: produs,
          ean: String(ean),
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error(`  ✗ Eroare produs ${produs}:`, error.message);
        continue;
      }

      productId = newProduct.id;
      productsAdded++;
    }

    // Adăugăm URL-urile pentru fiecare farmacie
    for (let j = 0; j < PHARMACY_COLUMNS.length && j < urls.length; j++) {
      const url = urls[j];
      const pharmacyName = PHARMACY_COLUMNS[j];
      const retailerId = retailerIds[pharmacyName];

      // Sărim dacă nu avem URL valid
      if (!url || url === 'N/A' || url === '' || !retailerId) {
        continue;
      }

      // Verificăm dacă URL-ul există deja
      const { data: existingUrl } = await supabase
        .from('product_urls')
        .select('id')
        .eq('product_id', productId)
        .eq('retailer_id', retailerId)
        .single();

      if (existingUrl) {
        // Actualizăm URL-ul
        await supabase
          .from('product_urls')
          .update({ url, is_active: true })
          .eq('id', existingUrl.id);
      } else {
        // Adăugăm URL-ul
        const { error } = await supabase
          .from('product_urls')
          .insert({
            product_id: productId,
            retailer_id: retailerId,
            url,
            is_active: true
          });

        if (error) {
          // Ignorăm erori de duplicat
          if (!error.message.includes('duplicate')) {
            console.error(`  ✗ Eroare URL ${pharmacyName}:`, error.message);
          }
        } else {
          urlsAdded++;
        }
      }
    }

    // Progress
    if (i % 10 === 0) {
      console.log(`  Procesat ${i}/${data.length - 1} produse...`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ IMPORT FINALIZAT!');
  console.log('');
  console.log(`📊 Statistici:`);
  console.log(`   Produse adăugate: ${productsAdded}`);
  console.log(`   URL-uri adăugate: ${urlsAdded}`);
  console.log(`   Rânduri sărite:   ${skipped}`);
  console.log('');
  console.log('🌐 Verifică aplicația: https://pharma-tracker-sandy.vercel.app/');
  console.log('');
}

main().catch(console.error);
