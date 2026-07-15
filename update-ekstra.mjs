import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const items = ['Telur', 'Nasi Putih', 'Ayam', 'Sambal'];
  
  // Update products table
  const { data: prodData, error: prodErr } = await supabase.from('products')
    .update({ category: 'EKSTRA' })
    .in('name', items);
    
  if (prodErr) console.error("Error updating products:", prodErr);
  else console.log("Updated products successfully.");

  // Update recipes table
  const { data: recData, error: recErr } = await supabase.from('recipes')
    .update({ category: 'EKSTRA', tag: 'EKSTRA' })
    .in('name', items);

  if (recErr) console.error("Error updating recipes:", recErr);
  else console.log("Updated recipes successfully.");
}
run();
