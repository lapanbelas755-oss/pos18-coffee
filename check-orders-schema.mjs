import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg2ODIsImV4cCI6MjA1NjgxNDY4Mn0.uE0OqF-uN7n11lR1P9c6uYfImsB_eUaF7tC8YhGZXYs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}
run();
