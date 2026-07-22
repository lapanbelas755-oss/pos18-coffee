import React, { useState } from "react";
import { Product } from "../../types";

interface VariantSelectionModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (selectedSize: string, selectedMood: string, notes: string) => void;
}

export default function VariantSelectionModal({
  product,
  onClose,
  onConfirm,
}: VariantSelectionModalProps) {
  // Filter active moods & sizes
  const activeMoods = (product.moods || []).filter(m => Boolean(m && m.trim()));
  const activeSizes = (product.sizes || []).filter(s => Boolean(s && s.trim()));

  const [selectedSize, setSelectedSize] = useState<string>(activeSizes[0] || "");
  const [selectedMood, setSelectedMood] = useState<string>(activeMoods[0] || "");
  const [notes, setNotes] = useState<string>("");

  // Calculate unit price with modifiers
  let unitPrice = product.price;
  const mods = product.priceModifiers;
  if (mods) {
    if (selectedSize && mods[selectedSize]) unitPrice += mods[selectedSize];
    if (selectedMood && mods[selectedMood]) unitPrice += mods[selectedMood];
  }

  const handleConfirm = () => {
    onConfirm(selectedSize, selectedMood, notes);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#4d3227] text-white p-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
            <p className="text-xs text-white/80">Pilih varian / opsi pesanan</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 max-h-[60vh]">
          {/* Section: Varian / Ukuran / Topping */}
          {activeSizes.length > 0 && !(activeSizes.length === 1 && activeSizes[0] === "M" && !product.priceModifiers?.["M"]) && (
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                Pilih Varian / Ukuran
              </label>
              <div className="grid grid-cols-2 gap-2">
                {activeSizes.map((size) => {
                  const addon = product.priceModifiers?.[size] || 0;
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`p-3 rounded-xl border-2 text-left transition-all font-bold text-sm flex flex-col justify-between ${
                        isSelected
                          ? "border-[#4d3227] bg-[#4d3227]/5 text-[#4d3227]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span>{size}</span>
                      {addon > 0 && (
                        <span className="text-xs text-primary font-semibold mt-1">
                          +Rp {addon.toLocaleString("id-ID")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Tipe Minuman (Mood: Hot / Ice) */}
          {activeMoods.length > 0 && (
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
                Suhu / Tipe Minuman
              </label>
              <div className="grid grid-cols-2 gap-2">
                {activeMoods.map((mood) => {
                  const addon = product.priceModifiers?.[mood] || 0;
                  const isSelected = selectedMood === mood;
                  const isCold = mood.toLowerCase().includes("cold") || mood.toLowerCase().includes("ice");
                  return (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setSelectedMood(mood)}
                      className={`p-3 rounded-xl border-2 text-center transition-all font-bold text-sm flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? isCold
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-amber-700 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">
                          {isCold ? "ac_unit" : "local_fire_department"}
                        </span>
                        {mood}
                      </span>
                      {addon > 0 && (
                        <span className="text-xs text-primary font-semibold">
                          +Rp {addon.toLocaleString("id-ID")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Catatan Khusus */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-2">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              placeholder="Cth: Pedas, Less Sugar, Extra Shot..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4d3227] transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 block">Total Harga Item</span>
            <span className="font-black text-lg text-primary">
              Rp {unitPrice.toLocaleString("id-ID")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 bg-[#4d3227] hover:bg-[#3b261e] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
            Tambah ke Keranjang
          </button>
        </div>
      </div>
    </div>
  );
}
