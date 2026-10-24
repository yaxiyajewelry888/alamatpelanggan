import React, { useState, useEffect, useRef } from 'react';
import { Address, Customer, StoreSettings } from '../types';
import { 
  X, 
  Printer, 
  Copy, 
  Eye, 
  Sliders, 
  Info, 
  Package, 
  Scissors,
  ExternalLink,
  CheckCircle2,
  BookmarkPlus,
  Save,
  Loader2,
  Sparkles
} from 'lucide-react';
import { YaxiyaLogo } from '../utils/logo';
import { openPrintWindow } from '../utils/printHelper';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: Address[];
  customersMap: Record<string, Customer>;
  onPrintSuccess?: (records: any[]) => void;
  defaultSettings?: StoreSettings;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  addresses,
  customersMap,
  onPrintSuccess,
  defaultSettings
}) => {
  if (!isOpen || addresses.length === 0) return null;

  // Local mutable list of addresses so updates/additions (like saved dropship) reflect immediately
  const [localAddresses, setLocalAddresses] = useState<Address[]>(addresses);

  // Selected addresses for printing
  const [selectedIds, setSelectedIds] = useState<string[]>(() => addresses.map(a => a.address_id));
  const [format, setFormat] = useState<'thermal_100x150' | 'hvs_a4_3part'>('thermal_100x150');
  const [a4Mode, setA4Mode] = useState<'single_per_sheet' | 'mixed_bulk'>('single_per_sheet');
  const [copies, setCopies] = useState<number>(1);
  const [showCustomerId, setShowCustomerId] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'small' | 'standard' | 'large'>('standard');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastOpenedUrl, setLastOpenedUrl] = useState<string | null>(null);

  // Dropship Mode
  const [isDropshipMode, setIsDropshipMode] = useState<boolean>(false);
  const [dropshipSenderName, setDropshipSenderName] = useState<string>('');
  const [dropshipSenderPhone, setDropshipSenderPhone] = useState<string>('');
  const [dropshipSenderCity, setDropshipSenderCity] = useState<string>('');

  // Save Dropship Address to Multi-Address state
  const [saveDropshipMode, setSaveDropshipMode] = useState<'create_new' | 'update_existing'>('create_new');
  const [autoSaveDropshipOnPrint, setAutoSaveDropshipOnPrint] = useState<boolean>(true);
  const [isSavingDropship, setIsSavingDropship] = useState<boolean>(false);
  const [dropshipSaveSuccessMsg, setDropshipSaveSuccessMsg] = useState<string | null>(null);
  const [savedDropshipIds, setSavedDropshipIds] = useState<Set<string>>(new Set());

  // Sync prop changes & auto-detect dropship details
  useEffect(() => {
    setLocalAddresses(addresses);
    setSelectedIds(addresses.map(a => a.address_id));

    // Auto-detect if any address already has saved dropship details
    const savedDropship = addresses.find(
      a => a.is_dropship || Boolean(a.dropship_sender_name && a.dropship_sender_name.trim()) || a.address_label === 'Dropship'
    );
    if (savedDropship) {
      setIsDropshipMode(true);
      if (savedDropship.dropship_sender_name) {
        setDropshipSenderName(savedDropship.dropship_sender_name);
      }
      if (savedDropship.dropship_sender_phone) {
        setDropshipSenderPhone(savedDropship.dropship_sender_phone);
      }
      if (savedDropship.dropship_sender_city) {
        setDropshipSenderCity(savedDropship.dropship_sender_city);
      }
    }
  }, [addresses]);

  // Store Settings (Default Pengirim & Logo)
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(defaultSettings || {
    store_name: 'YAXIYA JEWELRY',
    phone: '0812-8889-9928',
    address: 'Pusat Grosir Perhiasan Titanium & Lapis Emas 18K',
    city: 'Jakarta Barat, DKI Jakarta',
    logo_mode: 'official',
    custom_logo_url: '',
    show_logo_on_print: true
  });

  useEffect(() => {
    if (defaultSettings) {
      setStoreSettings(defaultSettings);
    }
  }, [defaultSettings]);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setStoreSettings(d.data);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      // If user selected an address that has saved dropship data, auto-fill it
      if (next.includes(id)) {
        const picked = localAddresses.find(a => a.address_id === id);
        if (picked && (picked.is_dropship || picked.dropship_sender_name)) {
          setIsDropshipMode(true);
          if (picked.dropship_sender_name) setDropshipSenderName(picked.dropship_sender_name);
          if (picked.dropship_sender_phone) setDropshipSenderPhone(picked.dropship_sender_phone);
          if (picked.dropship_sender_city) setDropshipSenderCity(picked.dropship_sender_city);
        }
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(localAddresses.map(a => a.address_id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const selectedAddresses = localAddresses.filter(a => selectedIds.includes(a.address_id));

  // Expand addresses according to copies count
  const printItems: Address[] = [];
  selectedAddresses.forEach(addr => {
    for (let c = 0; c < copies; c++) {
      printItems.push(addr);
    }
  });

  // Helper for computing sender info per item (Dropship suppresses logo and default store name)
  const getItemSenderInfo = (item: Address) => {
    const itemIsDropship = isDropshipMode || Boolean(item.is_dropship) || Boolean(item.dropship_sender_name && item.dropship_sender_name.trim()) || item.address_label === 'Dropship';
    const senderName = itemIsDropship
      ? (dropshipSenderName.trim() || item.dropship_sender_name?.trim() || 'PENGIRIM DROPSHIP')
      : storeSettings.store_name;
    const senderPhone = itemIsDropship
      ? (dropshipSenderPhone.trim() || item.dropship_sender_phone?.trim() || '')
      : storeSettings.phone;
    const itemCity = (dropshipSenderCity.trim() || item.dropship_sender_city?.trim() || '');
    const senderAddress = itemIsDropship
      ? (itemCity ? `Pengiriman dari: ${itemCity}` : '')
      : `${storeSettings.address}, ${storeSettings.city}`;

    return {
      itemIsDropship,
      senderName,
      senderPhone,
      senderAddress
    };
  };

  // Effective sender details (modal general fallback)
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
      notes: 'text-[10px]',
      sender: 'text-[10px]'
    },
    standard: {
      recipient: 'text-base font-extrabold',
      phone: 'text-sm font-bold',
      address: 'text-xs leading-normal',
      notes: 'text-xs',
      sender: 'text-xs'
    },
    large: {
      recipient: 'text-lg font-black',
      phone: 'text-base font-bold',
      address: 'text-sm leading-relaxed',
      notes: 'text-xs',
      sender: 'text-xs'
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

  // Generate printable HTML string for hidden iframe printing
  const generatePrintableHtml = () => {
    const isThermal = format === 'thermal_100x150';

    if (isThermal) {
      return printItems.map((item, idx) => {
        const { itemIsDropship, senderName, senderPhone, senderAddress } = getItemSenderInfo(item);
        return `
        <div class="thermal-card page-break" style="width: 100mm; height: 148mm; padding: 4.5mm; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; display: flex; flex-direction: column; justify-content: space-between; border: 2px solid #000; margin: 0 auto;">
          <div>
            <!-- HEADER ATAS: PENGIRIM (DROPSHIP = LOGO DAN NAMA TOKO BAWAAN OTOMATIS HILANG) -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #000; padding-bottom: 3mm; gap: 3mm;">
              <div style="display: flex; align-items: center; gap: 3mm; min-width: 0;">
                ${!itemIsDropship && storeSettings.show_logo_on_print && storeSettings.logo_mode !== 'none' ? `
                  <div style="flex-shrink: 0; display: flex; align-items: center;">
                    ${(storeSettings.logo_mode === 'custom' || storeSettings.custom_logo_url) && storeSettings.custom_logo_url ? `
                      <img src="${storeSettings.custom_logo_url}" alt="Logo Toko" style="max-height: 12mm; max-width: 25mm; object-fit: contain; display: block;" onerror="this.style.display='none'" />
                    ` : `
                      <img src="/assets/aistudio/LOGO_YAXIYA_Pink_-_Copy_c18e8ec2.png" alt="Yaxiya Jewelry" style="max-height: 12mm; max-width: 25mm; object-fit: contain; display: block;" />
                    `}
                  </div>
                ` : ''}
                <div style="min-width: 0; line-height: 1.25;">
                  <div style="font-size: 7.5pt; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 0.5px;">PENGIRIM:</div>
                  <div style="font-weight: 900; font-size: ${itemIsDropship ? '11pt' : '12pt'}; text-transform: uppercase; word-wrap: break-word;">${senderName}</div>
                  <div style="font-family: monospace; font-size: 9pt; font-weight: 800;">${senderPhone}</div>
                  ${senderAddress ? `<div style="font-size: 7.5pt; color: #333; margin-top: 1px; word-wrap: break-word;">${senderAddress}</div>` : ''}
                </div>
              </div>
            </div>

            <!-- BAGIAN TENGAH: PENERIMA -->
            <div style="padding: 3mm 0; border-bottom: 2px dashed #000;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; font-weight: 800; margin-bottom: 1.5mm;">
                <span style="letter-spacing: 0.5px;">PENERIMA:</span>
                ${showCustomerId ? `<span style="font-family: monospace; font-size: 8.5pt; background: #eee; padding: 1px 4px; border-radius: 2px; border: 1px solid #ccc;">ID: ${item.customer_id}</span>` : ''}
              </div>
              <div style="font-size: ${fontSize === 'large' ? '15pt' : fontSize === 'small' ? '12pt' : '13.5pt'}; font-weight: 900; line-height: 1.2; word-wrap: break-word;">
                ${item.recipient_name}
              </div>
              <div style="font-size: ${fontSize === 'large' ? '13pt' : '11pt'}; font-weight: 900; font-family: monospace; margin-top: 1.5mm;">
                ${item.recipient_phone}
              </div>
              <div style="font-size: ${fontSize === 'large' ? '11pt' : '10pt'}; line-height: 1.3; margin-top: 2mm; word-wrap: break-word;">
                ${item.full_address}
              </div>
              <div style="font-size: 9.5pt; font-weight: 800; margin-top: 1.5mm;">
                ${[item.village, item.district, item.city, item.province, item.postal_code].filter(Boolean).join(', ')}
              </div>
            </div>

            <!-- KETERANGAN JASA KIRIM (DIPINDAHKAN DI BAWAH ALAMAT) -->
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
              <div style="margin-top: 2mm; padding: 2mm; background: #fffbe6; border: 1px dashed #d4b106; font-size: 8.5pt; border-radius: 2px;">
                <strong>CATATAN: </strong> ${item.shipping_notes}
              </div>
            ` : ''}
          </div>

          <!-- Footer: Keterangan Tanggal Cetak (Footer lama dihilangkan) -->
          <div style="border-top: 1px solid #ccc; padding-top: 1.5mm; font-size: 7.5pt; color: #555; text-align: center; font-family: monospace;">
            Tgl Cetak: ${currentPrintDate}
          </div>
        </div>
      `;
      }).join('');
    } else {
      // HVS A4 (3 Bagian per Lembar)
      const renderA4ItemHtml = (item: Address, slotIdx: number, modeLabel: string) => {
        const { itemIsDropship, senderName, senderPhone, senderAddress } = getItemSenderInfo(item);
        return `
        <div style="height: 91mm; border: 1.5px dashed #000; padding: 3mm 4mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; margin-bottom: 2mm; position: relative;">
          <div>
            <!-- HEADER ATAS: PENGIRIM (DROPSHIP = LOGO DAN NAMA TOKO BAWAAN OTOMATIS HILANG) -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 1.5mm;">
              <div style="display: flex; align-items: center; gap: 2.5mm;">
                ${!itemIsDropship && storeSettings.show_logo_on_print && storeSettings.logo_mode !== 'none' ? `
                  <div style="flex-shrink: 0; display: inline-flex; align-items: center;">
                    ${(storeSettings.logo_mode === 'custom' || storeSettings.custom_logo_url) && storeSettings.custom_logo_url ? `
                      <img src="${storeSettings.custom_logo_url}" alt="Logo Toko" style="max-height: 9mm; max-width: 22mm; object-fit: contain; display: block;" onerror="this.style.display='none'" />
                    ` : `
                      <img src="/assets/aistudio/LOGO_YAXIYA_Pink_-_Copy_c18e8ec2.png" alt="Yaxiya Jewelry" style="max-height: 9mm; max-width: 22mm; object-fit: contain; display: block;" />
                    `}
                  </div>
                ` : ''}
                <div>
                  <span style="font-size: 7pt; font-weight: 800; color: #444;">PENGIRIM: </span>
                  <strong style="font-size: 9.5pt; text-transform: uppercase;">${senderName}</strong>
                  ${senderPhone ? `<span style="font-family: monospace; font-size: 8pt; font-weight: 800; margin-left: 2mm;">(${senderPhone})</span>` : ''}
                  ${senderAddress ? `<span style="font-size: 7pt; color: #555; margin-left: 2mm;">[${senderAddress}]</span>` : ''}
                </div>
              </div>
              ${showCustomerId ? `<div style="font-family: monospace; font-size: 7.5pt; font-weight: 800;">ID: ${item.customer_id}</div>` : ''}
            </div>

            <!-- DETAIL PENERIMA -->
            <div style="padding: 2mm 0; border-bottom: 1px dashed #888;">
              <div style="font-size: 7.5pt; font-weight: 800; color: #444;">PENERIMA:</div>
              <div style="font-size: ${fontSize === 'large' ? '12pt' : fontSize === 'small' ? '10pt' : '11pt'}; font-weight: 900; line-height: 1.2;">${item.recipient_name}</div>
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
      `;
      };

      const renderEmptySlotHtml = (slotIdx: number) => `
        <div style="height: 91mm; border: 1px dotted #ccc; background: #fafafa; margin-bottom: 2mm; box-sizing: border-box; display: flex; align-items: center; justify-content: center; color: #999; font-size: 8pt; font-family: monospace;">
          [Area Kosong Lembar A4 · Bagian ${slotIdx + 1}/3]
        </div>
      `;

      let a4Html = '';

      if (a4Mode === 'single_per_sheet') {
        // Mode 1: 1 Lembar Hanya 1 Alamat, sesuai jumlah salinan (maks 3 per lembar)
        selectedAddresses.forEach(addr => {
          const sheetsForThisAddr = Math.max(1, Math.ceil(copies / 3));
          for (let s = 0; s < sheetsForThisAddr; s++) {
            const countOnThisSheet = Math.min(copies - s * 3, 3);
            a4Html += `
              <div class="a4-page page-break" style="width: 200mm; height: 287mm; padding: 3mm; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; display: flex; flex-direction: column; justify-content: flex-start; margin: 0 auto; page-break-after: always; break-after: page;">
                ${Array.from({ length: countOnThisSheet }).map((_, cIdx) => 
                  renderA4ItemHtml(addr, cIdx, `Salinan ${s * 3 + cIdx + 1}/${copies}`)
                ).join('')}
                ${Array.from({ length: 3 - countOnThisSheet }).map((_, emptyIdx) => 
                  renderEmptySlotHtml(countOnThisSheet + emptyIdx)
                ).join('')}
              </div>
            `;
          }
        });
      } else {
        // Mode 2: Cetak Massal - 1 Lembar memuat hingga 3 alamat berbeda
        const totalPages = Math.ceil(printItems.length / 3);
        for (let p = 0; p < totalPages; p++) {
          const pageItems = printItems.slice(p * 3, p * 3 + 3);
          a4Html += `
            <div class="a4-page page-break" style="width: 200mm; height: 287mm; padding: 3mm; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; display: flex; flex-direction: column; justify-content: flex-start; margin: 0 auto; page-break-after: always; break-after: page;">
              ${pageItems.map((item, itemIdx) => 
                renderA4ItemHtml(item, itemIdx, 'Alamat Berbeda')
              ).join('')}
              ${Array.from({ length: 3 - pageItems.length }).map((_, emptyIdx) => 
                renderEmptySlotHtml(pageItems.length + emptyIdx)
              ).join('')}
            </div>
          `;
        }
      }

      return a4Html;
    }
  };

  // Direct Print URL for standalone printing
  const printPageUrl = `/api/print-page?ids=${selectedIds.join(',')}&format=${format}&copies=${copies}&a4_mode=${a4Mode}&is_dropship=${isDropshipMode}&dropship_name=${encodeURIComponent(dropshipSenderName)}&dropship_phone=${encodeURIComponent(dropshipSenderPhone)}&dropship_city=${encodeURIComponent(dropshipSenderCity)}&show_id=${showCustomerId}&font_size=${fontSize}`;

  const handleSaveDropshipAddress = async (targetAddr?: Address, quiet: boolean = false): Promise<Address | null> => {
    const addr = targetAddr || selectedAddresses[0];
    if (!addr) {
      if (!quiet) alert('Pilih minimal satu alamat penerima terlebih dahulu.');
      return null;
    }

    if (!dropshipSenderName.trim() || !dropshipSenderPhone.trim()) {
      if (!quiet) alert('Silakan isi Nama Pengirim Dropship dan No. Telepon Pengirim terlebih dahulu.');
      return null;
    }

    setIsSavingDropship(true);
    setDropshipSaveSuccessMsg(null);

    try {
      const response = await fetch('/api/addresses/save-dropship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address_id: addr.address_id,
          customer_id: addr.customer_id,
          recipient_name: addr.recipient_name,
          recipient_phone: addr.recipient_phone,
          full_address: addr.full_address,
          village: addr.village,
          district: addr.district,
          city: addr.city,
          province: addr.province,
          postal_code: addr.postal_code,
          shipping_courier: addr.shipping_courier,
          shipping_service: addr.shipping_service,
          shipping_notes: addr.shipping_notes,
          dropship_sender_name: dropshipSenderName.trim(),
          dropship_sender_phone: dropshipSenderPhone.trim(),
          dropship_sender_city: dropshipSenderCity.trim(),
          mode: saveDropshipMode
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || 'Gagal menyimpan alamat dropship');
      }

      const savedAddr: Address = resData.data;

      // Update local address list so preview and list reflect immediately
      if (saveDropshipMode === 'create_new') {
        setLocalAddresses(prev => [savedAddr, ...prev.filter(a => a.address_id !== savedAddr.address_id)]);
        setSelectedIds(prev => [savedAddr.address_id, ...prev.filter(id => id !== addr.address_id)]);
      } else {
        setLocalAddresses(prev => prev.map(a => a.address_id === savedAddr.address_id ? savedAddr : a));
      }

      setSavedDropshipIds(prev => new Set(prev).add(savedAddr.address_id).add(addr.address_id));
      setDropshipSaveSuccessMsg(`✓ Alamat dropship "${savedAddr.recipient_name}" & Pengirim "${savedAddr.dropship_sender_name}" tersimpan di kolom khusus Spreadsheet & Multi-Alamat (${savedAddr.customer_id}). Catatan pengiriman tetap terpisah dan siap cetak tanpa logo toko!`);

      // Broadcast events so other views (Customer List, Multi-address modal) refresh immediately
      window.dispatchEvent(new CustomEvent('addresses-updated'));
      window.dispatchEvent(new CustomEvent('groups-updated'));
      if (onPrintSuccess) onPrintSuccess([]);
      return savedAddr;
    } catch (err: any) {
      if (!quiet) alert('Gagal menyimpan alamat dropship: ' + err.message);
      return null;
    } finally {
      setIsSavingDropship(false);
    }
  };

  const handlePrint = async () => {
    if (printItems.length === 0) {
      alert('Pilih minimal satu alamat untuk dicetak.');
      return;
    }

    setIsRecording(true);
    setNotice(null);

    try {
      // Auto-save dropship if enabled and sender info is filled
      if (isDropshipMode && autoSaveDropshipOnPrint && dropshipSenderName.trim() && dropshipSenderPhone.trim()) {
        const unsaved = selectedAddresses.find(a => !savedDropshipIds.has(a.address_id));
        if (unsaved) {
          try {
            await handleSaveDropshipAddress(unsaved, true);
          } catch (e) {
            console.warn('Auto-save dropship on print:', e);
          }
        }
      }

      // 1. Immediately open new browser window to print labels
      const printResult = openPrintWindow({
        addressIds: selectedIds,
        format,
        copies,
        a4Mode,
        isDropship: isDropshipMode,
        dropshipName: dropshipSenderName,
        dropshipPhone: dropshipSenderPhone,
        dropshipCity: dropshipSenderCity,
        showId: showCustomerId,
        fontSize,
        onPrintRecorded: () => {
          if (onPrintSuccess) onPrintSuccess([]);
        }
      });

      setLastOpenedUrl(printResult.url);

      if (printResult.success) {
        setNotice('Jendela baru berhasil dibuka untuk mencetak label. Kotak dialog printer akan otomatis muncul.');
      } else {
        setNotice('Jendela cetak telah disiapkan. Jika jendela tidak otomatis terbuka (popup blocker), silakan klik tombol di bawah.');
      }

      if (onPrintSuccess) {
        onPrintSuccess([]);
      }
    } catch (err: any) {
      console.error('Error during print process:', err);
      window.print();
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl my-4 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/70 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Cetak Label Pengiriman</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold font-mono">
                  {selectedAddresses.length} Alamat Terpilih
                </span>
                {isDropshipMode && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                    Mode Dropship Aktif
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Pengirim di header atas · Jasa kirim di bawah alamat · Logo otomatis hilang pada dropship
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

        {/* Notice Banner */}
        {notice && (
          <div className="px-6 py-2.5 bg-gradient-to-r from-pink-50 to-emerald-50 border-b border-pink-100 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
            {lastOpenedUrl && (
              <a
                href={lastOpenedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Jendela Cetak ↗
              </a>
            )}
          </div>
        )}

        {/* Content: Left Controls, Right Preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-4 overflow-y-auto bg-slate-50/50">
            
            {/* Format Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-pink-600" />
                <span>Pilih Format Label</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('thermal_100x150')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    format === 'thermal_100x150'
                      ? 'border-pink-500 bg-pink-50/70 text-pink-950 ring-2 ring-pink-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Thermal 100 × 150 mm</span>
                    {format === 'thermal_100x150' && <span className="w-2 h-2 rounded-full bg-pink-600"></span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Roll portrait (1 label per halaman potong otomatis).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('hvs_a4_3part')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    format === 'hvs_a4_3part'
                      ? 'border-pink-500 bg-pink-50/70 text-pink-950 ring-2 ring-pink-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>HVS A4 (21 × 29,7 cm)</span>
                    {format === 'hvs_a4_3part' && <span className="w-2 h-2 rounded-full bg-pink-600"></span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Kertas A4 biasa, 3 bagian per lembar + garis gunting.
                  </p>
                </button>
              </div>
            </div>

            {/* DROPSHIP BUTTON & TOGGLE SECTION */}
            <div className={`p-4 rounded-xl border transition-all ${
              isDropshipMode 
                ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/10' 
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    isDropshipMode ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Tombol Dropship
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Logo otomatis hilang · Nama & No. Telp pengirim diganti
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDropshipMode(!isDropshipMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isDropshipMode
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isDropshipMode ? 'Dropship Aktif' : 'Aktifkan Dropship'}
                </button>
              </div>

              {/* Form Input Dropship Sender */}
              {isDropshipMode && (
                <div className="mt-3.5 pt-3 border-t border-purple-200/60 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-purple-950 block">
                      Nama Pengirim Dropship *
                    </label>
                    <input
                      type="text"
                      required
                      value={dropshipSenderName}
                      onChange={e => setDropshipSenderName(e.target.value)}
                      placeholder="Contoh: Toko Emas Ayu / Butik Permata"
                      className="w-full mt-1 px-3 py-1.5 bg-white rounded-lg border border-purple-300 text-xs focus:ring-2 focus:ring-purple-200 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-purple-950 block">
                        No. Telepon Pengirim *
                      </label>
                      <input
                        type="tel"
                        required
                        value={dropshipSenderPhone}
                        onChange={e => setDropshipSenderPhone(e.target.value)}
                        placeholder="Contoh: 08123456789"
                        className="w-full mt-1 px-3 py-1.5 bg-white rounded-lg border border-purple-300 text-xs font-mono focus:ring-2 focus:ring-purple-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-purple-950 block">
                        Kota Asal (Opsional)
                      </label>
                      <input
                        type="text"
                        value={dropshipSenderCity}
                        onChange={e => setDropshipSenderCity(e.target.value)}
                        placeholder="Contoh: Surabaya / Solo"
                        className="w-full mt-1 px-3 py-1.5 bg-white rounded-lg border border-purple-300 text-xs focus:ring-2 focus:ring-purple-200 outline-none"
                      />
                    </div>
                  </div>

                  {/* SECTION: SIMPAN ALAMAT DROPSHIP KE MULTI-ALAMAT */}
                  <div className="p-3 bg-white rounded-xl border border-purple-300/80 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BookmarkPlus className="w-4 h-4 text-purple-700 shrink-0" />
                        <span className="text-xs font-black text-purple-950">
                          Simpan Alamat Dropship
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                        Label: Dropship
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      Data pengirim dropship & penerima tersimpan ke kolom khusus (<strong className="text-purple-900 font-bold">is_dropship, dropship_sender_name, phone, city</strong>) di Google Spreadsheet, memisahkan catatan pengiriman agar tetap fleksibel, dan langsung siap cetak tanpa logo toko.
                    </p>

                    {/* Target Address Info if multiple addresses */}
                    {selectedAddresses.length > 1 && (
                      <div className="text-[10px] text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200">
                        Target: <strong className="font-bold">{selectedAddresses[0]?.recipient_name}</strong> ({selectedAddresses[0]?.city})
                      </div>
                    )}

                    {/* Mode Pilihan: Buat Baru vs Perbarui Label */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSaveDropshipMode('create_new')}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          saveDropshipMode === 'create_new'
                            ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold ring-1 ring-purple-600/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span>Alamat Baru</span>
                          {saveDropshipMode === 'create_new' && <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal block mt-0.5 leading-tight">
                          Tambah alamat baru di multi-alamat
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSaveDropshipMode('update_existing')}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          saveDropshipMode === 'update_existing'
                            ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold ring-1 ring-purple-600/20'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span>Ubah Label Ini</span>
                          {saveDropshipMode === 'update_existing' && <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>}
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal block mt-0.5 leading-tight">
                          Ganti label alamat ini jadi Dropship
                        </span>
                      </button>
                    </div>

                    {/* Tombol Simpan Alamat Dropship */}
                    <button
                      type="button"
                      onClick={() => handleSaveDropshipAddress()}
                      disabled={isSavingDropship || !dropshipSenderName.trim() || !dropshipSenderPhone.trim()}
                      className="w-full py-2.5 px-3 rounded-lg bg-purple-700 hover:bg-purple-800 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingDropship ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyimpan & Sinkron ke Spreadsheet...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>💾 Simpan Alamat Dropship ke Multi-Alamat</span>
                        </>
                      )}
                    </button>

                    {/* Auto-save toggle checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-purple-100 text-[11px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={autoSaveDropshipOnPrint}
                        onChange={e => setAutoSaveDropshipOnPrint(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500 border-purple-300"
                      />
                      <span>Otomatis simpan ke multi-alamat & Spreadsheet saat klik <strong>Cetak Label</strong></span>
                    </label>

                    {/* Notifikasi Sukses Simpan */}
                    {dropshipSaveSuccessMsg && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-850 text-[11px] flex items-start gap-1.5 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{dropshipSaveSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Display Options */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Pengaturan Cetak
              </span>

              {/* Copies */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Jumlah Salinan (Copies):
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-7 h-7 rounded border border-slate-200 bg-slate-50 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold font-mono text-sm">{copies}</span>
                  <button
                    type="button"
                    onClick={() => setCopies(copies + 1)}
                    className="w-7 h-7 rounded border border-slate-200 bg-slate-50 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Font Size */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Ukuran Teks Label:</span>
                <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFontSize('small')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      fontSize === 'small' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500'
                    }`}
                  >
                    Kecil
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('standard')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      fontSize === 'standard' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500'
                    }`}
                  >
                    Standar
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('large')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      fontSize === 'large' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500'
                    }`}
                  >
                    Besar
                  </button>
                </div>
              </div>

              {/* Customer ID toggle */}
              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-700 pt-1">
                <span>Tampilkan ID Pelanggan (Referensi)</span>
                <input
                  type="checkbox"
                  checked={showCustomerId}
                  onChange={e => setShowCustomerId(e.target.checked)}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300"
                />
              </label>
            </div>

            {/* Address Selection List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Alamat Dicetak ({selectedIds.length}/{localAddresses.length})
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-pink-600 hover:underline font-semibold"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-slate-500 hover:underline"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {localAddresses.map(addr => {
                  const isChecked = selectedIds.includes(addr.address_id);
                  return (
                    <label
                      key={addr.address_id}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-pink-300 bg-pink-50/40 text-slate-900' 
                          : 'border-slate-200 bg-white text-slate-500 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(addr.address_id)}
                        className="mt-0.5 w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold truncate text-slate-900">
                            {addr.recipient_name}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                            {addr.shipping_courier || 'Ekspedisi'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {addr.address_label} · {addr.city} ({addr.customer_id})
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Petunjuk Cetak */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Panduan Ukuran Fisik Presisi:</p>
                <p className="text-amber-800 mt-0.5">
                  Di dialog printer, atur <strong>Skala: 100% (Actual Size)</strong> dan <strong>Margin: None / Minimum</strong> agar ukuran roll thermal 100×150 mm atau kertas HVS A4 tepat sesuai ukuran aslinya.
                </p>
              </div>
            </div>
          </div>

          {/* Right Preview Column (7 cols) */}
          <div className="lg:col-span-7 p-6 overflow-y-auto bg-slate-200/70 flex flex-col items-center justify-start">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-600 font-semibold max-w-lg">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {format === 'thermal_100x150' 
                    ? 'Preview Roll Portrait (100 × 150 mm)' 
                    : 'Preview Lembar HVS A4 (21 × 29,7 cm)'}
                </span>
              </span>
              <span className="font-mono text-slate-500">
                Total: {printItems.length} Label
              </span>
            </div>

            {printItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300 max-w-md w-full">
                Pilih minimal 1 alamat untuk melihat preview label
              </div>
            ) : format === 'thermal_100x150' ? (
              /* THERMAL 100x150 MM PORTRAIT PREVIEW */
              <div className="w-full max-w-[340px] space-y-4">
                {printItems.slice(0, 2).map((item, idx) => {
                  const { itemIsDropship, senderName, senderPhone, senderAddress } = getItemSenderInfo(item);
                  return (
                  <div
                    key={`thermal-preview-${item.address_id}-${idx}`}
                    className="bg-white rounded-xl shadow-lg border-2 border-black p-4 relative overflow-hidden font-sans text-black flex flex-col justify-between"
                    style={{
                      aspectRatio: '100 / 150', // 100x150mm ratio
                      minHeight: '460px'
                    }}
                  >
                    <div>
                      {/* HEADER ATAS: PENGIRIM (DROPSHIP = LOGO DAN NAMA TOKO BAWAAN OTOMATIS HILANG) */}
                      <div className="flex items-center pb-3 border-b-2 border-black gap-3">
                        {!itemIsDropship && storeSettings.show_logo_on_print && storeSettings.logo_mode !== 'none' ? (
                          <div className="shrink-0 flex items-center justify-center">
                            {(storeSettings.logo_mode === 'custom' || storeSettings.custom_logo_url) && storeSettings.custom_logo_url ? (
                              <img
                                src={storeSettings.custom_logo_url}
                                alt="Logo"
                                className="max-h-11 max-w-[80px] object-contain block"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : storeSettings.logo_mode === 'official' ? (
                              <YaxiyaLogo variant="monochrome" size="sm" />
                            ) : (
                              <div className="w-8 h-8 border-2 border-black font-black text-xs flex items-center justify-center">
                                YX
                              </div>
                            )}
                          </div>
                        ) : null}

                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-extrabold uppercase text-slate-600 tracking-wider block">
                              PENGIRIM:
                            </span>
                            {itemIsDropship && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                                DROPSHIP · SIAP CETAK
                              </span>
                            )}
                          </div>
                          <div className="font-display font-black text-sm uppercase truncate text-black">
                            {senderName}
                          </div>
                          <div className="font-mono font-bold text-xs text-black mt-0.5">
                            {senderPhone}
                          </div>
                          {senderAddress && (
                            <div className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">
                              {senderAddress}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* DETAIL PENERIMA (TENGAH) */}
                      <div className="py-3 border-b-2 border-dashed border-black space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                          <span className="uppercase tracking-wider">PENERIMA:</span>
                          {showCustomerId && (
                            <span className="font-mono font-bold text-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                              ID: {item.customer_id}
                            </span>
                          )}
                        </div>
                        <div className={`${fontStyles.recipient} text-black leading-snug`}>
                          {item.recipient_name}
                        </div>
                        <div className={`${fontStyles.phone} font-mono text-black font-bold`}>
                          {item.recipient_phone}
                        </div>
                        <div className={`${fontStyles.address} text-black font-medium pt-1 leading-snug`}>
                          {item.full_address}
                        </div>
                        <div className="text-xs font-bold text-black pt-0.5">
                          {[item.village, item.district, item.city, item.province, item.postal_code].filter(Boolean).join(', ')}
                        </div>
                      </div>

                      {/* KETERANGAN JASA KIRIM (DIPINDAHKAN DI BAWAH ALAMAT) */}
                      <div className="mt-3 p-2.5 bg-slate-50 border-2 border-black rounded-lg">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                          <span>JASA KIRIM:</span>
                          <span>KOTA TUJUAN:</span>
                        </div>
                        {/* Keterangan Jasa Kirim & Tujuan (Bersih tanpa barcode) */}
                        <div className="flex items-center justify-between mt-1">
                          <div className="px-2.5 py-1 bg-black text-white font-black text-xs uppercase tracking-wider rounded">
                            {item.shipping_courier || 'EKSPEDISI'} {item.shipping_service ? `· ${item.shipping_service}` : ''}
                          </div>
                          <div className="font-black text-xs uppercase text-black">
                            {item.city}
                          </div>
                        </div>
                      </div>

                      {/* Catatan Pengiriman jika ada */}
                      {item.shipping_notes && (
                        <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-950">
                          <strong>Catatan: </strong>
                          <span>{item.shipping_notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom footer: Keterangan Tanggal Cetak (Footer lama dihilangkan) */}
                    <div className="pt-2 border-t border-slate-300 text-[9px] text-slate-500 text-center font-mono">
                      Tgl Cetak: {currentPrintDate}
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              /* HVS A4 21 x 29.7 CM PREVIEW */
              <div 
                className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-slate-300 p-4 text-black relative flex flex-col justify-between"
                style={{
                  aspectRatio: '210 / 297', // A4 21 x 29.7 cm proportion
                  minHeight: '560px'
                }}
              >
                {[0, 1, 2].map((slotIdx) => {
                  const item = printItems[slotIdx] || printItems[0];
                  if (!item) return null;
                  const { itemIsDropship, senderName, senderPhone, senderAddress } = getItemSenderInfo(item);
                  return (
                    <div
                      key={`hvs-slot-${slotIdx}`}
                      className="border-2 border-dashed border-black p-2.5 rounded flex flex-col justify-between"
                      style={{ height: '31%' }}
                    >
                      <div>
                        {/* Header Atas: Pengirim */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-black">
                          <div className="flex items-center gap-2">
                            {!itemIsDropship && storeSettings.show_logo_on_print && storeSettings.logo_mode !== 'none' ? (
                              <div className="shrink-0 flex items-center justify-center">
                                {(storeSettings.logo_mode === 'custom' || storeSettings.custom_logo_url) && storeSettings.custom_logo_url ? (
                                  <img
                                    src={storeSettings.custom_logo_url}
                                    alt="Logo"
                                    className="max-h-7 max-w-[65px] object-contain block"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="font-black text-[9px] border border-black px-1.5 py-0.5">YX</div>
                                )}
                              </div>
                            ) : null}
                            <div>
                              <span className="text-[7pt] font-extrabold text-slate-600">PENGIRIM: </span>
                              <strong className="text-[10px] font-black uppercase text-black">{senderName}</strong>
                              {senderPhone && <span className="font-mono font-bold text-[9px] ml-1">({senderPhone})</span>}
                              {itemIsDropship && <span className="ml-1 text-[8px] font-bold px-1 rounded bg-purple-100 text-purple-800">[DROPSHIP]</span>}
                            </div>
                          </div>
                          {showCustomerId && (
                            <span className="font-mono text-[8px] font-bold">ID: {item?.customer_id}</span>
                          )}
                        </div>

                        {/* Penerima */}
                        <div className="py-1.5 border-b border-dashed border-slate-400 text-[10px]">
                          <div className="font-bold text-[9px] text-slate-600 uppercase">PENERIMA:</div>
                          <div className="font-extrabold text-xs text-black leading-tight">
                            {item?.recipient_name}
                          </div>
                          <div className="font-mono font-bold text-[10px]">
                            {item?.recipient_phone}
                          </div>
                          <div className="text-[9px] leading-tight text-slate-800 line-clamp-2 mt-0.5">
                            {item?.full_address}, {item?.city}, {item?.postal_code}
                          </div>
                        </div>

                        {/* Jasa Kirim (di bawah alamat) */}
                        <div className="mt-1 flex items-center justify-between bg-slate-100 p-1 border border-black rounded text-[9px]">
                          <div>
                            <span className="font-bold text-slate-600">JASA KIRIM: </span>
                            <span className="font-black bg-black text-white px-1 rounded">
                              {item?.shipping_courier || 'EKSPEDISI'} {item?.shipping_service ? `(${item.shipping_service})` : ''}
                            </span>
                          </div>
                          <div className="font-bold">
                            TUJUAN: {item?.city}
                          </div>
                        </div>

                        {item?.shipping_notes && (
                          <div className="text-[8px] mt-0.5 text-slate-700">
                            <strong>Catatan:</strong> {item.shipping_notes}
                          </div>
                        )}
                      </div>

                      {/* Cut line & Tanggal Cetak */}
                      <div className="text-[7.5px] text-slate-500 text-center border-t border-dotted border-slate-400 mt-1 pt-0.5 flex items-center justify-center gap-1 font-mono">
                        <Scissors className="w-2.5 h-2.5" />
                        <span>Garis Potong · Tgl Cetak: {currentPrintDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Pengirim label: <strong className="text-slate-800">{effectiveSenderName}</strong> ({effectiveSenderPhone})
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isRecording || printItems.length === 0}
              className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold shadow-md shadow-pink-600/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>{isRecording ? 'Menyiapkan...' : `Cetak ${printItems.length} Label Sekarang`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* IN-PAGE PRINTABLE CONTAINER (FALLBACK) */}
      <div id="printable-label-area" className="hidden">
        <div dangerouslySetInnerHTML={{ __html: generatePrintableHtml() }} />
      </div>
    </div>
  );
};
