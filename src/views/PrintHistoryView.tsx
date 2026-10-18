import React, { useState, useEffect } from 'react';
import { PrintRecord } from '../types';
import { 
  History, 
  Printer, 
  Search, 
  RotateCcw, 
  Calendar, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Filter, 
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PrintHistoryViewProps {
  onReprintAddress: (customerId: string, addressId: string) => void;
  refreshTrigger: number;
}

// Helper to parse dates in format DD-MM-YYYY HH:mm:ss, DD/MM/YYYY, or ISO string
function parsePrintDate(str: string): Date | null {
  if (!str) return null;
  const trimmed = str.trim();

  // Match DD-MM-YYYY or DD/MM/YYYY with optional time
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const mins = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const secs = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    return new Date(year, month, day, hours, mins, secs);
  }

  // Match YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hours = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const mins = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const secs = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    return new Date(year, month, day, hours, mins, secs);
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export const PrintHistoryView: React.FC<PrintHistoryViewProps> = ({
  onReprintAddress,
  refreshTrigger
}) => {
  const [history, setHistory] = useState<PrintRecord[]>([]);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'thermal_100x150' | 'hvs_a4_3part'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/print-history?limit=1000');
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Error fetching print history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  // Quick Date Preset Handlers
  const handleSetPreset = (preset: 'today' | '7days' | '30days' | 'this_month' | 'all') => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      const todayStr = toYmd(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setStartDate(toYmd(past));
      setEndDate(toYmd(now));
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 29);
      setStartDate(toYmd(past));
      setEndDate(toYmd(now));
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toYmd(firstDay));
      setEndDate(toYmd(lastDay));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter logic
  const filtered = history.filter(item => {
    if (formatFilter !== 'all' && item.label_format !== formatFilter) return false;

    // Search query filter
    if (search) {
      const q = search.toLowerCase();
      const match =
        item.recipient_name?.toLowerCase().includes(q) ||
        item.customer_id?.toLowerCase().includes(q) ||
        item.shipping_courier?.toLowerCase().includes(q) ||
        item.print_id?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Date range filter
    if (startDate || endDate) {
      const recordDate = parsePrintDate(item.printed_at);
      if (!recordDate) return false;

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (recordDate < start) return false;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);
        if (recordDate > end) return false;
      }
    }

    return true;
  });

  // Summary Metrics
  const totalFilteredCopies = filtered.reduce((acc, curr) => acc + (curr.copies || 1), 0);
  const thermalCount = filtered.filter(i => i.label_format === 'thermal_100x150').length;
  const hvsCount = filtered.filter(i => i.label_format === 'hvs_a4_3part').length;

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      alert('Tidak ada data riwayat cetak yang memenuhi kriteria filter untuk diekspor.');
      return;
    }

    const exportRows = filtered.map((rec, idx) => ({
      'No.': idx + 1,
      'ID Cetak': rec.print_id,
      'Waktu Cetak': rec.printed_at,
      'ID Pelanggan': rec.customer_id,
      'Penerima Paket': rec.recipient_name,
      'Jasa Kirim / Kurir': rec.shipping_courier,
      'Format Label': rec.label_format === 'thermal_100x150' ? 'Thermal 100×150 mm' : 'HVS A4 3-Bagian',
      'Jumlah Salinan': rec.copies || 1
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 },
      { wch: 30 },
      { wch: 24 },
      { wch: 24 },
      { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Riwayat Cetak');

    const dateSuffix = startDate || endDate ? `_${startDate || 'awal'}_sd_${endDate || 'akhir'}` : '';
    const filename = `riwayat_cetak_yaxiya${dateSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);

    setExportNotice(`File Excel "${filename}" berhasil diunduh (${filtered.length} baris data).`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Export to PDF (.pdf)
  const handleExportPDF = () => {
    if (filtered.length === 0) {
      alert('Tidak ada data riwayat cetak yang memenuhi kriteria filter untuk diekspor.');
      return;
    }

    // A4 Landscape document for readable columns
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const nowStr = new Date().toLocaleString('id-ID');
    const periodeStr = (startDate || endDate)
      ? `${startDate || 'Semua'} s/d ${endDate || 'Sekarang'}`
      : 'Semua Periode';

    // Header Yaxiya Jewelry
    doc.setFillColor(157, 23, 77); // Pink-900 jewel brand color
    doc.rect(14, 12, doc.internal.pageSize.width - 28, 18, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('YAXIYA JEWELRY — LAPORAN RIWAYAT CETAK LABEL PENGIRIMAN', 18, 20.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(253, 242, 248);
    doc.text('Sistem Operasional Logistik & Manajemen Alamat Pelanggan', 18, 26);

    // Report Summary Block
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Periode Laporan:', 14, 36);
    doc.setFont('helvetica', 'normal');
    doc.text(periodeStr, 42, 36);

    doc.setFont('helvetica', 'bold');
    doc.text('Filter Format:', 14, 41);
    doc.setFont('helvetica', 'normal');
    doc.text(formatFilter === 'all' ? 'Semua Format' : formatFilter === 'thermal_100x150' ? 'Thermal 100x150 mm' : 'HVS A4 3-Bagian', 42, 41);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Riwayat:', 115, 36);
    doc.setFont('helvetica', 'normal');
    doc.text(`${filtered.length} kali pencetakan`, 140, 36);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Salinan:', 115, 41);
    doc.setFont('helvetica', 'normal');
    doc.text(`${totalFilteredCopies} lembar label`, 140, 41);

    doc.setFont('helvetica', 'bold');
    doc.text('Waktu Unduh:', 205, 36);
    doc.setFont('helvetica', 'normal');
    doc.text(nowStr, 230, 36);

    if (search) {
      doc.setFont('helvetica', 'bold');
      doc.text('Kata Kunci:', 205, 41);
      doc.setFont('helvetica', 'normal');
      doc.text(`"${search}"`, 230, 41);
    }

    // Table Data
    const tableData = filtered.map((rec, idx) => [
      (idx + 1).toString(),
      rec.printed_at || '-',
      rec.customer_id || '-',
      rec.recipient_name || '-',
      rec.shipping_courier || '-',
      rec.label_format === 'thermal_100x150' ? 'Thermal 100×150 mm' : 'HVS A4 3-Bagian',
      (rec.copies || 1).toString()
    ]);

    autoTable(doc, {
      startY: 46,
      head: [['No.', 'Waktu Cetak', 'ID Pelanggan', 'Penerima Paket', 'Jasa Kirim / Kurir', 'Format Label', 'Salinan']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [157, 23, 77],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 26, fontStyle: 'bold', textColor: [190, 24, 93] },
        3: { cellWidth: 62, fontStyle: 'bold' },
        4: { cellWidth: 42 },
        5: { cellWidth: 45 },
        6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Halaman ${data.pageNumber} dari ${pageCount} · Yaxiya Jewelry Shipping Address Manager`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 8,
          { align: 'center' }
        );
      }
    });

    const dateSuffix = startDate || endDate ? `_${startDate || 'awal'}_sd_${endDate || 'akhir'}` : '';
    const filename = `riwayat_cetak_yaxiya${dateSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    setExportNotice(`File PDF "${filename}" berhasil diunduh (${filtered.length} baris data).`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const isDateFiltered = Boolean(startDate || endDate);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">
            Riwayat Cetak Label Pengiriman
          </h1>
          <p className="text-xs text-slate-500">
            Log riwayat pencetakan label thermal dan HVS yang tersimpan dan tersinkron ke Google Sheets
          </p>
        </div>
        
        {/* Actions: Export buttons and Reload */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            title="Ekspor data riwayat cetak yang sedang difilter ke Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export EXCEL</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 rounded-xl bg-pink-700 hover:bg-pink-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            title="Ekspor laporan riwayat cetak ke dokumen PDF rapi (.pdf)"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          {/* Reload Button */}
          <button
            onClick={fetchHistory}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
            title="Muat ulang riwayat dari server"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Export notification badge */}
      {exportNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards for Filtered Period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Riwayat Dicetak
          </span>
          <div className="text-xl font-black text-slate-900 mt-0.5 font-mono">
            {filtered.length}
            {filtered.length !== history.length && (
              <span className="text-xs text-slate-400 font-sans font-normal ml-1">/ {history.length}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Sesuai filter periode</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Lembar Label
          </span>
          <div className="text-xl font-black text-pink-700 mt-0.5 font-mono">
            {totalFilteredCopies}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Total salinan fisik</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Format Thermal
          </span>
          <div className="text-xl font-black text-purple-700 mt-0.5 font-mono">
            {thermalCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Roll 100×150 mm</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Format HVS A4
          </span>
          <div className="text-xl font-black text-blue-700 mt-0.5 font-mono">
            {hvsCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Kertas HVS 3-bagian</p>
        </div>
      </div>

      {/* Filter and Period Control Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
        {/* Row 1: Search & Format Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama penerima, ID pelanggan, ekspedisi, atau ID cetak..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-xs"
            />
          </div>

          <select
            value={formatFilter}
            onChange={e => setFormatFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-xs outline-none"
          >
            <option value="all">Semua Format Cetak</option>
            <option value="thermal_100x150">Thermal 100×150 mm</option>
            <option value="hvs_a4_3part">HVS A4 (3 Bagian)</option>
          </select>
        </div>

        {/* Row 2: Date Period Filters */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
              <Calendar className="w-4 h-4 text-pink-700" />
              <span>Periode Tanggal:</span>
            </div>

            {/* Start Date */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-400">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-400">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
              />
            </div>

            {/* Reset Button */}
            {isDateFiltered && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-pink-700 hover:bg-pink-50 flex items-center gap-1 transition-colors"
                title="Hapus filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Tanggal</span>
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-400 mr-1 hidden md:inline">Preset:</span>
            <button
              onClick={() => handleSetPreset('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                !isDateFiltered
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => handleSetPreset('today')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleSetPreset('7days')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              7 Hari
            </button>
            <button
              onClick={() => handleSetPreset('30days')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              30 Hari
            </button>
            <button
              onClick={() => handleSetPreset('this_month')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Bulan Ini
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-600 font-semibold flex items-center gap-2">
            <span>Daftar Riwayat Pencetakan</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-mono">
              {filtered.length} Data
            </span>
          </div>
          {(isDateFiltered || search || formatFilter !== 'all') && (
            <div className="text-[11px] text-pink-700 font-medium">
              Filter aktif: {isDateFiltered ? `${startDate || '...'} s/d ${endDate || '...'}` : ''}
              {formatFilter !== 'all' ? ` · ${formatFilter}` : ''}
              {search ? ` · "${search}"` : ''}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-slate-600 font-bold uppercase text-[11px]">
                <th className="py-3 px-4 w-12 text-center">No.</th>
                <th className="py-3 px-4">Waktu Cetak</th>
                <th className="py-3 px-4">ID Pelanggan</th>
                <th className="py-3 px-4">Penerima Paket</th>
                <th className="py-3 px-4">Jasa Kirim</th>
                <th className="py-3 px-4 text-center">Format Label</th>
                <th className="py-3 px-4 text-center">Salinan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat riwayat cetak...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum ada riwayat pencetakan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((rec, index) => (
                  <tr key={rec.print_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {rec.printed_at}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-pink-700 whitespace-nowrap">
                      {rec.customer_id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {rec.recipient_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                        {rec.shipping_courier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.label_format === 'thermal_100x150'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {rec.label_format === 'thermal_100x150' ? 'Thermal 100×150 mm' : 'HVS A4 3-Bagian'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold font-mono">
                      {rec.copies || 1}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onReprintAddress(rec.customer_id, rec.address_id)}
                        className="px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                        title="Buka alamat ini untuk dicetak ulang"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Cetak Ulang</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
