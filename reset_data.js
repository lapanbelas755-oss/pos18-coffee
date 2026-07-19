import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Mzk5NjYsImV4cCI6MjA5OTMxNTk2Nn0.PnhXOkGwVytUG-mimpgmaaPZilb7iDteVnf-VXsO_4U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Resetting tables...");
  const { data: tables, error: tableErr } = await supabase.from('tables').select('id');
  if (tableErr) {
    console.error("Error fetching tables:", tableErr);
  } else if (tables) {
    for (const t of tables) {
      await supabase.from('tables').update({
        status: "Kosong",
        cart: [],
        current: 0,
        customer_name: null,
        linked_to: null,
        time: ""
      }).eq('id', t.id);
    }
    console.log(`Reset ${tables.length} tables to Kosong.`);
  }

  console.log("Deleting orders...");
  const { error: orderErr } = await supabase.from('orders').delete().neq('id', 'DUMMY_ID');
  if (orderErr) console.error("Error deleting orders:", orderErr);
  else console.log("Orders deleted.");

  console.log("Deleting kds_orders...");
  const { error: kdsErr } = await supabase.from('kds_orders').delete().neq('id', 'DUMMY_ID');
  if (kdsErr) console.error("Error deleting kds_orders:", kdsErr);
  else console.log("KDS orders deleted.");
  
  console.log("Deleting transactions...");
  const { error: txErr } = await supabase.from('transactions').delete().neq('id', 'DUMMY_ID');
  if (txErr) console.error("Error deleting transactions:", txErr);
  else console.log("Transactions deleted.");

  console.log("Reset complete!");
}
run();
