import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

const newMilkRecipes = [
  {
    name: "Matcha", // Matched with product name
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Matcha Artisan", rawMeasurementVal: 13, measurementUnit: "Gram (g)", measurement: "13 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Taro",
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Taro ( Ratu ) ", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Coklat",
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Dark Coklat Denali", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Coklat Caramel",
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Dark Coklat Denali", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" },
      { name: "Drip Caramel", rawMeasurementVal: 16, measurementUnit: "Mililiter (ml)", measurement: "16 ml", unitCost: "0" }
    ]
  },
  {
    name: "Coklat Vanilla",
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Dark Coklat Denali", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" },
      { name: "Drip Vanilla", rawMeasurementVal: 16, measurementUnit: "Mililiter (ml)", measurement: "16 ml", unitCost: "0" }
    ]
  },
  {
    name: "Coklat Hazelnut", // Assuming product name is "Coklat Hazelnut"
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Dark Coklat Denali", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" },
      { name: "Davinci Hazelnut ", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" }
    ]
  },
  {
    name: "Coklat Oreo",
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Dark Coklat Denali", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" },
      { name: "Biskuit Oreo", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Klepon",
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Klepon Denali", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" },
      { name: "Saus Aren Boba", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" }
    ]
  },
  {
    name: "Red Velvet",
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Powder Redvelved ( Ratu ) ", rawMeasurementVal: 20, measurementUnit: "Gram (g)", measurement: "20 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Biskuit Lotus",
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Drip Vanilla", rawMeasurementVal: 16, measurementUnit: "Mililiter (ml)", measurement: "16 ml", unitCost: "0" },
      { name: "Selai Biscof Crunchy", rawMeasurementVal: 15, measurementUnit: "Gram (g)", measurement: "15 Gram", unitCost: "0" } // used 15g for secukupnya
    ]
  },
  {
    name: "Coco Cruncy", // Found "Coco Cruncy" in product names
    category: "MILK",
    ingredients: [
      { name: "SKM ( dairy Champ ) ", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Creamer", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" },
      { name: "Goldenfill choco crunchy", rawMeasurementVal: 30, measurementUnit: "Gram (g)", measurement: "30 Gram", unitCost: "0" }
    ]
  }
];

async function updateMilkRecipes() {
  const { data: existingRecipes } = await supabase.from('recipes').select('id, name');

  let inserted = 0;
  let updated = 0;

  for (const recipeData of newMilkRecipes) {
    const existing = existingRecipes.find(r => r.name.toLowerCase() === recipeData.name.toLowerCase());
    
    if (existing) {
      // Update existing
      console.log(`Mengupdate resep: ${recipeData.name}`);
      await supabase.from('recipes').update({
        category: recipeData.category,
        ingredients: recipeData.ingredients
      }).eq('id', existing.id);
      updated++;
    } else {
      // Insert new
      console.log(`Menambahkan resep baru: ${recipeData.name}`);
      await supabase.from('recipes').insert({
        id: `REC-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: recipeData.name,
        category: recipeData.category,
        tag: recipeData.category, // Since the user wants these in MILK category
        image: "",
        description: `Resep racikan ${recipeData.name}`,
        cogs: 0,
        sell_price: 0,
        profit_margin: 0,
        nutrition: { calories: "0" },
        steps: ["Siapkan gelas", "Masukkan semua bahan sesuai takaran", "Aduk hingga rata", "Sajikan"],
        ingredients: recipeData.ingredients
      });
      inserted++;
    }
  }

  console.log(`Selesai! Update: ${updated}, Insert: ${inserted}`);
}

updateMilkRecipes();
