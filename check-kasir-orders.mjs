import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg2ODIsImV4cCI6MjA1NjgxNDY4Mn0.uE0OqF-uN7n11lR1P9c6uYfImsB_eUaF7tC8YhGZXYs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: posOrders, error: posError } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(2);
  const { data: kdsOrders, error: kdsError } = await supabase.from('kds_orders').select('*').order('created_at', { ascending: false }).limit(4);

  console.log("Latest POS Orders:");
  console.log(JSON.stringify(posOrders, null, 2));
  console.log("\nLatest KDS Orders:");
  console.log(JSON.stringify(kdsOrders, null, 2));
}

run();
