import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

const basicItems = [
  { name: "Beras", category: "Lainnya", unit: "Gram", warehouse: "Penyimpanan Utama", sku: "SKU-BHK-001" },
  { name: "Ayam Potong Segar", category: "Ayam", unit: "Pcs", warehouse: "Freezer / Chiller", sku: "SKU-BHK-002" },
  { name: "Telur Ayam", category: "Lainnya", unit: "Pcs", warehouse: "Penyimpanan Utama", sku: "SKU-BHK-003" },
  { name: "Udang Segar", category: "Daging", unit: "Gram", warehouse: "Freezer / Chiller", sku: "SKU-BHK-004" }
];

async function insertItems() {
  const payload = basicItems.map(item => ({
    ...item,
    quantity: "0",
    stock_level: 0,
    status: "Low Stock",
    image: "",
    min_stock: 0,
    unit_cost: 0
  }));

  console.log(`Menyisipkan ${payload.length} bahan pokok ke database...`);
  
  const { data, error } = await supabase.from('stock_items').insert(payload);
  
  if (error) {
    console.error("Gagal menyisipkan data:", error);
  } else {
    console.log("Berhasil menyisipkan semua data bahan pokok!");
  }
}

insertItems();
