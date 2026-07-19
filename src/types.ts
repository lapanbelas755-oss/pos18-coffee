// ... (keep previous types if any, appending new ones)
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  stock?: number;
  sizes: string[];
  sugars: string[];
  ices: string[];
  moods: string[];
  priceModifiers?: Record<string, number>;
  cogs?: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedSugar: string;
  selectedIce: string;
  selectedMood: string;
  notes: string;
}

export interface KdsItem {
  id: string;
  name: string;
  checked: boolean;
  notes?: string;
}

export interface KdsOrder {
  id: string;
  type: "Dine In" | "Takeaway" | "Grab Delivery" | "Gojek" | "ShopeeFood";
  table?: string;
  timeInSeconds: number;
  status: "incoming" | "working" | "urgent" | "done";
  items: KdsItem[];
  station?: "barista" | "kitchen" | "all" | "kasir"; // Stasiun tujuan KDS
  customerName?: string;
}

export interface StockItem {
  sku: string;
  name: string;
  category: string;
  stock?: number;
  stockLevel: number;
  quantity: string;
  warehouse: string;
  unit: string;
  status: "Healthy" | "Low Stock" | "Pending Arrival";
  image: string;
  expected?: number;
  actual?: number;
  variance?: number | string;
  minStock?: number; // Batas minimal stok sebelum reminder Telegram
  unitCost?: number; // Harga per satuan (per gram / ml / pcs)
}

export interface RecipeItem {
  id: string;
  name: string;
  image: string;
  category?: string;
  tag: string;
  description: string;
  cogs: number;
  sellPrice: number;
  profitMargin: number;
  lastUpdated?: string;
  nutrition: {
    calories: string;
    protein?: string;
    carbs?: string;
    fat?: string;
    sugar?: string;
    caffeine?: string;
  };
  ingredients: {
    name: string;
    measurement: string;
    rawMeasurementVal?: number | string;
    measurementUnit?: string;
    unitCost: string;
    totalCost?: number | string;
  }[];
  steps: string[];
}

export interface WasteLog {
  id: string;
  date?: string;
  time?: string;
  product?: string;
  item?: string;
  sku?: string;
  quantity: number;
  unit?: string;
  reason: string;
  notes?: string;
  cost: number;
  user?: string;
}

export interface Transaction {
  id: string;
  date: string;
  title: string;
  category: string;
  status: "Cleared" | "Pending";
  amount: number;
  type: "inflow" | "outflow";
}

export interface Order {
  id: string;
  queue: string;
  staff: string;
  table: string | null;
  pager: string | null;
  type: "Dine In" | "Take Out" | "Online";
  payment: string; // e.g., "Cash", "QRIS", "Unpaid"
  amountGiven?: number; // Tunai yang diberikan
  change?: number; // Kembalian
  status: "Unpaid" | "Selesai" | "Batal" | "Ready" | "Pending";
  total: number;
  time: string;
  items: CartItem[];
  customerName?: string;
  created_at?: string;
}

export interface TableData {
  id: string;
  name: string;
  capacity: number;
  status: "Kosong" | "Hold" | "Belum Dipesan" | "Sudah Dipesan" | "Selesai" | "Digabung";
  current: number;
  time: string;
  customerName?: string;
  cart: CartItem[]; // History order untuk meja ini
  linkedTo?: string; // ID meja utama (jika digabung)
}

export interface EmployeePermissions {
  pos: boolean;        // Akses POS Kasir
  kdsBarista: boolean; // Akses KDS Barista
  kdsKitchen: boolean; // Akses KDS Dapur
  kdsKasir: boolean;   // Akses KDS Monitor Kasir
  admin: boolean;      // Akses Panel Admin
  reports: boolean;    // Akses Laporan
}

export interface Employee {
  id: string;
  name: string;
  role: "Kasir" | "Barista" | "Chef" | "Manajer" | "Admin";
  pin: string;
  status: "Aktif" | "Nonaktif";
  joinDate: string;
  permissions: EmployeePermissions;
}

/** Default permissions berdasarkan role */
export function getDefaultPermissions(role: Employee['role']): EmployeePermissions {
  switch (role) {
    case 'Kasir': return { pos: true, kdsBarista: false, kdsKitchen: false, kdsKasir: true, admin: false, reports: false };
    case 'Barista': return { pos: false, kdsBarista: true, kdsKitchen: false, kdsKasir: false, admin: false, reports: false };
    case 'Chef': return { pos: false, kdsBarista: false, kdsKitchen: true, kdsKasir: false, admin: false, reports: false };
    case 'Manajer': return { pos: true, kdsBarista: true, kdsKitchen: true, kdsKasir: true, admin: true, reports: true };
    case 'Admin': return { pos: true, kdsBarista: true, kdsKitchen: true, kdsKasir: true, admin: true, reports: true };
  }
}

export interface Promo {
  id: string;
  title: string;
  code: string;
  type: "Persentase" | "Nominal" | "Layanan" | "Karyawan";
  value: number; // e.g. 20 (for 20%) or 15000 (for Rp 15.000) or 0 (for Layanan/Karyawan)
  minPurchase?: number; // e.g. 100000
  validUntil: string; // YYYY-MM-DD
  status: "Aktif" | "Nonaktif" | "Terpakai";
  usage: number;
  employeeId?: string;
  shift?: "Pagi" | "Siang" | "Malam";
}
