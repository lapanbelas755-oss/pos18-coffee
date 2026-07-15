import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: recipes } = await supabase.from('recipes').select('id, name, category, tag');
  console.log("Recipes count:", recipes.length);
  
  const coffeeKeywords = ['coffee', 'kopi', 'americano', 'espresso', 'cappuccino', 'sanger'];
  
  const coffeeRelated = recipes.filter(r => {
    const name = r.name.toLowerCase();
    const cat = (r.category || '').toLowerCase();
    const tag = (r.tag || '').toLowerCase();
    
    if (cat.includes('coffee') || tag.includes('coffee')) return true;
    for (const kw of coffeeKeywords) {
      if (name.includes(kw)) return true;
    }
    return false;
  });

  console.log("\nAll Coffee-related Recipes:");
  coffeeRelated.forEach(r => console.log(`- ${r.name} (Cat: ${r.category}, Tag: ${r.tag})`));
}
run();
