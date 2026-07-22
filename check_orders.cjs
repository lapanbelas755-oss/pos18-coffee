const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kdrtpzbxgjvkznkokxmi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Mzk5NjYsImV4cCI6MjA5OTMxNTk2Nn0.PnhXOkGwVytUG-mimpgmaaPZilb7iDteVnf-VXsO_4U');
async function check() {
  const { data, error, count } = await supabase.from('kds_orders').select('*', { count: 'exact' });
  console.log('Orders count:', count, 'Error:', error);
}
check();
