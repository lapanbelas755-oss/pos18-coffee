import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: tx } = await supabase.from('transactions').select('*').limit(1);
  console.log('Transactions columns:', Object.keys(tx?.[0] || {}));
  
  const { data: orders } = await supabase.from('orders').select('*').limit(1);
  console.log('Orders columns:', Object.keys(orders?.[0] || {}));
}
run();
