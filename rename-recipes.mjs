import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

const nameMappings = {
  "Matcha Latte": "Matcha",
  "Taro Latte": "Taro",
  "Red Velvet Latte": "Red Velvet",
  "Chocolate Milk": "Coklat",
  "Chocolate Caramel": "Coklat Caramel",
  "Kopi Latte": "Coffee Latte",
  "Kopi Aren": "Coffee Aren",
  "Kopi Vanilla": "Coffee Vanilla",
  "Roasted Almond Coffee": "Roasted Almond",
  "Butterscotch Coffee": "Butterscoth",
  "Pistachio Hazelnut": "Pistachio hazelnut"
};

async function renameRecipes() {
  const { data: recipes } = await supabase.from('recipes').select('id, name');
  
  let updatedCount = 0;
  for (const recipe of recipes) {
    if (nameMappings[recipe.name]) {
      const newName = nameMappings[recipe.name];
      console.log(`Renaming: ${recipe.name} -> ${newName}`);
      await supabase.from('recipes').update({ name: newName }).eq('id', recipe.id);
      updatedCount++;
    }
  }
  
  console.log(`Selesai memperbarui nama ${updatedCount} resep.`);
}

renameRecipes();
