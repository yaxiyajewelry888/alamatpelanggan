import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  FileCheck, 
  ArrowRight,
  Database,
  Cloud,
  RefreshCw,
  Copy,
  ExternalLink,
  Check,
  Server,
  Zap,
  HelpCircle,
  Code,
  ClipboardPaste,
  Trash2,
  Plus,
  Sparkles
} from 'lucide-react';
import { parseTabularText, parseSingleAddressText, ParsedAddressEntry } from '../utils/addressParser';

interface ImportExportViewProps {
  onImportCompleted: () => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({ onImportCompleted }) => {
  const [activeTab, setActiveTab] = useState<'spreadsheet_sync' | 'quick_paste' | 'export_file' | 'import_file'>('spreadsheet_sync');

  // Spreadsheet Sync State
  const [appsScriptUrl, setAppsScriptUrl] = useState('https://script.google.com/macros/s/AKfycbymST6-L81TVqQ1XHvf2pi68pllwjut4BQtidADPi-jIaoEDf45HsIEBCxMkMrf7DwV5w/exec');
  const [spreadsheetId, setSpreadsheetId] = useState('1Q0xxgKTDv4AhSQKt2mJdqnuxm1U3AuWAHJ89ArlHx-Q');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [isPushingData, setIsPushingData] = useState(false);
  const [isPullingData, setIsPullingData] = useState(false);
  const [isCleaningDummy, setIsCleaningDummy] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: any } | null>(null);
  const [codeGsContent, setCodeGsContent] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  // File Export State
  const [exportType, setExportType] = useState<'combined' | 'customers' | 'addresses'>('combined');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  // File Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'new_id' | 'skip'>('update');
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Paste State
  const [pasteRawText, setPasteRawText] = useState('');
  const [quickPasteRows, setQuickPasteRows] = useState<ParsedAddressEntry[]>([]);
  const [isSavingQuickPaste, setIsSavingQuickPaste] = useState(false);
  const [quickPasteMsg, setQuickPasteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [availableGroups, setAvailableGroups] = useState<string[]>(['HERMES', 'DIAMOND', 'CHANEL']);

  useEffect(() => {
    fetch('/api/address-groups')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) setAvailableGroups(d.data);
      })
      .catch(() => {});
  }, []);

  const handleParseQuickPaste = (text: string) => {
    setPasteRawText(text);
    if (!text.trim()) {
      setQuickPasteRows([]);
      return;
    }
    try {
      let results: ParsedAddressEntry[] = [];
      if (text.includes('\t') || text.includes(';') || (text.includes(',') && text.split('\n').length > 1)) {
        results = parseTabularText(text);
      } else {
        const multi = parseTabularText(text);
        if (multi.length > 0 && (multi[0].recipientName || multi[0].customerId)) {
          results = multi;
        } else {
          results = [parseSingleAddressText(text)];
        }
      }
      setQuickPasteRows(results);
      setQuickPasteMsg(null);
    } catch (e: any) {
      setQuickPasteMsg({ type: 'error', text: 'Gagal membaca format teks: ' + e.message });
    }
  };

  const handleCommitQuickPaste = async () => {
    if (quickPasteRows.length === 0) return;
    setIsSavingQuickPaste(true);
    setQuickPasteMsg(null);
    try {
      const res = await fetch('/api/import/quick-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: quickPasteRows })
      });
      const data = await res.json();
      if (data.success) {
        setQuickPasteMsg({ type: 'success', text: data.message || 'Semua data berhasil disimpan & disinkronkan ke Google Spreadsheet!' });
        setPasteRawText('');
        setQuickPasteRows([]);
        onImportCompleted();
      } else {
        setQuickPasteMsg({ type: 'error', text: data.error || 'Gagal menyimpan data.' });
      }
    } catch (err: any) {
      setQuickPasteMsg({ type: 'error', text: err.message || 'Gagal menyimpan data.' });
    } finally {
      setIsSavingQuickPaste(false);
    }
  };

  // Load Spreadsheet Config & code.gs content
  useEffect(() => {
    fetch('/api/spreadsheet/config')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          if (d.data.apps_script_url) setAppsScriptUrl(d.data.apps_script_url);
          if (d.data.spreadsheet_id) setSpreadsheetId(d.data.spreadsheet_id);
        }
      })
      .catch(() => {});

    fetch('/api/spreadsheet/code-gs')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.code) {
          setCodeGsContent(d.code);
        }
      })
      .catch(() => {});
  }, []);

  // Save Apps Script URL
  const handleSaveAppsScriptUrl = async () => {
    if (!appsScriptUrl.trim()) {
      setSyncStatusMsg({ type: 'error', text: 'Masukkan URL Web App Google Apps Script terlebih dahulu.' });
      return;
    }

    setIsSavingUrl(true);
    setSyncStatusMsg(null);

    try {
      const res = await fetch('/api/spreadsheet/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apps_script_url: appsScriptUrl.trim(),
          spreadsheet_id: spreadsheetId.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatusMsg({ type: 'success', text: 'Konfigurasi Google Apps Script & Spreadsheet ID berhasil disimpan!' });
      } else {
        setSyncStatusMsg({ type: 'error', text: data.error || 'Gagal menyimpan URL' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: err.message || 'Gagal menyimpan URL' });
    } finally {
      setIsSavingUrl(false);
    }
  };

  // Test Ping Connection
  const handleTestConnection = async () => {
    if (!appsScriptUrl.trim()) {
      setSyncStatusMsg({ type: 'error', text: 'Masukkan URL Web App Google Apps Script sebelum menguji koneksi.' });
      return;
    }

    setIsTestingUrl(true);
    setSyncStatusMsg({ type: 'info', text: 'Menguji koneksi ke Google Spreadsheet...' });

    try {
      const res = await fetch('/api/spreadsheet/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: appsScriptUrl.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Koneksi Berhasil! Terhubung ke Google Spreadsheet "${data.data?.spreadsheetName || 'Yaxiya Jewelry'}" (${data.latencyMs} ms). Database siap digunakan.`
        });
      } else {
        setSyncStatusMsg({ type: 'error', text: data.error || 'Google Apps Script merespon tetapi mengembalikan status gagal.' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: `Koneksi gagal: ${err.message}` });
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Push All Data (Kirim Semua Data ke Spreadsheet)
  const handlePushAllData = async () => {
    setIsPushingData(true);
    setSyncStatusMsg({ type: 'info', text: 'Mengirim seluruh data pelanggan, alamat, kurir, dan pengaturan ke Google Spreadsheet...' });

    try {
      const res = await fetch('/api/spreadsheet/sync-push', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Berhasil! Seluruh data (${data.counts.customers} Pelanggan, ${data.counts.addresses} Alamat, ${data.counts.couriers} Jasa Kirim, ${data.counts.prints} Riwayat Cetak) telah tersimpan aman di Google Spreadsheet Anda!`
        });
        onImportCompleted();
      } else {
        setSyncStatusMsg({ type: 'error', text: data.error || 'Gagal mengirim data ke spreadsheet.' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: err.message || 'Gagal mengirim data.' });
    } finally {
      setIsPushingData(false);
    }
  };

  // Pull All Data (Tarik Semua Data dari Spreadsheet)
  const handlePullAllData = async () => {
    if (!confirm('Tarik semua data dari Google Spreadsheet? Data lokal akan diperbarui mengikuti data di Google Spreadsheet.')) {
      return;
    }

    setIsPullingData(true);
    setSyncStatusMsg({ type: 'info', text: 'Mengunduh dan memperbarui data dari Google Spreadsheet ke sistem...' });

    try {
      const res = await fetch('/api/spreadsheet/sync-pull', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Sinkronisasi Selesai! Berhasil memuat ${data.data.customers} Pelanggan, ${data.data.addresses} Alamat, dan ${data.data.couriers} Jasa Kirim dari Google Spreadsheet.`
        });
        onImportCompleted();
      } else {
        setSyncStatusMsg({ type: 'error', text: data.error || 'Gagal menarik data dari spreadsheet.' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: err.message || 'Gagal menarik data.' });
    } finally {
      setIsPullingData(false);
    }
  };

  // Clean Dummy Data & Sync clean state to Google Spreadsheet
  const handleCleanDummyData = async () => {
    setIsCleaningDummy(true);
    setSyncStatusMsg({ type: 'info', text: 'Membersihkan data dummy & menyinkronkan Google Spreadsheet...' });

    try {
      const res = await fetch('/api/spreadsheet/clean-dummy', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Data dummy berhasil dibersihkan! Sistem & Google Spreadsheet kini bersih dan siap untuk data riil.`
        });
        onImportCompleted();
      } else {
        setSyncStatusMsg({ type: 'error', text: data.error || 'Gagal membersihkan data dummy.' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ type: 'error', text: err.message || 'Gagal membersihkan data dummy.' });
    } finally {
      setIsCleaningDummy(false);
    }
  };

  // Copy code.gs to clipboard
  const handleCopyCodeGs = () => {
    if (!codeGsContent) return;
    navigator.clipboard.writeText(codeGsContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Download code.gs file
  const handleDownloadCodeGs = () => {
    const blob = new Blob([codeGsContent], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'code.gs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Handlers for File Import / Export ---
  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    const headers = [
      'customer_id',
      'customer_name',
      'primary_phone',
      'group_name',
      'notes',
      'address_id',
      'address_label',
      'recipient_name',
      'recipient_phone',
      'full_address',
      'village',
      'district',
      'city',
      'province',
      'postal_code',
      'shipping_courier',
      'shipping_service',
      'shipping_notes'
    ];

    const sampleRow = [
      'YX-000130',
      'Mega Permatasari',
      '081234567890',
      'HERMES',
      'Pelanggan Set Perhiasan Emas',
      'ADDR-000201',
      'Rumah',
      'Mega Permatasari',
      '081234567890',
      'Jl. Melati No. 15, RT 02 / RW 03',
      'Menteng',
      'Menteng',
      'Jakarta Pusat',
      'DKI Jakarta',
      '10310',
      'JNE',
      'YES (Yakin Esok Sampai)',
      'Jangan dibanting'
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), sampleRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Template_Import_Yaxiya_Jewelry.${format === 'csv' ? 'csv' : 'csv'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg(null);
    setImportResult(null);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/api/import/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: base64,
            filename: file.name
          })
        });
        const data = await res.json();
        if (data.success) {
          setPreviewData({
            ...data,
            base64Data: base64
          });
        } else {
          setErrorMsg(data.error || 'Gagal memproses berkas');
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca berkas');
      setIsUploading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData || !previewData.base64Data) return;
    setIsCommitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: previewData.base64Data,
          duplicateStrategy
        })
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data.data);
        setPreviewData(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onImportCompleted();
      } else {
        setErrorMsg(data.error || 'Gagal menyimpan data import');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengimpor');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleTriggerExport = () => {
    window.location.href = `/api/export?type=${exportType}&format=${exportFormat}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display">
          Database & Sinkronisasi Data
        </h1>
        <p className="text-xs text-slate-500">
          Simpan semua data sistem ke Google Spreadsheet, hubungkan dengan deployment Vercel, serta impor & ekspor data Excel / CSV.
        </p>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('spreadsheet_sync')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'spreadsheet_sync'
              ? 'border-pink-600 text-pink-700 bg-pink-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Cloud className="w-4 h-4 text-pink-600" />
          <span>Google Spreadsheet & code.gs (Cloud Database & Vercel)</span>
          {appsScriptUrl && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quick_paste')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'quick_paste'
              ? 'border-pink-600 text-pink-700 bg-pink-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <ClipboardPaste className="w-4 h-4 text-pink-600" />
          <span>Tempel Data Cepat (Copy-Paste Langsung)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-pink-100 text-pink-700 uppercase tracking-wider">Auto-Detect</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export_file')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'export_file'
              ? 'border-pink-600 text-pink-700 bg-pink-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Ekspor File (Excel / CSV)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('import_file')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'import_file'
              ? 'border-pink-600 text-pink-700 bg-pink-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-t-xl'
          }`}
        >
          <Upload className="w-4 h-4 text-slate-500" />
          <span>Impor File (Excel / CSV)</span>
        </button>
      </div>

      {/* TAB 1: GOOGLE SPREADSHEET & CODE.GS */}
      {activeTab === 'spreadsheet_sync' && (
        <div className="space-y-6">
          {/* Status Message */}
          {syncStatusMsg && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-xs ${
              syncStatusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : syncStatusMsg.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              {syncStatusMsg.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {syncStatusMsg.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              {syncStatusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />}
              <div className="flex-1">
                <span className="font-semibold">{syncStatusMsg.text}</span>
              </div>
              <button onClick={() => setSyncStatusMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
          )}

          {/* URL Configuration & Cloud Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Web App URL Configuration */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Google Spreadsheet & Background Sync
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Database cloud permanen — tersinkron otomatis di latar belakang
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Otomatis di Latar Belakang
                </span>
              </div>

              {/* Permanent Sync Active Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Sinkronisasi Otomatis Aktif:</span> Setiap tambah pelanggan, edit data, hapus data, dan cetak label langsung terkirim dan tersinkron ke Google Spreadsheet secara instan tanpa perlu tindakan manual.
                </div>
              </div>

              {/* Spreadsheet ID & Direct Link */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    ID Google Spreadsheet (Permanen)
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 select-all">
                    {spreadsheetId}
                  </span>
                </div>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition-colors shadow-2xs self-start sm:self-auto"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Buka Spreadsheet</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  API URL Web App Google Apps Script (Permanen)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={appsScriptUrl}
                    onChange={e => setAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:ring-2 focus:ring-pink-100 focus:border-pink-500 bg-slate-50/50"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveAppsScriptUrl}
                      disabled={isSavingUrl}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold disabled:opacity-50 transition-colors shadow-2xs whitespace-nowrap"
                    >
                      {isSavingUrl ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTestingUrl || !appsScriptUrl}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-50 transition-colors whitespace-nowrap flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                      <span>Uji Koneksi</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid: Push, Pull & Clean Dummy Data */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={handlePushAllData}
                  disabled={isPushingData || !appsScriptUrl}
                  className="p-3 rounded-xl border border-pink-200 bg-pink-50/50 hover:bg-pink-100/60 text-left transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-pink-950 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-pink-600" />
                      <span>Kirim Semua Data</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-pink-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[10px] text-pink-800 leading-snug">
                    Push seluruh data sistem ke Google Spreadsheet.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handlePullAllData}
                  disabled={isPullingData || !appsScriptUrl}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-left transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Tarik Semua Data</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[10px] text-slate-600 leading-snug">
                    Tarik data dari Google Spreadsheet ke sistem website.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleCleanDummyData}
                  disabled={isCleaningDummy}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-left transition-all disabled:opacity-50 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Bersihkan Data Dummy</span>
                    </span>
                    <Check className="w-3 h-3 text-amber-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-[10px] text-amber-800 leading-snug">
                    {isCleaningDummy ? 'Sedang membersihkan...' : 'Bersihkan data dummy dari sistem & spreadsheet.'}
                  </p>
                </button>
              </div>
            </div>

            {/* Right: File code.gs Actions & Quick Copy */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                  <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-pink-400" />
                    <h3 className="text-sm font-bold text-white">File code.gs Sinkronisasi</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">
                    Siap Pakai
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  File <strong>code.gs</strong> sudah dibuat dan tersinkronisasi 100% dengan struktur database Yaxiya Jewelry: tabel Pelanggan, Alamat, Grup, Ekspedisi, dan Pengaturan.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCodeGs}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Tersalin ke Clipboard!' : 'Salin Kode code.gs'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCodeGs}
                    className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    title="Unduh file code.gs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh .gs</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCodePreview(!showCodePreview)}
                  className="w-full text-center text-xs text-pink-300 hover:text-pink-200 underline py-1"
                >
                  {showCodePreview ? 'Sembunyikan Preview Kode' : 'Lihat / Periksa Kode code.gs'}
                </button>
              </div>

              {/* Code Preview Drawer if opened */}
              {showCodePreview && (
                <div className="mt-2 p-3 bg-black/60 rounded-xl border border-slate-700 max-h-48 overflow-y-auto text-[10px] font-mono text-slate-300 leading-tight">
                  <pre>{codeGsContent.slice(0, 1500)}...</pre>
                </div>
              )}
            </div>
          </div>

          {/* STEP BY STEP GUIDE: DEPLOY TO GOOGLE APPS SCRIPT & VERCEL */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Zap className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">
                Panduan Praktis: Deploy ke Vercel & Sinkronisasi Google Spreadsheet
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* STEP 1: GOOGLE APPS SCRIPT */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-pink-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Pasang code.gs di Google Spreadsheet (2 Menit)
                  </h3>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Buka Google Spreadsheet baru atau yang sudah ada di akun Google Anda.</li>
                  <li>Klik menu <strong>Ekstensi (Extensions)</strong> &gt; pilih <strong>Apps Script</strong>.</li>
                  <li>Hapus kode bawaan (jika ada), lalu klik tombol <strong>"Salin Kode code.gs"</strong> di atas dan tempel (paste) ke editor.</li>
                  <li>Simpan proyek dengan menekan tombol <strong>Simpan (Ctrl+S / Cmd+S)</strong>.</li>
                  <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas &gt; pilih <strong>Penerapan Baru (New deployment)</strong>.</li>
                  <li>Pilih jenis <strong>Aplikasi Web (Web app)</strong>.</li>
                  <li>
                    Atur:
                    <br />• <strong>Jalankan sebagai:</strong> Saya (akun Google Anda)
                    <br />• <strong>Yang memiliki akses:</strong> <strong className="text-pink-700 font-bold">Siapa saja (Anyone)</strong>
                  </li>
                  <li>Klik <strong>Terapkan</strong>, lalu setujui izin akses (Authorize access).</li>
                  <li>Salin <strong>URL Aplikasi Web</strong> yang berakhiran <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">/exec</code> dan tempelkan ke kolom URL di atas, lalu klik <strong>"Simpan URL"</strong> dan <strong>"Kirim Semua Data"</strong>!</li>
                </ol>
              </div>

              {/* STEP 2: VERCEL DEPLOYMENT */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Deploy ke Vercel (Gratis & Otomatis)
                  </h3>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Konfigurasi Vercel (<code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">vercel.json</code> dan <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">api/index.ts</code>) sudah otomatis disiapkan di sistem ini.</li>
                  <li>Unggah kode aplikasi ini ke repository <strong>GitHub</strong> Anda.</li>
                  <li>Buka <strong>vercel.com</strong> &gt; klik <strong>Add New Project</strong> &gt; pilih repository Anda.</li>
                  <li>
                    Di bagian <strong>Environment Variables</strong> di Vercel, Anda dapat menambahkan:
                    <br />• <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">GOOGLE_APPS_SCRIPT_URL</code>: (URL Web App code.gs Anda)
                  </li>
                  <li>Klik <strong>Deploy</strong>. Vercel akan otomatis meng-compile aplikasi.</li>
                  <li>
                    Setelah aktif di Vercel:
                    <br />• Semua perubahan data akan otomatis tersimpan permanen di Google Spreadsheet Anda.
                    <br />• Kapan pun Anda membuka website di Vercel, Anda dapat menekan tombol <strong>"Tarik Semua Data (Pull All)"</strong> untuk menyelaraskan data seketika!
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPORT FILE */}
      {activeTab === 'export_file' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-2xl space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ekspor Data ke File Spreadsheet (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-500">
                Unduh seluruh rekaman pelanggan, multi-alamat, dan grup ke file lokal di komputer Anda.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Pilihan Data yang Diekspor:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportType('combined')}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                    exportType === 'combined'
                      ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  Semua Data Lengkap
                </button>
                <button
                  type="button"
                  onClick={() => setExportType('customers')}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                    exportType === 'customers'
                      ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  Hanya Pelanggan
                </button>
                <button
                  type="button"
                  onClick={() => setExportType('addresses')}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all ${
                    exportType === 'addresses'
                      ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  Hanya Alamat
                </button>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Format Berkas:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat('xlsx')}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                    exportFormat === 'xlsx'
                      ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Microsoft Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 font-semibold transition-all ${
                    exportFormat === 'csv'
                      ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Comma Separated (.csv)</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleTriggerExport}
                className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-md shadow-pink-600/20 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File {exportFormat.toUpperCase()} Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMPORT FILE */}
      {activeTab === 'import_file' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Impor Data Massal dari File Excel / CSV
                </h2>
                <p className="text-xs text-slate-500">
                  Tambahkan banyak data pelanggan dan alamat sekaligus dari berkas Excel atau CSV.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
              <span className="text-slate-600">Butuh format kolom yang sesuai?</span>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="font-bold text-pink-600 hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template Contoh</span>
              </button>
            </div>

            {/* Dropzone */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
                id="file-import-input"
              />
              <label
                htmlFor="file-import-input"
                className="border-2 border-dashed border-slate-300 hover:border-pink-400 hover:bg-pink-50/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center block"
              >
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Pilih Berkas Excel atau CSV'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Mendukung format .xlsx, .xls, atau .csv (Maks. 50MB)
                </span>
              </label>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {importResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  Impor Berhasil: <strong>{importResult.importedCustomers}</strong> pelanggan dan <strong>{importResult.importedAddresses}</strong> alamat berhasil dimasukkan ke database!
                </span>
              </div>
            )}
          </div>

          {/* Import Preview Modal / Box if file uploaded */}
          {previewData && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-4 max-w-4xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Preview Validasi Berkas Impor: "{previewData.filename}"</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Terdeteksi: <strong>{previewData.totalRows}</strong> baris data · <strong>{previewData.detectedCustomers}</strong> pelanggan · <strong>{previewData.detectedAddresses}</strong> alamat
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-lg">
                  {previewData.duplicateCustomersCount} ID Duplikat Terdeteksi
                </span>
              </div>

              {/* Strategy selection for duplicates */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-700">Strategi Penanganan ID Duplikat:</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="strat"
                      checked={duplicateStrategy === 'update'}
                      onChange={() => setDuplicateStrategy('update')}
                      className="text-pink-600"
                    />
                    <span>Perbarui data lama jika ID sudah ada (Update)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="strat"
                      checked={duplicateStrategy === 'new_id'}
                      onChange={() => setDuplicateStrategy('new_id')}
                      className="text-pink-600"
                    />
                    <span>Buatkan ID baru otomatis untuk data kembar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="strat"
                      checked={duplicateStrategy === 'skip'}
                      onChange={() => setDuplicateStrategy('skip')}
                      className="text-pink-600"
                    />
                    <span>Lewati baris yang ID-nya sudah ada (Skip)</span>
                  </label>
                </div>
              </div>

              {/* Sample Rows Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold text-[11px]">
                      {previewData.columns.slice(0, 6).map((col: string) => (
                        <th key={col} className="p-2 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.previewRows.map((row: any, rIdx: number) => (
                      <tr key={rIdx} className="hover:bg-slate-50">
                        {previewData.columns.slice(0, 6).map((col: string) => (
                          <td key={col} className="p-2 text-slate-600 truncate max-w-xs">{String(row[col] || '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Commit Action */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewData(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={isCommitting}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md shadow-pink-600/20 disabled:opacity-50"
                >
                  {isCommitting ? 'Menyimpan ke Database...' : 'Konfirmasi & Masukkan Data ke Database'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUICK PASTE TABLE & TEXT (DIRECT COPY-PASTE) */}
      {activeTab === 'quick_paste' && (
        <div className="space-y-6">
          {/* Notification Messages */}
          {quickPasteMsg && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-xs ${
              quickPasteMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              {quickPasteMsg.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="font-semibold">{quickPasteMsg.text}</span>
            </div>
          )}

          {/* Intro Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardPaste className="w-4 h-4 text-pink-600" />
                  <span>Salin & Tempel Alamat Langsung (Tabular Excel / Teks Berlabel)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Salin baris alamat langsung dari spreadsheet atau chat, tempel di sini. ID Pelanggan manual (misal: PL4968, OL210) dan detail alamat langsung terdeteksi!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = `PL4968\tAdhe fitra\t083181417949\tBlok Cempaka RT 003 RW 002 Desa Jatitengah\tMajalengka\tJawa Barat\tJ&T
PL8180\tBulan Sari\t081299887766\tJl. Melati No. 12 RT 01 RW 04\tBandung\tJawa Barat\tJNE`;
                    handleParseQuickPaste(sample);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600"
                >
                  Isi Contoh Tabular
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={pasteRawText}
              onChange={e => handleParseQuickPaste(e.target.value)}
              placeholder="Tempel baris spreadsheet atau teks alamat di sini... (Contoh: PL4968	Adhe fitra	083181417949	Blok Cempaka...)"
              className="w-full p-3.5 rounded-xl border border-slate-300 font-mono text-xs focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
            />

            {quickPasteRows.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pratinjau Data Terbaca ({quickPasteRows.length} Baris Siap Disimpan):
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPasteRows(prev => [
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
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5 w-28">ID Pelanggan *</th>
                        <th className="p-2.5 w-36">Nama Penerima *</th>
                        <th className="p-2.5 w-28">No. Telepon *</th>
                        <th className="p-2.5">Alamat Lengkap *</th>
                        <th className="p-2.5 w-28">Kota/Kab</th>
                        <th className="p-2.5 w-24">Kurir</th>
                        <th className="p-2.5 w-24">Grup</th>
                        <th className="p-2.5 w-10 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {quickPasteRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-pink-50/20">
                          <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.customerId || ''}
                              onChange={e => {
                                const val = e.target.value.trim();
                                setQuickPasteRows(prev => {
                                  const c = [...prev];
                                  c[idx] = { ...c[idx], customerId: val };
                                  return c;
                                });
                              }}
                              placeholder="PL4968"
                              className="w-full px-2 py-1 rounded border border-slate-200 font-mono font-bold text-pink-700 text-xs outline-none focus:border-pink-500 bg-pink-50/30"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.recipientName || row.customerName || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setQuickPasteRows(prev => {
                                  const c = [...prev];
                                  c[idx] = { ...c[idx], recipientName: val, customerName: val };
                                  return c;
                                });
                              }}
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-pink-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.phone || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setQuickPasteRows(prev => {
                                  const c = [...prev];
                                  c[idx] = { ...c[idx], phone: val };
                                  return c;
                                });
                              }}
                              className="w-full px-2 py-1 rounded border border-slate-200 font-mono text-xs outline-none focus:border-pink-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.fullAddress || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setQuickPasteRows(prev => {
                                  const c = [...prev];
                                  c[idx] = { ...c[idx], fullAddress: val };
                                  return c;
                                });
                              }}
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-pink-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.city || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setQuickPasteRows(prev => {
                                  const c = [...prev];
                                  c[idx] = { ...c[idx], city: val };
                                  return c;
                                });
                              }}
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-pink-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={row.courier || 'JNE'}
                              onChange={e => {
                                const val = e.target.value.toUpperCase();
                                setQuickPasteRows(prev => {
                                  const c = [...prev];
                                  c[idx] = { ...c[idx], courier: val };
                                  return c;
                                });
                              }}
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-bold uppercase outline-none focus:border-pink-500"
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              value={row.groupName || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setQuickPasteRows(prev => {
                                  const c = [...prev];
                                  c[idx] = { ...c[idx], groupName: val };
                                  return c;
                                });
                              }}
                              className="w-full px-1.5 py-1 rounded border border-slate-200 text-xs font-semibold outline-none bg-white"
                            >
                              <option value="">Tanpa Grup (Kosong)</option>
                              {availableGroups.map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickPasteRows(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Menyimpan data ini otomatis menambahkan pelanggan & alamat ke sistem serta menyinkronkan Google Spreadsheet.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasteRawText('');
                        setQuickPasteRows([]);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Bersihkan
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitQuickPaste}
                      disabled={isSavingQuickPaste}
                      className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-md shadow-pink-600/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSavingQuickPaste ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Menyimpan ke Spreadsheet...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Simpan & Terapkan Data ({quickPasteRows.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
