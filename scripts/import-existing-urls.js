/**
 * Script pentru importul URL-urilor existente din Excel în baza de date
 * Folosește fișierul original "skus price check.xlsx"
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Lipsesc variabilele de mediu!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('='.repeat(60));
  console.log('  IMPORT URL-URI EXISTENTE ÎN BAZA DE DATE');
  console.log('='.repeat(60));
  console.log('');

  // Citește Excel
  const inputFile = path.join(__dirname, '..', 'skus price check.xlsx');

  if (!fs.existsSync(inputFile)) {
    console.error('❌ Nu găsesc fișierul: skus price check.xlsx');
    process.exit(1);
  }

  console.log('📖 Citesc fișierul Excel...');
  const workbook = XLSX.readFile(inputFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`   ${data.length - 1} rânduri găsite`);
  console.log('');

  // PASUL 1: Colectăm toate farmaciile unice
  console.log('📦 Pas 1: Adaug retailerii...');

  const pharmacyNames = new Set();
  for (let i = 1; i < data.length; i++) {
    const farmacie = data[i][4];
    if (farmacie) pharmacyNames.add(farmacie.trim());
  }

  const retailerIds = {};

  for (const name of pharmacyNames) {
    // Verifică dacă există
    const { data: existing } = await supabase
      .from('retailers')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      retailerIds[name] = existing.id;
      console.log(`   ✓ ${name} (există)`);
    } else {
      // Adaugă
      const { data: newRetailer, error } = await supabase
        .from('retailers')
        .insert({ name, is_active: true })
        .select()
        .single();

      if (error) {
        console.error(`   ✗ Eroare ${name}:`, error.message);
      } else {
        retailerIds[name] = newRetailer.id;
        console.log(`   + ${name} (adăugat)`);
      }
    }
  }

  console.log('');

  // PASUL 2: Adăugăm produsele și URL-urile
  console.log('📦 Pas 2: Adaug produsele și URL-urile...');

  let productsAdded = 0;
  let urlsAdded = 0;
  let errors = 0;

  for (let i = 1; i < data.length; i++) {
    const [categorie, produs, ean, url, farmacie] = data[i];

    if (!produs || !ean || !url || !farmacie) {
      continue;
    }

    const eanStr = String(ean);
    const farmacieStr = farmacie.trim();

    // Verifică/adaugă produsul
    let productId;
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('ean', eanStr)
      .single();

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert({ name: produs, ean: eanStr, is_active: true })
        .select()
        .single();

      if (error) {
        console.error(`   ✗ Eroare produs ${produs}:`, error.message);
        errors++;
        continue;
      }

      productId = newProduct.id;
      productsAdded++;
    }

    // Adaugă URL-ul
    const retailerId = retailerIds[farmacieStr];
    if (!retailerId) {
      console.error(`   ✗ Retailer negăsit: ${farmacieStr}`);
      errors++;
      continue;
    }

    // Verifică dacă URL-ul există
    const { data: existingUrl } = await supabase
      .from('product_urls')
      .select('id')
      .eq('product_id', productId)
      .eq('retailer_id', retailerId)
      .single();

    if (existingUrl) {
      // Actualizează URL-ul
      await supabase
        .from('product_urls')
        .update({ url, is_active: true })
        .eq('id', existingUrl.id);
    } else {
      // Adaugă URL-ul
      const { error } = await supabase
        .from('product_urls')
        .insert({
          product_id: productId,
          retailer_id: retailerId,
          url,
          is_active: true
        });

      if (error) {
        if (!error.message.includes('duplicate')) {
          console.error(`   ✗ Eroare URL:`, error.message);
          errors++;
        }
      } else {
        urlsAdded++;
      }
    }

    // Progress
    if (i % 20 === 0) {
      console.log(`   Procesat ${i}/${data.length - 1}...`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ IMPORT FINALIZAT!');
  console.log('');
  console.log('📊 Statistici:');
  console.log(`   Produse adăugate:  ${productsAdded}`);
  console.log(`   URL-uri adăugate:  ${urlsAdded}`);
  console.log(`   Erori:             ${errors}`);
  console.log('');
  console.log('🌐 Verifică aplicația:');
  console.log('   https://pharma-tracker-sandy.vercel.app/');
  console.log('');
}

main().catch(console.error);
