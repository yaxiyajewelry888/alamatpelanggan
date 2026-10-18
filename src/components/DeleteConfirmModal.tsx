import React from 'react';
import { AlertTriangle, Archive, Trash2, X } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-center text-slate-900">
            {title}
          </h3>

          <div className="mt-2 text-center text-xs text-slate-600 leading-relaxed">
            <p>{message}</p>
            <p className="mt-2 font-bold text-slate-800 bg-slate-100 p-2 rounded-lg font-mono">
              "{itemName}"
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {onConfirmArchive && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={onConfirmArchive}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Archive className="w-4 h-4" />
                <span>Arsipkan Saja (Dapat Dipulihkan)</span>
              </button>
            )}

            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirmDelete}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Menghapus...' : 'Hapus Permanen (Hapus dari Spreadsheet)'}</span>
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
