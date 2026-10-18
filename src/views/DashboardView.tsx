import React from 'react';
import { 
  Users, 
  MapPin, 
  Printer, 
  AlertCircle, 
  UserPlus, 
  MapPinPlus, 
  Search, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Database,
  FileSpreadsheet,
  Truck
} from 'lucide-react';
import { DashboardStats, Customer, Address, Courier } from '../types';
import { NavMenu } from '../components/Sidebar';

interface DashboardViewProps {
  stats: DashboardStats | null;
  allCouriers?: Courier[];
  onNavigate: (menu: NavMenu) => void;
  onOpenAddCustomer: () => void;
  onOpenAddAddress: () => void;
  onOpenPrintForCustomer: (customer: Customer) => void;
  onSelectCustomerDetail: (customerId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  allCouriers,
  onNavigate,
  onOpenAddCustomer,
  onOpenAddAddress,
  onOpenPrintForCustomer,
  onSelectCustomerDetail
}) => {
  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">
        Memuat data dashboard Yaxiya Jewelry...
      </div>
    );
  }

  const {
    totalCustomers,
    totalAddresses,
    totalLabelsPrinted,
    totalCouriers,
    activeCouriers,
    unassignedCourierAddresses,
    recentCustomers,
    recentActivities,
    syncStats,
    sheetsStatus
  } = stats;

  const couriersCount = (allCouriers && allCouriers.length > 0)
    ? allCouriers.length
    : (totalCouriers || 35);

  const activeCouriersCount = (allCouriers && allCouriers.length > 0)
    ? allCouriers.filter(c => c.is_active).length
    : (activeCouriers || couriersCount);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-pink-800 via-pink-700 to-pink-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold tracking-wide uppercase mb-3">
            <span>Sistem Operasional Pengiriman Yaxiya Jewelry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
            Shipping Address Manager
          </h1>
          <p className="mt-2 text-sm text-pink-100 leading-relaxed">
            Kelola database pelanggan grosir & dropship, banyak alamat dalam satu ID, ekspedisi Indonesia, dan pencetakan label thermal 100×150 mm serta HVS A4 secara presisi.
          </p>

          {/* Main Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('customer_list')}
              className="px-4 py-2.5 rounded-xl bg-white text-pink-900 hover:bg-pink-50 font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-pink-700" />
              <span>Buka Daftar Pelanggan & Alamat</span>
            </button>
            <button
              onClick={() => onNavigate('customer_list')}
              className="px-4 py-2.5 rounded-xl bg-pink-600/80 hover:bg-pink-600 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Label Alamat</span>
            </button>
            <button
              onClick={() => onNavigate('print_history')}
              className="px-4 py-2.5 rounded-xl bg-pink-600/80 hover:bg-pink-600 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>Riwayat Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Real Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Pelanggan
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {totalCustomers}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Terdaftar dalam database</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Total Addresses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Alamat Pengiriman
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {totalAddresses}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Termasuk alamat dropship</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Total Labels Printed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Label Dicetak
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {totalLabelsPrinted}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Thermal & HVS tercatat</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Printer className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Jasa Kirim (Ekspedisi) */}
        <div 
          onClick={() => onNavigate('couriers')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-pink-300 hover:shadow-md transition-all group"
          title="Klik untuk membuka Pengaturan Jasa Kirim"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-pink-600 transition-colors">
                Jasa Kirim
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono flex items-baseline gap-1.5">
              <span>{couriersCount}</span>
              <span className="text-xs font-semibold text-slate-400 font-sans">Ekspedisi</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-1">
              <span>{activeCouriersCount} aktif di pengaturan</span>
              {unassignedCourierAddresses > 0 && (
                <span className="text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                  · {unassignedCourierAddresses} alamat tanpa kurir
                </span>
              )}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-100 group-hover:scale-105 transition-all flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Storage & Sync Status Summary Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-pink-700" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Status Penyimpanan & Sinkronisasi Data
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Database Utama Aktif
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-slate-500 font-medium text-[11px]">Database Utama:</div>
            <div className="font-bold text-slate-800 mt-0.5">Penyimpanan Utama (ACID)</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Data pelanggan & alamat tersimpan persisten secara langsung.
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-slate-500 font-medium text-[11px]">Google Spreadsheet Operasional:</div>
            <div className="font-bold text-slate-800 mt-0.5 truncate font-mono text-[11px]">
              {sheetsStatus?.spreadsheetId || '1Q0xxgKTDv4AhSQKt2mJdqnuxm1U3AuWAHJ89ArlHx-Q'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">Tersambung permanen (Otomatis)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-slate-500 font-medium text-[11px]">Antrean Sinkronisasi:</div>
            <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-2">
              <span className="font-mono text-pink-700">{syncStats.syncedTasks} Selesai</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-amber-600">{syncStats.pendingTasks} Pending</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Setiap perubahan aman dalam antrean persisten dengan auto-retry.
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Customers & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Customers (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pelanggan Baru Ditambahkan</h2>
              <p className="text-xs text-slate-500">5 pelanggan terbaru dalam sistem</p>
            </div>
            <button
              onClick={() => onNavigate('customer_list')}
              className="text-xs font-semibold text-pink-700 hover:text-pink-800 flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada data pelanggan. Klik "Tambah Pelanggan" untuk mulai.
              </div>
            ) : (
              recentCustomers.map(cust => (
                <div 
                  key={cust.customer_id}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-pink-800 bg-pink-50 px-2 py-0.5 rounded">
                        {cust.customer_id}
                      </span>
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {cust.customer_name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 font-medium">
                      <span className="font-mono">{cust.primary_phone}</span>
                      <span>·</span>
                      <span>{cust.address_count ?? (cust.addresses?.length || 0)} Alamat</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelectCustomerDetail(cust.customer_id)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => onOpenPrintForCustomer(cust)}
                      className="px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activities (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Aktivitas Terbaru</h2>
              <p className="text-xs text-slate-500">Log operasional sistem</p>
            </div>
            <button
              onClick={() => onNavigate('activity_logs')}
              className="text-xs font-semibold text-pink-700 hover:text-pink-800 flex items-center gap-1"
            >
              <span>Riwayat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
            {recentActivities.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Belum ada aktivitas tercatat
              </div>
            ) : (
              recentActivities.map(act => (
                <div key={act.log_id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-pink-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium leading-snug">
                      {act.description}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      {act.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
