import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function list() {
  const { data, error } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
  if (error) {
     console.log("pg_tables query failed:", error.message);
     // Try asking postgrest for openapi spec
     const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
     const json = await res.json();
     console.log("Tables from OpenAPI:", Object.keys(json.definitions || {}));
  } else {
     console.log("Tables:", data);
  }
}
list();
