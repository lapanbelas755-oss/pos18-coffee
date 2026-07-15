import React, { useState } from "react";

export default function QueueDisplayAdmin() {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto h-full pb-10">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col">
        
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
          <h2 className="text-2xl font-black text-slate-800">Queue Number Display</h2>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              {isActive ? "Status: Aktif" : "Status: Nonaktif"}
            </span>
            <button 
              onClick={() => setIsActive(!isActive)}
              className={`w-14 h-8 rounded-full p-1.5 transition-colors relative flex items-center shadow-inner ${
                isActive ? "bg-[#4a2d21]" : "bg-slate-300"
              }`}
            >
              <div 
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                  isActive ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Banner Graphic Placeholder */}
        <div className="w-full bg-[#4a2d21] rounded-3xl overflow-hidden relative min-h-[350px] flex items-center p-12 shadow-lg">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 translate-x-20"></div>
          
          <div className="relative z-10 w-1/2 text-white pl-4">
            <h1 className="text-4xl font-black mb-4 leading-tight tracking-tight text-[#f4ece3]">
              To use this feature, turn on<br/>Queue Number Display
            </h1>
            <p className="text-[#e8dccb] font-medium leading-relaxed max-w-sm mb-12">
              Tampilkan status pesanan secara real-time kepada pelanggan untuk meminimalkan antrean di area kasir.
            </p>
            <div className="flex items-center gap-2 opacity-80">
              <img src="/logo.png" alt="LB Coffee Logo" className="w-12 h-12 object-contain rounded-md" />
              <span className="font-bold text-2xl tracking-tight text-[#f4ece3]">LB Coffee</span>
            </div>
          </div>
          
          {/* Tablet Graphic Mockup */}
          <div className="relative z-10 w-1/2 flex justify-end">
            <div className="bg-white p-3 rounded-2xl shadow-2xl rotate-3 hover:rotate-0 transition-transform w-[450px]">
              <div className="bg-[#fcfaf8] border-4 border-[#f4ece3] rounded-xl overflow-hidden flex h-[280px]">
                {/* Promo side */}
                <div className="w-1/2 bg-slate-900 p-6 flex flex-col justify-center text-white relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#4a2d21] rounded-full opacity-50 blur-xl"></div>
                  <h3 className="font-bold text-[#e8dccb] text-sm tracking-widest uppercase mb-3 relative z-10">Promo Spesial</h3>
                  <h2 className="font-black text-3xl leading-none mb-6 relative z-10">KOPI<br/>SUSU<br/>AREN</h2>
                  <div className="w-16 h-16 bg-[#e8dccb] rounded-full flex items-center justify-center text-[#4a2d21] font-black text-sm transform -rotate-12 shadow-lg relative z-10">
                    Beli 2<br/>Diskon
                  </div>
                </div>
                {/* Queue side */}
                <div className="w-1/2 flex flex-col">
                  <div className="flex-1 bg-white flex flex-col">
                    <div className="bg-amber-500 text-white text-center text-[10px] uppercase tracking-widest font-bold py-2">Sedang Disiapkan</div>
                    <div className="flex-1 p-3 grid grid-cols-2 gap-2 text-center text-2xl font-black text-amber-950">
                      <div className="bg-amber-50 rounded-lg flex items-center justify-center shadow-inner">05</div>
                      <div className="bg-amber-50 rounded-lg flex items-center justify-center shadow-inner">06</div>
                      <div className="bg-amber-50 rounded-lg flex items-center justify-center shadow-inner">07</div>
                      <div className="bg-amber-50 rounded-lg flex items-center justify-center shadow-inner">08</div>
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-50 flex flex-col border-t-2 border-slate-200 border-dashed">
                    <div className="bg-green-600 text-white text-center text-[10px] uppercase tracking-widest font-bold py-2">Siap Diambil</div>
                    <div className="flex-1 p-3 grid grid-cols-2 gap-2 text-center text-2xl font-black text-green-950">
                      <div className="bg-green-100 rounded-lg flex items-center justify-center shadow-inner text-green-700 border border-green-200">01</div>
                      <div className="bg-green-100 rounded-lg flex items-center justify-center shadow-inner text-green-700 border border-green-200">02</div>
                      <div className="bg-green-100 rounded-lg flex items-center justify-center shadow-inner text-green-700 border border-green-200">03</div>
                      <div className="bg-green-100 rounded-lg flex items-center justify-center shadow-inner text-green-700 border border-green-200">04</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
