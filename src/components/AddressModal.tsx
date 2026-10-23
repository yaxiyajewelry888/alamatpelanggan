import React, { useState, useEffect } from 'react';
import { Address, Customer, Courier } from '../types';
import { X, MapPin, Search, Star, AlertCircle, Tag, FolderKanban, ClipboardPaste, Sparkles } from 'lucide-react';
import { INDONESIA_PROVINCES, ADDRESS_LABEL_SUGGESTIONS } from '../utils/indonesianData';
import { parseSingleAddressText } from '../utils/addressParser';
import { ManageGroupsModal } from './ManageGroupsModal';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (addressData: any) => Promise<void>;
  addressToEdit?: Address | null;
  targetCustomer?: Customer | null;
  allCustomers: Customer[];
  allCouriers: Courier[];
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onSave,
  addressToEdit,
  targetCustomer,
  allCustomers,
  allCouriers
}) => {
  const isEditing = !!addressToEdit;

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [manualCustomerId, setManualCustomerId] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [addressLabel, setAddressLabel] = useState('Rumah');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('Jakarta Barat');
  const [province, setProvince] = useState('DKI Jakarta');
  const [postalCode, setPostalCode] = useState('');
  
  // Courier selection state
  const [selectedCourierName, setSelectedCourierName] = useState('JNE');
  const [customCourierName, setCustomCourierName] = useState('');
  const [shippingService, setShippingService] = useState('Reguler');
  const [shippingNotes, setShippingNotes] = useState('');
  const [courierSearch, setCourierSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [existingGroups, setExistingGroups] = useState<string[]>(['HERMES', 'DIAMOND', 'CHANEL']);
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [status, setStatus] = useState<'active' | 'archived'>('active');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch unique group names
  const loadGroups = () => {
    fetch('/api/address-groups?refresh=true')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setExistingGroups(d.data);
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

  useEffect(() => {
    if (addressToEdit) {
      setSelectedCustomerId(addressToEdit.customer_id);
      setAddressLabel(addressToEdit.address_label);
      setGroupName(addressToEdit.group_name || '');
      setRecipientName(addressToEdit.recipient_name);
      setRecipientPhone(addressToEdit.recipient_phone);
      setFullAddress(addressToEdit.full_address);
      setVillage(addressToEdit.village || '');
      setDistrict(addressToEdit.district || '');
      setCity(addressToEdit.city);
      setProvince(addressToEdit.province);
      setPostalCode(addressToEdit.postal_code || '');
      
      const foundCourier = allCouriers.find(c => c.courier_name.toLowerCase() === addressToEdit.shipping_courier.toLowerCase());
      if (foundCourier) {
        setSelectedCourierName(foundCourier.courier_name);
        setCustomCourierName('');
      } else {
        setSelectedCourierName('Lainnya');
        setCustomCourierName(addressToEdit.shipping_courier);
      }

      setShippingService(addressToEdit.shipping_service || 'Reguler');
      setShippingNotes(addressToEdit.shipping_notes || '');
      setStatus(addressToEdit.status === 'archived' ? 'archived' : 'active');
    } else {
      const initialCust = targetCustomer || allCustomers[0];
      if (initialCust) {
        setSelectedCustomerId(initialCust.customer_id);
        setRecipientName(initialCust.customer_name);
        setRecipientPhone(initialCust.primary_phone);
        setGroupName(initialCust.group_name || '');
      } else {
        setGroupName('');
      }
      setAddressLabel('Rumah');
      setFullAddress('');
      setVillage('');
      setDistrict('');
      setCity('Jakarta Barat');
      setProvince('DKI Jakarta');
      setPostalCode('');
      setSelectedCourierName('JNE');
      setCustomCourierName('');
      setShippingService('Reguler');
      setShippingNotes('');
      setStatus('active');
    }
    setError(null);
  }, [addressToEdit, targetCustomer, isOpen, allCustomers, allCouriers]);

  if (!isOpen) return null;

  const currentCourierObj = allCouriers.find(c => c.courier_name === selectedCourierName);
  const availableServices = currentCourierObj ? currentCourierObj.services : ['Reguler', 'Express'];

  // Filter couriers for dropdown
  const filteredCouriers = allCouriers.filter(c => 
    c.courier_name.toLowerCase().includes(courierSearch.toLowerCase()) ||
    c.courier_category.toLowerCase().includes(courierSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Harap pilih pelanggan yang dituju.');
      return;
    }
    if (!recipientName.trim() || !recipientPhone.trim() || !fullAddress.trim() || !city.trim()) {
      setError('Nama penerima, no telepon, alamat lengkap, dan kota wajib diisi.');
      return;
    }

    const finalCourier = selectedCourierName === 'Lainnya' ? (customCourierName.trim() || 'Lainnya') : selectedCourierName;

    setIsSubmitting(true);
    try {
      const payload: any = {
        customer_id: selectedCustomerId,
        address_label: addressLabel.trim(),
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        full_address: fullAddress.trim(),
        village: village.trim(),
        district: district.trim(),
        city: city.trim(),
        province: province.trim(),
        postal_code: postalCode.trim(),
        shipping_courier: finalCourier,
        shipping_service: shippingService.trim(),
        shipping_notes: shippingNotes.trim(),
        group_name: groupName.trim(),
        status
      };

      if (isEditing && addressToEdit) {
        payload.address_id = addressToEdit.address_id;
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan alamat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomerObj = allCustomers.find(c => c.customer_id === selectedCustomerId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Alamat Pengiriman' : 'Tambah Alamat Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedCustomerObj ? `Untuk Pelanggan: ${selectedCustomerObj.customer_name} (${selectedCustomerObj.customer_id})` : 'Pilih pelanggan dan tentukan detail alamat'}
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

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Paste Auto-Fill Button & Box */}
          <div className="p-3.5 rounded-xl bg-pink-50/60 border border-pink-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                <span>Salin & Tempel Alamat Cepat</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="text-xs font-bold text-pink-700 hover:text-pink-800 bg-white hover:bg-pink-100 border border-pink-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-pink-600" />
                <span>{showPasteBox ? 'Tutup Kotak Tempel' : 'Tempel Teks Alamat (Auto-Fill)'}</span>
              </button>
            </div>

            {showPasteBox && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-100">
                <textarea
                  rows={3}
                  value={pasteText}
                  onChange={e => {
                    const val = e.target.value;
                    setPasteText(val);
                    if (val.trim()) {
                      const parsed = parseSingleAddressText(val);
                      if (parsed.customerId) {
                        setSelectedCustomerId(parsed.customerId);
                      }
                      if (parsed.recipientName) setRecipientName(parsed.recipientName);
                      if (parsed.phone) setRecipientPhone(parsed.phone);
                      if (parsed.fullAddress) setFullAddress(parsed.fullAddress);
                      if (parsed.city) setCity(parsed.city);
                      if (parsed.province) setProvince(parsed.province);
                      if (parsed.district) setDistrict(parsed.district);
                      if (parsed.village) setVillage(parsed.village);
                      if (parsed.postalCode) setPostalCode(parsed.postalCode);
                      if (parsed.courier) {
                        const found = allCouriers.find(c => c.courier_name.toLowerCase() === parsed.courier!.toLowerCase());
                        if (found) {
                          setSelectedCourierName(found.courier_name);
                          setCustomCourierName('');
                        } else {
                          setSelectedCourierName('Lainnya');
                          setCustomCourierName(parsed.courier);
                        }
                      }
                      if (parsed.notes) setShippingNotes(parsed.notes);
                      if (parsed.groupName) setGroupName(parsed.groupName);
                    }
                  }}
                  placeholder="Tempel teks alamat WhatsApp / Spreadsheet di sini... (Contoh: ID: PL4968, Penerima: Adhe fitra, HP: 083181417949, Alamat: Majalengka, Jasa Kirim: J&T)"
                  className="w-full p-2.5 rounded-lg border border-pink-200 text-xs font-mono outline-none focus:border-pink-500 bg-white"
                />
                <p className="text-[10px] text-pink-800">
                  ⚡ Otomatis mendeteksi ID Pelanggan, Nama, Telepon, Alamat, Kota, Provinsi, dan Jasa Kirim!
                </p>
              </div>
            )}
          </div>

          {/* Customer Selection / Manual Customer ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                ID & Pelanggan Pemilik Alamat *
              </label>
              {!isEditing && !targetCustomer && (
                <button
                  type="button"
                  onClick={() => setManualCustomerId(!manualCustomerId)}
                  className="text-xs font-semibold text-pink-700 hover:underline"
                >
                  {manualCustomerId ? 'Pilih dari Daftar Pelanggan' : 'Ketik ID Pelanggan Manual'}
                </button>
              )}
            </div>

            {manualCustomerId ? (
              <div className="space-y-1">
                <input
                  type="text"
                  required
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value.trim())}
                  placeholder="Ketik ID Pelanggan (Contoh: PL4968, OL210, YX-000001)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-pink-700 bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
                />
                <p className="text-[10px] text-slate-500">
                  Ketik ID Pelanggan langsung. Alamat ini akan ditambahkan ke pelanggan tersebut.
                </p>
              </div>
            ) : (
              <select
                disabled={isEditing || !!targetCustomer}
                value={selectedCustomerId}
                onChange={e => {
                  setSelectedCustomerId(e.target.value);
                  const cust = allCustomers.find(c => c.customer_id === e.target.value);
                  if (cust && !recipientName) {
                    setRecipientName(cust.customer_name);
                    setRecipientPhone(cust.primary_phone);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-medium text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none disabled:bg-slate-100 disabled:opacity-80"
              >
                {allCustomers.map(c => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.customer_id} — {c.customer_name} ({c.primary_phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Address Label & Recipient Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Label Alamat *
              </label>
              <input
                type="text"
                required
                value={addressLabel}
                onChange={e => setAddressLabel(e.target.value)}
                placeholder="Contoh: Rumah, Kantor, Dropship 1"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ADDRESS_LABEL_SUGGESTIONS.slice(0, 5).map(sug => (
                  <button
                    type="button"
                    key={sug}
                    onClick={() => setAddressLabel(sug)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Nama Penerima Paket *
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                placeholder="Nama orang yang menerima paket"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
              />
              <p className="text-[11px] text-slate-400">
                Bisa berbeda dari nama pelanggan (contoh: pesanan dropship).
              </p>
            </div>
          </div>

          {/* Grup Alamat Dropdown */}
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
              {existingGroups.map(grp => (
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
              {existingGroups.map(grp => {
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

          {/* Recipient Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Nomor Telepon Penerima *
            </label>
            <input
              type="tel"
              required
              value={recipientPhone}
              onChange={e => setRecipientPhone(e.target.value)}
              placeholder="Contoh: 081298765432"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
            />
          </div>

          {/* Full Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Alamat Lengkap (Jalan, Nomor, RT/RW, Patokan) *
            </label>
            <textarea
              required
              rows={2}
              value={fullAddress}
              onChange={e => setFullAddress(e.target.value)}
              placeholder="Contoh: Jl. Kemang Raya No. 45B, RT 04 / RW 02, Samping Apotek Sehat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none resize-none"
            />
          </div>

          {/* Village, District, City, Province, Postal Code */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Kelurahan / Desa</label>
              <input
                type="text"
                value={village}
                onChange={e => setVillage(e.target.value)}
                placeholder="Contoh: Bangka"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Kecamatan</label>
              <input
                type="text"
                value={district}
                onChange={e => setDistrict(e.target.value)}
                placeholder="Contoh: Mampang Prapatan"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Kota / Kabupaten *</label>
              <input
                type="text"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Contoh: Jakarta Selatan"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Provinsi *</label>
              <select
                value={province}
                onChange={e => setProvince(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none bg-white focus:border-pink-500"
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
                placeholder="Contoh: 12730"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Courier Section */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Jasa Kirim Indonesia
              </label>
              <span className="text-[11px] text-slate-500">Pilih ekspedisi untuk label ini</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <select
                  value={selectedCourierName}
                  onChange={e => setSelectedCourierName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:border-pink-500"
                >
                  <optgroup label="⭐ Kurir Favorit">
                    {allCouriers.filter(c => c.is_active !== false && c.is_favorite).map(c => (
                      <option key={c.courier_id} value={c.courier_name}>★ {c.courier_name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="📦 Reguler & Ekspres">
                    {allCouriers.filter(c => c.is_active !== false && !c.is_favorite && c.courier_category === 'Reguler & Ekspres').map(c => (
                      <option key={c.courier_id} value={c.courier_name}>{c.courier_name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="⚡ Instan & Same-day">
                    {allCouriers.filter(c => c.is_active !== false && !c.is_favorite && c.courier_category === 'Instan & Same-day').map(c => (
                      <option key={c.courier_id} value={c.courier_name}>{c.courier_name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🚛 Kargo & Internasional">
                    {allCouriers.filter(c => c.is_active !== false && !c.is_favorite && (c.courier_category === 'Kargo' || c.courier_category === 'Internasional')).map(c => (
                      <option key={c.courier_id} value={c.courier_name}>{c.courier_name}</option>
                    ))}
                  </optgroup>
                  <option value="Lainnya">+ Kurir Lainnya (Input Manual)</option>
                </select>

                {selectedCourierName === 'Lainnya' && (
                  <input
                    type="text"
                    required
                    value={customCourierName}
                    onChange={e => setCustomCourierName(e.target.value)}
                    placeholder="Masukkan nama jasa kirim manual..."
                    className="w-full mt-2 px-3 py-1.5 rounded-lg border border-pink-300 text-xs bg-pink-50/30"
                  />
                )}
              </div>

              <div>
                <input
                  type="text"
                  value={shippingService}
                  onChange={e => setShippingService(e.target.value)}
                  placeholder="Layanan (Contoh: Reguler, YES, Cargo, dll)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-pink-500"
                />
                {availableServices.length > 0 && selectedCourierName !== 'Lainnya' && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {availableServices.slice(0, 3).map(srv => (
                      <button
                        type="button"
                        key={srv}
                        onClick={() => setShippingService(srv)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        {srv}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600">Catatan Pengiriman</label>
              <input
                type="text"
                value={shippingNotes}
                onChange={e => setShippingNotes(e.target.value)}
                placeholder="Contoh: Titipkan di pos satpam / Dropship atas nama Toko Berlian"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-pink-500"
              />
            </div>
          </div>

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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white text-sm font-semibold shadow-md shadow-pink-600/20 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Tambah Alamat')}
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
