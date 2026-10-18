import React, { useState } from 'react';
import { 
  X, 
  ClipboardPaste, 
  Sparkles, 
  Check, 
  Trash2, 
  Plus, 
  AlertCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { parseTabularText, parseSingleAddressText, ParsedAddressEntry } from '../utils/addressParser';

interface QuickPasteAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCompleted: () => void;
  availableGroups?: string[];
}

export const QuickPasteAddressModal: React.FC<QuickPasteAddressModalProps> = ({
  isOpen,
  onClose,
  onSaveCompleted,
  availableGroups = ['HERMES', 'DIAMOND', 'CHANEL']
}) => {
  const [inputText, setInputText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedAddressEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = (text: string) => {
    setInputText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    try {
      // Determine if multi-row tabular or single labelled
      let results: ParsedAddressEntry[] = [];
      if (text.includes('\t') || text.includes(';') || (text.includes(',') && text.split('\n').length > 1)) {
        results = parseTabularText(text);
      } else {
        // Try tabular first, if only 1 item, try single parser
        const multi = parseTabularText(text);
        if (multi.length > 0 && (multi[0].recipientName || multi[0].customerId)) {
          results = multi;
        } else {
          results = [parseSingleAddressText(text)];
        }
      }

      setParsedRows(results);
      setErrorMsg(null);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Gagal memproses teks: ' + e.message);
    }
  };

  const handleUpdateRow = (index: number, field: keyof ParsedAddressEntry, value: string) => {
    setParsedRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBlankRow = () => {
    setParsedRows(prev => [
      ...prev,
      {
        customerId: '',
        recipientName: '',
        phone: '',
        fullAddress: '',
        city: 'Jakarta Barat',
        province: 'DKI Jakarta',
        courier: 'JNE',
        groupName: ''
      }
    ]);
  };

  const handleSubmit = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg('Belum ada data alamat yang terbaca untuk disimpan.');
      return;
    }

    // Validate that every row has at least an ID or a Name or an Address
    for (let i = 0; i < parsedRows.length; i++) {
      const r = parsedRows[i];
      if (!r.recipientName && !r.customerId && !r.fullAddress) {
        setErrorMsg(`Baris ${i + 1} tidak memiliki Nama, ID Pelanggan, atau Alamat.`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/import/quick-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedRows })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Gagal menyimpan data');
      }

      setSuccessMsg(data.message || 'Semua data berhasil disimpan & disinkronkan ke Spreadsheet!');
      setTimeout(() => {
        onSaveCompleted();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadExample1 = () => {
    const sample = `PL4968\tAdhe fitra\t083181417949\tBlok Cempaka RT 003 RW 002 Desa Jatitengah\tMajalengka\tJawa Barat\tJ&T
PL8180\tBulan Sari\t081299887766\tJl. Melati No. 12 RT 01 RW 04\tBandung\tJawa Barat\tJNE
OL210\tCitra Dewi\t085712345678\tRuko Grand Galaxy Blok B5\tBekasi\tJawa Barat\tSiCepat`;
    handleParse(sample);
  };

  const loadExample2 = () => {
    const sample = `ID Pelanggan: PL4968
Nama Penerima: Adhe fitra
No HP: 083181417949
Alamat: Blok Cempaka RT 003 RW 002 Desa Jatitengah Kec. Jatitujuh Kab. Majalengka
Kota: Majalengka
Provinsi: Jawa Barat
Kurir: J&T
Grup: HERMES`;
    handleParse(sample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/70 via-rose-50/40 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shadow-xs">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Tempel Data Alamat Cepat (Auto-Detect ID & Alamat)</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 tracking-wider">
                  Multi-Format
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Salin baris dari Google Sheets / Excel atau chat WhatsApp, lalu tempel di sini. ID Pelanggan manual & alamat akan terbaca otomatis!
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

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-bold animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Paste Input Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                <span>Kotak Salin & Tempel Teks:</span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Coba Contoh:</span>
                <button
                  type="button"
                  onClick={loadExample1}
                  className="px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 font-semibold text-slate-600 transition-colors"
                >
                  Contoh Spreadsheet (Tab)
                </button>
                <button
                  type="button"
                  onClick={loadExample2}
                  className="px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 font-semibold text-slate-600 transition-colors"
                >
                  Contoh Teks WhatsApp (Label)
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={inputText}
              onChange={e => handleParse(e.target.value)}
              placeholder="Tempel baris dari Excel/Spreadsheet (misal: PL4968	Adhe fitra	083181417949	Blok Cempaka...) atau teks berlabel WhatsApp di sini..."
              className="w-full p-3.5 rounded-xl border border-slate-300 font-mono text-xs focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
            />
            <p className="text-[11px] text-slate-500">
              💡 Sistem otomatis membaca kolom ID Pelanggan, Nama, No. HP, Alamat, Kota, Provinsi, dan Jasa Kirim. Anda dapat memeriksa dan mengedit kolom di bawah sebelum disimpan.
            </p>
          </div>

          {/* Preview Table of Detected Entries */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hasil Baca Sistem ({parsedRows.length} Data Siap Disimpan)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Manual</span>
              </button>
            </div>

            {parsedRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Silakan tempel teks di kotak atas untuk melihat pratinjau data di sini.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5 w-28">ID Pelanggan *</th>
                        <th className="p-2.5 w-36">Nama Pelanggan / Penerima *</th>
                        <th className="p-2.5 w-28">No. Telepon *</th>
                        <th className="p-2.5">Alamat Lengkap *</th>
                        <th className="p-2.5 w-28">Kota / Kab *</th>
                        <th className="p-2.5 w-24">Kurir</th>
                        <th className="p-2.5 w-24">Grup</th>
                        <th className="p-2.5 w-10 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-medium">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-pink-50/30 transition-colors">
                          <td className="p-2 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.customerId || ''}
                              onChange={e => handleUpdateRow(idx, 'customerId', e.target.value.trim())}
                              placeholder="Ketik ID (PL...)"
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-mono font-bold text-pink-700 bg-pink-50/40 focus:bg-white focus:border-pink-500 outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.recipientName || row.customerName || ''}
                              onChange={e => {
                                handleUpdateRow(idx, 'recipientName', e.target.value);
                                handleUpdateRow(idx, 'customerName', e.target.value);
                              }}
                              placeholder="Nama Penerima"
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:border-pink-500 outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.phone || ''}
                              onChange={e => handleUpdateRow(idx, 'phone', e.target.value)}
                              placeholder="08..."
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-mono focus:border-pink-500 outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.fullAddress || ''}
                              onChange={e => handleUpdateRow(idx, 'fullAddress', e.target.value)}
                              placeholder="Alamat jalan, RT/RW, Desa/Kec"
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:border-pink-500 outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.city || ''}
                              onChange={e => handleUpdateRow(idx, 'city', e.target.value)}
                              placeholder="Kota/Kab"
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:border-pink-500 outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.courier || 'JNE'}
                              onChange={e => handleUpdateRow(idx, 'courier', e.target.value.toUpperCase())}
                              placeholder="JNE, J&T..."
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs uppercase font-bold focus:border-pink-500 outline-none"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.groupName || ''}
                              onChange={e => handleUpdateRow(idx, 'groupName', e.target.value)}
                              className="w-full px-1.5 py-1 rounded border border-slate-200 text-xs font-semibold focus:border-pink-500 outline-none bg-white"
                            >
                              <option value="">(Kosong)</option>
                              {availableGroups.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            Total <strong>{parsedRows.length}</strong> data siap ditambahkan ke database & disinkronkan ke Google Spreadsheet.
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex-1 sm:flex-initial"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || parsedRows.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-pink-600/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all flex-1 sm:flex-initial"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan ke Sistem & Spreadsheet...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan & Terapkan Data ({parsedRows.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
