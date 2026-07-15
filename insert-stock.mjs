import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

const frozenItems = [
  "Tahu Walik",
  "Bakwan Jagung",
  "Kentang Goreng",
  "Nugget",
  "Sosis",
  "Lumpia Udang",
  "Lumpia Kulit Tahu",
  "Tortila",
  "Mix Plater",
  "Otak Otak",
  "Hot & Spicy Meetball",
  "Dimsum Ayam",
  "Dimsum Mentai",
  "Siomay",
  "Risol Ayam Suwir",
  "Risol Ayam Daging",
  "Risol Mayo",
  "Risol Coklat"
];

const mieItems = [
  { name: "Bakmie Kuah", category: "Bakmie" },
  { name: "Bakmie Ori", category: "Bakmie" },
  { name: "Spageti Bolognese", category: "Bakmie" },
  { name: "Mie Tiaw Polos", category: "Bakmie" },
  { name: "Mie Tiaw Pedas", category: "Bakmie" },
  { name: "Mie Tiaw Seafood", category: "Bakmie" },
  { name: "Indomie Goreng", category: "Mie Indomie" }
];

async function insertItems() {
  const payload = [];

  // Frozen
  frozenItems.forEach((name, index) => {
    const numStr = (index + 1).toString().padStart(3, '0');
    payload.push({
      sku: `SKU-FZN-${numStr}`,
      name: name,
      category: "Frozen",
      quantity: "0",
      stock_level: 0,
      warehouse: "Freezer",
      unit: "Gram",
      status: "Low Stock",
      image: "",
      min_stock: 0,
      unit_cost: 0
    });
  });

  // Mie
  mieItems.forEach((item, index) => {
    const numStr = (index + 1).toString().padStart(3, '0');
    payload.push({
      sku: `SKU-MIE-${numStr}`,
      name: item.name,
      category: item.category, // Mapped to existing categories in UI
      quantity: "0",
      stock_level: 0,
      warehouse: "Freezer",
      unit: "Gram", // As requested by user
      status: "Low Stock",
      image: "",
      min_stock: 0,
      unit_cost: 0
    });
  });

  console.log(`Menyisipkan ${payload.length} barang ke database...`);
  
  const { data, error } = await supabase.from('stock_items').insert(payload);
  
  if (error) {
    console.error("Gagal menyisipkan data:", error);
  } else {
    console.log("Berhasil menyisipkan semua data!");
  }
}

insertItems();
