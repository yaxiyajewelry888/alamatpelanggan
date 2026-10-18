import React, { useState, useEffect } from 'react';
import { Customer, Address } from '../types';
import { 
  X, 
  MapPinPlus, 
  Printer, 
  Edit2, 
  Trash2, 
  Phone, 
  Calendar, 
  FileText, 
  MapPin, 
  Truck,
  CheckCircle2,
  FolderKanban
} from 'lucide-react';
import { getGroupBadgeStyle } from '../views/CustomerListView';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  onOpenAddAddress: (customerId: string) => void;
  onOpenEditAddress: (address: Address) => void;
  onOpenEditCustomer: (customer: Customer) => void;
  onOpenPrintAddresses: (addresses: Address[], customer: Customer) => void;
  onDeleteAddress: (address: Address) => void;
  refreshTrigger: number;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customerId,
  onOpenAddAddress,
  onOpenEditAddress,
  onOpenEditCustomer,
  onOpenPrintAddresses,
  onDeleteAddress,
  refreshTrigger
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressIds, setSelectedAddressIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && customerId) {
      setIsLoading(true);
      fetch(`/api/customers/${customerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setCustomer(data.data);
            const addrs = data.data.addresses || [];
            setAddresses(addrs);
            // Default select all active addresses
            setSelectedAddressIds(addrs.filter((a: Address) => a.status !== 'deleted').map((a: Address) => a.address_id));
          }
        })
        .catch(err => console.error('Error fetching customer detail:', err))
        .finally(() => setIsLoading(false));
    } else {
      setCustomer(null);
      setAddresses([]);
      setSelectedAddressIds([]);
    }
  }, [isOpen, customerId, refreshTrigger]);

  if (!isOpen || !customerId) return null;

  const toggleSelectAddress = (id: string) => {
    setSelectedAddressIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedAddressIds(addresses.map(a => a.address_id));
  };

  const deselectAll = () => {
    setSelectedAddressIds([]);
  };

  const handlePrintSelected = () => {
    if (!customer) return;
    const toPrint = addresses.filter(a => selectedAddressIds.includes(a.address_id));
    if (toPrint.length === 0) {
      alert('Pilih minimal satu alamat dengan mencentang kotak.');
      return;
    }
    onOpenPrintAddresses(toPrint, customer);
  };

  const handlePrintAll = () => {
    if (!customer || addresses.length === 0) return;
    onOpenPrintAddresses(addresses, customer);
  };

  const handlePrintSingle = (address: Address) => {
    if (!customer) return;
    onOpenPrintAddresses([address], customer);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/70 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-700 to-pink-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-pink-600/20 font-display">
              {customer?.customer_name ? customer.customer_name.slice(0, 2).toUpperCase() : 'YX'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-pink-800 bg-pink-100/80 px-2 py-0.5 rounded border border-pink-200">
                  {customerId}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {customer?.customer_name || 'Detail Pelanggan'}
                </h2>
                {customer?.group_name && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border tracking-wide uppercase ${getGroupBadgeStyle(customer.group_name)}`}>
                    Grup: {customer.group_name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola banyak alamat pengiriman (Rumah, Kantor, Dropship) dalam satu ID pelanggan
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              Memuat data pelanggan dan multi-alamat...
            </div>
          ) : !customer ? (
            <div className="py-12 text-center text-slate-500">
              Pelanggan tidak ditemukan.
            </div>
          ) : (
            <>
              {/* Customer Info Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                      <Phone className="w-3.5 h-3.5 text-pink-600" />
                      {customer.primary_phone}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      Dibuat: {customer.created_at}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      {customer.status === 'active' ? 'Aktif' : 'Arsip'}
                    </span>
                  </div>
                  {customer.notes && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{customer.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenEditCustomer(customer)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Profil</span>
                  </button>
                  <button
                    onClick={() => onOpenAddAddress(customer.customer_id)}
                    className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-md shadow-pink-600/20 flex items-center gap-1.5"
                  >
                    <MapPinPlus className="w-3.5 h-3.5" />
                    <span>Tambah Alamat</span>
                  </button>
                </div>
              </div>

              {/* Multi-Address Controls & List */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Daftar Alamat Pengiriman ({addresses.length})
                    </h3>
                    <span className="text-xs text-slate-500">
                      · {selectedAddressIds.length} dipilih
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-600"
                    >
                      Pilih Semua
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-600"
                    >
                      Batal Pilih
                    </button>
                    <button
                      onClick={handlePrintSelected}
                      disabled={selectedAddressIds.length === 0}
                      className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Terpilih ({selectedAddressIds.length})</span>
                    </button>
                    <button
                      onClick={handlePrintAll}
                      disabled={addresses.length === 0}
                      className="px-3 py-1.5 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Semua Alamat</span>
                    </button>
                  </div>
                </div>

                {addresses.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Pelanggan ini belum memiliki alamat terdaftar. Klik "Tambah Alamat" di atas untuk menambahkan alamat baru.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {addresses.map(addr => {
                      const isSelected = selectedAddressIds.includes(addr.address_id);
                      const isDropship = addr.recipient_name.toLowerCase() !== customer.customer_name.toLowerCase();

                      return (
                        <div
                          key={addr.address_id}
                          className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-pink-300 bg-pink-50/20 ring-2 ring-pink-500/10'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            {/* Card Top: Checkbox, Label, Courier */}
                            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectAddress(addr.address_id)}
                                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300 cursor-pointer"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-slate-900">
                                      {addr.address_label}
                                    </span>
                                    {addr.group_name && (
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border tracking-wide uppercase ${getGroupBadgeStyle(addr.group_name)}`}>
                                        Grup: {addr.group_name}
                                      </span>
                                    )}
                                    {isDropship && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                                        Dropship
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {addr.address_id}
                                  </span>
                                </div>
                              </label>

                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 flex items-center gap-1 shrink-0">
                                <Truck className="w-3 h-3 text-slate-500" />
                                {addr.shipping_courier || 'Kurir Belum Diatur'}
                              </span>
                            </div>

                            {/* Recipient and Address Details */}
                            <div className="py-2.5 space-y-1 text-xs">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-extrabold text-slate-900">
                                  {addr.recipient_name}
                                </span>
                                <span className="font-mono text-slate-700 font-semibold">
                                  {addr.recipient_phone}
                                </span>
                              </div>
                              <p className="text-slate-700 leading-snug">
                                {addr.full_address}
                              </p>
                              <p className="text-slate-500 font-semibold text-[11px]">
                                {[addr.village, addr.district, addr.city, addr.province, addr.postal_code].filter(Boolean).join(', ')}
                              </p>
                              {addr.shipping_notes && (
                                <p className="text-[11px] text-amber-800 bg-amber-50/80 p-1.5 rounded border border-amber-200/50 mt-1">
                                  <strong>Catatan:</strong> {addr.shipping_notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-1">
                            <button
                              onClick={() => handlePrintSingle(addr)}
                              className="px-2.5 py-1 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold flex items-center gap-1 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak Label</span>
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                title="Edit Alamat"
                                onClick={() => onOpenEditAddress(addr)}
                                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                title="Hapus Alamat"
                                onClick={() => onDeleteAddress(addr)}
                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Total {addresses.length} alamat terhubung ke ID <strong className="font-mono text-slate-700">{customerId}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
