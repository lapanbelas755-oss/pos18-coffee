import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { RecipeItem, StockItem } from "../../types";
import { calculateMaxServings } from "../../utils/inventory";
import RecipeFormModal from "../../components/RecipeFormModal";
import { supabase } from "../../lib/supabase";

interface RecipeAdminProps {
  recipes: RecipeItem[];
  setRecipes?: React.Dispatch<React.SetStateAction<RecipeItem[]>>;
  stockItems: StockItem[];
  onNotify: (msg: string, type?: "success" | "warning" | "info") => void;
}

export default function RecipeAdmin({ recipes, setRecipes, stockItems, onNotify }: RecipeAdminProps) {
  const [selected, setSelected] = useState<RecipeItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  const categories = ["Semua", "COFFEE", "COFFEE MILK", "SIGNATURE", "TEA", "MILK", "FOOD", "SNACK", "MIE", "EKSTRA"];

  const filteredRecipes = useMemo(() => {
    let result = recipes;
    if (selectedCategory !== "Semua") {
      const targetCat = selectedCategory.toLowerCase();
      result = result.filter(r => 
        r.category?.toLowerCase() === targetCat || 
        r.tag?.toLowerCase() === targetCat
      );
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(lower) || 
        r.category?.toLowerCase().includes(lower) || 
        r.tag?.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [recipes, searchTerm, selectedCategory]);

  const handleSaveRecipe = async (savedRecipe: RecipeItem) => {
    const dbPayload = {
      id: savedRecipe.id,
      name: savedRecipe.name,
      image: savedRecipe.image,
      category: savedRecipe.category,
      tag: savedRecipe.tag,
      description: savedRecipe.description,
      cogs: savedRecipe.cogs,
      sell_price: savedRecipe.sellPrice,
      profit_margin: savedRecipe.profitMargin,
      last_updated: savedRecipe.lastUpdated,
      nutrition: savedRecipe.nutrition,
      ingredients: savedRecipe.ingredients,
      steps: savedRecipe.steps,
    };
    const exists = recipes.find(r => r.id === savedRecipe.id);
    
    if (setRecipes) {
      setRecipes(prev => {
        if (exists) return prev.map(r => r.id === savedRecipe.id ? savedRecipe : r);
        return [...prev, savedRecipe];
      });
    }

    if (exists) {
      const { error } = await supabase.from('recipes').update(dbPayload).eq('id', savedRecipe.id);
      if (error) { onNotify("Gagal memperbarui resep!", "warning"); return; }
    } else {
      const { error } = await supabase.from('recipes').insert([dbPayload]);
      if (error) { onNotify("Gagal menambahkan resep!", "warning"); return; }
    }

    // Sync price to products table
    await supabase.from('products').update({ price: savedRecipe.sellPrice }).eq('name', savedRecipe.name);

    onNotify(editingRecipe ? "Resep berhasil diperbarui!" : "Resep baru berhasil ditambahkan!", "success");
    setIsFormOpen(false);
    if (selected && selected.id === savedRecipe.id) setSelected(savedRecipe);
  };

  const handleDeleteRecipe = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus resep ini?")) {
      if (setRecipes) setRecipes(prev => prev.filter(r => r.id !== id));
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) { onNotify("Gagal menghapus resep!", "warning"); return; }
      onNotify("Resep berhasil dihapus!", "success");
      if (selected?.id === id) setSelected(null);
    }
  };

  const getMaxServings = (recipe: RecipeItem) => calculateMaxServings(recipe, stockItems);

  const servingsBadge = (n: number) => {
    if (n === 0) return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-100 shadow-sm">Stok Habis</span>;
    if (n < 5) return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-100 shadow-sm">{n} Porsi</span>;
    return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-100 shadow-sm">{n} Porsi</span>;
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto h-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row w-full sm:max-w-2xl gap-3">
          <div className="relative w-full sm:w-1/2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari resep..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f8f9fa] border-none rounded-xl py-3 pl-12 pr-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-[#4a2d21]/20 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#f8f9fa] border-none rounded-xl py-3 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#4a2d21]/20 outline-none transition-all cursor-pointer appearance-none"
              style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>')`, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.2em" }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === "Semua" ? "Semua Kategori" : cat}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={() => { setEditingRecipe(null); setIsFormOpen(true); }} className="w-full sm:w-auto shrink-0 bg-[#4a2d21] text-white hover:bg-[#382016] px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Tambah Resep
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRecipes.map(recipe => {
          const result = getMaxServings(recipe);
          return (
            <div
              key={recipe.id}
              onClick={() => setSelected(recipe)}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col"
            >
              <div className="h-48 overflow-hidden relative">
                <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                <div className="absolute top-4 left-4">
                  <span className="bg-[#4a2d21] text-white text-[10px] px-3 py-1.5 uppercase tracking-widest rounded-full font-black shadow-md">{recipe.tag}</span>
                </div>
                <div className="absolute top-4 right-4">
                  {servingsBadge(result.maxServings)}
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-extrabold text-slate-800 text-lg mb-2">{recipe.name}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed flex-1">{recipe.description}</p>

                <div className="grid grid-cols-3 gap-3 text-center text-xs bg-[#fcfaf8] rounded-2xl p-4 border border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">HPP</p>
                    <p className="font-black text-slate-700">Rp {recipe.cogs.toLocaleString("id-ID")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Jual</p>
                    <p className="font-black text-[#4a2d21]">Rp {recipe.sellPrice.toLocaleString("id-ID")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Margin</p>
                    <p className="font-black text-green-600">{recipe.profitMargin}%</p>
                  </div>
                </div>

                {result.limitingIngredient && result.maxServings < 20 && (
                  <div className="mt-4 text-xs font-bold text-amber-700 bg-amber-50 rounded-xl px-4 py-3 flex items-center gap-2 border border-amber-100">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    Terbatas oleh: {result.limitingIngredient}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative h-64 shrink-0">
              <img src={selected.image} alt={selected.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                <div className="w-full flex justify-between items-end gap-4">
                  <div>
                    <span className="bg-[#4a2d21] text-white text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full font-black mb-3 inline-block shadow-sm">{selected.tag}</span>
                    <h2 className="text-3xl font-black text-white tracking-tight">{selected.name}</h2>
                  </div>
                  <div className="flex gap-3 shrink-0 mb-1">
                    <button onClick={() => { setEditingRecipe(selected); setIsFormOpen(true); }} className="bg-white/20 hover:bg-white/40 text-white rounded-xl p-3 backdrop-blur-md transition-colors shadow-sm" title="Edit">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button onClick={() => handleDeleteRecipe(selected.id)} className="bg-red-500/80 hover:bg-red-500 text-white rounded-xl p-3 backdrop-blur-md transition-colors shadow-sm" title="Hapus">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="absolute top-6 right-6 bg-white/90 text-slate-800 rounded-full p-2 hover:bg-white transition-colors shadow-lg">
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <p className="text-slate-600 text-base leading-relaxed font-medium">{selected.description}</p>

              {/* Nutrition */}
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(selected.nutrition).map(([key, val]) => (
                  <div key={key} className="bg-[#f4ece3] p-4 rounded-2xl text-center shadow-inner">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{key}</p>
                    <p className="font-black text-slate-800 text-base">{val}</p>
                  </div>
                ))}
              </div>

              {/* Gramasi & Max Serving */}
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg mb-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[24px] text-[#4a2d21]">science</span>
                  Gramasi & Ketersediaan Stok
                </h4>
                {(() => {
                  const result = getMaxServings(selected);
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-[#fcfaf8] border border-slate-200 rounded-2xl px-6 py-4">
                        <span className="font-bold text-slate-700">Estimasi Porsi Tersedia</span>
                        {servingsBadge(result.maxServings)}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                          <thead className="bg-[#fafafa] border-b border-slate-200">
                            <tr>
                              <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bahan</th>
                              <th className="p-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kebutuhan/porsi</th>
                              <th className="p-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bisa Buat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.details.map((d, i) => (
                              <tr key={i} className={`border-b border-slate-100 last:border-0 ${d.possibleServings === result.maxServings && result.maxServings < 20 ? "bg-amber-50" : ""}`}>
                                <td className="p-4 font-bold text-slate-800">{d.ingredientName}</td>
                                <td className="p-4 text-right text-slate-500 font-medium">{d.requiredPerServing} {d.unit}</td>
                                <td className={`p-4 text-right font-black ${d.possibleServings < 5 ? "text-red-600" : "text-green-600"}`}>{d.possibleServings} porsi</td>
                              </tr>
                            ))}
                            {result.details.length === 0 && (
                              <tr><td colSpan={3} className="p-6 text-center text-slate-400 font-medium text-sm">Data bahan tidak ditemukan di inventaris.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Ingredients */}
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg mb-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[24px] text-[#4a2d21]">list_alt</span>
                  Bahan-Bahan Modal
                </h4>
                <div className="space-y-3">
                  {selected.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between items-center text-sm bg-[#fcfaf8] border border-slate-100 rounded-xl px-5 py-3">
                      <span className="font-bold text-slate-700">{ing.name}</span>
                      <div className="text-right">
                        <span className="font-black text-slate-800 bg-[#f4ece3] px-2 py-1 rounded-md">{ing.measurement}</span>
                        <span className="text-[11px] font-bold text-slate-400 ml-3">{ing.unitCost}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between items-center font-bold text-sm bg-[#4a2d21] rounded-2xl px-6 py-4 shadow-md">
                  <span className="text-white/80 uppercase tracking-widest text-[11px]">HPP Total per Porsi</span>
                  <span className="text-white text-lg font-black tracking-tight">Rp {selected.cogs.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {/* Steps */}
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg mb-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[24px] text-[#4a2d21]">format_list_numbered</span>
                  Langkah Pembuatan
                </h4>
                <ol className="space-y-4">
                  {selected.steps.map((step, i) => (
                    <li key={i} className="flex gap-4 text-sm text-slate-600 font-medium">
                      <span className="w-8 h-8 bg-[#f4ece3] text-[#4a2d21] rounded-xl flex items-center justify-center font-black shrink-0">{i + 1}</span>
                      <span className="pt-1.5 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <RecipeFormModal 
          recipe={editingRecipe} 
          onSave={handleSaveRecipe} 
          onClose={() => setIsFormOpen(false)} 
          stockItems={stockItems}
        />
      )}
    </div>
  );
}
