import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { LoyaltyMember, LoyaltySettings } from "../../types";

export default function LoyaltyAdmin() {
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Settings edit state
  const [editSettings, setEditSettings] = useState<LoyaltySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [memberRes, settingsRes] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('loyalty_settings').select('*').eq('id', 1).single()
    ]);

    if (memberRes.data) setMembers(memberRes.data);
    if (settingsRes.data) {
      setSettings(settingsRes.data);
      setEditSettings(settingsRes.data);
    }
    setIsLoading(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSettings) return;
    setIsSaving(true);
    
    const { data, error } = await supabase
      .from('loyalty_settings')
      .update({
        point_per_amount: editSettings.point_per_amount,
        birthday_bonus: editSettings.birthday_bonus,
        level_bronze_max: editSettings.level_bronze_max,
        level_silver_max: editSettings.level_silver_max,
        level_gold_max: editSettings.level_gold_max
      })
      .eq('id', 1)
      .select()
      .single();
      
    if (data) {
      setSettings(data);
      alert("Settings berhasil disimpan!");
    } else {
      alert("Gagal menyimpan pengaturan: " + error?.message);
    }
    setIsSaving(false);
  };

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone.includes(search) ||
    m.member_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#4d3227]">Loyalty & Member</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data member dan pengaturan reward poin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Tabel Members */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-700">Daftar Member ({filteredMembers.length})</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Cari member..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-64"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Poin</th>
                  <th className="px-4 py-3">Total Trx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">Loading...</td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">Tidak ada member ditemukan.</td>
                  </tr>
                ) : (
                  filteredMembers.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{m.full_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{m.member_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{m.phone}</div>
                        {m.email && <div className="text-[11px] text-slate-500">{m.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          m.level === 'Platinum' ? 'bg-slate-800 text-slate-200' :
                          m.level === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                          m.level === 'Silver' ? 'bg-slate-200 text-slate-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {m.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-orange-600">{m.total_point}</td>
                      <td className="px-4 py-3 text-slate-600">Rp {m.total_spending.toLocaleString('id-ID')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kanan: Pengaturan */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500 text-[20px]">settings</span>
              Pengaturan Poin
            </h3>
          </div>
          
          <div className="p-4 flex-1">
            {editSettings ? (
              <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Poin Didapat per Nominal</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold">1 Poin = Rp</span>
                    <input 
                      type="number" 
                      value={editSettings.point_per_amount}
                      onChange={e => setEditSettings({...editSettings, point_per_amount: Number(e.target.value)})}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bonus Poin Ulang Tahun</label>
                  <input 
                    type="number" 
                    value={editSettings.birthday_bonus}
                    onChange={e => setEditSettings({...editSettings, birthday_bonus: Number(e.target.value)})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block font-bold text-slate-800 mb-3 text-[13px]">Batas Level Member (Total Belanja)</label>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-500">Batas Max Bronze</span>
                      <input type="number" value={editSettings.level_bronze_max} onChange={e => setEditSettings({...editSettings, level_bronze_max: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none mt-1" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500">Batas Max Silver</span>
                      <input type="number" value={editSettings.level_silver_max} onChange={e => setEditSettings({...editSettings, level_silver_max: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none mt-1" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500">Batas Max Gold (Min Platinum)</span>
                      <input type="number" value={editSettings.level_gold_max} onChange={e => setEditSettings({...editSettings, level_gold_max: Number(e.target.value)})} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none mt-1" />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-[#4d3227] hover:bg-[#3a251d] text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 mt-4"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 text-slate-400">Loading settings...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
