import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

const newSignatureRecipes = [
  {
    name: "Aluna",
    category: "SIGNATURE",
    ingredients: [
      { name: "Yakult", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" },
      { name: "Monin Strowbery", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Drip Mint", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Buahvita Jambu", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" }
    ]
  },
  {
    name: "Scarlet Fizz", // matching product name
    category: "SIGNATURE",
    ingredients: [
      { name: "Monin Strowbery", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Drip Mint", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Drip lychee", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Sprit ", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" },
      { name: "Natadecoco", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Strawberry Mojito",
    category: "SIGNATURE",
    ingredients: [
      { name: "Monin Strowbery", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Drip Mint", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Sprit ", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" },
      { name: "Natadecoco", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Lychee Mojito", // matching product name
    category: "SIGNATURE",
    ingredients: [
      { name: "Drip lychee", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Drip Mint", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Sprit ", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" },
      { name: "Natadecoco", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Sunrise Mojito",
    category: "SIGNATURE",
    ingredients: [
      { name: "Sunquick", rawMeasurementVal: 15, measurementUnit: "Mililiter (ml)", measurement: "15 ml", unitCost: "0" },
      { name: "Monin Strowbery", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Drip Mint", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Sprit ", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" },
      { name: "Natadecoco", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Peach Mojito",
    category: "SIGNATURE",
    ingredients: [
      { name: "Drip Peach", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Drip Mint", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Sprit ", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" },
      { name: "Natadecoco", rawMeasurementVal: 10, measurementUnit: "Gram (g)", measurement: "10 Gram", unitCost: "0" }
    ]
  },
  {
    name: "Pink oasis", // matching product name
    category: "SIGNATURE",
    ingredients: [
      { name: "Monin Strowbery", rawMeasurementVal: 20, measurementUnit: "Mililiter (ml)", measurement: "20 ml", unitCost: "0" },
      { name: "Drip Mint", rawMeasurementVal: 10, measurementUnit: "Mililiter (ml)", measurement: "10 ml", unitCost: "0" },
      { name: "Yakult", rawMeasurementVal: 1, measurementUnit: "Pcs", measurement: "1 Pcs", unitCost: "0" },
      { name: "Buahvita Jeruk", rawMeasurementVal: 80, measurementUnit: "Mililiter (ml)", measurement: "80 ml", unitCost: "0" }
    ]
  }
];

async function updateSignatureRecipes() {
  const { data: existingRecipes } = await supabase.from('recipes').select('id, name');

  let inserted = 0;
  let updated = 0;

  for (const recipeData of newSignatureRecipes) {
    const existing = existingRecipes.find(r => r.name.toLowerCase() === recipeData.name.toLowerCase());
    
    if (existing) {
      console.log(`Mengupdate resep: ${recipeData.name}`);
      await supabase.from('recipes').update({
        category: recipeData.category,
        tag: recipeData.category,
        ingredients: recipeData.ingredients
      }).eq('id', existing.id);
      updated++;
    } else {
      console.log(`Menambahkan resep baru: ${recipeData.name}`);
      await supabase.from('recipes').insert({
        id: `REC-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: recipeData.name,
        category: recipeData.category,
        tag: recipeData.category,
        image: "",
        description: `Resep racikan ${recipeData.name}`,
        cogs: 0,
        sell_price: 0,
        profit_margin: 0,
        nutrition: { calories: "0" },
        steps: ["Siapkan gelas dengan es batu", "Masukkan semua bahan sesuai urutan", "Aduk perlahan", "Sajikan"],
        ingredients: recipeData.ingredients
      });
      inserted++;
    }
  }

  console.log(`Selesai! Update: ${updated}, Insert: ${inserted}`);
}

updateSignatureRecipes();
