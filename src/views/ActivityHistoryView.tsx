import React, { useState, useEffect } from 'react';
import { ActivityLog } from '../types';
import { Activity, RotateCcw, Search, Clock, Tag } from 'lucide-react';

interface ActivityHistoryViewProps {
  refreshTrigger: number;
}

export const ActivityHistoryView: React.FC<ActivityHistoryViewProps> = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [refreshTrigger]);

  const filtered = logs.filter(log => {
    if (filterType !== 'all' && log.action_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.description.toLowerCase().includes(q) ||
        log.action_type.toLowerCase().includes(q) ||
        (log.entity_id && log.entity_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getActionBadge = (type: ActivityLog['action_type']) => {
    switch (type) {
      case 'TAMBAH_PELANGGAN':
      case 'TAMBAH_ALAMAT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EDIT_PELANGGAN':
      case 'EDIT_ALAMAT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ARSIP_PELANGGAN':
      case 'ARSIP_ALAMAT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HAPUS_PELANGGAN':
      case 'HAPUS_ALAMAT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CETAK_LABEL':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'SINKRONISASI':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'IMPOR_DATA':
      case 'EKSPOR_DATA':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">
            Riwayat Aktivitas & Audit Sistem
          </h1>
          <p className="text-xs text-slate-500">
            Pencatatan lengkap perubahan data pelanggan, alamat, cetak label, dan sinkronisasi
          </p>
        </div>
        <button
          onClick={fetchActivities}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari aktivitas atau deskripsi..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 outline-none"
          />
        </div>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
        >
          <option value="all">Semua Jenis Aksi</option>
          <option value="TAMBAH_PELANGGAN">Tambah Pelanggan</option>
          <option value="EDIT_PELANGGAN">Edit Pelanggan</option>
          <option value="TAMBAH_ALAMAT">Tambah Alamat</option>
          <option value="EDIT_ALAMAT">Edit Alamat</option>
          <option value="HAPUS_ALAMAT">Hapus Alamat</option>
          <option value="CETAK_LABEL">Cetak Label</option>
          <option value="IMPOR_DATA">Impor Data</option>
          <option value="EKSPOR_DATA">Ekspor Data</option>
        </select>
      </div>

      {/* Timeline List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Memuat aktivitas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Belum ada log aktivitas yang cocok.
          </div>
        ) : (
          filtered.map(log => (
            <div key={log.log_id} className="p-4.5 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold border shrink-0 uppercase tracking-wider ${getActionBadge(log.action_type)}`}>
                  {log.action_type.replace(/_/g, ' ')}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 leading-snug">
                    {log.description}
                  </p>
                  {log.entity_id && (
                    <span className="font-mono text-[10px] text-pink-700 bg-pink-50 px-1.5 py-0.2 rounded mt-1 inline-block">
                      Ref: {log.entity_id}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 shrink-0 whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-300" />
                <span>{log.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
