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
  Sparkles,
  Truck,
  Send,
  User,
  Phone,
  MapPin,
  ClipboardList,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PrintHistoryViewProps {
  onReprintAddress: (customerId: string, addressId: string) => void;
  refreshTrigger: number;
}

// Robust date parser for all date string formats (DD-MM-YYYY, DD/MM/YYYY, ISO, etc.)
export function parsePrintDate(str?: string | null): Date | null {
  if (!str) return null;
  const trimmed = str.trim();

  // Match DD-MM-YYYY or DD/MM/YYYY with optional time
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[,\s]+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
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
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s]+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/);
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

// Convert any printed_at string into YYYY-MM-DD for 100% accurate string comparison
export function getPrintDateYmd(str?: string | null): string {
  const d = parsePrintDate(str);
  if (!d) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatIndonesianDate(ymd: string): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${monthNames[mIdx] || parts[1]} ${parts[0]}`;
}

export const PrintHistoryView: React.FC<PrintHistoryViewProps> = ({
  onReprintAddress,
  refreshTrigger
}) => {
  const [history, setHistory] = useState<PrintRecord[]>([]);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'thermal_100x150' | 'hvs_a4_3part'>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'dropship'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/print-history?limit=2000');
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

  // Helpers for Local Indonesian date presets
  const getTodayYmd = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  const getYesterdayYmd = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const handleSetPreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'all') => {
    const today = getTodayYmd();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const yest = getYesterdayYmd();
      setStartDate(yest);
      setEndDate(yest);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setStartDate(toYmd(past));
      setEndDate(today);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 29);
      setStartDate(toYmd(past));
      setEndDate(today);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toYmd(firstDay));
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Extract unique couriers for the dropdown
  const availableCouriers = Array.from(
    new Set(
      history
        .map(h => (h.shipping_courier || '').trim())
        .filter(Boolean)
    )
  ).sort();

  // Filter logic
  const filtered = history.filter(item => {
    // 1. Format filter
    if (formatFilter !== 'all' && item.label_format !== formatFilter) return false;

    // 2. Courier filter
    if (courierFilter !== 'all') {
      const c = (item.shipping_courier || '').trim().toLowerCase();
      if (c !== courierFilter.trim().toLowerCase()) return false;
    }

    // 3. Dropship filter
    if (typeFilter === 'dropship' && !item.is_dropship) return false;
    if (typeFilter === 'regular' && item.is_dropship) return false;

    // 4. Search query filter
    if (search) {
      const q = search.toLowerCase();
      const match =
        item.recipient_name?.toLowerCase().includes(q) ||
        item.recipient_phone?.toLowerCase().includes(q) ||
        item.customer_id?.toLowerCase().includes(q) ||
        item.customer_name?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q) ||
        item.shipping_courier?.toLowerCase().includes(q) ||
        item.sender_name?.toLowerCase().includes(q) ||
        item.print_id?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 5. Date range filter (Strict & Accurate)
    if (startDate || endDate) {
      const recordYmd = getPrintDateYmd(item.printed_at);
      if (!recordYmd) return false;

      if (startDate && recordYmd < startDate) return false;
      if (endDate && recordYmd > endDate) return false;
    }

    return true;
  });

  // Summary Metrics
  const totalFilteredCopies = filtered.reduce((acc, curr) => acc + (curr.copies || 1), 0);
  const thermalCount = filtered.filter(i => i.label_format === 'thermal_100x150').length;
  const hvsCount = filtered.filter(i => i.label_format === 'hvs_a4_3part').length;
  const dropshipCount = filtered.filter(i => i.is_dropship).length;
  const regularCount = filtered.length - dropshipCount;

  // Breakdown per courier for daily shipment handover
  const courierBreakdown: Record<string, { prints: number; copies: number }> = {};
  filtered.forEach(item => {
    const courier = (item.shipping_courier || 'Ekspedisi').trim();
    if (!courierBreakdown[courier]) {
      courierBreakdown[courier] = { prints: 0, copies: 0 };
    }
    courierBreakdown[courier].prints += 1;
    courierBreakdown[courier].copies += (item.copies || 1);
  });

  const isSingleDay = Boolean(startDate && endDate && startDate === endDate);
  const isDateFiltered = Boolean(startDate || endDate);

  // Dynamic Report Title
  const getReportTitle = () => {
    if (isSingleDay) {
      return `Laporan Pengiriman Harian (${formatIndonesianDate(startDate)})`;
    }
    if (startDate && endDate) {
      return `Laporan Pengiriman (${formatIndonesianDate(startDate)} s/d ${formatIndonesianDate(endDate)})`;
    }
    if (startDate) {
      return `Laporan Pengiriman (Sejak ${formatIndonesianDate(startDate)})`;
    }
    if (endDate) {
      return `Laporan Pengiriman (Hingga ${formatIndonesianDate(endDate)})`;
    }
    return 'Laporan Pengiriman Semua Periode';
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      alert('Tidak ada data riwayat cetak yang memenuhi kriteria filter untuk diekspor.');
      return;
    }

    const exportRows = filtered.map((rec, idx) => ({
      'No.': idx + 1,
      'Tanggal & Waktu Cetak': rec.printed_at,
      'ID Cetak': rec.print_id,
      'ID Pelanggan': rec.customer_id,
      'Nama Pelanggan': rec.customer_name || '-',
      'Penerima Paket': rec.recipient_name,
      'No. Telepon Penerima': rec.recipient_phone || '-',
      'Kota / Kabupaten': rec.city || '-',
      'Provinsi': rec.province || '-',
      'Alamat Lengkap': rec.full_address || '-',
      'Jasa Kirim / Kurir': rec.shipping_courier || 'Ekspedisi',
      'Layanan Pengiriman': rec.shipping_service || '-',
      'Tipe Pengiriman': rec.is_dropship ? 'Dropship' : 'Reguler',
      'Pengirim': rec.sender_name || (rec.is_dropship ? 'Dropship' : 'Yaxiya Jewelry'),
      'No. Telepon Pengirim': rec.sender_phone || '-',
      'Format Label': rec.label_format === 'thermal_100x150' ? 'Thermal 100×150 mm' : 'HVS A4 3-Bagian',
      'Jumlah Salinan': rec.copies || 1
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 6 },  // No.
      { wch: 22 }, // Waktu Cetak
      { wch: 24 }, // ID Cetak
      { wch: 16 }, // ID Pelanggan
      { wch: 28 }, // Nama Pelanggan
      { wch: 28 }, // Penerima
      { wch: 18 }, // No HP Penerima
      { wch: 20 }, // Kota
      { wch: 20 }, // Provinsi
      { wch: 45 }, // Alamat Lengkap
      { wch: 20 }, // Ekspedisi
      { wch: 18 }, // Layanan
      { wch: 16 }, // Tipe
      { wch: 24 }, // Pengirim
      { wch: 18 }, // No HP Pengirim
      { wch: 22 }, // Format Label
      { wch: 14 }  // Salinan
    ];

    const workbook = XLSX.utils.book_new();
    const sheetName = isSingleDay ? `Harian ${startDate}`.slice(0, 31) : 'Laporan Pengiriman';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const fileSuffix = isSingleDay 
      ? `Harian_${startDate}` 
      : isDateFiltered 
        ? `${startDate || 'awal'}_sd_${endDate || 'akhir'}`
        : 'Semua_Periode';

    const filename = `Laporan_Pengiriman_Yaxiya_${fileSuffix}.xlsx`;
    XLSX.writeFile(workbook, filename);

    setExportNotice(`File Excel "${filename}" berhasil diunduh (${filtered.length} data pengiriman siap laporan harian).`);
    setTimeout(() => setExportNotice(null), 5000);
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

    const nowStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(new Date());

    const periodeStr = isSingleDay 
      ? formatIndonesianDate(startDate)
      : isDateFiltered
        ? `${startDate ? formatIndonesianDate(startDate) : 'Awal'} s/d ${endDate ? formatIndonesianDate(endDate) : 'Sekarang'}`
        : 'Semua Periode';

    // Header Yaxiya Jewelry
    doc.setFillColor(157, 23, 77); // Pink-900 brand color
    doc.rect(14, 10, doc.internal.pageSize.width - 28, 18, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    const mainTitle = isSingleDay
      ? `YAXIYA JEWELRY — LAPORAN PENGIRIMAN HARIAN (${formatIndonesianDate(startDate).toUpperCase()})`
      : 'YAXIYA JEWELRY — LAPORAN REKAPITULASI PENGIRIMAN & CETAK LABEL';
    doc.text(mainTitle, 18, 18.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(253, 242, 248);
    doc.text('Manifest Serah Terima Ekspedisi & Manajemen Pengiriman Logistik', 18, 24);

    // Report Summary Block
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Periode Laporan:', 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(periodeStr, 44, 34);

    doc.setFont('helvetica', 'bold');
    doc.text('Filter Ekspedisi:', 14, 39);
    doc.setFont('helvetica', 'normal');
    doc.text(courierFilter === 'all' ? 'Semua Jasa Kirim' : courierFilter, 44, 39);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Paket Cetak:', 110, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(`${filtered.length} paket (${regularCount} Reguler, ${dropshipCount} Dropship)`, 142, 34);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Lembar Label:', 110, 39);
    doc.setFont('helvetica', 'normal');
    doc.text(`${totalFilteredCopies} lembar (${thermalCount} Thermal, ${hvsCount} HVS A4)`, 142, 39);

    doc.setFont('helvetica', 'bold');
    doc.text('Waktu Cetak/Unduh:', 210, 34);
    doc.setFont('helvetica', 'normal');
    doc.text(`${nowStr} WIB`, 242, 34);

    // Summary per courier badge in PDF
    const courierSummaryStr = Object.entries(courierBreakdown)
      .map(([k, v]) => `${k}: ${v.prints} paket`)
      .join('  |  ');
    doc.setFont('helvetica', 'bold');
    doc.text('Rekap Ekspedisi:', 210, 39);
    doc.setFont('helvetica', 'normal');
    doc.text(courierSummaryStr.slice(0, 50) + (courierSummaryStr.length > 50 ? '...' : ''), 242, 39);

    // Table Data
    const tableData = filtered.map((rec, idx) => [
      (idx + 1).toString(),
      rec.printed_at || '-',
      `${rec.customer_name || 'Pelanggan'}\n(${rec.customer_id})`,
      `${rec.recipient_name}\n${rec.recipient_phone ? `Telp: ${rec.recipient_phone}` : ''}`,
      `${rec.city || '-'}${rec.province ? `, ${rec.province}` : ''}`,
      `${rec.shipping_courier || '-'}${rec.shipping_service ? `\n[${rec.shipping_service}]` : ''}`,
      rec.is_dropship ? `DROPSHIP\n${rec.sender_name || ''}` : 'REGULER\n(Yaxiya)',
      (rec.copies || 1).toString()
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['No.', 'Waktu Cetak', 'Pelanggan & ID', 'Penerima & Kontak', 'Kota Tujuan', 'Jasa Kirim', 'Tipe / Pengirim', 'Salinan']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [157, 23, 77],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 42, fontStyle: 'bold' },
        3: { cellWidth: 55, fontStyle: 'bold' },
        4: { cellWidth: 38 },
        5: { cellWidth: 36, fontStyle: 'bold' },
        6: { cellWidth: 38 },
        7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Halaman ${data.pageNumber} dari ${pageCount} · Yaxiya Jewelry Shipping Address Manager · Sah sebagai Manifest Harian`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 6,
          { align: 'center' }
        );
      }
    });

    const fileSuffix = isSingleDay 
      ? `Harian_${startDate}` 
      : isDateFiltered 
        ? `${startDate || 'awal'}_sd_${endDate || 'akhir'}`
        : 'Semua_Periode';

    const filename = `Laporan_Pengiriman_Yaxiya_${fileSuffix}.pdf`;
    doc.save(filename);

    setExportNotice(`File PDF "${filename}" berhasil diunduh (${filtered.length} baris data).`);
    setTimeout(() => setExportNotice(null), 5000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 font-display">
              {getReportTitle()}
            </h1>
            {isSingleDay && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                Laporan Harian
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Log riwayat pencetakan label akurat sesuai tanggal cetak, siap difilter dan diekspor ke Excel / PDF untuk laporan pengiriman harian.
          </p>
        </div>
        
        {/* Actions: Export buttons and Reload */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            title="Ekspor laporan pengiriman harian / periode yang sedang difilter ke Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 rounded-xl bg-pink-700 hover:bg-pink-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            title="Ekspor rekap manifest pengiriman harian ke dokumen PDF (.pdf)"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF (.pdf)</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Paket Dicetak
          </span>
          <div className="text-xl font-black text-slate-900 mt-0.5 font-mono">
            {filtered.length}
            {filtered.length !== history.length && (
              <span className="text-xs text-slate-400 font-sans font-normal ml-1">/ {history.length}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Sesuai filter tanggal</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Lembar Label
          </span>
          <div className="text-xl font-black text-pink-700 mt-0.5 font-mono">
            {totalFilteredCopies}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Total fisik dicetak</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Reguler vs Dropship
          </span>
          <div className="text-base font-black text-slate-800 mt-1 font-mono flex items-center gap-1.5">
            <span className="text-blue-700">{regularCount} Reg</span>
            <span className="text-slate-300">/</span>
            <span className="text-purple-700">{dropshipCount} Drop</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Rincian tipe kiriman</p>
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

      {/* Courier Handover Breakdown Strip */}
      {Object.keys(courierBreakdown).length > 0 && (
        <div className="p-3 bg-gradient-to-r from-pink-50/70 via-white to-pink-50/40 rounded-xl border border-pink-200/70 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-pink-700 shrink-0" />
            <span className="text-xs font-bold text-slate-800">
              Rekap Serah Terima Kurir ({isSingleDay ? `Hari ${startDate}` : 'Periode Terpilih'}):
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(courierBreakdown).map(([cName, stats]) => (
              <span 
                key={cName}
                onClick={() => setCourierFilter(courierFilter === cName ? 'all' : cName)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                  courierFilter === cName 
                    ? 'bg-pink-600 text-white border-pink-600 shadow-2xs' 
                    : 'bg-white hover:bg-pink-50 text-slate-700 border-slate-200'
                }`}
                title={`Klik untuk filter ekspedisi ${cName}`}
              >
                <span>{cName}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                  courierFilter === cName ? 'bg-pink-700 text-white' : 'bg-slate-100 text-slate-800'
                }`}>
                  {stats.prints} pkt ({stats.copies} lbr)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Period Control Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5 text-xs">
        
        {/* Row 1: Date Period Filters & 1-Click Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
              <Calendar className="w-4 h-4 text-pink-700" />
              <span>Tanggal Cetak:</span>
            </div>

            {/* Start Date */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-400 font-medium">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-400 font-medium">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {/* Reset Button */}
            {isDateFiltered && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-pink-700 hover:bg-pink-50 border border-pink-200 flex items-center gap-1 transition-colors"
                title="Hapus filter tanggal"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Tanggal</span>
              </button>
            )}
          </div>

          {/* Quick Presets for Daily Shipping Report */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Pilihan Cepat:</span>
            <button
              onClick={() => handleSetPreset('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                isSingleDay && startDate === getTodayYmd()
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200'
              }`}
            >
              <span>⭐ Hari Ini</span>
            </button>
            <button
              onClick={() => handleSetPreset('yesterday')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isSingleDay && startDate === getYesterdayYmd()
                  ? 'bg-pink-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Kemarin
            </button>
            <button
              onClick={() => handleSetPreset('7days')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => handleSetPreset('this_month')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Bulan Ini
            </button>
            <button
              onClick={() => handleSetPreset('all')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                !isDateFiltered
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Periode
            </button>
          </div>
        </div>

        {/* Row 2: Search, Courier, Type, and Format Filters */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari penerima, pelanggan, HP, kota, kurir, ID cetak..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-pink-500 outline-none text-xs"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Ekspedisi Filter */}
          <select
            value={courierFilter}
            onChange={e => setCourierFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs outline-none cursor-pointer"
          >
            <option value="all">Semua Jasa Kirim</option>
            {availableCouriers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Tipe Filter: Reguler / Dropship */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs outline-none cursor-pointer"
          >
            <option value="all">Semua Tipe (Reg & Drop)</option>
            <option value="regular">Hanya Reguler</option>
            <option value="dropship">Hanya Dropship</option>
          </select>

          {/* Format Label */}
          <select
            value={formatFilter}
            onChange={e => setFormatFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs outline-none cursor-pointer"
          >
            <option value="all">Semua Format Cetak</option>
            <option value="thermal_100x150">Thermal 100×150 mm</option>
            <option value="hvs_a4_3part">HVS A4 (3 Bagian)</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-50/75 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-700 font-bold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-pink-700" />
            <span>Tabel Riwayat Pengiriman & Cetak Label</span>
            <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[10px] font-mono font-bold">
              {filtered.length} Paket
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            {isDateFiltered && (
              <span className="font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                {isSingleDay ? `Tanggal: ${startDate}` : `${startDate || '...'} s/d ${endDate || '...'}`}
              </span>
            )}
            {courierFilter !== 'all' && (
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                Kurir: {courierFilter}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-slate-600 font-bold uppercase text-[11px]">
                <th className="py-3 px-4 w-12 text-center">No.</th>
                <th className="py-3 px-4">Waktu Cetak</th>
                <th className="py-3 px-4">Pelanggan & ID</th>
                <th className="py-3 px-4">Penerima & Alamat Tujuan</th>
                <th className="py-3 px-4">Jasa Kirim</th>
                <th className="py-3 px-4">Tipe & Pengirim</th>
                <th className="py-3 px-4 text-center">Format & Salinan</th>
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
                    Belum ada riwayat cetak yang cocok dengan filter tanggal ini.
                  </td>
                </tr>
              ) : (
                filtered.map((rec, index) => (
                  <tr key={rec.print_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* No. */}
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>

                    {/* Waktu Cetak */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {rec.printed_at}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                        {rec.print_id}
                      </span>
                    </td>

                    {/* Pelanggan & ID */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {rec.customer_name || 'Pelanggan'}
                      </div>
                      <span className="font-mono text-[10px] text-pink-700 font-bold">
                        {rec.customer_id}
                      </span>
                    </td>

                    {/* Penerima & Alamat */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{rec.recipient_name}</span>
                        {rec.recipient_phone && (
                          <span className="font-mono font-normal text-slate-500 text-[11px]">
                            ({rec.recipient_phone})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {[rec.city, rec.province].filter(Boolean).join(', ') || rec.full_address || '-'}
                      </div>
                    </td>

                    {/* Jasa Kirim */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] inline-flex items-center gap-1">
                        <Truck className="w-3 h-3 text-slate-500" />
                        {rec.shipping_courier}
                      </span>
                      {rec.shipping_service && (
                        <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                          {rec.shipping_service}
                        </span>
                      )}
                    </td>

                    {/* Tipe & Pengirim */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {rec.is_dropship ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">
                            <Send className="w-2.5 h-2.5 text-purple-700" />
                            Dropship
                          </span>
                          <span className="text-[10px] text-purple-800 font-bold block mt-0.5 truncate max-w-[150px]" title={rec.sender_name}>
                            {rec.sender_name || 'Dropship'}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            Reguler
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Yaxiya Jewelry
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Format & Salinan */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        rec.label_format === 'thermal_100x150'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {rec.label_format === 'thermal_100x150' ? 'Thermal 100×150' : 'HVS A4'}
                      </span>
                      <div className="font-mono font-bold text-slate-700 text-xs mt-0.5">
                        {rec.copies || 1} Salinan
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onReprintAddress(rec.customer_id, rec.address_id)}
                        className="px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors shadow-2xs"
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
