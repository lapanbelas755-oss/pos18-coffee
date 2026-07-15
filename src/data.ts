import { Product, KdsOrder, StockItem, RecipeItem, WasteLog, Transaction } from "./types";

export const initialProducts: Product[] = [
  {
    id: "prod-1",
    name: "cokelat hazelnute",
    price: 0,
    description: "Open Item",
    image: "https://placehold.co/150x150/e2e8f0/64748b?text=Open+Item",
    category: "COFFEE",
    stock: 999,
    sizes: ["S", "M", "L"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Hot", "Cold"]
  },
  {
    id: "prod-2",
    name: "coco cruncy",
    price: 0,
    description: "Open Item",
    image: "https://placehold.co/150x150/e2e8f0/64748b?text=Open+Item",
    category: "COFFEE",
    stock: 999,
    sizes: ["S", "M", "L"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Hot", "Cold"]
  },
  {
    id: "prod-3",
    name: "Americano",
    price: 13000,
    description: "Espresso klasik dengan air",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=150&h=150",
    category: "COFFEE",
    stock: 99,
    sizes: ["S", "M", "L"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Hot", "Cold"]
  },
  {
    id: "prod-4",
    name: "Espresso",
    price: 10000,
    description: "Espresso murni",
    image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=150&h=150",
    category: "COFFEE",
    stock: 99,
    sizes: ["S"],
    sugars: ["Normal", "Less"],
    ices: ["None"],
    moods: ["Hot"]
  },
  {
    id: "prod-5",
    name: "Sanger Single 18",
    price: 14000,
    description: "Kopi susu tradisional khas Aceh",
    image: "https://images.unsplash.com/photo-1582216503943-4fc98c0d5716?auto=format&fit=crop&q=80&w=150&h=150",
    category: "KOPI SUSU",
    stock: 50,
    sizes: ["M"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Hot", "Cold"]
  },
  {
    id: "prod-6",
    name: "Sanger 18 Double",
    price: 16000,
    description: "Double shot espresso dengan kental manis",
    image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&q=80&w=150&h=150",
    category: "KOPI SUSU",
    stock: 0, 
    sizes: ["M"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Hot", "Cold"]
  },
  {
    id: "prod-7",
    name: "Kopi Avocado",
    price: 20000,
    description: "Kopi dengan campuran alpukat",
    image: "https://images.unsplash.com/photo-1620215730248-cb5fbd45595c?auto=format&fit=crop&q=80&w=150&h=150",
    category: "KOPI SUSU",
    stock: 12,
    sizes: ["M", "L"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Cold"]
  },
  {
    id: "prod-8",
    name: "Kopi Lemon Single",
    price: 20000,
    description: "Paduan kopi dan lemon segar",
    image: "https://images.unsplash.com/photo-1513244849641-fcb23e8006e2?auto=format&fit=crop&q=80&w=150&h=150",
    category: "MOCTAIL",
    stock: 25,
    sizes: ["M"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Cold"]
  },
  {
    id: "prod-9",
    name: "Kopi Lemon Party",
    price: 35000,
    description: "Porsi besar lemon kopi",
    image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=150&h=150",
    category: "MOCTAIL",
    stock: 15,
    sizes: ["L"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Cold"]
  },
  {
    id: "prod-10",
    name: "Kopi Leci",
    price: 20000,
    description: "Sensasi kopi dengan rasa manis leci",
    image: "https://images.unsplash.com/photo-1625759712752-650085a3c990?auto=format&fit=crop&q=80&w=150&h=150",
    category: "MOCTAIL",
    stock: 20,
    sizes: ["M"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Cold"]
  },
  {
    id: "prod-11",
    name: "Kopi Lotus",
    price: 25000,
    description: "Kopi susu dengan biskuit lotus",
    image: "https://images.unsplash.com/photo-1606758688463-54911d0b5030?auto=format&fit=crop&q=80&w=150&h=150",
    category: "KOPI SUSU",
    stock: 18,
    sizes: ["M", "L"],
    sugars: ["Normal", "Less"],
    ices: ["Normal", "Less"],
    moods: ["Hot", "Cold"]
  }
];

export const initialKdsOrders: KdsOrder[] = [
  {
    id: "8241",
    type: "Dine In",
    table: "Meja 04",
    timeInSeconds: 135,
    status: "incoming",
    items: [
      { id: "k-1", name: "1x Caramel Frappuccino", checked: false, notes: "Kurang Gula, Susu Oat" },
      { id: "k-2", name: "1x Butter Croissant", checked: false, notes: "Dihangatkan" }
    ]
  },
  {
    id: "8243",
    type: "Takeaway",
    timeInSeconds: 45,
    status: "incoming",
    items: [
      { id: "k-3", name: "2x Iced Americano", checked: false, notes: "Ekstra Sloki" }
    ]
  },
  {
    id: "8238",
    type: "Dine In",
    table: "Meja 12",
    timeInSeconds: 402,
    status: "working",
    items: [
      { id: "k-4", name: "1x Avocado Toast", checked: true },
      { id: "k-5", name: "1x Peppermint Macchiato", checked: false, notes: "Susu Bebas Lemak" }
    ]
  },
  {
    id: "8235",
    type: "Grab Delivery",
    timeInSeconds: 728,
    status: "urgent",
    items: [
      { id: "k-6", name: "3x Signature Cold Brew", checked: false, notes: "1x Ekstra Vanila, 2x Biasa" },
      { id: "k-7", name: "1x Blueberry Muffin", checked: false }
    ]
  }
];

export const initialStockItems: StockItem[] = [
  {
    sku: "AB-1092-DWTN",
    name: "Biji Kopi Arabika - Estate",
    category: "Coffee Beans",
    stockLevel: 84,
    quantity: "420 kg",
    warehouse: "Pusat Hub",
    unit: "Kilogram",
    status: "Healthy",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHxsY-_F0ImWCrux-e5uY1hPcRHpo0DwJTTb1UdBIGOKFEt1neLf1ZAlbSJL0ptaV8t1YCtC6GxGB9gpmo4jyI4xnDbfT4QVXmfJE_v56WyCt06EkgpBiezHN8aNDebwswGRiCMhmeRo-15347q1oslLO4KJqOMLaoIhynLfU3zIB3i-mEB13Jyu3FT7wLDLRE2OXoNbyPwPHCqjHey6CUoti7VrROV1wLaFrkXc1L4feDkK4uhq8",
    expected: 12,
    actual: 12,
    variance: 0,
    minStock: 20
  },
  {
    sku: "DM-OAT-552",
    name: "Susu Oat Barista",
    category: "Dairy Alternatives",
    stockLevel: 8,
    quantity: "12 Liter",
    warehouse: "Gudang B",
    unit: "Liter",
    status: "Low Stock",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBazedrb037LqPPZKibGKlSLYUnheExYM21HTKHo3naFJAqCTPJDr7gdX9VjX3koRqfbbIp5LePZh-pLROMcEN1c2iLeDl52cT0eosMqQ-cDTGUQRPvbv4qCPSMrxcHQdsSubHgYn852fI7AeknFAMjjjba8YHMISQ2C8pO1FDmNz5gH-SwcMurT71ZUKCSB2kpt_n-YmCWCO7r5tGtIcHHAKaf7HD_CeXv8HKvMhkTK8SnYx0g3yQ",
    expected: 48,
    actual: 42,
    variance: -6,
    minStock: 10
  },
  {
    sku: "SY-VAN-22",
    name: "Sirup Vanila Madagaskar",
    category: "Syrups & Flavors",
    stockLevel: 62,
    quantity: "54 Botol",
    warehouse: "Pusat Hub",
    unit: "Botol",
    status: "Pending Arrival",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBidc1er_T5vQwydbKxDqzBX7Y3Jh4hO_HavhmLFpg_bHlkDrxHfKxT6xZVMsWeNS0c5VhMTgbUxy2ZTaCcBKa_EN-wRjYhcOA4Z9wZf_CJiFRuuJjLmsaDhBxgcZTOez6D4kwnq2OUfEuOm453-fLpk68JjSHPnep9iYvwt9bxB1NkmB0ojfKb01WQJVx7X-US90vbB9i3IthpLGkgjNTfEOxM2QrPJ4QZ1I6OezjbB8YfaLHTUOM",
    expected: 24,
    actual: 25,
    variance: 1,
    minStock: 30
  },
  {
    sku: "PK-CUP-12Z",
    name: "Eco-Cup (12oz)",
    category: "Packaging",
    stockLevel: 45,
    quantity: "2.100 Buah",
    warehouse: "Gudang B",
    unit: "Buah",
    status: "Healthy",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAQ_32v15-0skb9hPCT_POMKZunJyHo4p4lflaO_ocOhfGxuPy4cdXcPq-AQ1C9iXWfYOgPaA_svYjoH0lSXQ0B0eq55NuhVRWGJUwVIn6lVPgiuBOyWszE792z_ucEmRhRr1YAO2dFhWyU6MlG327PNy2zZecf1I8ty2ORBDAbcbVVGv-2UqVMbH0CbqB7yaHuvirtGrxXPRAKRcvRKbOjR4wTxOzOcn2w5_xCVd9TqqzRmObWXmg",
    expected: 15,
    actual: 15,
    variance: 0,
    minStock: 50
  }
];

export const initialRecipes: RecipeItem[] = [
  {
    id: "recipe-1",
    name: "Latte Vanila",
    tag: "Terlaris",
    lastUpdated: "Diperbarui 2 hari yang lalu",
    description: "Perpaduan harmonis antara double-shot espresso Arabika, susu murni hangat yang lembut, dan 15ml sirup vanila organik.",
    cogs: 11400,
    sellPrice: 55000,
    profitMargin: 79.2,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8H1e7zLEY5sq75Mi9yYvUE1XT2lqlBbDpt_Slcf7Fm6sdJpzW5Ga9xGQmPskTfWHPixvoRloL-5rlmBFHyXKCcZ_CdMraNTAsbQBof9K1NH0EQnygerhK_kd1dM0img3O5KDq_HQpCRq6DMPN9u1KKqBWtKKyhGEeloyirAFVnKxsioflM0im8x8n0DEPA_WfMGzextWhuVd1xry9RSOatRFO3cCbMXyWudcjIoYmoOsvzEj0xZw",
    nutrition: {
      calories: "240 kkal",
      sugar: "18g",
      caffeine: "150mg"
    },
    ingredients: [
      { name: "Biji Kopi Espresso Arabika", measurement: "18 g", rawMeasurementVal: 18, measurementUnit: "g", unitCost: "Rp 200 / g", totalCost: 3600 },
      { name: "Susu Murni (Organik)", measurement: "280 ml", rawMeasurementVal: 280, measurementUnit: "ml", unitCost: "Rp 18 / ml", totalCost: 5040 },
      { name: "Sirup Vanila Khas", measurement: "15 ml", rawMeasurementVal: 15, measurementUnit: "ml", unitCost: "Rp 120 / ml", totalCost: 1800 },
      { name: "Gelas Kertas & Tutup (12oz)", measurement: "1 buah", rawMeasurementVal: 1, measurementUnit: "buah", unitCost: "Rp 1.000 / buah", totalCost: 1000 }
    ],
    steps: [
      "Kalibrasi penggiling untuk dosis 18g; ekstrak 36g espresso selama 28-30 detik.",
      "Tambahkan 15ml sirup vanila langsung ke dalam gelas sebelum ekstraksi.",
      "Panaskan 280ml susu hingga 65°C dengan konsistensi mikrofoam untuk latte art."
    ]
  },
  {
    id: "recipe-2",
    name: "Espresso Ganda",
    tag: "Klasik Murni",
    lastUpdated: "Diperbarui 5 hari yang lalu",
    description: "Dua sloki murni espresso hitam yang pekat dengan lapisan krema tebal serta sentuhan rasa karamel dan kakao yang khas.",
    cogs: 4200,
    sellPrice: 32000,
    profitMargin: 86.8,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDMaA4yTmFt6kKOcKtl0ymsQdPdOTitzSB7ziNtziABda2W4HgJaAej6JWm4akktpZsOinqITNrT4i3qRvLySe-sDB7gQNEHvZNTBO-1H7IbDX05lV-TI9SXUkytPRH9Eoep5N5HtBTXySBBz__RyHkWYgLQlZZeXl57ZzGwmZdMDcqhiynZC4Y3jTmIpwmNEpnCS-yBEX1ei-MtYNn5ZXE6haJMqvoVpSdhZsZHsbC4WYhxgX-azk",
    nutrition: {
      calories: "5 kkal",
      sugar: "0g",
      caffeine: "150mg"
    },
    ingredients: [
      { name: "Biji Kopi Espresso Arabika", measurement: "18 g", rawMeasurementVal: 18, measurementUnit: "g", unitCost: "Rp 200 / g", totalCost: 3600 },
      { name: "Gelas Kertas & Tutup (12oz)", measurement: "1 buah", rawMeasurementVal: 1, measurementUnit: "buah", unitCost: "Rp 600 / buah", totalCost: 600 }
    ],
    steps: [
      "Kalibrasi penggiling ke ukuran gilingan sangat halus 18g.",
      "Ekstrak 36g cairan espresso pekat selama tepat 28 detik.",
      "Sajikan panas dalam gelas demitasse yang sudah dihangatkan segera."
    ]
  },
  {
    id: "recipe-3",
    name: "Kopi Cold Brew Khas",
    tag: "Diseduh Perlahan",
    lastUpdated: "Diperbarui 1 minggu yang lalu",
    description: "Ringan, cerah, dan sangat menyegarkan. Biji kopi single-origin yang digiling kasar dan direndam dalam air filtrasi dingin selama 18 jam.",
    cogs: 8800,
    sellPrice: 48000,
    profitMargin: 81.6,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAxvGx5Jlw8Uxa3VkwXwjXlqcfc7_Lprrd1HiGvlatSr7KqQJjAdF0dlSNXDg6zVxSMxvLgcHLfTkq_MRisvGtQuczjQt6f2QWROVUHwzyA462G15eP8u63VrYYqvbx3L5TESkX9nnqQtZCGkspFrPezHXa0N_cWefMxnEhBCoV4DLfC5_kH7_WnnNmD3J4Z-FC8wM3xIeFPUm1vGW4witOHw8JPVAlH3p9cWs4QTpOxYlRT2XNfJU",
    nutrition: {
      calories: "3 kkal",
      sugar: "0g",
      caffeine: "200mg"
    },
    ingredients: [
      { name: "Biji Kopi Arabika Giling Kasar", measurement: "35 g", rawMeasurementVal: 35, measurementUnit: "g", unitCost: "Rp 150 / g", totalCost: 5250 },
      { name: "Air Dingin yang Dimurnikan", measurement: "350 ml", rawMeasurementVal: 350, measurementUnit: "ml", unitCost: "Rp 10 / ml", totalCost: 3500 },
      { name: "Gelas Kertas & Tutup (16oz)", measurement: "1 buah", rawMeasurementVal: 1, measurementUnit: "buah", unitCost: "Rp 2.000 / buah", totalCost: 2000 }
    ],
    steps: [
      "Giling kasar biji kopi Arabika ke dalam kantong filter.",
      "Rendam dan seduh dalam tangki filtrasi dingin selama 18 jam pada suhu 4°C.",
      "Sajikan di atas es batu padat bersih dalam gelas 16oz."
    ]
  },
  {
    id: "recipe-4",
    name: "Flat White Susu Oat",
    tag: "Berbasis Nabati",
    lastUpdated: "Diperbarui kemarin",
    description: "Susu oat hangat bertekstur beludru yang dituang lembut ke dalam double espresso ristretto, menciptakan rasa manis yang sangat halus.",
    cogs: 13200,
    sellPrice: 52000,
    profitMargin: 74.6,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBsW_JLq4ufLabQnXTK-1HJOuH58mmngIiqp9sDQCpaI-24Ig--3WCxfMdAHisYxAH4fRjDjqI4Zrcs7YlfugD8TJ_-zIpL_nUcjyhVQ27TkOHUw3pcxoG317qTrHaviZpRODIoo6n3QmS5_JZL376sUoF0XbIQgqB9iK30V1ybNhX6YhJfWh9VGPVecvkPfaHuo_jRd54oo-0g_jwrL72DOc3fNm3DbJxSn5qZZ2b6Zze7ZOqEeSs",
    nutrition: {
      calories: "140 kkal",
      sugar: "9g",
      caffeine: "150mg"
    },
    ingredients: [
      { name: "Biji Kopi Espresso Ristretto", measurement: "18 g", rawMeasurementVal: 18, measurementUnit: "g", unitCost: "Rp 200 / g", totalCost: 3600 },
      { name: "Susu Oat (Edisi Barista)", measurement: "200 ml", rawMeasurementVal: 200, measurementUnit: "ml", unitCost: "Rp 43 / ml", totalCost: 8600 },
      { name: "Gelas Kertas & Tutup (8oz)", measurement: "1 buah", rawMeasurementVal: 1, measurementUnit: "buah", unitCost: "Rp 1.000 / buah", totalCost: 1000 }
    ],
    steps: [
      "Ekstrak 25g espresso ristretto dari dosis 18g dalam cangkir demitasse.",
      "Panaskan susu oat hingga tepat 58°C untuk memaksimalkan rasa manis tanpa gosong.",
      "Tuangkan dengan lapisan mikrofoam tipis, buat pola hati kecil di tengah."
    ]
  }
];

export const initialWasteLogs: WasteLog[] = [
  {
    id: "w-1",
    item: "Susu Oat Barista",
    quantity: 2.0,
    unit: "Liter",
    reason: "Spillage",
    notes: "Kotak terjatuh saat mengisi kembali kulkas di bawah bar.",
    time: "09:45 WIB",
    cost: 70000
  },
  {
    id: "w-2",
    item: "Butter Croissant",
    quantity: 3,
    unit: "Buah",
    reason: "Expired",
    notes: "Sisa makanan dari rotasi rak hari sebelumnya.",
    time: "Kemarin",
    cost: 105000
  }
];

export const initialTransactions: Transaction[] = [
  {
    id: "tx-1",
    date: "15 Mar 2024",
    title: "Penjualan Outlet Harian",
    category: "Sales",
    status: "Cleared",
    amount: 42105000,
    type: "inflow"
  },
  {
    id: "tx-2",
    date: "14 Mar 2024",
    title: "Restok Stok Biji Kopi",
    category: "Supplier PO",
    status: "Cleared",
    amount: 18000000,
    type: "outflow"
  },
  {
    id: "tx-3",
    date: "14 Mar 2024",
    title: "Gaji Dua Mingguan Staf",
    category: "Payroll",
    status: "Pending",
    amount: 124500000,
    type: "outflow"
  },
  {
    id: "tx-4",
    date: "13 Mar 2024",
    title: "Isi Ulang Dompet Aplikasi",
    category: "Top-ups",
    status: "Cleared",
    amount: 8500000,
    type: "inflow"
  }
];

export const initialTables: import('./types').TableData[] = [
  { id: "01", name: "01", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "02", name: "02", capacity: 4, status: "Hold", current: 2, time: "10m", cart: [] },
  { id: "03", name: "03", capacity: 6, status: "Sudah Dipesan", current: 4, time: "25m", cart: [
    {
      id: "dummy-item-1",
      product: initialProducts[0],
      quantity: 2,
      selectedSize: "M",
      selectedSugar: "Normal",
      selectedIce: "Normal",
      selectedMood: "Cold",
      notes: ""
    }
  ] },
  { id: "04", name: "04", capacity: 5, status: "Belum Dipesan", current: 3, time: "2m", cart: [] },
  { id: "05", name: "05", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
  { id: "06", name: "06", capacity: 4, status: "Sudah Dipesan", current: 1, time: "45m", cart: [
    {
      id: "dummy-item-2",
      product: initialProducts[1],
      quantity: 1,
      selectedSize: "M",
      selectedSugar: "Less Sugar",
      selectedIce: "Normal",
      selectedMood: "Cold",
      notes: "Takeaway"
    }
  ] },
  { id: "07", name: "07", capacity: 4, status: "Selesai", current: 2, time: "1h 10m", cart: [] },
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
  { id: "20", name: "20 Outdoor", capacity: 4, status: "Kosong", current: 0, time: "", cart: [] },
];

export const initialOrders: import('./types').Order[] = [
  { id: "INV-3224-7609", queue: "-", staff: "Cindy", table: "13 Outdoor", pager: "-", type: "Dine In", payment: "Unpaid", status: "Unpaid", total: 81000, time: "9 Jul 2026 18.14", items: [] },
  { id: "INV-3224-7608", queue: "38", staff: "Cindy", table: "07", pager: "-", type: "Dine In", payment: "QRIS EDC", status: "Selesai", total: 38000, time: "9 Jul 2026 17.53", items: [] },
  { id: "INV-3224-7607", queue: "37", staff: "Cindy", table: "03", pager: "-", type: "Dine In", payment: "Cash", status: "Selesai", total: 33000, time: "9 Jul 2026 17.49", items: [] },
  { id: "INV-3224-7603", queue: "33", staff: "Cindy", table: null, pager: "-", type: "Take Out", payment: "Cash", status: "Selesai", total: 32000, time: "9 Jul 2026 15.50", items: [] },
  
  // Dummy Online Orders
  { id: "INV-3224-7598", queue: "28", staff: "Cindy", table: "11", pager: "-", type: "Online", payment: "QRIS", status: "Ready", total: 108000, time: "9 Jul 2026 15.33", items: [] },
  { id: "INVQ-2624-388", queue: "27", staff: "Cindy", table: "11", pager: "-", type: "Online", payment: "QRIS", status: "Ready", total: 25000, time: "9 Jul 2026 15.05", items: [] },
];
