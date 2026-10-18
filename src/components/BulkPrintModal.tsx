import React, { useState, useEffect } from 'react';
import { Address, Customer, Courier, StoreSettings } from '../types';
import { 
  X, 
  Printer, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  RotateCcw, 
  Package, 
  Layers, 
  Scissors, 
  Copy, 
  CheckCircle2, 
  Info, 
  ExternalLink,
  Truck,
  Eye,
  Tag
} from 'lucide-react';
import { YaxiyaLogo } from '../utils/logo';
import { openPrintWindow } from '../utils/printHelper';

interface BulkPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCouriers: Courier[];
  storeSettings?: StoreSettings;
  onOpenFullPrintPage: (selectedAddresses: Address[], a4Mode: 'single_per_sheet' | 'mixed_bulk') => void;
  onPrintSuccess: () => void;
}

export const BulkPrintModal: React.FC<BulkPrintModalProps> = ({
  isOpen,
  onClose,
  allCouriers,
  storeSettings: propStoreSettings,
  onOpenFullPrintPage,
  onPrintSuccess
}) => {
  const [allAddresses, setAllAddresses] = useState<Address[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, Customer>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [courierFilter, setCourierFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [selectedAddressIds, setSelectedAddressIds] = useState<string[]>([]);
  const [lastOpenedPrintUrl, setLastOpenedPrintUrl] = useState<string | null>(null);

  // Print Configuration
  const [format, setFormat] = useState<'thermal_100x150' | 'hvs_a4_3part'>('hvs_a4_3part');
  const [copies, setCopies] = useState<number>(1);
  const [fontSize, setFontSize] = useState<'small' | 'standard' | 'large'>('standard');
  const [showCustomerId, setShowCustomerId] = useState<boolean>(false);

  // Dropship Mode
  const [isDropshipMode, setIsDropshipMode] = useState<boolean>(false);
  const [dropshipSenderName, setDropshipSenderName] = useState<string>('');
  const [dropshipSenderPhone, setDropshipSenderPhone] = useState<string>('');
  const [dropshipSenderCity, setDropshipSenderCity] = useState<string>('');

  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Store Settings
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(propStoreSettings || {
    store_name: 'YAXIYA JEWELRY',
    phone: '0812-8889-9928',
    address: 'Pusat Grosir Perhiasan Titanium & Lapis Emas 18K',
    city: 'Jakarta Barat, DKI Jakarta',
    logo_mode: 'official',
    custom_logo_url: '',
    show_logo_on_print: true
  });

  // Fetch all addresses, customers, groups, settings on open
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([
        fetch('/api/addresses?limit=1000').then(r => r.json()),
        fetch('/api/customers?limit=1000').then(r => r.json()),
        fetch('/api/address-groups').then(r => r.json()),
        fetch('/api/settings').then(r => r.json())
      ])
        .then(([addrRes, custRes, groupRes, settRes]) => {
          if (addrRes.success) {
            const activeAddrs = addrRes.data.filter((a: Address) => a.status !== 'deleted');
            setAllAddresses(activeAddrs);
            // Default select all active addresses for convenience
            setSelectedAddressIds(activeAddrs.map((a: Address) => a.address_id));
          }
          if (custRes.success) {
            const map: Record<string, Customer> = {};
            custRes.data.forEach((c: Customer) => {
              map[c.customer_id] = c;
            });
            setCustomersMap(map);
          }
          if (groupRes.success && Array.isArray(groupRes.data)) {
            setAvailableGroups(groupRes.data);
          }
          if (settRes.success && settRes.data) {
            setStoreSettings(settRes.data);
          }
        })
        .catch(err => console.error('Error loading bulk data:', err))
        .finally(() => setIsLoading(false));
    } else {
      setSearchQuery('');
      setCourierFilter('');
      setGroupFilter('');
      setNotice(null);
      setLastOpenedPrintUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtered addresses
  const filteredAddresses = allAddresses.filter(addr => {
    const parentCust = customersMap[addr.customer_id];
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      const matchCustomer = parentCust?.customer_name?.toLowerCase().includes(q) || false;
      const matchCustomerId = addr.customer_id.toLowerCase().includes(q);
      const matchRecipient = addr.recipient_name.toLowerCase().includes(q);
      const matchPhone = addr.recipient_phone.toLowerCase().includes(q);
      const matchLabel = addr.address_label.toLowerCase().includes(q);
      const matchGroup = (addr.group_name || '').toLowerCase().includes(q);
      const matchCity = addr.city.toLowerCase().includes(q);
      const matchAddress = addr.full_address.toLowerCase().includes(q);
      const matchCourier = (addr.shipping_courier || '').toLowerCase().includes(q);

      if (!matchCustomer && !matchCustomerId && !matchRecipient && !matchPhone && !matchLabel && !matchGroup && !matchCity && !matchAddress && !matchCourier) {
        return false;
      }
    }

    if (courierFilter && addr.shipping_courier.toLowerCase() !== courierFilter.toLowerCase()) {
      return false;
    }

    if (groupFilter && (addr.group_name || '').toLowerCase() !== groupFilter.toLowerCase()) {
      return false;
    }

    return true;
  });

  const toggleSelectAddress = (id: string) => {
    setSelectedAddressIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const visibleIds = filteredAddresses.map(a => a.address_id);
    setSelectedAddressIds(prev => Array.from(new Set([...prev, ...visibleIds])));
  };

  const deselectAllFiltered = () => {
    const visibleIdsSet = new Set(filteredAddresses.map(a => a.address_id));
    setSelectedAddressIds(prev => prev.filter(id => !visibleIdsSet.has(id)));
  };

  const selectedAddresses = allAddresses.filter(a => selectedAddressIds.includes(a.address_id));

  // Expand items based on copies
  const printItems: Address[] = [];
  selectedAddresses.forEach(addr => {
    for (let i = 0; i < copies; i++) {
      printItems.push(addr);
    }
  });

  // Effective sender details
  const effectiveSenderName = isDropshipMode && dropshipSenderName.trim()
    ? dropshipSenderName.trim()
    : storeSettings.store_name;

  const effectiveSenderPhone = isDropshipMode && dropshipSenderPhone.trim()
    ? dropshipSenderPhone.trim()
    : storeSettings.phone;

  const effectiveSenderAddress = isDropshipMode
    ? (dropshipSenderCity.trim() ? `Pengiriman dari: ${dropshipSenderCity.trim()}` : '')
    : `${storeSettings.address}, ${storeSettings.city}`;

  // Font sizing styles
  const fontStyles = {
    small: {
      recipient: 'text-sm font-bold',
      phone: 'text-xs font-semibold',
      address: 'text-[11px] leading-snug',
    },
    standard: {
      recipient: 'text-base font-extrabold',
      phone: 'text-sm font-bold',
      address: 'text-xs leading-normal',
    },
    large: {
      recipient: 'text-lg font-black',
      phone: 'text-base font-bold',
      address: 'text-sm leading-relaxed',
    }
  }[fontSize];

  // Current formatted print date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentPrintDate = `${day} ${month} ${year}, ${hours}:${minutes} WIB`;

  // Generate printable HTML: in bulk print, A4 puts 3 different addresses per sheet
  const generateBulkPrintHtml = () => {
    const isThermal = format === 'thermal_100x150';

    if (isThermal) {
      return printItems.map((item) => `
        <div class="thermal-card page-break" style="width: 100mm; height: 148mm; padding: 4.5mm; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; display: flex; flex-direction: column; justify-content: space-between; border: 2.5px solid #000; margin: 0 auto; page-break-after: always; break-after: page;">
          <div>
            <!-- HEADER ATAS: PENGIRIM -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #000; padding-bottom: 3mm; gap: 3.5mm;">
              <div style="display: flex; align-items: center; gap: 3mm; min-width: 0;">
                ${!isDropshipMode && storeSettings.show_logo_on_print ? `
                  <div style="flex-shrink: 0;">
                    ${storeSettings.logo_mode === 'custom' && storeSettings.custom_logo_url ? `
                      <img src="${storeSettings.custom_logo_url}" style="max-height: 12mm; max-width: 25mm; object-fit: contain;" alt="Logo" />
                    ` : `
                      <div style="display: inline-flex; align-items: center; justify-content: center; width: 12mm; height: 12mm; border: 2px solid #000; font-weight: 900; font-size: 8.5pt; border-radius: 2px;">
                        YX
                      </div>
                    `}
                  </div>
                ` : ''}
                <div style="min-width: 0; line-height: 1.25;">
                  <div style="font-size: 7.5pt; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 0.5px;">PENGIRIM:</div>
                  <div style="font-weight: 900; font-size: ${isDropshipMode ? '11.5pt' : '12pt'}; text-transform: uppercase; word-wrap: break-word;">${effectiveSenderName}</div>
                  <div style="font-family: monospace; font-size: 9.5pt; font-weight: 800;">${effectiveSenderPhone}</div>
                  ${effectiveSenderAddress ? `<div style="font-size: 7.5pt; color: #333; margin-top: 1px; word-wrap: break-word;">${effectiveSenderAddress}</div>` : ''}
                </div>
              </div>
            </div>

            <!-- BAGIAN TENGAH: PENERIMA -->
            <div style="padding: 3.5mm 0; border-bottom: 2px dashed #000;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; font-weight: 800; margin-bottom: 1.5mm;">
                <span style="letter-spacing: 0.5px;">PENERIMA:</span>
                ${showCustomerId ? `<span style="font-family: monospace; font-size: 8.5pt; background: #eee; padding: 1px 5px; border-radius: 2px; border: 1px solid #ccc;">ID: ${item.customer_id}</span>` : ''}
              </div>
              <div style="font-size: ${fontSize === 'large' ? '15pt' : fontSize === 'small' ? '12pt' : '13.5pt'}; font-weight: 900; line-height: 1.2; word-wrap: break-word;">
                ${item.recipient_name}
              </div>
              <div style="font-size: ${fontSize === 'large' ? '13pt' : '11.5pt'}; font-weight: 900; font-family: monospace; margin-top: 1.5mm;">
                ${item.recipient_phone}
              </div>
              <div style="font-size: ${fontSize === 'large' ? '11pt' : '10pt'}; line-height: 1.3; margin-top: 2mm; word-wrap: break-word;">
                ${item.full_address}
              </div>
              <div style="font-size: 9.5pt; font-weight: 800; margin-top: 1.5mm;">
                ${[item.village, item.district, item.city, item.province, item.postal_code].filter(Boolean).join(', ')}
              </div>
            </div>

            <!-- KETERANGAN JASA KIRIM -->
            <div style="margin-top: 3mm; border: 2px solid #000; padding: 2.5mm; border-radius: 3px; background: #fafafa;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #555;">JASA KIRIM:</div>
                <div style="font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #555;">KOTA TUJUAN:</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1mm;">
                <div style="background: #000; color: #fff; padding: 3px 8px; font-weight: 900; font-size: 11pt; border-radius: 2px; text-transform: uppercase;">
                  ${item.shipping_courier || 'EKSPEDISI'} ${item.shipping_service ? `· ${item.shipping_service}` : ''}
                </div>
                <div style="font-weight: 900; font-size: 11pt; text-transform: uppercase;">
                  ${item.city}
                </div>
              </div>
            </div>

            ${item.shipping_notes ? `
              <div style="margin-top: 2.5mm; padding-top: 2mm; background: #fffbe6; border: 1px dashed #d4b106; font-size: 8.5pt; border-radius: 2px;">
                <strong>CATATAN: </strong> ${item.shipping_notes}
              </div>
            ` : ''}
          </div>

          <!-- Footer: Keterangan Tanggal Cetak (Footer lama dihilangkan) -->
          <div style="border-top: 1px solid #ccc; padding-top: 1.5mm; font-size: 7.5pt; color: #555; text-align: center; font-family: monospace;">
            Tgl Cetak: ${currentPrintDate}
          </div>
        </div>
      `).join('');
    } else {
      // HVS A4: 1 lembar memuat 3 alamat berbeda!
      const totalPages = Math.ceil(printItems.length / 3);
      let a4Html = '';

      for (let p = 0; p < totalPages; p++) {
        const pageItems = printItems.slice(p * 3, p * 3 + 3);
        a4Html += `
          <div class="a4-page page-break" style="width: 200mm; height: 287mm; padding: 3mm; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; display: flex; flex-direction: column; justify-content: flex-start; margin: 0 auto; page-break-after: always; break-after: page;">
            ${pageItems.map((item, itemIdx) => `
              <div style="height: 91mm; border: 1.5px dashed #000; padding: 3mm 4mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; margin-bottom: 2mm; position: relative;">
                <div>
                  <!-- HEADER ATAS: PENGIRIM -->
                  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 1.5mm;">
                    <div style="display: flex; align-items: center; gap: 2.5mm;">
                      ${!isDropshipMode && storeSettings.show_logo_on_print ? `
                        <div style="font-weight: 900; font-size: 8pt; border: 1.5px solid #000; padding: 1px 4px;">YX</div>
                      ` : ''}
                      <div>
                        <span style="font-size: 7pt; font-weight: 800; color: #444;">PENGIRIM: </span>
                        <strong style="font-size: 9.5pt; text-transform: uppercase;">${effectiveSenderName}</strong>
                        <span style="font-family: monospace; font-size: 8pt; font-weight: 800; margin-left: 2mm;">(${effectiveSenderPhone})</span>
                      </div>
                    </div>
                    ${showCustomerId ? `<div style="font-family: monospace; font-size: 7.5pt; font-weight: 800;">ID: ${item.customer_id}</div>` : ''}
                  </div>

                  <!-- DETAIL PENERIMA -->
                  <div style="padding: 2mm 0; border-bottom: 1px dashed #888;">
                    <div style="font-size: 7.5pt; font-weight: 800; color: #444;">PENERIMA:</div>
                    <div style="font-size: 11pt; font-weight: 900; line-height: 1.2;">${item.recipient_name}</div>
                    <div style="font-size: 9.5pt; font-weight: 800; font-family: monospace;">${item.recipient_phone}</div>
                    <div style="font-size: 8.5pt; line-height: 1.25; margin-top: 1mm;">${item.full_address}</div>
                    <div style="font-size: 8pt; font-weight: 800; margin-top: 0.5mm;">
                      ${[item.village, item.district, item.city, item.province, item.postal_code].filter(Boolean).join(', ')}
                    </div>
                  </div>

                  <!-- KETERANGAN JASA KIRIM -->
                  <div style="margin-top: 1.5mm; display: flex; justify-content: space-between; align-items: center; background: #f4f4f4; padding: 1.5mm 2.5mm; border: 1px solid #000; border-radius: 2px;">
                    <div>
                      <span style="font-size: 7pt; font-weight: 800; color: #444;">JASA KIRIM: </span>
                      <strong style="background: #000; color: #fff; padding: 1px 5px; font-size: 8.5pt; border-radius: 2px;">${item.shipping_courier || 'EKSPEDISI'} ${item.shipping_service ? `(${item.shipping_service})` : ''}</strong>
                    </div>
                    <div style="font-size: 8pt; font-weight: 900; text-transform: uppercase;">
                      TUJUAN: ${item.city}
                    </div>
                  </div>

                  ${item.shipping_notes ? `
                    <div style="font-size: 7.5pt; margin-top: 1mm;"><strong>Catatan:</strong> ${item.shipping_notes}</div>
                  ` : ''}
                </div>

                <!-- Garis Potong & Keterangan Tanggal Cetak -->
                <div style="text-align: center; font-size: 7pt; color: #666; border-top: 1px dotted #888; padding-top: 1mm; font-family: monospace;">
                  ✂ Gunting Di Sini (Cut Line) · Tgl Cetak: ${currentPrintDate}
                </div>
              </div>
            `).join('')}

            ${/* Jika halaman terakhir tersisa slot kosong, gambar panduan garis potong agar kertas tetap rapi */
              pageItems.length < 3 ? Array.from({ length: 3 - pageItems.length }).map((_, emptyIdx) => `
                <div style="height: 91mm; border: 1px dotted #ccc; background: #fafafa; margin-bottom: 2mm; box-sizing: border-box; display: flex; align-items: center; justify-content: center; color: #999; font-size: 8pt; font-family: monospace;">
                  [Area Kosong Lembar A4 · Bagian ${pageItems.length + emptyIdx + 1}/3]
                </div>
              `).join('') : ''
            }
          </div>
        `;
      }
      return a4Html;
    }
  };

  // Direct Bulk Print Execution
  // Direct Bulk Print Execution - Opens new window immediately
  const handleExecuteBulkPrint = async () => {
    if (printItems.length === 0) {
      alert('Pilih minimal satu alamat dengan mencentang kotak.');
      return;
    }

    setIsPrinting(true);
    setNotice(null);

    try {
      // 1. Immediately open new browser window to print
      const printResult = openPrintWindow({
        addressIds: selectedAddressIds,
        format,
        copies,
        a4Mode: 'mixed_bulk',
        isDropship: isDropshipMode,
        dropshipName: dropshipSenderName,
        dropshipPhone: dropshipSenderPhone,
        dropshipCity: dropshipSenderCity,
        showId: showCustomerId,
        fontSize,
        onPrintRecorded: () => {
          onPrintSuccess();
        }
      });

      setLastOpenedPrintUrl(printResult.url);

      if (printResult.success) {
        setNotice('Jendela baru berhasil dibuka untuk mencetak label. Kotak dialog printer akan otomatis muncul.');
      } else {
        setNotice('Jendela cetak telah disiapkan. Jika jendela baru terblokir oleh browser, silakan klik tombol di bawah.');
      }

      onPrintSuccess();
    } catch (err: any) {
      console.error('Error initiating bulk print:', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenAdvancedPreview = () => {
    if (selectedAddresses.length === 0) {
      alert('Pilih minimal satu alamat dengan mencentang kotak.');
      return;
    }
    onOpenFullPrintPage(selectedAddresses, 'mixed_bulk');
    onClose();
  };

  const a4SheetsCount = Math.ceil(printItems.length / 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/70 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-md shadow-pink-600/20">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Cetak Label Alamat Massal
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-mono">
                  Bulk Printing
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cari, tandai beberapa alamat dari berbagai pelanggan, lalu cetak pada kertas Thermal atau HVS A4 (1 lembar isi 3 alamat berbeda)
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

        {/* Notice */}
        {notice && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
            {lastOpenedPrintUrl && (
              <a
                href={lastOpenedPrintUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Jendela Cetak ↗
              </a>
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Format Kertas */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                1. Ukuran Kertas
              </label>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setFormat('hvs_a4_3part')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    format === 'hvs_a4_3part'
                      ? 'border-pink-500 bg-white shadow-xs text-pink-900 ring-2 ring-pink-500/20'
                      : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Kertas HVS A4 (3 Alamat)</span>
                    {format === 'hvs_a4_3part' && <span className="w-2 h-2 rounded-full bg-pink-600"></span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    1 lembar A4 memuat 3 alamat berbeda (hemat kertas).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('thermal_100x150')}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    format === 'thermal_100x150'
                      ? 'border-pink-500 bg-white shadow-xs text-pink-900 ring-2 ring-pink-500/20'
                      : 'border-slate-200 bg-white/70 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Thermal 100 × 150 mm</span>
                    {format === 'thermal_100x150' && <span className="w-2 h-2 rounded-full bg-pink-600"></span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Roll stiker potrait (1 stiker per salinan).
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Salinan & Dropship */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Salinan & Pengirim
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Salinan:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCopies(Math.max(1, copies - 1))}
                      className="w-6 h-6 rounded border border-slate-200 bg-white font-bold hover:bg-slate-100 flex items-center justify-center text-xs"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold font-mono text-xs">{copies}</span>
                    <button
                      type="button"
                      onClick={() => setCopies(copies + 1)}
                      className="w-6 h-6 rounded border border-slate-200 bg-white font-bold hover:bg-slate-100 flex items-center justify-center text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Dropship Toggle */}
              <div className="pt-2 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => setIsDropshipMode(!isDropshipMode)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                    isDropshipMode
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>Mode Dropship</span>
                  </span>
                  <span>{isDropshipMode ? 'Aktif' : 'Non-aktif'}</span>
                </button>

                {isDropshipMode && (
                  <div className="mt-2 space-y-1.5">
                    <input
                      type="text"
                      value={dropshipSenderName}
                      onChange={e => setDropshipSenderName(e.target.value)}
                      placeholder="Nama Toko Pengirim Dropship"
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-purple-300 outline-none"
                    />
                    <input
                      type="tel"
                      value={dropshipSenderPhone}
                      onChange={e => setDropshipSenderPhone(e.target.value)}
                      placeholder="No. HP Pengirim Dropship"
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-purple-300 outline-none font-mono"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. Ringkasan Cetak */}
            <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-200/70 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-pink-900 uppercase tracking-wider block">
                  3. Ringkasan Cetak Massal
                </span>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Alamat Ditandai:</span>
                    <strong className="font-mono text-slate-900">{selectedAddressIds.length} alamat</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Label:</span>
                    <strong className="font-mono text-pink-700">{printItems.length} label</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-pink-200/60 font-semibold">
                    <span className="text-slate-700">Kebutuhan Kertas:</span>
                    <span className="text-pink-900 font-bold">
                      {format === 'thermal_100x150'
                        ? `${printItems.length} Stiker Roll`
                        : `${a4SheetsCount} Lembar HVS A4`}
                    </span>
                  </div>
                </div>
              </div>

              {format === 'hvs_a4_3part' && (
                <div className="text-[11px] text-pink-800 bg-white/70 p-2 rounded-lg border border-pink-200/50 mt-2">
                  ✨ <strong>Aturan A4 Massal:</strong> 1 lembar kertas A4 memuat hingga 3 alamat berbeda dengan garis potong gunting rapi.
                </div>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari ID, pelanggan, nama penerima, no telepon, kota..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none"
                />
              </div>

              <select
                value={courierFilter}
                onChange={e => setCourierFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 outline-none"
              >
                <option value="">Semua Jasa Kirim</option>
                {allCouriers.filter(c => c.is_active).map(c => (
                  <option key={c.courier_id} value={c.courier_name}>{c.courier_name}</option>
                ))}
              </select>
            </div>

            {/* Quick Checkbox Actions */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700"
              >
                Tandai Semua ({filteredAddresses.length})
              </button>
              <button
                type="button"
                onClick={deselectAllFiltered}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-semibold text-slate-500"
              >
                Batal Tandai
              </button>
            </div>
          </div>

          {/* Addresses Table / Cards */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-[360px] overflow-y-auto">
              {isLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Memuat data seluruh alamat pelanggan...
                </div>
              ) : filteredAddresses.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada alamat yang sesuai pencarian atau filter.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] font-bold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                      <th className="py-2.5 px-3">Pelanggan & ID</th>
                      <th className="py-2.5 px-3">Label Alamat</th>
                      <th className="py-2.5 px-3">Penerima & No. Telepon</th>
                      <th className="py-2.5 px-3">Alamat Lengkap & Kota</th>
                      <th className="py-2.5 px-3">Jasa Kirim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAddresses.map(addr => {
                      const isChecked = selectedAddressIds.includes(addr.address_id);
                      const parentCust = customersMap[addr.customer_id];
                      const isDropship = parentCust && addr.recipient_name.toLowerCase() !== parentCust.customer_name.toLowerCase();

                      return (
                        <tr
                          key={addr.address_id}
                          onClick={() => toggleSelectAddress(addr.address_id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked ? 'bg-pink-50/40 hover:bg-pink-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by row click
                              className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300 pointer-events-none"
                            />
                          </td>

                          {/* Customer & ID */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {parentCust?.customer_name || 'Pelanggan'}
                            </div>
                            <span className="font-mono text-[10px] text-pink-700 font-semibold">
                              {addr.customer_id}
                            </span>
                          </td>

                          {/* Label & Group */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800">
                                {addr.address_label}
                              </span>
                              {addr.group_name && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-0.5">
                                  <Tag className="w-2.5 h-2.5 text-purple-500" />
                                  {addr.group_name}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              {addr.address_id}
                            </span>
                          </td>

                          {/* Recipient */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {addr.recipient_name}
                            </div>
                            <div className="font-mono text-slate-600 text-[11px]">
                              {addr.recipient_phone}
                            </div>
                          </td>

                          {/* Full address */}
                          <td className="py-2.5 px-3 max-w-xs truncate">
                            <span className="text-slate-800 font-medium">
                              {addr.full_address}
                            </span>
                            <div className="text-[10px] text-slate-500 font-semibold truncate">
                              {[addr.district, addr.city, addr.province].filter(Boolean).join(', ')}
                            </div>
                          </td>

                          {/* Courier */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-800 text-[10px] flex items-center gap-1 w-fit">
                              <Truck className="w-3 h-3 text-slate-500" />
                              {addr.shipping_courier || 'Ekspedisi'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            <strong>{selectedAddressIds.length}</strong> alamat dipilih · Total <strong>{printItems.length}</strong> label (
            {format === 'hvs_a4_3part' ? `${a4SheetsCount} lembar A4 (3 alamat/lembar)` : `${printItems.length} roll stiker`})
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenAdvancedPreview}
              disabled={selectedAddressIds.length === 0}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>Preview Lengkap</span>
            </button>

            <button
              onClick={handleExecuteBulkPrint}
              disabled={selectedAddressIds.length === 0 || isPrinting}
              className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-md shadow-pink-600/20 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Mempersiapkan...' : `Cetak Massal Sekarang (${selectedAddressIds.length} Alamat)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
