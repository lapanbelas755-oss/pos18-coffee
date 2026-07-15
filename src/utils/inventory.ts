import { StockItem, RecipeItem } from "../types";

export interface InventoryCalculationResult {
  /** Jumlah porsi maksimal yang bisa dibuat */
  maxServings: number;
  /** Nama bahan baku yang menjadi pembatas (paling cepat habis) */
  limitingIngredient: string | null;
  /** Rincian sisa porsi berdasarkan masing-masing bahan */
  details: {
    ingredientName: string;
    requiredPerServing: number;
    currentStock: number;
    possibleServings: number;
    unit: string;
  }[];
}

/**
 * Utility untuk mengekstrak angka dari string kuantitas.
 * Contoh: "420 kg" -> 420
 *         "5 L" -> 5
 */
const parseQuantity = (quantityStr: any): number => {
  if (typeof quantityStr === 'number') return quantityStr;
  const match = String(quantityStr).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
};

/**
 * Normalisasi unit dasar untuk kalkulasi (mengubah kg ke g, L ke ml, dsb)
 * agar satuan di stok (StockItem) sama dengan satuan di resep (RecipeItem).
 */
const normalizeToBaseUnit = (value: number, unit: string): { value: number, unit: string } => {
  const lowerUnit = unit.toLowerCase().trim();
  if (lowerUnit === "kg" || lowerUnit === "kilogram") {
    return { value: value * 1000, unit: "g" };
  }
  if (lowerUnit === "l" || lowerUnit === "liter" || lowerUnit === "liters") {
    return { value: value * 1000, unit: "ml" };
  }
  // Satuan yang sudah base unit (g, ml, pcs, dll)
  return { value, unit: lowerUnit };
};

/**
 * Menghitung maksimal porsi minuman yang bisa dibuat (maxServings)
 * berdasarkan pembagian stok bahan baku (StockItem) dengan takaran resep (RecipeItem).
 * 
 * @param recipe - Data resep produk
 * @param stockItems - Seluruh data stok bahan baku yang tersedia di inventaris
 * @returns Object berisi jumlah porsi maksimal dan bahan yang membatasinya
 */
export function calculateMaxServings(
  recipe: RecipeItem,
  stockItems: StockItem[]
): InventoryCalculationResult {
  
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return { maxServings: 0, limitingIngredient: null, details: [] };
  }

  let overallMaxServings = Infinity;
  let limitingIngredient: string | null = null;
  const details: InventoryCalculationResult['details'] = [];

  for (const ingredient of recipe.ingredients) {
    // Cari bahan baku di data stok berdasarkan nama (case-insensitive & generous matching)
    const ingName = (ingredient.name || "").toLowerCase().trim();
    const stock = stockItems.find(item => {
      const sName = item.name.toLowerCase().trim();
      return sName === ingName || sName.includes(ingName) || ingName.includes(sName);
    });
    
    // Normalisasi satuan dari resep
    const recipeRequirement = normalizeToBaseUnit(Number(ingredient.rawMeasurementVal) || 0, ingredient.measurementUnit || "");

    if (!stock) {
      // Jika bahan baku sama sekali tidak ditemukan di stok, berarti tidak bisa dibuat sama sekali (0 porsi)
      details.push({
        ingredientName: ingredient.name,
        requiredPerServing: recipeRequirement.value,
        currentStock: 0,
        possibleServings: 0,
        unit: recipeRequirement.unit
      });
      overallMaxServings = 0;
      limitingIngredient = ingredient.name;
      continue;
    }

    // Ekstrak dan normalisasi satuan dari stok ("420 kg" -> 420000 g)
    const rawStockValue = parseQuantity(stock.quantity);
    const availableStock = normalizeToBaseUnit(rawStockValue, stock.unit);

    // Hitung porsi yang bisa dibuat dari bahan ini
    // Memastikan kita membulatkan ke bawah karena porsi harus utuh
    const possibleServings = Math.floor(availableStock.value / recipeRequirement.value);
    
    details.push({
      ingredientName: ingredient.name,
      requiredPerServing: recipeRequirement.value,
      currentStock: availableStock.value,
      possibleServings,
      unit: recipeRequirement.unit // Base unit
    });

    if (possibleServings < overallMaxServings) {
      overallMaxServings = possibleServings;
      limitingIngredient = ingredient.name;
    }
  }

  return {
    maxServings: overallMaxServings === Infinity ? 0 : overallMaxServings,
    limitingIngredient,
    details
  };
}

/**
 * Mengecek apakah stok bahan baku menyentuh batas minimal (minStock).
 * Jika ya, kirim notifikasi Telegram.
 * 
 * @param stockItems - Daftar stok yang baru diperbarui
 */
import { sendTelegramNotification } from "./telegram";

export const checkStockAndNotify = async (stockItems: StockItem[]) => {
  const lowStockItems = stockItems.filter(item => {
    if (item.minStock === undefined) return false;
    
    // Parsing angka dari quantity misal "420 kg" -> 420
    const quantityVal = parseQuantity(item.quantity);
    
    // Kita asumsikan perbandingan langsung antara angka qty dengan minStock
    // Pastikan satuan sama (di sini dianggap minStock menggunakan satuan yg sama dgn label)
    return quantityVal <= item.minStock;
  });

  for (const item of lowStockItems) {
    const message = `⚠️ *PERINGATAN STOK MINIMAL* ⚠️\n\nBahan Baku: *${item.name}*\nSisa Stok: ${item.quantity}\nBatas Minimal: ${item.minStock} ${item.unit}\nStatus: Perlu Segera Restok!`;
    await sendTelegramNotification(message);
  }
};
