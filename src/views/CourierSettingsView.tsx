import React, { useState } from 'react';
import { Courier } from '../types';
import { Truck, Star, Plus, Check, X, Search, Edit2, SlidersHorizontal, Trash2 } from 'lucide-react';
import { COURIER_CATEGORIES } from '../utils/indonesianData';

interface CourierSettingsViewProps {
  couriers: Courier[];
  onUpdateCourier: (courierId: string, updates: Partial<Courier>) => Promise<void>;
  onAddCourier: (courierData: any) => Promise<void>;
  onDeleteCourier?: (courier: Courier) => void;
  refreshCouriers: () => void;
}

export const CourierSettingsView: React.FC<CourierSettingsViewProps> = ({
  couriers,
  onUpdateCourier,
  onAddCourier,
  onDeleteCourier,
  refreshCouriers
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua Kategori');
  const [search, setSearch] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);

  // New courier form
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierCategory, setNewCourierCategory] = useState('Reguler & Ekspres');
  const [newCourierServices, setNewCourierServices] = useState('Reguler, Express');
  const [newIsFavorite, setNewIsFavorite] = useState(false);

  const filtered = couriers.filter(c => {
    if (selectedCategory !== 'Semua Kategori' && c.courier_category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.courier_name.toLowerCase().includes(q) ||
        c.courier_id.toLowerCase().includes(q) ||
        c.services.some(s => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleFavorite = async (c: Courier) => {
    await onUpdateCourier(c.courier_id, { is_favorite: !c.is_favorite });
    refreshCouriers();
  };

  const handleToggleActive = async (c: Courier) => {
    await onUpdateCourier(c.courier_id, { is_active: !c.is_active });
    refreshCouriers();
  };

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourierName.trim()) return;

    try {
      await onAddCourier({
        courier_name: newCourierName.trim(),
        courier_category: newCourierCategory,
        services: newCourierServices.split(',').map(s => s.trim()).filter(Boolean),
        is_favorite: newIsFavorite,
        is_active: true
      });
      setIsAddModalOpen(false);
      setNewCourierName('');
      setNewCourierServices('Reguler, Express');
      refreshCouriers();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan jasa kirim');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourier) return;

    try {
      await onUpdateCourier(editingCourier.courier_id, {
        courier_name: editingCourier.courier_name,
        courier_category: editingCourier.courier_category,
        services: editingCourier.services
      });
      setEditingCourier(null);
      refreshCouriers();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui jasa kirim');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">
            Pengaturan Jasa Kirim Indonesia
          </h1>
          <p className="text-xs text-slate-500">
            Daftar ekspedisi reguler, kargo, instan, internasional, dan kurir toko sendiri
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md shadow-pink-600/20 flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jasa Kirim Baru</span>
        </button>
      </div>

      {/* Filter and Category Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama ekspedisi (JNE, J&T, SiCepat, SPX, GoSend, Lalamove, Kargo...)"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:border-pink-500 outline-none"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {COURIER_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Couriers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(courier => {
          return (
            <div
              key={courier.courier_id}
              className={`bg-white rounded-2xl border p-4.5 shadow-xs flex flex-col justify-between transition-all ${
                courier.is_active ? 'border-slate-200' : 'border-slate-200/50 opacity-60 bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleFavorite(courier)}
                      title={courier.is_favorite ? 'Hapus dari favorit' : 'Tandai sebagai favorit'}
                      className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          courier.is_favorite ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {courier.courier_name}
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-500 block">
                        {courier.courier_category}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    courier.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {courier.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Available Services */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Jenis Layanan:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {courier.services && courier.services.length > 0 ? (
                      courier.services.map((srv, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded"
                        >
                          {srv}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Standar</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleToggleActive(courier)}
                  className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold"
                >
                  {courier.is_active ? 'Nonaktifkan' : 'Aktifkan Kembali'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCourier(courier)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 text-[11px] flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3 text-slate-400" />
                    <span>Edit</span>
                  </button>
                  {onDeleteCourier && (
                    <button
                      onClick={() => onDeleteCourier(courier)}
                      title="Hapus Jasa Kirim"
                      className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Courier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-white">
              <h3 className="font-bold text-slate-900 text-sm">Tambah Jasa Kirim Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateCourier} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Jasa Kirim *</label>
                <input
                  type="text"
                  required
                  value={newCourierName}
                  onChange={e => setNewCourierName(e.target.value)}
                  placeholder="Contoh: Kurir Toko Surabaya / Lion Parcel"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori *</label>
                <select
                  value={newCourierCategory}
                  onChange={e => setNewCourierCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-pink-500"
                >
                  {COURIER_CATEGORIES.filter(c => c !== 'Semua Kategori').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Daftar Layanan (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={newCourierServices}
                  onChange={e => setNewCourierServices(e.target.value)}
                  placeholder="Contoh: Instant, Next Day, Reguler"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-pink-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newIsFavorite}
                  onChange={e => setNewIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500"
                />
                <span className="font-semibold text-slate-700">Tandai sebagai Favorit (Muncul di atas)</span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold"
                >
                  Simpan Jasa Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Courier Modal */}
      {editingCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Edit Jasa Kirim</h3>
              <button onClick={() => setEditingCourier(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Jasa Kirim</label>
                <input
                  type="text"
                  required
                  value={editingCourier.courier_name}
                  onChange={e => setEditingCourier({ ...editingCourier, courier_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={editingCourier.courier_category}
                  onChange={e => setEditingCourier({ ...editingCourier, courier_category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-pink-500"
                >
                  {COURIER_CATEGORIES.filter(c => c !== 'Semua Kategori').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Layanan (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={Array.isArray(editingCourier.services) ? editingCourier.services.join(', ') : ''}
                  onChange={e => setEditingCourier({ 
                    ...editingCourier, 
                    services: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-pink-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCourier(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
