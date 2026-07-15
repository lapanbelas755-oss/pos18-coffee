import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzczOTk2NiwiZXhwIjoyMDk5MzE1OTY2fQ.voP_D76KgZrbNApGJJmK69_Xb_9jUXY67dh1sKEDouM';

const supabase = createClient(supabaseUrl, supabaseKey);

const initialTables = [
  { id: "01", name: "01", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "02", name: "02", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "03", name: "03", capacity: 6, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "04", name: "04", capacity: 5, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "05", name: "05", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "06", name: "06", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "07", name: "07", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "08", name: "08", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "09", name: "09", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "10", name: "10", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "11", name: "11", capacity: 10, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "12", name: "12", capacity: 6, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "13", name: "13 Outdoor", capacity: 6, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "14", name: "14 Outdoor", capacity: 5, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "15", name: "15 Outdoor", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "16", name: "16 Outdoor", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "17", name: "17 Outdoor", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "18", name: "18 Outdoor", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "19", name: "19 Outdoor", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "20", name: "20 Outdoor", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] }
];

async function seed() {
  console.log("Seeding tables...");
  const { error } = await supabase.from('tables').upsert(initialTables);
  if (error) {
    console.error("Error seeding tables:", error);
  } else {
    console.log("Tables seeded successfully!");
  }
}

seed();
