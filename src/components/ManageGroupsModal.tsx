import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  FolderKanban, 
  AlertCircle, 
  Layers, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface ManageGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupsChanged: () => void;
}

export const ManageGroupsModal: React.FC<ManageGroupsModalProps> = ({
  isOpen,
  onClose,
  onGroupsChanged
}) => {
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editedNameValue, setEditedNameValue] = useState('');
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/address-groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setGroups(data.data);
      } else {
        setGroups(['HERMES', 'DIAMOND', 'CHANEL']);
      }
    } catch (err: any) {
      console.error('Failed to load address groups:', err);
      setError('Gagal memuat daftar grup alamat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      setNewGroupName('');
      setEditingGroupName(null);
      setDeleteConfirmGroup(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newGroupName.trim().toUpperCase();
    if (!cleanName) {
      setError('Nama grup tidak boleh kosong.');
      return;
    }

    if (groups.some(g => g.toLowerCase() === cleanName.toLowerCase())) {
      setError(`Grup "${cleanName}" sudah terdaftar.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/address-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName })
      });
      const data = await res.json();
      if (data.success) {
        setNewGroupName('');
        setSuccessMsg(`Grup "${cleanName}" berhasil ditambahkan.`);
        await fetchGroups();
        onGroupsChanged();
      } else {
        setError(data.error || 'Gagal menambahkan grup.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (group: string) => {
    setEditingGroupName(group);
    setEditedNameValue(group);
    setDeleteConfirmGroup(null);
    setError(null);
    setSuccessMsg(null);
  };

  const cancelEditing = () => {
    setEditingGroupName(null);
    setEditedNameValue('');
  };

  const handleSaveEdit = async (oldName: string) => {
    const cleanNewName = editedNameValue.trim().toUpperCase();
    if (!cleanNewName) {
      setError('Nama grup baru tidak boleh kosong.');
      return;
    }

    if (cleanNewName === oldName) {
      cancelEditing();
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/address-groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_name: oldName, new_name: cleanNewName })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Nama grup berhasil diubah menjadi "${cleanNewName}". Semua data alamat terkait telah otomatis diperbarui.`);
        cancelEditing();
        await fetchGroups();
        onGroupsChanged();
      } else {
        setError(data.error || 'Gagal mengubah nama grup.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupName: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/address-groups/${encodeURIComponent(groupName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Grup "${groupName}" berhasil dihapus.`);
        setDeleteConfirmGroup(null);
        await fetchGroups();
        onGroupsChanged();
      } else {
        setError(data.error || 'Gagal menghapus grup.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const getGroupBadgeClass = (name: string) => {
    const upper = name.toUpperCase();
    if (upper === 'HERMES') {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    if (upper === 'DIAMOND') {
      return 'bg-cyan-100 text-cyan-900 border-cyan-300';
    }
    if (upper === 'CHANEL') {
      return 'bg-rose-100 text-rose-900 border-rose-300';
    }
    return 'bg-purple-100 text-purple-900 border-purple-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/70 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kelola Grup Alamat
              </h2>
              <p className="text-xs text-slate-500">
                Grup utama: HERMES, DIAMOND, CHANEL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Group Form */}
          <form onSubmit={handleAddGroup} className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tambah Grup Baru
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value.toUpperCase())}
                placeholder="Contoh: HERMES, DIAMOND, CHANEL"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none uppercase"
              />
              <button
                type="submit"
                disabled={isLoading || !newGroupName.trim()}
                className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </button>
            </div>
          </form>

          {/* Group List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Grup Alamat Aktif ({groups.length})
              </span>
              <button
                type="button"
                onClick={fetchGroups}
                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                title="Muat ulang"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Segarkan</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 max-h-72 overflow-y-auto">
              {groups.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Belum ada grup alamat. Tambahkan grup di atas.
                </div>
              ) : (
                groups.map(group => {
                  const isEditing = editingGroupName === group;
                  const isConfirmingDelete = deleteConfirmGroup === group;

                  return (
                    <div
                      key={group}
                      className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editedNameValue}
                            onChange={e => setEditedNameValue(e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-pink-400 text-xs font-bold focus:ring-2 focus:ring-pink-100 outline-none uppercase"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(group)}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                            title="Simpan Nama Baru"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Batal"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div className="flex-1 flex items-center justify-between gap-2 p-1.5 bg-rose-50 rounded-lg border border-rose-200">
                          <span className="text-[11px] text-rose-800 font-medium">
                            Hapus grup <strong>{group}</strong>? Alamat akan menjadi tanpa grup.
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group)}
                              className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition-colors"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmGroup(null)}
                              className="px-2 py-1 rounded border border-slate-300 text-slate-700 text-[11px] hover:bg-white transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <span className={`px-3 py-1 rounded-lg text-xs font-black border tracking-wide uppercase shadow-2xs ${getGroupBadgeClass(group)}`}>
                              {group}
                            </span>
                            {['HERMES', 'DIAMOND', 'CHANEL'].includes(group.toUpperCase()) && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Edit Name Button */}
                            <button
                              type="button"
                              onClick={() => startEditing(group)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title={`Ubah nama grup "${group}"`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete Group Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmGroup(group)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title={`Hapus grup "${group}"`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              * Mengubah nama grup akan otomatis memperbarui seluruh data pelanggan dan alamat yang terkait.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
