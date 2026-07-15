import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: prods } = await supabase.from('products').select('name, category');
  console.log("Products:", JSON.stringify(prods, null, 2));

  const { data: stocks } = await supabase.from('stock_items').select('name, category, unit');
  console.log("Stock Items:", JSON.stringify(stocks, null, 2));

  const { data: recipes } = await supabase.from('recipes').select('id, name').like('id', 'REC-AUTO-%');
  console.log("Auto inserted recipes:", recipes.length);
}
run();
