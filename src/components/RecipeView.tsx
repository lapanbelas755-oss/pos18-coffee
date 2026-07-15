import React, { useState } from "react";
import { RecipeItem, StockItem } from "../types";
import { formatRupiah } from "../utils";

interface RecipeViewProps {
  recipes: RecipeItem[];
  stockItems: StockItem[];
  onNotify: (message: string, type?: "success" | "warning") => void;
}

export default function RecipeView({ recipes, stockItems, onNotify }: RecipeViewProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || "");
  const [servingsScale, setServingsScale] = useState<number>(1);

  const activeRecipe = recipes.find(r => r.id === selectedRecipeId) || recipes[0];

  if (!activeRecipe) {
    return (
      <div className="p-8 text-center text-on-surface-variant text-sm">
        Tidak ada resep yang dimuat. Tambahkan resep standar untuk melanjutkan.
      </div>
    );
  }

  // Handle batch simulation verification
  const handleLockBatch = () => {
    // Check if enough stock exists in our inventory items!
    let warningFound = false;
    let warningsList: string[] = [];

    activeRecipe.ingredients.forEach(ing => {
      // Find matching stock item
      const matched = stockItems.find(s =>
        s.name.toLowerCase().includes(ing.name.toLowerCase().split(" ")[0])
      );

      if (matched) {
        // extract numeric quantity from stock item e.g. "420 kg" or "12 Liters" or "54 Units"
        const numStock = parseInt(matched.quantity.replace(/[^0-9]/g, "")) || 0;
        const required = (Number(ing.rawMeasurementVal) || 0) * servingsScale;

        // conversion checking helper
        let scaleRequiredVal = required;
        if (ing.measurementUnit === "g" && matched.unit.toLowerCase().includes("kilo")) {
          scaleRequiredVal = required / 1000; // grams to kg
        } else if (ing.measurementUnit === "ml" && matched.unit.toLowerCase().includes("liter")) {
          scaleRequiredVal = required / 1000; // ml to liters
        }

        if (scaleRequiredVal > numStock) {
          warningFound = true;
          warningsList.push(`${matched.name} (Stok: ${matched.quantity}, Butuh: ${scaleRequiredVal.toFixed(1)} ${matched.unit})`);
        }
      }
    });

    if (warningFound) {
      onNotify(`Peringatan: Stok tidak mencukupi untuk batch porsi ini! Kurang: ${warningsList.join(", ")}`, "warning");
    } else {
      onNotify(`Batch Dikunci! Bahan-bahan yang disesuaikan untuk ${servingsScale} porsi telah diverifikasi dengan inventaris stok aktif.`, "success");
    }
  };

  const scaledCogs = activeRecipe.cogs * servingsScale;
  const scaledPrice = activeRecipe.sellPrice * servingsScale;
  const scaledProfit = scaledPrice - scaledCogs;

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      
      {/* Left Sidebar - Recipe Cards List */}
      <aside className="w-80 border-r border-outline-variant/30 bg-surface-container-low/40 p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-shrink-0">
        <div>
          <h3 className="font-bold text-base text-on-surface">Buku Menu</h3>
          <p className="text-xs text-on-surface-variant mt-1">Pilih resep minuman untuk disesuaikan porsi & dianalisis.</p>
        </div>

        <div className="flex flex-col gap-3">
          {recipes.map((recipe) => {
            const isSelected = recipe.id === selectedRecipeId;
            return (
              <div
                key={recipe.id}
                onClick={() => {
                  setSelectedRecipeId(recipe.id);
                  setServingsScale(1); // reset scale on change
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-3 ${
                  isSelected
                    ? "bg-white border-primary shadow-[0_4px_16px_rgba(68,40,26,0.08)] scale-[1.02]"
                    : "bg-transparent border-outline-variant/20 hover:border-primary/40 text-on-surface-variant"
                }`}
              >
                <img
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  src={recipe.image}
                  alt={recipe.name}
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider">
                      {recipe.tag}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-on-surface mt-1 truncate">{recipe.name}</h4>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 font-medium">HPP: {formatRupiah(recipe.cogs)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right Main Details Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-background custom-scrollbar flex flex-col gap-6">
        
        {/* Active Recipe Header info Card */}
        <div className="bg-surface-container-low/50 rounded-3xl p-6 border border-outline-variant/10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex gap-5 items-center">
            <img
              className="w-20 h-20 rounded-2xl object-cover shadow-sm flex-shrink-0"
              src={activeRecipe.image}
              alt={activeRecipe.name}
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-bold uppercase tracking-wider rounded-full">
                  {activeRecipe.tag}
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">{activeRecipe.lastUpdated === "Just Now" ? "Baru Saja" : activeRecipe.lastUpdated}</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface mt-1.5">Resep {activeRecipe.name}</h2>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-xl">{activeRecipe.description}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/10 text-center w-28">
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Margin Laba</p>
              <p className="text-lg font-extrabold text-green-600 mt-0.5">{activeRecipe.profitMargin}%</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-outline-variant/10 text-center w-28">
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Harga Dasar</p>
              <p className="text-lg font-extrabold text-primary mt-0.5">{formatRupiah(activeRecipe.sellPrice)}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Scaling Slider Section */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Kelipatan Skala Porsi</h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Geser untuk menyesuaikan kuantitas bahan dan perhitungan HPP secara instan.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServingsScale(p => Math.max(p - 1, 1))}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold hover:bg-outline-variant/40 active:scale-95 cursor-pointer"
              >
                -
              </button>
              <span className="text-sm font-extrabold text-primary w-20 text-center">{servingsScale} Porsi</span>
              <button
                onClick={() => setServingsScale(p => Math.min(p + 1, 100))}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold hover:bg-outline-variant/40 active:scale-95 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={100}
            className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
            value={servingsScale}
            onChange={(e) => setServingsScale(parseInt(e.target.value) || 1)}
          />

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-dashed border-outline-variant/30">
            <div className="text-center bg-surface-container-low p-3.5 rounded-2xl">
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Biaya HPP Proporsional</p>
              <p className="text-sm font-extrabold text-primary mt-0.5">{formatRupiah(scaledCogs)}</p>
            </div>
            <div className="text-center bg-surface-container-low p-3.5 rounded-2xl">
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Perkiraan Pendapatan</p>
              <p className="text-sm font-extrabold text-amber-800 mt-0.5">{formatRupiah(scaledPrice)}</p>
            </div>
            <div className="text-center bg-surface-container-low p-3.5 rounded-2xl">
              <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider">Proyeksi Laba Bersih</p>
              <p className="text-sm font-extrabold text-green-600 mt-0.5">{formatRupiah(scaledProfit)}</p>
            </div>
          </div>
        </div>

        {/* Ingredients Matrix Spreadsheet */}
        <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Matriks Proporsi Bahan</h3>
            <span className="text-[10px] text-on-surface-variant font-semibold">Dihitung secara dinamis</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5">Bahan Baku</th>
                  <th className="py-2.5 text-center">Takaran Unit (Per Porsi)</th>
                  <th className="py-2.5 text-center">Jumlah Skala Diperlukan</th>
                  <th className="py-2.5 text-right">Harga Satuan</th>
                  <th className="py-2.5 text-right">Total Biaya HPP</th>
                </tr>
              </thead>
              <tbody className="text-xs font-semibold">
                {activeRecipe.ingredients.map((ing, idx) => {
                  const unitVal = Number(ing.rawMeasurementVal) || 0;
                  const unitLabel = ing.measurementUnit === "ml" ? "ml" : ing.measurementUnit === "g" ? "g" : ing.measurementUnit;
                  const totalVal = unitVal * servingsScale;
                  const totalCost = Number(ing.totalCost) * servingsScale;

                  return (
                    <tr key={idx} className="border-b border-outline-variant/10 hover:bg-surface-container-low transition-all">
                      <td className="py-3 text-on-surface">{ing.name}</td>
                      <td className="py-3 text-center text-on-surface-variant">{ing.measurement === "20g" ? "20 g" : ing.measurement === "250ml" ? "250 ml" : ing.measurement === "1 piece" ? "1 buah" : ing.measurement === "30ml" ? "30 ml" : ing.measurement}</td>
                      <td className="py-3 text-center text-primary font-bold">
                        {totalVal.toLocaleString("id-ID")} {unitLabel}
                      </td>
                      <td className="py-3 text-right text-on-surface-variant font-mono">{ing.unitCost}</td>
                      <td className="py-3 text-right text-primary font-bold font-mono">{formatRupiah(totalCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nutritional & Prep Steps Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Prep Steps List (Barista Checklist) */}
          <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Langkah Pembuatan Standar</h3>
            
            <ol className="space-y-4 text-xs font-semibold text-on-surface-variant leading-relaxed">
              {activeRecipe.steps.map((step, idx) => (
                <li key={idx} className="flex gap-4 items-start">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Nutrition Facts */}
          <div className="bg-white rounded-3xl p-6 border border-outline-variant/15 shadow-sm lg:col-span-1 space-y-4">
            <h3 className="font-bold text-sm text-on-surface uppercase tracking-wider">Indikator Gizi</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-xl">
                <span className="text-xs font-bold text-on-surface-variant">Kandungan Energi</span>
                <span className="text-xs font-extrabold text-primary">{activeRecipe.nutrition.calories === "210 kcal" ? "210 kkal" : activeRecipe.nutrition.calories === "260 kcal" ? "260 kkal" : activeRecipe.nutrition.calories === "15 kcal" ? "15 kkal" : activeRecipe.nutrition.calories}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-xl">
                <span className="text-xs font-bold text-on-surface-variant">Gula</span>
                <span className="text-xs font-extrabold text-primary">{activeRecipe.nutrition.sugar === "24g" ? "24 g" : activeRecipe.nutrition.sugar === "28g" ? "28 g" : activeRecipe.nutrition.sugar === "0g" ? "0 g" : activeRecipe.nutrition.sugar}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-surface-container-low rounded-xl">
                <span className="text-xs font-bold text-on-surface-variant">Batas Kafein</span>
                <span className="text-xs font-extrabold text-primary">{activeRecipe.nutrition.caffeine === "75mg" ? "75 mg" : activeRecipe.nutrition.caffeine === "150mg" ? "150 mg" : activeRecipe.nutrition.caffeine}</span>
              </div>
            </div>

            <button
              onClick={handleLockBatch}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              Verifikasi & Kunci Stok Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
