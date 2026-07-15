import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Mzk5NjYsImV4cCI6MjA5OTMxNTk2Nn0.PnhXOkGwVytUG-mimpgmaaPZilb7iDteVnf-VXsO_4U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('kds_orders').delete().like('id', 'test-%');
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
