import React, { useState, useEffect, useRef } from 'react';
import { Customer, Courier } from '../types';
import { X, AlertCircle, Sparkles, Plus, Home, FolderKanban, ClipboardPaste, Truck, Search, Check, ChevronDown, CheckCircle2, ChevronUp } from 'lucide-react';
import { INDONESIA_PROVINCES, COMMON_CITIES, COURIER_CATEGORIES } from '../utils/indonesianData';
import { parseSingleAddressText } from '../utils/addressParser';
import { ManageGroupsModal } from './ManageGroupsModal';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: any) => Promise<void>;
  customerToEdit?: Customer | null;
  existingCustomers: Customer[];
  allCouriers?: Courier[];
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customerToEdit,
  existingCustomers,
  allCouriers
}) => {
  const isEditing = !!customerToEdit;

  const [customerId, setCustomerId] = useState('');
  const [autoId, setAutoId] = useState(false);
  const [suggestedId, setSuggestedId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [groupName, setGroupName] = useState('');
  const [availableGroups, setAvailableGroups] = useState<string[]>(['HERMES', 'DIAMOND', 'CHANEL']);
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');

  // Optional initial address form
  const [includeInitialAddress, setIncludeInitialAddress] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [addressLabel, setAddressLabel] = useState('Rumah');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('DKI Jakarta');
  const [city, setCity] = useState('Jakarta Barat');
  const [postalCode, setPostalCode] = useState('');
  const [shippingCourier, setShippingCourier] = useState('JNE');
  const [shippingService, setShippingService] = useState('Reguler');
  const [shippingNotes, setShippingNotes] = useState('');
  const [couriersList, setCouriersList] = useState<Courier[]>(allCouriers || []);
  const [isCustomCourier, setIsCustomCourier] = useState(false);
  const [customCourierName, setCustomCourierName] = useState('');

  // Searchable courier & adding new courier state
  const [courierSearch, setCourierSearch] = useState('');
  const [isCourierDropdownOpen, setIsCourierDropdownOpen] = useState(false);
  const [isAddingNewCourier, setIsAddingNewCourier] = useState(false);
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierCategory, setNewCourierCategory] = useState('Reguler & Ekspres');
  const [newCourierServices, setNewCourierServices] = useState('Reguler, Express');
  const [newIsFavorite, setNewIsFavorite] = useState(false);
  const [isSavingCourier, setIsSavingCourier] = useState(false);
  const [courierSuccessMessage, setCourierSuccessMessage] = useState<string | null>(null);
  const courierDropdownRef = useRef<HTMLDivElement | null>(null);

  const [idError, setIdError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize dynamic couriers with Pengaturan Jasa Kirim
  useEffect(() => {
    if (allCouriers && allCouriers.length > 0) {
      setCouriersList(allCouriers);
    } else if (isOpen) {
      fetch('/api/couriers')
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setCouriersList(data.data);
          }
        })
        .catch(() => {});
    }
  }, [allCouriers, isOpen]);

  // Active couriers and categories from Pengaturan Jasa Kirim
  const activeCouriers = couriersList.filter(c => c.is_active !== false);
  const favoriteCouriers = activeCouriers.filter(c => c.is_favorite);
  const regularCouriers = activeCouriers.filter(c => !c.is_favorite && c.courier_category === 'Reguler & Ekspres');
  const instantCouriers = activeCouriers.filter(c => !c.is_favorite && c.courier_category === 'Instan & Same-day');
  const cargoCouriers = activeCouriers.filter(c => !c.is_favorite && c.courier_category !== 'Reguler & Ekspres' && c.courier_category !== 'Instan & Same-day');

  // Currently selected courier object & its available services
  const currentCourierObj = activeCouriers.find(c => c.courier_name.toLowerCase() === shippingCourier.toLowerCase());
  const availableServices = currentCourierObj && currentCourierObj.services && currentCourierObj.services.length > 0
    ? currentCourierObj.services
    : ['Reguler', 'Express'];

  // Automatically ensure shippingCourier matches an active courier from Pengaturan Jasa Kirim
  useEffect(() => {
    if (activeCouriers.length > 0 && !isCustomCourier) {
      const match = activeCouriers.find(c => c.courier_name.toLowerCase() === shippingCourier.toLowerCase());
      if (!match) {
        const preferred = activeCouriers.find(c => c.is_favorite) || activeCouriers[0];
        if (preferred) {
          setShippingCourier(preferred.courier_name);
          if (preferred.services && preferred.services.length > 0) {
            setShippingService(preferred.services[0]);
          }
        }
      }
    }
  }, [couriersList, activeCouriers.length, isCustomCourier, shippingCourier]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (courierDropdownRef.current && !courierDropdownRef.current.contains(e.target as Node)) {
        setIsCourierDropdownOpen(false);
      }
    };
    if (isCourierDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCourierDropdownOpen]);

  const handleSelectCourier = (val: string) => {
    if (val === 'Lainnya') {
      setIsCustomCourier(true);
      setShippingCourier(customCourierName || 'Kurir Toko Sendiri');
    } else {
      setIsCustomCourier(false);
      setShippingCourier(val);
      const match = activeCouriers.find(c => c.courier_name.toLowerCase() === val.toLowerCase());
      if (match && match.services && match.services.length > 0) {
        setShippingService(match.services[0]);
      }
    }
    setIsCourierDropdownOpen(false);
  };

  const handleSaveNewCourier = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = (newCourierName || courierSearch).trim();
    if (!name) return;

    setIsSavingCourier(true);
    try {
      const servicesArray = newCourierServices
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/couriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courier_name: name,
          courier_category: newCourierCategory || 'Reguler & Ekspres',
          services: servicesArray.length > 0 ? servicesArray : ['Reguler', 'Express'],
          is_favorite: newIsFavorite,
          is_active: true
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const created: Courier = data.data;
        setCouriersList(prev => [...prev.filter(c => c.courier_id !== created.courier_id), created]);
        setShippingCourier(created.courier_name);
        if (created.services && created.services.length > 0) {
          setShippingService(created.services[0]);
        }
        setIsCustomCourier(false);
        setIsAddingNewCourier(false);
        setIsCourierDropdownOpen(false);
        setCourierSearch('');
        setNewCourierName('');
        setCourierSuccessMessage(`Jasa kirim "${created.courier_name}" berhasil disimpan ke pengaturan!`);
        setTimeout(() => setCourierSuccessMessage(null), 4000);
        window.dispatchEvent(new CustomEvent('couriers-updated'));
      } else {
        alert(data.error || 'Gagal menyimpan jasa kirim baru');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan jasa kirim');
    } finally {
      setIsSavingCourier(false);
    }
  };

  // Fetch groups
  const loadGroups = () => {
    fetch('/api/address-groups?refresh=true')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setAvailableGroups(data.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) {
      loadGroups();
    }
    const onGroupsUpdated = () => loadGroups();
    window.addEventListener('groups-updated', onGroupsUpdated);
    return () => window.removeEventListener('groups-updated', onGroupsUpdated);
  }, [isOpen]);

  // Fetch next ID from server for suggestion
  useEffect(() => {
    if (!isEditing && isOpen) {
      fetch('/api/customers/next-id')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.next_id) {
            setSuggestedId(data.next_id);
            if (autoId) setCustomerId(data.next_id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, isEditing, autoId]);

  useEffect(() => {
    if (customerToEdit) {
      setCustomerId(customerToEdit.customer_id);
      setAutoId(false);
      setCustomerName(customerToEdit.customer_name);
      setPrimaryPhone(customerToEdit.primary_phone);
      setGroupName(customerToEdit.group_name || '');
      setNotes(customerToEdit.notes || '');
      setStatus(customerToEdit.status === 'archived' ? 'archived' : 'active');
      setIncludeInitialAddress(false);
    } else {
      setCustomerId('');
      setAutoId(false);
      setCustomerName('');
      setPrimaryPhone('');
      setGroupName('');
      setNotes('');
      setStatus('active');
      // Default to true so initial address and Jasa Kirim are immediately visible when adding a customer
      setIncludeInitialAddress(true);
      // Pick top favorite courier from Pengaturan Jasa Kirim
      const topFav = activeCouriers.find(c => c.is_favorite) || activeCouriers[0];
      if (topFav) {
        setShippingCourier(topFav.courier_name);
        if (topFav.services && topFav.services.length > 0) {
          setShippingService(topFav.services[0]);
        }
      }
    }
    setIdError(null);
  }, [customerToEdit, isOpen]);

  // Check ID collision
  useEffect(() => {
    if (!customerId) {
      setIdError(null);
      return;
    }
    const cleanId = customerId.trim().toLowerCase();
    const collision = existingCustomers.find(
      c => c.customer_id.toLowerCase() === cleanId && (!customerToEdit || c.customer_id !== customerToEdit.customer_id)
    );
    if (collision) {
      setIdError(`ID "${customerId}" sudah terdaftar untuk "${collision.customer_name}". Harap gunakan ID berbeda.`);
    } else {
      setIdError(null);
    }
  }, [customerId, existingCustomers, customerToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (idError) return;
    if (!customerName.trim() || !primaryPhone.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        customer_id: customerId.trim(),
        customer_name: customerName.trim(),
        primary_phone: primaryPhone.trim(),
        group_name: groupName,
        notes: notes.trim(),
        status
      };

      if (!isEditing && includeInitialAddress && (fullAddress.trim() || city.trim())) {
        payload.initial_address = {
          address_label: addressLabel.trim() || 'Rumah',
          recipient_name: recipientName.trim() || customerName.trim(),
          recipient_phone: recipientPhone.trim() || primaryPhone.trim(),
          full_address: fullAddress.trim() || (city.trim() ? `Kota ${city.trim()}` : 'Alamat Pengiriman'),
          village: village.trim(),
          district: district.trim(),
          city: city.trim() || 'Jakarta Barat',
          province: province.trim() || 'DKI Jakarta',
          postal_code: postalCode.trim(),
          shipping_courier: shippingCourier,
          shipping_service: shippingService,
          shipping_notes: shippingNotes.trim(),
          group_name: groupName
        };
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pelanggan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
              {isEditing ? '✎' : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? `Perbarui profil pelanggan ${customerToEdit?.customer_id}` : 'Daftarkan pelanggan Yaxiya Jewelry dengan ID unik'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Customer ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>ID Pelanggan (Manual / Bebas Ketik) *</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (suggestedId) {
                    setCustomerId(suggestedId);
                  } else {
                    fetch('/api/customers/next-id')
                      .then(r => r.json())
                      .then(d => {
                        if (d.next_id) setCustomerId(d.next_id);
                      });
                  }
                }}
                className="text-xs font-semibold text-pink-700 hover:text-pink-800 flex items-center gap-1 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-md transition-colors"
                title="Gunakan format ID otomatis YX-XXXXXX"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Buatkan ID Otomatis</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={customerId}
              onChange={e => setCustomerId(e.target.value.trim())}
              placeholder="Ketik ID Pelanggan (Contoh: PL4968, OL210, YX-000025, dll)"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold tracking-wider transition-all ${
                idError 
                  ? 'border-red-400 bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-200' 
                  : 'border-slate-300 bg-white text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-100'
              }`}
            />
            {idError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{idError}</span>
              </div>
            )}
            {isEditing ? (
              <p className="text-[11px] text-pink-700 font-medium">
                💡 Anda dapat mengubah ID Pelanggan ini. Jika ID diubah, seluruh alamat terkait akan otomatis dipindahkan ke ID baru.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Ketik kode ID pelanggan Anda sendiri (misal: <strong>PL4968</strong>, <strong>OL210</strong>), atau klik "Buatkan ID Otomatis".
              </p>
            )}
          </div>

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Nama Pelanggan *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Contoh: Citra Dewi Permata"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Nomor Telepon Utama *
              </label>
              <input
                type="tel"
                required
                value={primaryPhone}
                onChange={e => setPrimaryPhone(e.target.value)}
                placeholder="Contoh: 081298765432"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400">Disimpan sebagai teks agar angka 0 di depan tidak hilang.</p>
            </div>
          </div>

          {/* Kolom Dropdown untuk Grup Alamat */}
          <div className="space-y-2 p-3.5 rounded-xl bg-pink-50/50 border border-pink-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-pink-600" />
                <span>Grup Alamat *</span>
              </label>
              <button
                type="button"
                onClick={() => setIsManageGroupsOpen(true)}
                className="text-[11px] text-pink-600 hover:text-pink-700 font-bold hover:underline flex items-center gap-1"
              >
                <span>Kelola / Edit Grup</span>
              </button>
            </div>

            <select
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all cursor-pointer"
            >
              <option value="">Tanpa Grup (Kosong / Default)</option>
              {availableGroups.map(grp => (
                <option key={grp} value={grp}>
                  Grup: {grp}
                </option>
              ))}
            </select>

            {/* Quick selector chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400 font-medium">Pilihan Cepat:</span>
              <button
                type="button"
                onClick={() => setGroupName('')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  groupName === ''
                    ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tanpa Grup (Kosong)
              </button>
              {availableGroups.map(grp => {
                const isSelected = groupName === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setGroupName(grp)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-pink-600 text-white border-pink-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-pink-50 hover:text-pink-700'
                    }`}
                  >
                    {grp}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Catatan Pelanggan (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contoh: Reseller Grosir Cincin & Gelang Titanium, minta packing bubble wrap tebal."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Status (If editing) */}
          {isEditing && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Status Pelanggan
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
              >
                <option value="active">Aktif</option>
                <option value="archived">Diarsipkan (Archived)</option>
              </select>
            </div>
          )}

          {/* Optional Initial Address Section (Only for new customer) */}
          {!isEditing && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeInitialAddress}
                    onChange={e => setIncludeInitialAddress(e.target.checked)}
                    className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300"
                  />
                  <span>Sekaligus Tambahkan Alamat Pengiriman Pertama</span>
                </label>
                {includeInitialAddress && (
                  <span className="text-[11px] text-pink-600 font-semibold bg-pink-50 px-2 py-0.5 rounded-md">
                    Input Cepat
                  </span>
                )}
              </div>

              {includeInitialAddress && (
                <div className="p-4 bg-slate-50/75 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <span className="text-xs font-bold text-slate-800">Detail Alamat Pengiriman</span>
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(!showPasteBox)}
                      className="text-xs font-bold text-pink-700 hover:text-pink-800 flex items-center gap-1.5 bg-pink-100/70 hover:bg-pink-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>{showPasteBox ? 'Tutup Kotak Tempel' : 'Tempel Teks Alamat (Auto-Fill)'}</span>
                    </button>
                  </div>

                  {showPasteBox && (
                    <div className="p-3 bg-white rounded-xl border border-pink-200 space-y-2">
                      <label className="text-[11px] font-bold text-pink-900 block">
                        Tempel Teks Alamat dari WhatsApp / Spreadsheet:
                      </label>
                      <textarea
                        rows={3}
                        value={pasteText}
                        onChange={e => {
                          const val = e.target.value;
                          setPasteText(val);
                          if (val.trim()) {
                            const parsed = parseSingleAddressText(val);
                            if (parsed.recipientName) setRecipientName(parsed.recipientName);
                            if (parsed.phone) setRecipientPhone(parsed.phone);
                            if (parsed.fullAddress) setFullAddress(parsed.fullAddress);
                            if (parsed.city) setCity(parsed.city);
                            if (parsed.province) setProvince(parsed.province);
                            if (parsed.district) setDistrict(parsed.district);
                            if (parsed.village) setVillage(parsed.village);
                            if (parsed.postalCode) setPostalCode(parsed.postalCode);
                            if (parsed.courier) {
                              const match = activeCouriers.find(c => 
                                c.courier_name.toLowerCase().includes(parsed.courier!.toLowerCase()) ||
                                parsed.courier!.toLowerCase().includes(c.courier_name.toLowerCase())
                              );
                              if (match) {
                                setIsCustomCourier(false);
                                setShippingCourier(match.courier_name);
                                if (match.services && match.services.length > 0) {
                                  setShippingService(match.services[0]);
                                }
                              } else {
                                setIsCustomCourier(true);
                                setCustomCourierName(parsed.courier);
                                setShippingCourier(parsed.courier);
                              }
                            }
                            if (parsed.notes) setShippingNotes(parsed.notes);
                          }
                        }}
                        placeholder="Contoh: Penerima: Adhe fitra, No HP: 083181417949, Alamat: Jl. Raya No. 12 Majalengka, Kurir: J&T"
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-mono outline-none focus:border-pink-500"
                      />
                      <p className="text-[10px] text-slate-400">
                        Otomatis mengisi nama penerima, no HP, alamat lengkap, kota, provinsi, dan kurir!
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Label Alamat</label>
                      <input
                        type="text"
                        value={addressLabel}
                        onChange={e => setAddressLabel(e.target.value)}
                        placeholder="Contoh: Rumah, Kantor, Dropship"
                        className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Nama Penerima</label>
                      <input
                        type="text"
                        value={recipientName || customerName}
                        onChange={e => setRecipientName(e.target.value)}
                        placeholder={customerName || 'Nama Penerima'}
                        className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Alamat Lengkap *</label>
                    <textarea
                      rows={2}
                      value={fullAddress}
                      onChange={e => setFullAddress(e.target.value)}
                      placeholder="Nama jalan, nomor bangunan, RT/RW, patokan..."
                      className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Kota / Kabupaten</label>
                      <input
                        type="text"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Provinsi</label>
                      <select
                        value={province}
                        onChange={e => setProvince(e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs"
                      >
                        {INDONESIA_PROVINCES.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600">Kode Pos</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={e => setPostalCode(e.target.value)}
                        placeholder="Contoh: 11470"
                        className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Courier & Services - Dynamically rendered based on Pengaturan Jasa Kirim */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-pink-600" />
                        <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                          Jasa Kirim (Sesuai Pengaturan Jasa Kirim)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-pink-600 font-semibold bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                          {activeCouriers.length} Ekspedisi Aktif
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewCourier(!isAddingNewCourier);
                            setNewCourierName(courierSearch);
                          }}
                          className="text-[11px] text-pink-700 hover:text-pink-800 font-bold bg-pink-100/70 hover:bg-pink-100 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Tambah Jasa Kirim</span>
                        </button>
                      </div>
                    </div>

                    {courierSuccessMessage && (
                      <div className="mb-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{courierSuccessMessage}</span>
                      </div>
                    )}

                    {/* Tombol Pilihan Cepat Kurir Favorit */}
                    {favoriteCouriers.length > 0 && !isAddingNewCourier && (
                      <div className="mb-2.5 p-2 bg-pink-50/40 rounded-xl border border-pink-100">
                        <div className="text-[10px] font-bold text-pink-900 mb-1.5 flex items-center gap-1">
                          <span className="text-amber-500">★</span>
                          <span>Pilihan Cepat Jasa Kirim Favorit (Klik 1 Kali):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {favoriteCouriers.map(c => {
                            const isSelected = !isCustomCourier && shippingCourier.toLowerCase() === c.courier_name.toLowerCase();
                            return (
                              <button
                                key={c.courier_id}
                                type="button"
                                onClick={() => handleSelectCourier(c.courier_name)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-pink-600 text-white border-pink-600 shadow-2xs ring-2 ring-pink-500/20'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300'
                                }`}
                              >
                                <span className={isSelected ? 'text-amber-300' : 'text-amber-500'}>★</span>
                                <span>{c.courier_name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Form Tambah & Simpan Jasa Kirim Baru */}
                    {isAddingNewCourier && (
                      <div className="mb-3 p-3.5 bg-pink-50/80 rounded-xl border border-pink-300 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between pb-1.5 border-b border-pink-200">
                          <span className="text-xs font-bold text-pink-950 flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-pink-600" />
                            Tambah & Simpan Jasa Kirim Baru ke Pengaturan
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingNewCourier(false)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Nama Jasa Kirim *</label>
                            <input
                              type="text"
                              required
                              value={newCourierName}
                              onChange={e => setNewCourierName(e.target.value)}
                              placeholder="Misal: Sentral Cargo, Wahana, Lalamove..."
                              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-pink-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Kategori Jasa Kirim</label>
                            <select
                              value={newCourierCategory}
                              onChange={e => setNewCourierCategory(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-pink-300 text-xs text-slate-800 focus:outline-none"
                            >
                              <option value="Reguler & Ekspres">Reguler & Ekspres</option>
                              <option value="Instan & Same-day">Instan & Same-day</option>
                              <option value="Kargo">Kargo</option>
                              <option value="Internasional">Internasional</option>
                              <option value="Kurir Toko Sendiri">Kurir Toko Sendiri</option>
                              <option value="Lainnya">Lainnya</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-center">
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">Layanan (Pisahkan dengan koma)</label>
                            <input
                              type="text"
                              value={newCourierServices}
                              onChange={e => setNewCourierServices(e.target.value)}
                              placeholder="Misal: Reguler, Express, Super"
                              className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-pink-300 text-xs text-slate-800 focus:outline-none"
                            />
                          </div>

                          <div className="pt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                              <input
                                type="checkbox"
                                checked={newIsFavorite}
                                onChange={e => setNewIsFavorite(e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-pink-600 focus:ring-pink-500 border-slate-300"
                              />
                              <span>⭐ Jadikan sebagai Kurir Favorit</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-pink-200">
                          <button
                            type="button"
                            onClick={() => setIsAddingNewCourier(false)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={isSavingCourier || !newCourierName.trim()}
                            onClick={() => handleSaveNewCourier()}
                            className="px-4 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isSavingCourier ? 'Menyimpan...' : 'Simpan ke Pengaturan & Pilih'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Searchable Courier Combobox */}
                      <div className="relative" ref={courierDropdownRef}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-semibold text-slate-500 block">
                            Pilihan Ekspedisi (Bisa Dicari)
                          </label>
                          <span className="text-[9px] text-pink-600 font-medium">Ketik untuk mencari</span>
                        </div>

                        {/* Searchable input trigger */}
                        <div className="relative">
                          <input
                            type="text"
                            value={isCourierDropdownOpen ? courierSearch : (isCustomCourier ? (customCourierName || 'Kurir Lainnya') : shippingCourier)}
                            onFocus={() => {
                              setIsCourierDropdownOpen(true);
                              setCourierSearch('');
                            }}
                            onChange={e => {
                              setCourierSearch(e.target.value);
                              if (!isCourierDropdownOpen) setIsCourierDropdownOpen(true);
                            }}
                            placeholder="Ketik & cari nama jasa kirim..."
                            className="w-full pl-8 pr-7 py-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <button
                            type="button"
                            onClick={() => setIsCourierDropdownOpen(!isCourierDropdownOpen)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {isCourierDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Searchable Dropdown Popup */}
                        {isCourierDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                            {/* Search bar inside popup */}
                            <div className="p-2 bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                              <div className="relative">
                                <input
                                  type="text"
                                  autoFocus
                                  value={courierSearch}
                                  onChange={e => setCourierSearch(e.target.value)}
                                  placeholder="Ketik nama ekspedisi (misal: JNE, J&T, SiCepat, Kargo)..."
                                  className="w-full pl-7 pr-3 py-1.5 bg-white rounded-md border border-slate-300 text-xs font-medium text-slate-900 focus:border-pink-500 outline-none"
                                />
                                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            {/* List of active couriers filtered by search query */}
                            {(() => {
                              const q = courierSearch.toLowerCase().trim();
                              const filtered = activeCouriers.filter(c => {
                                if (!q) return true;
                                return (
                                  c.courier_name.toLowerCase().includes(q) ||
                                  c.courier_category.toLowerCase().includes(q) ||
                                  c.services.some(s => s.toLowerCase().includes(q))
                                );
                              });

                              const hasExactMatch = activeCouriers.some(
                                c => c.courier_name.toLowerCase() === q
                              );

                              return (
                                <>
                                  {filtered.length > 0 ? (
                                    <div className="py-1">
                                      {filtered.map(c => {
                                        const isSelected = !isCustomCourier && shippingCourier.toLowerCase() === c.courier_name.toLowerCase();
                                        return (
                                          <div
                                            key={c.courier_id}
                                            onClick={() => handleSelectCourier(c.courier_name)}
                                            className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                              isSelected ? 'bg-pink-50 text-pink-900 font-bold' : 'hover:bg-slate-50 text-slate-800'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              {c.is_favorite ? (
                                                <span className="text-amber-500 font-bold">★</span>
                                              ) : (
                                                <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                                              )}
                                              <div>
                                                <span className="font-semibold">{c.courier_name}</span>
                                                <span className="text-[10px] text-slate-400 ml-1.5">
                                                  ({c.courier_category})
                                                </span>
                                              </div>
                                            </div>
                                            {isSelected && (
                                              <Check className="w-3.5 h-3.5 text-pink-600" />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="p-3 text-center text-xs text-slate-500">
                                      Tidak ada jasa kirim yang cocok dengan "{courierSearch}".
                                    </div>
                                  )}

                                  {/* Prompt to add new courier if searched and not matching */}
                                  {q && !hasExactMatch && (
                                    <div className="p-2.5 bg-pink-50/70 border-t border-pink-200">
                                      <div className="text-[10px] text-pink-900 font-semibold mb-1">
                                        Jasa kirim "{courierSearch}" belum terdaftar?
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCourierName(courierSearch);
                                          setIsAddingNewCourier(true);
                                          setIsCourierDropdownOpen(false);
                                        }}
                                        className="w-full py-1.5 px-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Tambah & Simpan "{courierSearch}" Baru</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Manual custom option */}
                                  <div className="p-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsAddingNewCourier(true);
                                        setNewCourierName('');
                                        setIsCourierDropdownOpen(false);
                                      }}
                                      className="text-[11px] font-bold text-pink-600 hover:text-pink-700 hover:underline flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>+ Tambah Jasa Kirim Baru</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectCourier('Lainnya')}
                                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                                    >
                                      Ketik Manual Lainnya
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {isCustomCourier && (
                          <input
                            type="text"
                            value={customCourierName}
                            onChange={e => {
                              setCustomCourierName(e.target.value);
                              setShippingCourier(e.target.value);
                            }}
                            placeholder="Ketik nama ekspedisi manual..."
                            className="w-full mt-1.5 px-3 py-1.5 bg-pink-50/60 rounded-lg border border-pink-300 text-xs font-semibold text-pink-900 focus:outline-none"
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                          Layanan Ekspedisi
                        </label>
                        <select
                          value={shippingService}
                          onChange={e => setShippingService(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:border-pink-500"
                        >
                          {availableServices.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                          Catatan Pengiriman
                        </label>
                        <input
                          type="text"
                          value={shippingNotes}
                          onChange={e => setShippingNotes(e.target.value)}
                          placeholder="Contoh: Jangan dibanting, perhiasan"
                          className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs focus:border-pink-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!idError}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white text-sm font-semibold shadow-md shadow-pink-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Pelanggan'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Kelola Grup Alamat */}
      <ManageGroupsModal
        isOpen={isManageGroupsOpen}
        onClose={() => setIsManageGroupsOpen(false)}
        onGroupsChanged={loadGroups}
      />
    </div>
  );
};
