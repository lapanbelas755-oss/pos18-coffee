// migrate-unit-cost.mjs
// Jalankan: node migrate-unit-cost.mjs
// Script ini menambah kolom unit_cost ke stock_items di Supabase
// dan mengisi data awal harga per satuan bahan baku

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
// Gunakan service role key dari dashboard Supabase > Settings > API
// Ganti string di bawah dengan service_role key kamu
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'GANTI_DENGAN_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('📦 Mengambil semua stock_items...');
  const { data: stocks, error } = await supabase.from('stock_items').select('sku, name, unit');
  
  if (error) {
    console.error('❌ Error fetch:', error.message);
    console.log('\n⚠️  Jika error "JWT", pastikan kamu mengisi SUPABASE_SERVICE_KEY yang benar.');
    console.log('   Dapatkan di: Supabase Dashboard > Settings > API > service_role key\n');
    process.exit(1);
  }

  console.log(`✅ Ditemukan ${stocks.length} bahan baku\n`);

  // Update unit_cost per item (isi manual sesuai harga asli)
  // Format: Rp per satuan (gram / ml / pcs)
  // Contoh: beans = Rp 0.5 per gram (500g = Rp 250rb → 250000/500 = 500/gram)
  const updatePromises = stocks.map(async (stock) => {
    // Skip jika sudah ada unit_cost > 0 (cek dengan fetch)
    const { data: current } = await supabase
      .from('stock_items')
      .select('unit_cost')
      .eq('sku', stock.sku)
      .single();
    
    // Kalau sudah ada nilai, skip
    if (current?.unit_cost && current.unit_cost > 0) {
      console.log(`⏭️  Skip ${stock.name} (sudah ada: Rp ${current.unit_cost})`);
      return;
    }

    // Harga default per satuan berdasarkan nama bahan (sesuaikan!)
    let defaultCost = 0;
    const nameLower = stock.name.toLowerCase().trim();
    if (nameLower.includes('bean') || nameLower.includes('kopi')) defaultCost = 500;    // Rp 500/gram
    else if (nameLower.includes('susu') || nameLower.includes('milk')) defaultCost = 15; // Rp 15/ml
    else if (nameLower.includes('gula') || nameLower.includes('sugar')) defaultCost = 12; // Rp 12/gram
    else if (nameLower.includes('cup') || nameLower.includes('gelas')) defaultCost = 500; // Rp 500/pcs
    else if (nameLower.includes('syrup') || nameLower.includes('sirup')) defaultCost = 50; // Rp 50/ml
    else if (nameLower.includes('es') || nameLower.includes('ice')) defaultCost = 2;      // Rp 2/gram
    else defaultCost = 10; // Default Rp 10/satuan

    const { error: updateErr } = await supabase
      .from('stock_items')
      .update({ unit_cost: defaultCost })
      .eq('sku', stock.sku);

    if (updateErr) {
      // Kolom mungkin belum ada — perlu ALTER TABLE dulu di SQL Editor
      console.error(`❌ Gagal update ${stock.name}:`, updateErr.message);
      if (updateErr.message.includes('unit_cost')) {
        console.log('\n🔧 LANGKAH MANUAL DIPERLUKAN:');
        console.log('   Buka Supabase SQL Editor dan jalankan:\n');
        console.log('   ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,4) DEFAULT 0;\n');
        console.log('   Setelah itu jalankan script ini lagi.\n');
        process.exit(1);
      }
    } else {
      console.log(`✅ ${stock.name} → Rp ${defaultCost}/${stock.unit || 'satuan'}`);
    }
  });

  await Promise.all(updatePromises);
  console.log('\n🎉 Selesai! Unit cost sudah terisi di Supabase.');
}

main().catch(console.error);
