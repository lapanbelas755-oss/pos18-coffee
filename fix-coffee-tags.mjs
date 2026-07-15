import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Update "Kopi" -> "COFFEE"
  await supabase.from('recipes')
    .update({ tag: 'COFFEE', category: 'COFFEE' })
    .eq('tag', 'Kopi');
    
  // Update "Coffee Milk" (which we auto inserted) -> "COFFEE MILK"
  await supabase.from('recipes')
    .update({ tag: 'COFFEE MILK', category: 'COFFEE MILK' })
    .eq('category', 'Coffee Milk');
    
  // Also standardize the "Tea" ones to "TEA"
  await supabase.from('recipes')
    .update({ tag: 'TEA', category: 'TEA' })
    .eq('category', 'Tea');
    
  console.log("Selesai memperbaiki tag dan kategori!");
}
run();
