import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

const recipes = [
  // TEA
  {
    name: "Lychee Tea", category: "Tea",
    ingredients: [
      { name: "Drip Lychee", rawMeasurementVal: 20, measurementUnit: "ml", measurement: "20 ml", unitCost: "0" },
      { name: "Gula Cair", rawMeasurementVal: 10, measurementUnit: "ml", measurement: "10 ml", unitCost: "0" },
      { name: "Nectar", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" },
      { name: "Teh Sosro", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" }
    ]
  },
  {
    name: "Peach Tea", category: "Tea",
    ingredients: [
      { name: "Drip Peach", rawMeasurementVal: 20, measurementUnit: "ml", measurement: "20 ml", unitCost: "0" },
      { name: "Gula Cair", rawMeasurementVal: 20, measurementUnit: "ml", measurement: "20 ml", unitCost: "0" },
      { name: "Teh Sosro", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" }
    ]
  },
  {
    name: "Lemon Tea", category: "Tea",
    ingredients: [
      { name: "Gula Cair", rawMeasurementVal: 10, measurementUnit: "ml", measurement: "10 ml", unitCost: "0" },
      { name: "Lemon Tea Maxtea", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" },
      { name: "Teh Sosro", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" },
      { name: "Air Galon Cleo", rawMeasurementVal: 80, measurementUnit: "ml", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Strawberry Tea", category: "Tea",
    ingredients: [
      { name: "Gula Cair", rawMeasurementVal: 10, measurementUnit: "ml", measurement: "10 ml", unitCost: "0" },
      { name: "Monin Strawberry", rawMeasurementVal: 20, measurementUnit: "ml", measurement: "20 ml", unitCost: "0" },
      { name: "Teh Sosro", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" }
    ]
  },

  // MILK
  {
    name: "Matcha Latte", category: "Milk",
    ingredients: [
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Matcha Artisan", rawMeasurementVal: 20, measurementUnit: "Gram", measurement: "20 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Susu UHT", rawMeasurementVal: 80, measurementUnit: "ml", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Taro Latte", category: "Milk",
    ingredients: [
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Taro Ratu", rawMeasurementVal: 20, measurementUnit: "Gram", measurement: "20 Gram", unitCost: "0" },
      { name: "Susu UHT", rawMeasurementVal: 80, measurementUnit: "ml", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Red Velvet Latte", category: "Milk",
    ingredients: [
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Red Velvet Ratu", rawMeasurementVal: 20, measurementUnit: "Gram", measurement: "20 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Susu UHT", rawMeasurementVal: 80, measurementUnit: "ml", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Chocolate Milk", category: "Milk",
    ingredients: [
      { name: "Powder Coklat Denali", rawMeasurementVal: 20, measurementUnit: "Gram", measurement: "20 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Susu UHT", rawMeasurementVal: 80, measurementUnit: "ml", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Chocolate Caramel", category: "Milk",
    ingredients: [
      { name: "Powder Coklat Denali", rawMeasurementVal: 20, measurementUnit: "Gram", measurement: "20 Gram", unitCost: "0" },
      { name: "Drip Vanilla", rawMeasurementVal: 10, measurementUnit: "ml", measurement: "10 ml", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Susu UHT", rawMeasurementVal: 80, measurementUnit: "ml", measurement: "80 ml", unitCost: "0" }
    ]
  },

  // COFFEE MILK
  {
    name: "Caramel Macchiato", category: "Coffee Milk",
    ingredients: [
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Drip Vanilla", rawMeasurementVal: 8, measurementUnit: "Gram", measurement: "8 Gram", unitCost: "0" },
      { name: "Saus Caramel", rawMeasurementVal: 15, measurementUnit: "Gram", measurement: "15 Gram", unitCost: "0" },
      { name: "Coffee Beans", rawMeasurementVal: 9, measurementUnit: "Gram", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Kopi Latte", category: "Coffee Milk",
    ingredients: [
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Coffee Beans", rawMeasurementVal: 9, measurementUnit: "Gram", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Kopi Aren", category: "Coffee Milk",
    ingredients: [
      { name: "Saos Aren", rawMeasurementVal: 15, measurementUnit: "Gram", measurement: "15 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Coffee Beans", rawMeasurementVal: 9, measurementUnit: "Gram", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Kopi Vanilla", category: "Coffee Milk",
    ingredients: [
      { name: "Drip Vanilla", rawMeasurementVal: 16, measurementUnit: "Gram", measurement: "16 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Coffee Beans", rawMeasurementVal: 9, measurementUnit: "Gram", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Roasted Almond Coffee", category: "Coffee Milk",
    ingredients: [
      { name: "Sirup Almond", rawMeasurementVal: 20, measurementUnit: "Gram", measurement: "20 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Coffee Beans", rawMeasurementVal: 9, measurementUnit: "Gram", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Cookies & Cream", category: "Coffee Milk",
    ingredients: [
      { name: "Sirup Vanilla", rawMeasurementVal: 16, measurementUnit: "Gram", measurement: "16 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Butterscotch Coffee", category: "Coffee Milk",
    ingredients: [
      { name: "Sirup Butterscotch", rawMeasurementVal: 16, measurementUnit: "Gram", measurement: "16 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Coffee Beans", rawMeasurementVal: 9, measurementUnit: "Gram", measurement: "9 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Pistachio Hazelnut", category: "Coffee Milk",
    ingredients: [
      { name: "Sirup Pistachio", rawMeasurementVal: 16, measurementUnit: "Gram", measurement: "16 Gram", unitCost: "0" },
      { name: "Susu Kental Manis (SKM)", rawMeasurementVal: 15, measurementUnit: "Gram", measurement: "15 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram", measurement: "10 Gram", unitCost: "0" },
      { name: "Coffee Beans", rawMeasurementVal: 9, measurementUnit: "Gram", measurement: "9 Gram", unitCost: "0" }
    ]
  }
];

async function insertRecipes() {
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
    console.log("Berhasil menyisipkan semua data resep!");
  }
}

insertRecipes();
