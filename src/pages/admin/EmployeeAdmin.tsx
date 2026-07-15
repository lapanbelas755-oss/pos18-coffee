import React, { useState } from "react";
import { Employee, EmployeePermissions, getDefaultPermissions } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { usePosStore } from "../../store/posStore";
import { sendTelegramMessage } from "../../lib/telegram";

const PERMISSION_LABELS: { key: keyof EmployeePermissions; label: string; desc: string; icon: string }[] = [
  { key: 'pos',        label: 'POS Kasir',       desc: 'Akses halaman kasir & transaksi',   icon: 'point_of_sale' },
  { key: 'kdsBarista', label: 'KDS Barista',     desc: 'Layar antrian minuman',              icon: 'local_cafe' },
  { key: 'kdsKitchen', label: 'KDS Dapur',       desc: 'Layar antrian makanan dapur',       icon: 'soup_kitchen' },
  { key: 'kdsKasir',   label: 'Monitor Kasir',   desc: 'Pantau semua order real-time',      icon: 'monitor' },
  { key: 'admin',      label: 'Panel Admin',     desc: 'Manajemen menu, stok, laporan',     icon: 'admin_panel_settings' },
  { key: 'reports',    label: 'Laporan',         desc: 'Akses data laporan & analitik',     icon: 'bar_chart' },
];

const ROLE_COLORS: Record<string, string> = {
  Manajer: 'bg-purple-100 text-purple-700',
  Admin:   'bg-slate-100  text-slate-700',
  Kasir:   'bg-blue-100   text-blue-700',
  Barista: 'bg-amber-100  text-amber-700',
  Chef:    'bg-emerald-100 text-emerald-700',
};

export default function EmployeeAdmin() {
  const { currentUser, employees, addEmployee, updateEmployee, removeEmployee } = useAuthStore();
  const { promos, setPromos } = usePosStore();

  const [showModal, setShowModal]     = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramToken, setTelegramToken] = useState(() => localStorage.getItem('telegram_bot_token') || '8738749086:AAGtYRPYGXj4p_x7zE1xhPYkwfp7MzhRJDs');
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('telegram_chat_id') || '-5573934660');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [permTarget, setPermTarget]   = useState<Employee | null>(null);
  const [showPin, setShowPin] = useState(false);

  const [form, setForm] = useState<Partial<Employee>>({
    name: '', role: 'Kasir', pin: '', status: 'Aktif',
    permissions: getDefaultPermissions('Kasir'),
  });

  const handleOpen = (emp?: Employee) => {
    if (emp) {
      setEditingEmployee(emp);
      setForm(emp);
    } else {
      setEditingEmployee(null);
      setForm({ name: '', role: 'Kasir', pin: '', status: 'Aktif', permissions: getDefaultPermissions('Kasir') });
    }
    setShowModal(true);
  };

  const handleRoleChange = (role: Employee['role']) => {
    setForm(f => ({ ...f, role, permissions: getDefaultPermissions(role) }));
  };

  const handleSave = () => {
    if (!form.name || !form.pin) return;
    if (editingEmployee) {
      updateEmployee({ ...editingEmployee, ...form } as Employee);
    } else {
      const newEmp: Employee = {
        id: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
        name: form.name!,
        role: form.role as Employee['role'],
        pin: form.pin!,
        status: form.status as Employee['status'],
        joinDate: new Date().toISOString().split('T')[0],
        permissions: form.permissions ?? getDefaultPermissions(form.role as Employee['role']),
      };
      addEmployee(newEmp);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus karyawan ini?')) removeEmployee(id);
  };

  const handleOpenPerm = (emp: Employee) => {
    setPermTarget({ ...emp });
    setShowPermModal(true);
  };

  const handlePermToggle = (key: keyof EmployeePermissions) => {
    if (!permTarget) return;
    setPermTarget(prev => prev ? { ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } } : null);
  };

  const handleSavePerm = () => {
    if (permTarget) updateEmployee(permTarget);
    setShowPermModal(false);
  };

  const saveTelegramSettings = () => {
    localStorage.setItem('telegram_bot_token', telegramToken);
    localStorage.setItem('telegram_chat_id', telegramChatId);
    setShowTelegramModal(false);
    alert('Pengaturan Telegram berhasil disimpan!');
  };

  const handleGenerateVouchers = async () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const dateCode = dateStr.replace(/-/g, '').slice(2); // YYMMDD
    let count = 0;
    const generatedVouchers: string[] = [];
    
    setPromos(prev => {
      const activeEmps = employees.filter(e => e.status === 'Aktif');
      const newPromos = [...prev];
      
      activeEmps.forEach(emp => {
        const firstName = emp.name.split(' ')[0].toUpperCase();
        const code = `EMP-${firstName}-${dateCode}`;
        
        // Cek apakah sudah ada untuk hari ini
        if (!newPromos.find(p => p.code === code && p.validUntil === dateStr)) {
          newPromos.unshift({
            id: `VCH-${emp.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            title: `Voucher Minum ${emp.name}`,
            code,
            type: "Karyawan",
            value: 0,
            validUntil: dateStr,
            status: "Aktif",
            usage: 0,
            employeeId: emp.id,
            shift: "Karyawan" as any // Dummy value
          });
          generatedVouchers.push(`- ${emp.name}: <code>${code}</code>`);
          count++;
        }
      });
      return newPromos;
    });

    if (count > 0) {
      alert(`Berhasil generate ${count} voucher harian! (Kode: EMP-NAMA-TGL)`);
      
      const msg = `🎟 <b>Voucher Minuman Harian Tersedia!</b> 🎟\n\nTanggal: ${dateStr}\n\nBerikut daftar kode voucher karyawan untuk hari ini:\n${generatedVouchers.join('\n')}\n\n<i>Silakan gunakan pada saat checkout. Maksimal 1 minuman gratis per karyawan.</i>`;
      await sendTelegramMessage(msg);
      
    } else {
      alert(`Semua karyawan aktif sudah dibuatkan voucher untuk hari ini.`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto h-full pb-10">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex-wrap gap-4">
        <h2 className="text-2xl font-black text-slate-800">Manajemen Karyawan</h2>
        <div className="flex gap-3 flex-wrap">
          <a href="/kds" target="_blank"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-black text-sm transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Buka KDS
          </a>
          {(!currentUser || currentUser?.role === 'Admin' || currentUser?.role === 'Manajer') && (
            <div className="flex gap-2">
              <button onClick={() => setShowTelegramModal(true)}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-3 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center" title="Pengaturan Notifikasi Telegram">
                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
              </button>
              <button onClick={handleGenerateVouchers}
                className="bg-amber-100 text-amber-800 hover:bg-amber-200 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">local_cafe</span>
                Generate Voucher Harian
              </button>
            </div>
          )}
          <button onClick={() => handleOpen()}
            className="bg-[#4a2d21] text-white hover:bg-[#382016] px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm text-slate-700 min-w-[900px]">
            <thead className="bg-[#fafafa] text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">ID</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Nama</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Role</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">PIN</th>
                <th className="p-5 text-[11px] uppercase tracking-widest">Akses Modul</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Status</th>
                <th className="p-5 text-[11px] uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => {
                const activePerms = PERMISSION_LABELS.filter(p => emp.permissions[p.key]);
                return (
                  <tr key={emp.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                    <td className="p-5 font-black text-[#4a2d21] text-center text-xs">{emp.id}</td>
                    <td className="p-5 font-bold text-slate-800 text-base">{emp.name}</td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1.5 rounded-lg font-bold text-xs ${ROLE_COLORS[emp.role] ?? 'bg-slate-100 text-slate-700'}`}>{emp.role}</span>
                    </td>
                    <td className="p-5 font-mono text-slate-400 font-bold tracking-widest text-center">****</td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-1">
                        {activePerms.length === 0 ? (
                          <span className="text-slate-400 text-xs">Tidak ada</span>
                        ) : activePerms.map(p => (
                          <span key={p.key} className="flex items-center gap-1 px-2 py-0.5 bg-[#f4ece3] text-[#4a2d21] rounded-md text-xs font-bold">
                            <span className="material-symbols-outlined text-[11px]">{p.icon}</span>
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${emp.status === 'Aktif' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleOpenPerm(emp)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Atur Permission">
                          <span className="material-symbols-outlined text-[18px]">shield</span>
                        </button>
                        <button onClick={() => handleOpen(emp)} className="p-2 text-[#4a2d21] hover:bg-[#f4ece3] rounded-lg transition-colors" title="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monitoring Voucher Karyawan */}
      {(!currentUser || currentUser?.role === 'Admin' || currentUser?.role === 'Manajer') && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-4">
          <div className="p-6 border-b border-slate-200 bg-[#fafafa]">
            <h3 className="text-lg font-black text-slate-800">Riwayat & Pemakaian Voucher Karyawan</h3>
            <p className="text-xs text-slate-500">Memantau kupon jatah minuman karyawan yang di-generate hari ini.</p>
          </div>
          <div className="overflow-auto custom-scrollbar flex-1 max-h-[300px]">
            <table className="w-full text-left text-sm text-slate-700 min-w-[700px]">
              <thead className="bg-[#fafafa] text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4 text-[11px] uppercase tracking-widest text-center">Tgl Kadaluarsa</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest">Kode Voucher</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest">Nama Karyawan</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest text-center">Tipe</th>
                  <th className="p-4 text-[11px] uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {promos.filter(p => p.type === 'Karyawan').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">Belum ada voucher karyawan yang di-generate.</td>
                  </tr>
                ) : promos.filter(p => p.type === 'Karyawan').map((promo, idx) => (
                  <tr key={promo.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 !== 0 ? 'bg-[#fafcf5]' : 'bg-white'}`}>
                    <td className="p-4 font-mono text-center text-xs">{promo.validUntil}</td>
                    <td className="p-4 font-bold text-[#4a2d21]">{promo.code}</td>
                    <td className="p-4 font-medium text-slate-800">{promo.title.replace('Voucher Minum ', '').replace(/\s\(.*\)/, '')}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold">Harian</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${promo.status === 'Terpakai' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-green-50 text-green-700 border-green-100'}`}>
                        {promo.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add/Edit Employee Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-8 flex flex-col gap-5">
            <h3 className="font-extrabold text-2xl text-slate-800">{editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan'}</h3>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Nama Lengkap</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Role</label>
              <div className="relative">
                <select value={form.role} onChange={e => handleRoleChange(e.target.value as Employee['role'])} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
                  <option value="Kasir">Kasir</option>
                  <option value="Barista">Barista</option>
                  <option value="Chef">Chef / Dapur</option>
                  <option value="Manajer">Manajer</option>
                  <option value="Admin">Admin</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-500 pointer-events-none">expand_more</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Permission akan diset otomatis sesuai role. Bisa diubah manual via tombol 🔒</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">PIN Akses (4–6 Digit)</label>
              <div className="relative">
                <input 
                  type={showPin ? "text" : "password"} 
                  maxLength={6} 
                  value={form.pin} 
                  onChange={e => setForm({...form, pin: e.target.value.replace(/\D/g, '')})} 
                  className="w-full bg-[#f4ece3] border-none rounded-xl pl-4 pr-12 py-3 font-bold text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-[#4a2d21]" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPin(!showPin)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPin ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 block">Status</label>
              <div className="relative">
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value as any})} className="w-full bg-[#f4ece3] border-none rounded-xl px-4 py-3 font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#4a2d21]">
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-500 pointer-events-none">expand_more</span>
              </div>
            </div>
            <div className="flex gap-4 pt-2 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-[#fcfaf8] hover:bg-[#f4ece3] rounded-2xl font-black text-sm text-slate-600 transition-colors">Batal</button>
              <button onClick={handleSave} className="flex-1 py-4 bg-[#4a2d21] hover:bg-[#382016] text-white rounded-2xl font-black text-sm shadow-md transition-colors">Simpan Data</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permission Modal ── */}
      {showPermModal && permTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg p-8 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ROLE_COLORS[permTarget.role] ?? 'bg-slate-100'}`}>
                <span className="material-symbols-outlined text-2xl">person</span>
              </div>
              <div>
                <h3 className="font-extrabold text-xl text-slate-800">{permTarget.name}</h3>
                <p className="text-sm text-slate-500">{permTarget.role} · Atur akses modul secara manual</p>
              </div>
              <button onClick={() => setShowPermModal(false)} className="ml-auto text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Permission Toggles */}
            <div className="space-y-3">
              {PERMISSION_LABELS.map(p => (
                <div key={p.key}
                  onClick={() => handlePermToggle(p.key)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${permTarget.permissions[p.key] ? 'border-[#4a2d21] bg-[#faf4ef]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${permTarget.permissions[p.key] ? 'bg-[#4a2d21] text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <span className="material-symbols-outlined text-[20px]">{p.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{p.label}</p>
                    <p className="text-xs text-slate-500">{p.desc}</p>
                  </div>
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${permTarget.permissions[p.key] ? 'bg-[#4a2d21]' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permTarget.permissions[p.key] ? 'translate-x-6' : 'translate-x-1'}`}></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Reset to default */}
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button onClick={() => setPermTarget(prev => prev ? { ...prev, permissions: getDefaultPermissions(prev.role) } : null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-sm text-slate-600 transition-colors">
                Reset ke Default
              </button>
              <button onClick={handleSavePerm}
                className="flex-1 py-3 bg-[#4a2d21] hover:bg-[#382016] text-white rounded-2xl font-bold text-sm shadow-md transition-colors">
                Simpan Permission
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Telegram Settings Modal ── */}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#fafafa]">
              <h3 className="text-xl font-black text-slate-800">Pengaturan Telegram</h3>
              <button onClick={() => setShowTelegramModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bot Token</label>
                <input type="text" value={telegramToken} onChange={e => setTelegramToken(e.target.value)} placeholder="Contoh: 123456789:ABCdef..." className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold focus:border-[#4d3227] outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chat ID (Grup)</label>
                <input type="text" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="Contoh: -100123456789" className="w-full border border-slate-300 rounded-xl px-4 py-3 font-bold focus:border-[#4d3227] outline-none" />
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                Dapatkan Bot Token dari <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-500 underline font-bold">@BotFather</a>. Tambahkan bot Anda ke dalam grup karyawan, lalu ambil Chat ID-nya.
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowTelegramModal(false)} className="px-5 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Batal</button>
              <button onClick={saveTelegramSettings} className="bg-[#4d3227] text-white px-5 py-3 rounded-xl font-bold hover:bg-[#3a251d] transition-colors shadow-md">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
