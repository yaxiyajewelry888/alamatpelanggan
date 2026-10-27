import React, { useState, useEffect } from 'react';
import { Customer, Address, Courier, StoreSettings } from '../types';
import { 
  Search, 
  Filter, 
  UserPlus, 
  MapPinPlus, 
  Printer, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MapPin,
  Truck,
  CheckCircle2,
  Package,
  Layers,
  ClipboardPaste,
  RefreshCw,
  Home,
  Building2,
  Send,
  Tag
} from 'lucide-react';
import { INDONESIA_PROVINCES } from '../utils/indonesianData';
import { BulkPrintModal } from '../components/BulkPrintModal';
import { ManageGroupsModal } from '../components/ManageGroupsModal';
import { QuickPasteAddressModal } from '../components/QuickPasteAddressModal';

export const getGroupBadgeStyle = (name?: string) => {
  if (!name) return 'bg-slate-100 text-slate-700 border-slate-200';
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

interface CustomerListViewProps {
  onOpenAddCustomer: () => void;
  onOpenEditCustomer: (customer: Customer) => void;
  onOpenAddAddress: (customerId: string) => void;
  onOpenEditAddress: (address: Address) => void;
  onSelectCustomerDetail: (customerId: string) => void;
  onOpenPrintForCustomer: (customer: Customer) => void;
  onOpenPrintSingleAddress?: (address: Address, customer: Customer) => void;
  onOpenPrintAddresses?: (addresses: Address[], customer?: Customer, mode?: 'single_per_sheet' | 'mixed_bulk') => void;
  onDeleteCustomer: (customer: Customer) => void;
  onDeleteAddress?: (address: Address) => void;
  onDeleteCustomersBulk?: (customerIds: string[]) => void;
  allCouriers: Courier[];
  storeSettings?: StoreSettings;
  refreshTrigger: number;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  onOpenAddCustomer,
  onOpenEditCustomer,
  onOpenAddAddress,
  onOpenEditAddress,
  onSelectCustomerDetail,
  onOpenPrintForCustomer,
  onOpenPrintSingleAddress,
  onOpenPrintAddresses,
  onDeleteCustomer,
  onDeleteAddress,
  onDeleteCustomersBulk,
  allCouriers,
  storeSettings,
  refreshTrigger
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [courierFilter, setCourierFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [addressGroups, setAddressGroups] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pageSearchInput, setPageSearchInput] = useState('1');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Sync pageSearchInput whenever page changes
  useEffect(() => {
    setPageSearchInput(String(page));
  }, [page]);

  // Selected customer IDs for bulk actions (print & delete selected)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  // Expanded customer rows for quick multi-address management
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<string>>(new Set());

  const toggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedCustomerIds(prev => {
      const allVisibleSelected = customers.length > 0 && customers.every(c => prev.has(c.customer_id));
      if (allVisibleSelected) {
        return new Set();
      } else {
        const next = new Set(prev);
        customers.forEach(c => next.add(c.customer_id));
        return next;
      }
    });
  };

  const handlePrintSelectedCustomers = () => {
    if (selectedCustomerIds.size === 0) return;
    const selectedList = customers.filter(c => selectedCustomerIds.has(c.customer_id));
    const allAddrs: Address[] = [];
    for (const c of selectedList) {
      if (c.addresses && c.addresses.length > 0) {
        allAddrs.push(...c.addresses.filter(a => a.status !== 'deleted'));
      }
    }
    if (allAddrs.length === 0) {
      alert('Pelanggan terpilih belum memiliki alamat pengiriman.');
      return;
    }
    if (onOpenPrintAddresses) {
      onOpenPrintAddresses(allAddrs, undefined, 'mixed_bulk');
    }
  };

  const handleDeleteSelectedCustomers = () => {
    if (selectedCustomerIds.size === 0) return;
    if (onDeleteCustomersBulk) {
      onDeleteCustomersBulk(Array.from(selectedCustomerIds));
      setSelectedCustomerIds(new Set());
    }
  };

  // Bulk Print Modal state
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [isQuickPasteOpen, setIsQuickPasteOpen] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  const handleQuickSyncFromSheets = async () => {
    setIsSyncingSheets(true);
    try {
      const res = await fetch('/api/spreadsheet/sync-pull', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Berhasil sinkronisasi dari Google Spreadsheet!\nDimuat: ${data.data.customers} pelanggan, ${data.data.addresses} alamat.`);
        fetchAddressGroups();
        fetchCustomers();
      } else {
        alert(data.error || 'Gagal sinkronisasi data dari Spreadsheet');
      }
    } catch (e: any) {
      alert('Gagal menghubungi server: ' + e.message);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const fetchAddressGroups = () => {
    fetch('/api/address-groups')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setAddressGroups(d.data);
        }
      })
      .catch(() => {});
  };

  // Fetch address groups on trigger or groups-updated broadcast
  useEffect(() => {
    fetchAddressGroups();
    const onGroupsUpdated = () => {
      fetchAddressGroups();
      fetchCustomers();
    };
    const onCustomerDeleted = (e: any) => {
      const deletedId = e.detail?.customerId;
      if (deletedId) {
        setCustomers(prev => prev.filter(c => c.customer_id !== deletedId));
        setTotal(prev => Math.max(0, prev - 1));
      }
    };
    const onCustomersBulkDeleted = (e: any) => {
      const deletedIds = e.detail?.customerIds;
      if (Array.isArray(deletedIds)) {
        const idSet = new Set(deletedIds);
        setCustomers(prev => prev.filter(c => !idSet.has(c.customer_id)));
        setTotal(prev => Math.max(0, prev - deletedIds.length));
      }
    };
    window.addEventListener('groups-updated', onGroupsUpdated);
    window.addEventListener('addresses-updated', onGroupsUpdated);
    window.addEventListener('customer-deleted', onCustomerDeleted);
    window.addEventListener('customers-bulk-deleted', onCustomersBulkDeleted);
    return () => {
      window.removeEventListener('groups-updated', onGroupsUpdated);
      window.removeEventListener('addresses-updated', onGroupsUpdated);
      window.removeEventListener('customer-deleted', onCustomerDeleted);
      window.removeEventListener('customers-bulk-deleted', onCustomersBulkDeleted);
    };
  }, [refreshTrigger]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        status: statusFilter,
        courier: courierFilter,
        province: provinceFilter,
        group: groupFilter,
        page: String(page),
        limit: String(limit)
      });
      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, statusFilter, courierFilter, provinceFilter, groupFilter, page, limit, refreshTrigger]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('active');
    setCourierFilter('');
    setProvinceFilter('');
    setGroupFilter('');
    setPage(1);
  };

  const toggleExpandCustomer = (customerId: string) => {
    setExpandedCustomerIds(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const handlePrintSingle = (address: Address, customer: Customer) => {
    if (onOpenPrintSingleAddress) {
      onOpenPrintSingleAddress(address, customer);
    } else if (onOpenPrintAddresses) {
      onOpenPrintAddresses([address], customer, 'single_per_sheet');
    } else {
      onOpenPrintForCustomer(customer);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Main Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">
            Daftar Pelanggan & Alamat
          </h1>
          <p className="text-xs text-slate-500">
            Total {total} pelanggan terdaftar · Kelola multi-alamat, cetak satuan (1 lembar 1 alamat), atau cetak massal (1 lembar isi 3 alamat berbeda)
          </p>
        </div>

        {/* Action Buttons: Sync + Quick Paste + Bulk Print + Add Customer */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={isSyncingSheets}
            onClick={handleQuickSyncFromSheets}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Tarik data terbaru yang diedit langsung di Google Spreadsheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-pink-600 ${isSyncingSheets ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheets ? 'Menyinkronkan...' : 'Tarik dari Spreadsheet'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuickPasteOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5"
            title="Tempel teks alamat dari WhatsApp / Spreadsheet (Otomatis membaca ID & Alamat)"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-pink-600" />
            <span>Tempel Alamat Cepat</span>
          </button>

          <button
            onClick={() => setIsBulkPrintOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 hover:from-pink-700 hover:to-rose-800 text-white font-bold text-xs shadow-md shadow-pink-600/20 transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Massal</span>
          </button>

          <button
            onClick={onOpenAddCustomer}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/10 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Advanced Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Ketik pencarian: ID Pelanggan (YX-XXXXXX), nama pelanggan, nama penerima, no. telepon, alamat, kota..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Hapus
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-700 font-medium outline-none focus:border-pink-500"
          >
            <option value="active">Status: Aktif</option>
            <option value="archived">Status: Diarsipkan</option>
            <option value="all">Status: Semua</option>
          </select>

          {/* Courier Filter */}
          <select
            value={courierFilter}
            onChange={e => {
              setCourierFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-700 font-medium outline-none focus:border-pink-500"
          >
            <option value="">Semua Jasa Kirim</option>
            {allCouriers.filter(c => c.is_active).map(c => (
              <option key={c.courier_id} value={c.courier_name}>{c.courier_name}</option>
            ))}
          </select>

          {/* Province Filter */}
          <select
            value={provinceFilter}
            onChange={e => {
              setProvinceFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-700 font-medium outline-none focus:border-pink-500"
          >
            <option value="">Semua Provinsi</option>
            {INDONESIA_PROVINCES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Group Filter (Fitur Filter Grup Custom) */}
          <select
            value={groupFilter}
            onChange={e => {
              setGroupFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-pink-200 bg-pink-50/40 text-pink-900 font-semibold outline-none focus:border-pink-500"
          >
            <option value="">Semua Grup Alamat</option>
            <option value="__empty__">Tanpa Grup (Kosong)</option>
            {addressGroups.map(g => (
              <option key={g} value={g}>Grup: {g}</option>
            ))}
          </select>

          {/* Tombol Kelola Grup Alamat */}
          <button
            type="button"
            onClick={() => setIsManageGroupsOpen(true)}
            className="px-2.5 py-1.5 rounded-lg border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-800 font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Kelola, ubah nama, dan hapus grup alamat"
          >
            <FolderKanban className="w-3.5 h-3.5 text-pink-600" />
            <span>Kelola Grup</span>
          </button>

          {(searchQuery || statusFilter !== 'active' || courierFilter || provinceFilter || groupFilter) && (
            <button
              onClick={resetFilters}
              className="px-2.5 py-1.5 rounded-lg text-pink-700 hover:bg-pink-50 font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating / Sticky Selected Customers Action Bar */}
      {selectedCustomerIds.size > 0 && (
        <div className="bg-gradient-to-r from-pink-50 to-pink-100/70 border border-pink-200/90 rounded-2xl p-3.5 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-pink-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
              ✓
            </span>
            <div>
              <span className="text-xs font-bold text-slate-900">
                {selectedCustomerIds.size} Pelanggan Dipilih
              </span>
              <p className="text-[11px] text-slate-500">
                Aksi di bawah ini hanya berlaku untuk ID pelanggan yang dicentang
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCustomerIds(new Set())}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              Batal Pilih
            </button>
            <button
              type="button"
              onClick={handlePrintSelectedCustomers}
              className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Label Terpilih ({selectedCustomerIds.size})</span>
            </button>
            {onDeleteCustomersBulk && (
              <button
                type="button"
                onClick={handleDeleteSelectedCustomers}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Hapus permanen hanya pelanggan yang dicentang beserta alamatnya"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedCustomerIds.size})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold tracking-wider uppercase text-[11px]">
                <th className="py-3.5 px-3 w-16 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua pelanggan di halaman ini"
                      title="Pilih semua pelanggan yang tampil"
                      checked={customers.length > 0 && customers.every(c => selectedCustomerIds.has(c.customer_id))}
                      onChange={toggleSelectAllVisible}
                      className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="py-3.5 px-4">ID Pelanggan</th>
                <th className="py-3.5 px-4">Nama Pelanggan</th>
                <th className="py-3.5 px-4">No. Telepon</th>
                <th className="py-3.5 px-4 text-center">Multi Alamat</th>
                <th className="py-3.5 px-4">Ringkasan Alamat Terdaftar</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat data pelanggan...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada pelanggan yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                customers.map(customer => {
                  const addresses = customer.addresses || [];
                  const addressCount = customer.address_count ?? addresses.length;
                  const isExpanded = expandedCustomerIds.has(customer.customer_id);
                  const isChecked = selectedCustomerIds.has(customer.customer_id);

                  return (
                    <React.Fragment key={customer.customer_id}>
                      <tr 
                        className={`hover:bg-pink-50/20 transition-colors group ${isChecked ? 'bg-pink-50/30' : isExpanded ? 'bg-pink-50/15' : ''}`}
                      >
                        {/* Checkbox & Expand Button */}
                        <td className="py-3.5 pl-3 pr-1 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="checkbox"
                              aria-label={`Pilih ${customer.customer_name}`}
                              checked={isChecked}
                              onChange={() => toggleSelectCustomer(customer.customer_id)}
                              className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => toggleExpandCustomer(customer.customer_id)}
                              title={isExpanded ? 'Tutup daftar alamat' : 'Lihat & edit alamat pelanggan ini'}
                              className="p-1 rounded-md text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-pink-600" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* ID Pelanggan */}
                        <td className="py-3.5 px-4 font-mono font-bold text-pink-700 whitespace-nowrap">
                          <button
                            onClick={() => onSelectCustomerDetail(customer.customer_id)}
                            className="hover:underline flex items-center gap-1"
                          >
                            {customer.customer_id}
                          </button>
                        </td>

                        {/* Nama Pelanggan */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">
                              {customer.customer_name}
                            </span>
                            {customer.group_name && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border tracking-wide uppercase ${getGroupBadgeStyle(customer.group_name)}`}>
                                {customer.group_name}
                              </span>
                            )}
                          </div>
                          {customer.notes && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {customer.notes}
                            </div>
                          )}
                        </td>

                        {/* Nomor Telepon */}
                        <td className="py-3.5 px-4 font-mono text-slate-700 font-semibold whitespace-nowrap">
                          {customer.primary_phone}
                        </td>

                        {/* Jumlah Alamat */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => toggleExpandCustomer(customer.customer_id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] transition-all hover:ring-2 hover:ring-pink-300 ${
                              addressCount > 1 
                                ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                : addressCount === 1 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            <span>{addressCount} Alamat</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* Preview Alamat Terdaftar */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {addresses.length === 0 ? (
                            <span className="text-slate-400 italic">Belum ada alamat</span>
                          ) : (
                            <div className="space-y-1">
                              {addresses.slice(0, 2).map(addr => (
                                <div key={addr.address_id} className="text-[11px] truncate max-w-xs flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-700">[{addr.address_label}]:</span>
                                  {addr.group_name && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase shrink-0 ${getGroupBadgeStyle(addr.group_name)}`}>
                                      {addr.group_name}
                                    </span>
                                  )}
                                  <span>{addr.recipient_name} · {addr.city}</span>
                                  {addr.shipping_courier && (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono shrink-0">
                                      {addr.shipping_courier}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {addresses.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandCustomer(customer.customer_id)}
                                  className="text-[10px] text-pink-600 font-semibold hover:underline"
                                >
                                  +{addresses.length - 2} alamat lainnya (klik untuk buka)
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            customer.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {customer.status === 'active' ? 'Aktif' : 'Arsip'}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tambah Alamat Langsung untuk Pelanggan Ini */}
                            <button
                              title="Tambah Alamat Baru untuk Pelanggan Ini"
                              onClick={() => onOpenAddAddress(customer.customer_id)}
                              className="p-1.5 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors flex items-center gap-1 font-semibold text-[11px] px-2"
                            >
                              <MapPinPlus className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Tambah Alamat</span>
                            </button>

                            {/* Buka Popup Detail Multi-Alamat */}
                            <button
                              title="Buka Detail Pelanggan & Multi-Alamat"
                              onClick={() => onSelectCustomerDetail(customer.customer_id)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                            >
                              <FolderKanban className="w-3.5 h-3.5" />
                            </button>

                            {/* Cetak Label Pelanggan Ini */}
                            <button
                              title="Cetak Label Pengiriman Pelanggan Ini"
                              onClick={() => onOpenPrintForCustomer(customer)}
                              className="p-1.5 rounded-lg border border-pink-200 text-pink-700 bg-white hover:bg-pink-50 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Profil Pelanggan */}
                            <button
                              title="Edit Data Pelanggan"
                              onClick={() => onOpenEditCustomer(customer)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Hapus / Arsipkan */}
                            <button
                              title="Hapus / Arsipkan"
                              onClick={() => onDeleteCustomer(customer)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDABLE INLINE MULTI-ADDRESS ROW */}
                      {isExpanded && (
                        <tr className="bg-pink-50/20 border-b border-pink-100">
                          <td colSpan={8} className="p-4 pl-12">
                            <div className="bg-white rounded-xl border border-pink-200/80 p-4 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-pink-600" />
                                  <span className="font-bold text-xs text-slate-900">
                                    Kelola Multi-Alamat untuk {customer.customer_name} ({addresses.length} Alamat Terdaftar)
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onOpenAddAddress(customer.customer_id)}
                                  className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                                >
                                  <MapPinPlus className="w-3.5 h-3.5" />
                                  <span>+ Tambah Alamat Baru</span>
                                </button>
                              </div>

                              {addresses.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                  Belum ada alamat untuk pelanggan ini. Klik tombol "+ Tambah Alamat Baru" di atas.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                   {addresses.map(addr => {
                                     const cleanLabel = (addr.address_label || 'Rumah').trim();
                                     const lowerLabel = cleanLabel.toLowerCase();
                                     const isDropship = Boolean(addr.is_dropship) || 
                                       lowerLabel === 'dropship' || 
                                       Boolean(addr.dropship_sender_name && addr.dropship_sender_name.trim().length > 0);

                                     return (
                                       <div
                                         key={addr.address_id}
                                         className={`p-3 rounded-xl border bg-white flex flex-col justify-between transition-all space-y-2 ${
                                           isDropship 
                                             ? 'border-purple-200 hover:border-purple-400 bg-purple-50/10' 
                                             : 'border-slate-200 hover:border-pink-300'
                                         }`}
                                       >
                                         <div>
                                           <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-100">
                                             <div className="flex items-center gap-1.5 flex-wrap">
                                               {/* Label Alamat: Rumah / Kantor / Dropship */}
                                               {isDropship ? (
                                                 <div className="inline-flex items-center gap-1.5 flex-wrap">
                                                   <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                                                     <Send className="w-3 h-3 text-purple-700" />
                                                     Dropship
                                                   </span>
                                                   {addr.dropship_sender_name && (
                                                     <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200" title={`Pengirim Dropship: ${addr.dropship_sender_name} ${addr.dropship_sender_phone ? `(${addr.dropship_sender_phone})` : ''} ${addr.dropship_sender_city ? `· ${addr.dropship_sender_city}` : ''}`}>
                                                       Pengirim: {addr.dropship_sender_name}
                                                     </span>
                                                   )}
                                                 </div>
                                               ) : lowerLabel === 'rumah' ? (
                                                 <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                                   <Home className="w-3 h-3 text-blue-600" />
                                                   Rumah
                                                 </span>
                                               ) : lowerLabel === 'kantor' ? (
                                                 <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                   <Building2 className="w-3 h-3 text-emerald-600" />
                                                   Kantor
                                                 </span>
                                               ) : (
                                                 <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                                                   {cleanLabel}
                                                 </span>
                                               )}

                                               {addr.group_name && (
                                                 <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${getGroupBadgeStyle(addr.group_name)}`}>
                                                   Grup: {addr.group_name}
                                                 </span>
                                               )}
                                             </div>
                                             <span className="text-[10px] font-mono text-slate-400">
                                               {addr.address_id}
                                             </span>
                                           </div>

                                           <div className="pt-1.5 text-xs space-y-0.5">
                                             <div className="font-bold text-slate-900">
                                               {addr.recipient_name}
                                             </div>
                                             <div className="font-mono text-slate-600 text-[11px]">
                                               {addr.recipient_phone}
                                             </div>
                                             <div className="text-[11px] text-slate-700 line-clamp-2">
                                               {addr.full_address}
                                             </div>
                                             <div className="text-[10px] text-slate-500 font-medium">
                                               {[addr.district, addr.city, addr.province, addr.postal_code].filter(Boolean).join(', ')}
                                             </div>
                                             <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                                               <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 flex items-center gap-1">
                                                 <Truck className="w-3 h-3 text-slate-500" />
                                                 {addr.shipping_courier || 'Ekspedisi'} {addr.shipping_service ? `(${addr.shipping_service})` : ''}
                                               </span>
                                               {addr.shipping_notes && (
                                                 <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 truncate max-w-[200px]" title={addr.shipping_notes}>
                                                   Catatan: {addr.shipping_notes}
                                                 </span>
                                               )}
                                             </div>
                                           </div>
                                         </div>

                                         {/* Action buttons inside expanded address card + Info Pengirim */}
                                         <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                                           <button
                                             type="button"
                                             onClick={() => handlePrintSingle(addr, customer)}
                                             className="px-2 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0 shadow-2xs"
                                           >
                                             <Printer className="w-3 h-3" />
                                             <span>Cetak Label</span>
                                           </button>

                                           {/* Info Pengirim (Ditambahkan sesuai permintaan gambar) */}
                                           {isDropship ? (
                                             <div 
                                               className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 flex items-center gap-1 text-[10px] truncate"
                                               title={`Pengirim Dropship: ${addr.dropship_sender_name || 'Dropship'} ${addr.dropship_sender_phone ? `(${addr.dropship_sender_phone})` : ''} ${addr.dropship_sender_city ? `· Asal: ${addr.dropship_sender_city}` : ''}`}
                                             >
                                               <span className="font-black text-[9px] uppercase px-1 py-0.2 rounded bg-purple-200 text-purple-800 shrink-0">
                                                 Pengirim:
                                               </span>
                                               <span className="font-bold truncate text-[11px] text-purple-950">
                                                 {addr.dropship_sender_name || 'Dropship'}
                                               </span>
                                               {addr.dropship_sender_phone && (
                                                 <span className="font-mono text-purple-700 text-[10px] shrink-0 hidden sm:inline">
                                                   ({addr.dropship_sender_phone})
                                                 </span>
                                               )}
                                             </div>
                                           ) : (
                                             <div 
                                               className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-1 text-[10px] truncate"
                                               title={`Pengirim Bawaan Toko: ${storeSettings?.store_name || 'Yaxiya Jewelry'}`}
                                             >
                                               <span className="font-bold text-[9px] uppercase px-1 py-0.2 rounded bg-slate-200 text-slate-700 shrink-0">
                                                 Pengirim:
                                               </span>
                                               <span className="font-medium truncate text-slate-700 text-[10px]">
                                                 {storeSettings?.store_name || 'Yaxiya Jewelry'}
                                               </span>
                                             </div>
                                           )}

                                           <div className="flex items-center gap-1 shrink-0">
                                             <button
                                               type="button"
                                               title="Edit Alamat Ini"
                                               onClick={() => onOpenEditAddress(addr)}
                                               className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                                             >
                                               <Edit2 className="w-3 h-3" />
                                             </button>
                                             {onDeleteAddress && (
                                               <button
                                                 type="button"
                                                 title="Hapus Alamat Ini"
                                                 onClick={() => onDeleteAddress(addr)}
                                                 className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                               >
                                                 <Trash2 className="w-3 h-3" />
                                               </button>
                                             )}
                                           </div>
                                         </div>
                                       </div>
                                     );
                                   })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-600 bg-slate-50/70">
          
          {/* Info & Limit Selector (10/page, 50/page, 100/page, 300/page, 500/page) */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-slate-700">
              Menampilkan <strong className="text-slate-900">{total === 0 ? 0 : (page - 1) * limit + 1}</strong> - <strong className="text-slate-900">{Math.min((page - 1) * limit + customers.length, total)}</strong> dari <strong className="text-slate-900">{total}</strong> pelanggan
            </span>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-slate-500 font-medium">Tampilkan:</span>
              <select
                value={limit}
                onChange={e => {
                  const newLimit = parseInt(e.target.value, 10);
                  setLimit(newLimit);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-800 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-200 shadow-2xs cursor-pointer"
              >
                <option value={10}>10/page</option>
                <option value={50}>50/page</option>
                <option value={100}>100/page</option>
                <option value={300}>300/page</option>
                <option value={500}>500/page</option>
              </select>
            </div>
          </div>

          {/* Kolom Pencarian Halaman & Tombol Navigasi */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Kolom Pencarian Page */}
            <form
              onSubmit={e => {
                e.preventDefault();
                const target = parseInt(pageSearchInput, 10);
                if (!isNaN(target)) {
                  const clamped = Math.max(1, Math.min(totalPages, target));
                  setPage(clamped);
                  setPageSearchInput(String(clamped));
                }
              }}
              className="flex items-center gap-1.5"
            >
              <label htmlFor="page-search-input" className="text-slate-500 font-medium">
                Cari Hal:
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="page-search-input"
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageSearchInput}
                  onChange={e => setPageSearchInput(e.target.value)}
                  placeholder="Hal"
                  className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-800 text-center outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-200 shadow-2xs"
                  title={`Masukkan nomor halaman 1 sampai ${totalPages}`}
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-2xs transition-colors"
                  title="Lompat ke halaman yang dicari"
                >
                  Tuju
                </button>
              </div>
            </form>

            {/* Navigation buttons: First, Prev, Indicator, Next, Last */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition-colors shadow-2xs"
                title="Halaman Pertama (1)"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition-colors shadow-2xs"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="px-2.5 py-1 font-mono font-bold text-xs text-slate-800 bg-white rounded-lg border border-slate-200 shadow-2xs whitespace-nowrap">
                Hal {page} / {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition-colors shadow-2xs"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-700 transition-colors shadow-2xs"
                title={`Halaman Terakhir (${totalPages})`}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Bulk Print Modal */}
      <BulkPrintModal
        isOpen={isBulkPrintOpen}
        onClose={() => setIsBulkPrintOpen(false)}
        allCouriers={allCouriers}
        storeSettings={storeSettings}
        onOpenFullPrintPage={(addrs, a4Mode) => {
          if (onOpenPrintAddresses) {
            onOpenPrintAddresses(addrs, undefined, a4Mode);
          }
        }}
        onPrintSuccess={() => {
          fetchCustomers();
        }}
      />

      {/* Manage Groups Modal */}
      <ManageGroupsModal
        isOpen={isManageGroupsOpen}
        onClose={() => setIsManageGroupsOpen(false)}
        onGroupsChanged={() => {
          fetchAddressGroups();
          fetchCustomers();
        }}
      />

      {/* Quick Paste Address Modal */}
      <QuickPasteAddressModal
        isOpen={isQuickPasteOpen}
        onClose={() => setIsQuickPasteOpen(false)}
        onSaveCompleted={() => {
          fetchCustomers();
        }}
        availableGroups={addressGroups}
      />
    </div>
  );
};
