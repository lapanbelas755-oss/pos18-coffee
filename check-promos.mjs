import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://kdrtpzbxgjvkznkokxmi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg2ODIsImV4cCI6MjA1NjgxNDY4Mn0.uE0OqF-uN7n11lR1P9c6uYfImsB_eUaF7tC8YhGZXYs');
async function run() {
  const { data, error } = await supabase.from('promos').select('*').limit(1);
  console.log(data || error);
}
run();
