import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

const recipes = [
  // TEA
  {
    name: "Lychee Tea", category: "Tea",
    ingredients: [
      { name: "Drip lychee", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Gula Cair", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Lycee Nectar", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" },
      { name: "Teh Sosro", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" }
    ]
  },
  {
    name: "Peach Tea", category: "Tea",
    ingredients: [
      { name: "Drip Peach", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Gula Cair", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Teh Sosro", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" }
    ]
  },
  {
    name: "Lemon Tea", category: "Tea",
    ingredients: [
      { name: "Gula Cair", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Lemon Tea Maxtea", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" },
      { name: "Teh Sosro", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" },
      { name: "Cleo Galon 19 Liter", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Strawberry Tea", category: "Tea",
    ingredients: [
      { name: "Gula Cair", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Monin Strowbery", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Teh Sosro", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" }
    ]
  },

  // MILK
  {
    name: "Matcha Latte", category: "Milk",
    ingredients: [
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Matcha Artisan", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "UHT", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Taro Latte", category: "Milk",
    ingredients: [
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Taro ( Ratu ) ", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" },
      { name: "UHT", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Red Velvet Latte", category: "Milk",
    ingredients: [
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Redvelved ( Ratu ) ", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "UHT", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Chocolate Milk", category: "Milk",
    ingredients: [
      { name: "Powder Dark Coklat Denali", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "UHT", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Chocolate Caramel", category: "Milk",
    ingredients: [
      { name: "Powder Dark Coklat Denali", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" },
      { name: "Drip Vanilla", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "UHT", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" }
    ]
  },

  // COFFEE MILK
  {
    name: "Caramel Macchiato", category: "Coffee Milk",
    ingredients: [
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Drip Vanilla", rawMeasurementVal: 8, measurementUnit: "Gram (g)", measurement: "8 Gram", unitCost: "0" },
      { name: "Saus Caramel", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" },
      { name: "Beans ", rawMeasurementVal: 9, measurementUnit: "Gram (g)", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Kopi Latte", category: "Coffee Milk",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Beans ", rawMeasurementVal: 9, measurementUnit: "Gram (g)", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Kopi Aren", category: "Coffee Milk",
    ingredients: [
      { name: "Saus Aren Boba", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Beans ", rawMeasurementVal: 9, measurementUnit: "Gram (g)", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Kopi Vanilla", category: "Coffee Milk",
    ingredients: [
      { name: "Drip Vanilla", rawMeasurementVal: 16, measurementUnit: "Gram (g)", measurement: "16 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Beans ", rawMeasurementVal: 9, measurementUnit: "Gram (g)", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Roasted Almond Coffee", category: "Coffee Milk",
    ingredients: [
      { name: "Davinci Roasted Almond", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Beans ", rawMeasurementVal: 9, measurementUnit: "Gram (g)", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Cookies & Cream", category: "Coffee Milk",
    ingredients: [
      { name: "Drip Vanilla", rawMeasurementVal: 16, measurementUnit: "Gram (g)", measurement: "16 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Butterscotch Coffee", category: "Coffee Milk",
    ingredients: [
      { name: "Drip Butterschoth", rawMeasurementVal: 16, measurementUnit: "Gram (g)", measurement: "16 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Beans ", rawMeasurementVal: 9, measurementUnit: "Gram (g)", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Pistachio Hazelnut", category: "Coffee Milk",
    ingredients: [
      { name: "Drip Pistachio", rawMeasurementVal: 16, measurementUnit: "Gram (g)", measurement: "16 Gram", unitCost: "0" },
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Beans ", rawMeasurementVal: 9, measurementUnit: "Gram (g)", measurement: "9 Gram", unitCost: "0" }
    ]
  }
];

async function fixRecipes() {
  console.log("Deleting old auto recipes...");
  await supabase.from('recipes').delete().like('id', 'REC-AUTO-%');

  const payload = recipes.map((r, i) => {
    return {
      id: `REC-AUTO-${Date.now()}-${i}`,
      name: r.name,
      category: r.category,
      tag: "Minuman",
      image: "",
      description: `Resep racikan ${r.name}`,
      cogs: 0,
      sell_price: 0,
      profit_margin: 0,
      nutrition: { calories: "0" },
      steps: ["Siapkan gelas", "Masukkan semua bahan sesuai takaran", "Aduk hingga rata", "Sajikan"],
      ingredients: r.ingredients
    };
  });

  console.log(`Menyisipkan ${payload.length} resep ke database...`);
  
  const { data, error } = await supabase.from('recipes').insert(payload);
  
  if (error) {
    console.error("Gagal menyisipkan data resep:", error);
  } else {
    console.log("Berhasil menyisipkan semua data resep baru!");
  }
}

fixRecipes();
