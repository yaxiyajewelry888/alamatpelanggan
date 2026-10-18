import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  History, 
  Truck, 
  Sliders,
  ArrowLeftRight, 
  Activity,
  CheckCircle2,
  Clock,
  Menu,
  X
} from 'lucide-react';
import { YaxiyaLogo } from '../utils/logo';
import { SheetsStatus, SyncStats } from '../types';

export type NavMenu = 
  | 'dashboard' 
  | 'customer_list' 
  | 'print_history' 
  | 'couriers' 
  | 'settings'
  | 'import_export' 
  | 'activity_logs'
  | 'print_page';

interface SidebarProps {
  currentMenu: NavMenu;
  onNavigate: (menu: NavMenu) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  syncStats?: SyncStats;
  sheetsStatus?: SheetsStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMenu,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  syncStats,
  sheetsStatus
}) => {
  const menuItems: { id: NavMenu; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
    { id: 'customer_list', label: '2. Daftar Pelanggan & Alamat', icon: Users },
    { id: 'print_history', label: '3. Riwayat Cetak', icon: History },
    { id: 'couriers', label: '4. Pengaturan Jasa Kirim', icon: Truck },
    { id: 'settings', label: '5. Pengaturan Toko & Label', icon: Sliders },
    { id: 'import_export', label: '6. Impor & Ekspor Data', icon: ArrowLeftRight },
    { id: 'activity_logs', label: '7. Riwayat Aktivitas', icon: Activity },
  ];

  const handleMenuClick = (id: NavMenu) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-pink-50/50 to-white">
          <YaxiyaLogo size="md" />
          <button 
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Menu Operasional
          </div>

          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quiet Background Sync & Storage Status (Non-intrusive) */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Database Utama
            </span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
              Persisten
            </span>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1">
            <span>Google Sheets Salinan:</span>
            <span className="font-semibold text-slate-700">
              {sheetsStatus?.configured ? (
                <span className="text-emerald-600">Tersambung API</span>
              ) : (
                <span className="text-amber-600">Antrean Aktif</span>
              )}
            </span>
          </div>

          {syncStats && syncStats.pendingTasks > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" />
                Antrean Sinkronisasi:
              </span>
              <span className="font-mono font-bold text-amber-600">{syncStats.pendingTasks} tugas</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
