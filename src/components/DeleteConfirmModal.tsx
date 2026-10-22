import React, { useState } from 'react';
import { AlertTriangle, Archive, Trash2, Loader2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  itemName: string;
  onConfirmDelete: () => Promise<void>;
  onConfirmArchive?: () => Promise<void>;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  itemName,
  onConfirmDelete,
  onConfirmArchive,
  isDeleting = false
}) => {
  const [internalSubmitting, setInternalSubmitting] = useState<'delete' | 'archive' | null>(null);

  if (!isOpen) return null;

  const isBusy = isDeleting || internalSubmitting !== null;

  const handleDelete = async () => {
    if (isBusy) return;
    setInternalSubmitting('delete');
    try {
      await onConfirmDelete();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data.');
    } finally {
      setInternalSubmitting(null);
    }
  };

  const handleArchive = async () => {
    if (!onConfirmArchive || isBusy) return;
    setInternalSubmitting('archive');
    try {
      await onConfirmArchive();
    } catch (err: any) {
      alert(err.message || 'Gagal mengarsipkan data.');
    } finally {
      setInternalSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-100">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-center text-slate-900">
            {title}
          </h3>

          <div className="mt-2 text-center text-xs text-slate-600 leading-relaxed">
            <p>{message}</p>
            <p className="mt-2 font-bold text-slate-800 bg-slate-100 p-2 rounded-lg font-mono break-all">
              "{itemName}"
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {onConfirmArchive && (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleArchive}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {internalSubmitting === 'archive' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Sedang Mengarsipkan...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 shrink-0" />
                    <span>Arsipkan Saja (Dapat Dipulihkan)</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={handleDelete}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {internalSubmitting === 'delete' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Sedang Menghapus dari Sistem & Spreadsheet...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Hapus Permanen (Hapus dari Spreadsheet)</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

