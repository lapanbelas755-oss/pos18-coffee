import React, { useState, useEffect } from "react";
import { RecipeItem, StockItem } from "../types";

interface RecipeFormModalProps {
  recipe?: RecipeItem | null;
  onSave: (recipe: RecipeItem) => void;
  onClose: () => void;
  stockItems?: StockItem[];
}

export default function RecipeFormModal({ recipe, onSave, onClose, stockItems = [] }: RecipeFormModalProps) {
  const [formData, setFormData] = useState<Partial<RecipeItem>>({
    name: "",
    image: "",
    tag: "COFFEE",
    description: "",
    cogs: 0,
    sellPrice: 0,
    profitMargin: 0,
    nutrition: { calories: "" },
    ingredients: [],
    steps: [],
  });

  useEffect(() => {
    if (recipe) {
      setFormData(recipe);
    }
  }, [recipe]);

  const handleChange = (field: keyof RecipeItem, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    const newIngredients = [...(formData.ingredients || [])];
    newIngredients[index] = { ...newIngredients[index], [field]: value };

    // Auto-update measurement string
    if (field === "rawMeasurementVal" || field === "measurementUnit") {
      const val = field === "rawMeasurementVal" ? value : newIngredients[index].rawMeasurementVal;
      const unit = field === "measurementUnit" ? value : newIngredients[index].measurementUnit;
      if (val && unit) {
        newIngredients[index].measurement = `${val} ${unit}`;
      }
    }

    // Auto-hitung totalCost dari unitCost bahan baku × gramasi
    if (field === "name" || field === "rawMeasurementVal" || field === "measurementUnit") {
      const ing = newIngredients[index];
      const ingName = (field === "name" ? value : ing.name || "").toLowerCase().trim();
      const gramasi = Number(field === "rawMeasurementVal" ? value : ing.rawMeasurementVal) || 0;

      // Cari bahan di stock items
      const matchStock = stockItems.find(s =>
        s.name.toLowerCase().trim() === ingName ||
        s.name.toLowerCase().trim().includes(ingName) ||
        ingName.includes(s.name.toLowerCase().trim())
      );

      if (matchStock?.unitCost && gramasi > 0) {
        const cost = Math.round(matchStock.unitCost * gramasi);
        newIngredients[index].totalCost = cost;
        newIngredients[index].unitCost = `Rp ${matchStock.unitCost}/satuan`;
      }
    }

    // Auto-hitung COGS dari total semua bahan
    const totalCogs = newIngredients.reduce((acc, ing) => {
      const cost = typeof ing.totalCost === 'number' ? ing.totalCost : parseFloat((ing.totalCost as string) || "0");
      return acc + (isNaN(cost) ? 0 : cost);
    }, 0);
    
    let margin = formData.sellPrice ? Math.round(((formData.sellPrice - totalCogs) / formData.sellPrice) * 100) : 0;
    
    setFormData((prev) => ({
      ...prev,
      ingredients: newIngredients,
      cogs: totalCogs,
      profitMargin: margin
    }));
  };

  const handlePriceChange = (value: number) => {
    const margin = value ? Math.round(((value - (formData.cogs || 0)) / value) * 100) : 0;
    setFormData((prev) => ({ ...prev, sellPrice: value, profitMargin: margin }));
  };

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...(prev.ingredients || []),
        { name: "", measurement: "", rawMeasurementVal: "", measurementUnit: "g", unitCost: "Rp 0", totalCost: 0 }
      ]
    }));
  };

  const removeIngredient = (index: number) => {
    const newIngredients = [...(formData.ingredients || [])];
    newIngredients.splice(index, 1);
    
    const totalCogs = newIngredients.reduce((acc, ing) => {
      const cost = typeof ing.totalCost === 'number' ? ing.totalCost : parseFloat((ing.totalCost as string) || "0");
      return acc + (isNaN(cost) ? 0 : cost);
    }, 0);
    let margin = formData.sellPrice ? Math.round(((formData.sellPrice - totalCogs) / formData.sellPrice) * 100) : 0;
    
    setFormData((prev) => ({ ...prev, ingredients: newIngredients, cogs: totalCogs, profitMargin: margin }));
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...(prev.steps || []), ""]
    }));
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...(formData.steps || [])];
    newSteps[index] = value;
    setFormData((prev) => ({ ...prev, steps: newSteps }));
  };

  const removeStep = (index: number) => {
    const newSteps = [...(formData.steps || [])];
    newSteps.splice(index, 1);
    setFormData((prev) => ({ ...prev, steps: newSteps }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const finalRecipe: RecipeItem = {
      id: recipe?.id || `recipe-${Date.now()}`,
      name: formData.name || "",
      image: formData.image || "https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=800",
      tag: formData.tag || "COFFEE",
      description: formData.description || "",
      cogs: formData.cogs || 0,
      sellPrice: formData.sellPrice || 0,
      profitMargin: formData.profitMargin || 0,
      nutrition: formData.nutrition || { calories: "0 kcal" },
      ingredients: formData.ingredients || [],
      steps: formData.steps || [],
      lastUpdated: new Date().toISOString()
    };
    
    onSave(finalRecipe);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800">{recipe ? "Edit Resep" : "Tambah Resep Baru"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nama Resep</label>
              <input required type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4a2d21]" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Contoh: Kopi Susu Aren" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tag / Kategori</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4a2d21]" value={formData.tag} onChange={(e) => handleChange("tag", e.target.value)}>
                <option value="COFFEE">COFFEE</option>
                <option value="COFFEE MILK">COFFEE MILK</option>
                <option value="MILK">MILK</option>
                <option value="TEA">TEA</option>
                <option value="SIGNATURE">SIGNATURE</option>
                <option value="FOOD">FOOD</option>
                <option value="SNACK">SNACK</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">URL Gambar</label>
              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4a2d21]" value={formData.image} onChange={(e) => handleChange("image", e.target.value)} placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Deskripsi Singkat</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4a2d21] h-20" value={formData.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Jelaskan sedikit tentang resep ini..."></textarea>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Harga Jual (Rp)</label>
              <input type="number" required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4a2d21]" value={formData.sellPrice || ''} onChange={(e) => handlePriceChange(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Estimasi HPP (Rp)</label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-600">
                Rp {(formData.cogs || 0).toLocaleString("id-ID")}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Dihitung otomatis dari bahan</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700">Resep & Gramasi Bahan</label>
              <button type="button" onClick={addIngredient} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">add</span> Tambah Bahan
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-2 text-left text-xs font-bold text-slate-500">Nama Bahan</th>
                    <th className="p-2 text-left text-xs font-bold text-slate-500">Gramasi / Jumlah</th>
                    <th className="p-2 text-left text-xs font-bold text-slate-500">Satuan</th>
                    <th className="p-2 text-left text-xs font-bold text-slate-500 w-24">Biaya (Rp)</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.ingredients || []).map((ing, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2">
                        <input type="text" placeholder="Espresso" required className="w-full border rounded px-2 py-1 text-sm focus:border-[#4a2d21] focus:outline-none" value={ing.name} onChange={(e) => handleIngredientChange(i, "name", e.target.value)} />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.1" placeholder="30" required className="w-full border rounded px-2 py-1 text-sm focus:border-[#4a2d21] focus:outline-none" value={ing.rawMeasurementVal || ''} onChange={(e) => handleIngredientChange(i, "rawMeasurementVal", Number(e.target.value))} />
                      </td>
                      <td className="p-2">
                        <select className="w-full border rounded px-2 py-1 text-sm focus:border-[#4a2d21] focus:outline-none" value={ing.measurementUnit || "g"} onChange={(e) => handleIngredientChange(i, "measurementUnit", e.target.value)}>
                          <option value="g">Gram (g)</option>
                          <option value="ml">Mililiter (ml)</option>
                          <option value="pcs">Pcs</option>
                          <option value="pump">Pump</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          placeholder="Otomatis dari stok" 
                          className="w-full border rounded px-2 py-1 text-sm focus:border-[#4a2d21] focus:outline-none bg-slate-50" 
                          value={ing.totalCost || ''} 
                          onChange={(e) => handleIngredientChange(i, "totalCost", Number(e.target.value))} 
                        />
                        {!ing.totalCost && ing.name && (
                          <p className="text-[10px] text-amber-500 mt-0.5">Isi unit cost di Stok Bahan</p>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <button type="button" onClick={() => removeIngredient(i)} className="text-red-500 hover:text-red-700 p-1">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!formData.ingredients || formData.ingredients.length === 0) && (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-400 text-xs">Belum ada bahan ditambahkan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-700">Langkah Pembuatan</label>
              <button type="button" onClick={addStep} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">add</span> Tambah Langkah
              </button>
            </div>
            <div className="space-y-2">
              {(formData.steps || []).map((step, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-8 h-8 shrink-0 bg-[#4a2d21] text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <input type="text" required className="flex-1 border rounded-lg px-3 py-1 text-sm focus:border-[#4a2d21] focus:outline-none" value={step} onChange={(e) => handleStepChange(i, e.target.value)} placeholder={`Langkah ke-${i+1}`} />
                  <button type="button" onClick={() => removeStep(i)} className="text-red-500 hover:text-red-700 p-2">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
          
        </form>

        <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            Batal
          </button>
          <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-[#4a2d21] hover:bg-red-800 text-white font-bold rounded-lg shadow-sm transition-colors">
            Simpan Resep
          </button>
        </div>
      </div>
    </div>
  );
}
