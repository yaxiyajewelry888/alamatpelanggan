/**
 * =========================================================================
 * YAXIYA JEWELRY — GOOGLE APPS SCRIPT DATABASE & SYNC SERVICE (code.gs)
 * =========================================================================
 * 
 * Skrip ini bertindak sebagai Database Cloud Backend & Sinkronisasi Dua Arah
 * untuk aplikasi pengiriman Yaxiya Jewelry, mendukung penuh deployment ke Vercel.
 *
 * -------------------------------------------------------------------------
 * PANDUAN CARA PASANG (HANYA 2 MENIT, GRATIS & TANPA GOOGLE CLOUD):
 * -------------------------------------------------------------------------
 * 1. Buka Google Spreadsheet baru atau yang sudah Anda siapkan:
 *    https://docs.google.com/spreadsheets/
 * 2. Klik menu "Ekstensi" (Extensions) > "Apps Script".
 * 3. Hapus semua teks yang ada di editor Apps Script.
 * 4. Salin (copy) SELURUH isi file code.gs ini dan tempel (paste) ke editor.
 * 5. Klik ikon Simpan (Ctrl+S / Cmd+S).
 * 6. Klik tombol biru "Terapkan" (Deploy) di kanan atas > pilih "Penerapan Baru" (New deployment).
 * 7. Klik ikon roda gigi (Select type) > pilih "Aplikasi Web" (Web app).
 * 8. Konfigurasi:
 *    - Deskripsi: Yaxiya Jewelry Sync API
 *    - Jalankan sebagai (Execute as): "Saya" (Me - akun Google Anda)
 *    - Yang memiliki akses (Who has access): "Siapa saja" (Anyone) -> WAJIB agar website/Vercel bisa mengakses
 * 9. Klik "Terapkan" (Deploy), lalu klik "Berikan Akses" (Authorize access).
 *    (Jika muncul peringatan Google belum diverifikasi, klik "Advanced" > "Go to Yaxiya Jewelry (unsafe)")
 * 10. Salin "URL Aplikasi Web" (Web App URL) yang berakhiran "/exec".
 * 11. Tempelkan URL tersebut ke dalam aplikasi Yaxiya Jewelry di menu:
 *     "6. Impor & Ekspor Data" > tab "Google Spreadsheet & code.gs" > Simpan URL!
 * 12. Klik tombol "Kirim Semua Data ke Spreadsheet (Push All Data)" untuk migrasi awal.
 * =========================================================================
 */

// Konfigurasi Nama Sheet & Struktur Kolom
var SHEET_CONFIG = {
  PELANGGAN: {
    name: 'PELANGGAN',
    headers: ['customer_id', 'customer_name', 'primary_phone', 'group_name', 'notes', 'created_at', 'updated_at', 'status'],
    color: '#831843' // Deep Pink / Maroon elegan Yaxiya
  },
  ALAMAT_PENGIRIMAN: {
    name: 'ALAMAT_PENGIRIMAN',
    headers: ['address_id', 'customer_id', 'address_label', 'group_name', 'recipient_name', 'recipient_phone', 'full_address', 'village', 'district', 'city', 'province', 'postal_code', 'shipping_courier', 'shipping_service', 'shipping_notes', 'created_at', 'updated_at', 'status'],
    color: '#be185d' // Pink Rose
  },
  GRUP_ALAMAT: {
    name: 'GRUP_ALAMAT',
    headers: ['group_name', 'total_pelanggan', 'total_alamat', 'updated_at'],
    color: '#701a75' // Purple Fuchsia
  },
  JASA_KIRIM: {
    name: 'JASA_KIRIM',
    headers: ['courier_id', 'courier_name', 'courier_category', 'services', 'is_favorite', 'is_active', 'created_at', 'updated_at'],
    color: '#0369a1' // Blue
  },
  RIWAYAT_CETAK: {
    name: 'RIWAYAT_CETAK',
    headers: ['print_id', 'customer_id', 'address_id', 'recipient_name', 'shipping_courier', 'label_format', 'copies', 'printed_at'],
    color: '#0f766e' // Teal
  },
  PENGATURAN: {
    name: 'PENGATURAN',
    headers: ['key', 'value', 'updated_at'],
    color: '#334155' // Slate Dark
  }
};

/**
 * Menu Kustom di Google Sheets Toolbar
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('💎 Yaxiya Jewelry')
    .addItem('✨ Inisialisasi Semua Sheet & Kolom', 'menuInitializeSheets')
    .addItem('🎨 Format Header & Gaya Elegan', 'menuFormatHeaders')
    .addSeparator()
    .addItem('📊 Cek Total Data Tersimpan', 'menuCheckStats')
    .addItem('🗑️ Hapus Permanen Baris "deleted" (Purge)', 'menuPurgeDeleted')
    .addItem('📦 Buat Lembar Cadangan (Backup Data)', 'menuCreateBackup')
    .addToUi();
}

/**
 * Handler GET HTTP Request (Untuk Ping, Status, & Ambil Seluruh Data)
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || 'ping';

    if (action === 'ping') {
      var allData = getAllDataFromSheets();
      return jsonResponse({
        success: true,
        message: 'Koneksi Google Apps Script Yaxiya Jewelry Aktif & Tersambung!',
        spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
        spreadsheetName: SpreadsheetApp.getActiveSpreadsheet().getName(),
        stats: {
          customers: allData.customers.length,
          addresses: allData.addresses.length,
          couriers: allData.couriers.length,
          print_history: allData.print_history.length,
          groups: allData.address_groups.length
        },
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'init') {
      ensureAllSheetsExist();
      return jsonResponse({
        success: true,
        message: 'Semua sheet dan kolom Yaxiya Jewelry berhasil diinisialisasi!'
      });
    }

    if (action === 'getAll' || action === 'pullAll') {
      var allData = getAllDataFromSheets();
      return jsonResponse({
        success: true,
        data: allData
      });
    }

    return jsonResponse({
      success: false,
      error: 'Action GET tidak dikenali: ' + action
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Handler POST HTTP Request (Untuk Menyimpan / Sinkronisasi Data dari Website ke Spreadsheet)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Mencegah race condition dan duplikasi data
  } catch (lockErr) {}

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: 'Data POST kosong atau tidak valid.'
      });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || 'syncAll';

    ensureAllSheetsExist();

    if (action === 'syncAll') {
      var result = saveAllDataToSheets(payload.data || payload);
      return jsonResponse({
        success: true,
        message: 'Semua data Yaxiya Jewelry berhasil disimpan & disinkronkan ke Google Spreadsheet!',
        details: result
      });
    }

    if (action === 'saveCustomer') {
      upsertCustomerRow(payload.customer);
      return jsonResponse({ success: true, message: 'Data pelanggan berhasil disimpan di Spreadsheet.' });
    }

    if (action === 'deleteCustomer') {
      deleteCustomerRow(payload.customer_id);
      return jsonResponse({ success: true, message: 'Baris data pelanggan dan alamat terkait berhasil dihapus permanen dari Spreadsheet.' });
    }

    if (action === 'bulkDeleteCustomers') {
      var custIds = payload.customer_ids || [];
      for (var b = 0; b < custIds.length; b++) {
        deleteCustomerRow(custIds[b]);
      }
      return jsonResponse({
        success: true,
        message: custIds.length + ' baris pelanggan terpilih berhasil dihapus dari Spreadsheet.'
      });
    }

    if (action === 'archiveCustomer') {
      updateCustomerStatus(payload.customer_id, 'archived');
      return jsonResponse({ success: true, message: 'Status pelanggan berhasil diarsipkan di Spreadsheet.' });
    }

    if (action === 'saveAddress') {
      upsertAddressRow(payload.address);
      return jsonResponse({ success: true, message: 'Data alamat berhasil disimpan di Spreadsheet.' });
    }

    if (action === 'deleteAddress') {
      deleteAddressRow(payload.address_id);
      return jsonResponse({ success: true, message: 'Baris alamat berhasil dihapus permanen dari Spreadsheet.' });
    }

    if (action === 'bulkDeleteAddresses') {
      var addrIds = payload.address_ids || [];
      for (var c = 0; c < addrIds.length; c++) {
        deleteAddressRow(addrIds[c]);
      }
      return jsonResponse({
        success: true,
        message: addrIds.length + ' baris alamat terpilih berhasil dihapus dari Spreadsheet.'
      });
    }

    if (action === 'archiveAddress') {
      updateAddressStatus(payload.address_id, 'archived');
      return jsonResponse({ success: true, message: 'Status alamat berhasil diarsipkan di Spreadsheet.' });
    }

    if (action === 'recordPrint') {
      appendPrintHistoryRow(payload.record);
      return jsonResponse({ success: true, message: 'Riwayat cetak berhasil dicatat di Spreadsheet.' });
    }

    if (action === 'saveCourier') {
      upsertCourierRow(payload.courier);
      return jsonResponse({ success: true, message: 'Data jasa kirim berhasil disimpan di Spreadsheet.' });
    }

    if (action === 'deleteCourier') {
      deleteCourierRow(payload.courier_id);
      return jsonResponse({ success: true, message: 'Data jasa kirim berhasil dihapus dari Spreadsheet.' });
    }

    if (action === 'saveGroups') {
      saveAddressGroups(payload.groups);
      return jsonResponse({ success: true, message: 'Daftar grup alamat berhasil disimpan di Spreadsheet.' });
    }

    if (action === 'saveSettings') {
      saveSettingsRows(payload.settings);
      return jsonResponse({ success: true, message: 'Pengaturan toko berhasil disimpan di Spreadsheet.' });
    }

    return jsonResponse({
      success: false,
      error: 'Action POST tidak dikenali: ' + action
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: 'Gagal memproses sinkronisasi: ' + err.toString()
    });
  } finally {
    try {
      SpreadsheetApp.flush();
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * Menginisialisasi Semua Sheet dan Header Kolom
 */
function ensureAllSheetsExist() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  for (var key in SHEET_CONFIG) {
    var conf = SHEET_CONFIG[key];
    var sheet = ss.getSheetByName(conf.name);
    
    if (!sheet) {
      sheet = ss.insertSheet(conf.name);
    }
    
    // Periksa header di baris 1
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0 || sheet.getRange(1, 1).getValue() === '') {
      sheet.clear();
      var headers = conf.headers;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaderRow(sheet, headers.length, conf.color);
    }
  }
}

/**
 * Format Header Cantik & Rapi
 */
function formatHeaderRow(sheet, numCols, bgColor) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground(bgColor || '#be185d');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Arial');
  headerRange.setFontSize(10);
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);
  
  // Auto-resize kolom secara wajar
  for (var c = 1; c <= numCols; c++) {
    sheet.autoResizeColumn(c);
    var width = sheet.getColumnWidth(c);
    if (width < 100) sheet.setColumnWidth(c, 115);
    if (width > 300) sheet.setColumnWidth(c, 280);
  }
}

/**
 * Menyimpan Seluruh Data Sistem ke Sheet (Atomic Full Sync)
 */
function saveAllDataToSheets(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stats = { customers: 0, addresses: 0, couriers: 0, prints: 0 };

  // 1. PELANGGAN
  if (data.customers && Array.isArray(data.customers)) {
    var custSheet = ss.getSheetByName(SHEET_CONFIG.PELANGGAN.name);
    if (!custSheet) custSheet = ss.insertSheet(SHEET_CONFIG.PELANGGAN.name);
    custSheet.clearContents();
    try {
      custSheet.getRange(2, 1, Math.max(custSheet.getMaxRows() - 1, 1), custSheet.getMaxColumns()).clearDataValidations();
    } catch (valErr) {}
    custSheet.getRange(1, 1, 1, SHEET_CONFIG.PELANGGAN.headers.length).setValues([SHEET_CONFIG.PELANGGAN.headers]);
    formatHeaderRow(custSheet, SHEET_CONFIG.PELANGGAN.headers.length, SHEET_CONFIG.PELANGGAN.color);

    var activeCusts = data.customers.filter(function(c) { return c.status !== 'deleted'; });
    if (activeCusts.length > 0) {
      var custRows = activeCusts.map(function(c) {
        return [
          c.customer_id || '',
          c.customer_name || '',
          c.primary_phone || '',
          c.group_name || '',
          c.notes || '',
          c.created_at || '',
          c.updated_at || '',
          c.status || 'active'
        ];
      });
      try {
        custSheet.getRange(2, 1, custRows.length, SHEET_CONFIG.PELANGGAN.headers.length).setValues(custRows);
        stats.customers = custRows.length;
      } catch (setErr) {
        // Fallback: clear validations on target range and write safely
        for (var r = 0; r < custRows.length; r++) {
          try {
            var targetRow = custSheet.getRange(r + 2, 1, 1, SHEET_CONFIG.PELANGGAN.headers.length);
            targetRow.clearDataValidations();
            targetRow.setValues([custRows[r]]);
            stats.customers++;
          } catch (rowErr) {}
        }
      }
    }
  }

  // 2. ALAMAT_PENGIRIMAN
  if (data.addresses && Array.isArray(data.addresses)) {
    var addrSheet = ss.getSheetByName(SHEET_CONFIG.ALAMAT_PENGIRIMAN.name);
    if (!addrSheet) addrSheet = ss.insertSheet(SHEET_CONFIG.ALAMAT_PENGIRIMAN.name);
    addrSheet.clearContents();
    try {
      addrSheet.getRange(2, 1, Math.max(addrSheet.getMaxRows() - 1, 1), addrSheet.getMaxColumns()).clearDataValidations();
    } catch (valErr) {}
    addrSheet.getRange(1, 1, 1, SHEET_CONFIG.ALAMAT_PENGIRIMAN.headers.length).setValues([SHEET_CONFIG.ALAMAT_PENGIRIMAN.headers]);
    formatHeaderRow(addrSheet, SHEET_CONFIG.ALAMAT_PENGIRIMAN.headers.length, SHEET_CONFIG.ALAMAT_PENGIRIMAN.color);

    var activeAddrs = data.addresses.filter(function(a) { return a.status !== 'deleted'; });
    if (activeAddrs.length > 0) {
      var addrRows = activeAddrs.map(function(a) {
        return [
          a.address_id || '',
          a.customer_id || '',
          a.address_label || '',
          a.group_name || '',
          a.recipient_name || '',
          a.recipient_phone || '',
          a.full_address || '',
          a.village || '',
          a.district || '',
          a.city || '',
          a.province || '',
          a.postal_code || '',
          a.shipping_courier || '',
          a.shipping_service || '',
          a.shipping_notes || '',
          a.created_at || '',
          a.updated_at || '',
          a.status || 'active'
        ];
      });
      try {
        addrSheet.getRange(2, 1, addrRows.length, SHEET_CONFIG.ALAMAT_PENGIRIMAN.headers.length).setValues(addrRows);
        stats.addresses = addrRows.length;
      } catch (setAddrErr) {
        for (var ra = 0; ra < addrRows.length; ra++) {
          try {
            var targetAddrRow = addrSheet.getRange(ra + 2, 1, 1, SHEET_CONFIG.ALAMAT_PENGIRIMAN.headers.length);
            targetAddrRow.clearDataValidations();
            targetAddrRow.setValues([addrRows[ra]]);
            stats.addresses++;
          } catch (rErr) {}
        }
      }
    }
  }

  // 3. GRUP_ALAMAT (HERMES, DIAMOND, CHANEL, dll)
  var groupsList = data.address_groups || ['HERMES', 'DIAMOND', 'CHANEL'];
  var groupSheet = ss.getSheetByName(SHEET_CONFIG.GRUP_ALAMAT.name);
  if (!groupSheet) groupSheet = ss.insertSheet(SHEET_CONFIG.GRUP_ALAMAT.name);
  groupSheet.clearContents();
  groupSheet.getRange(1, 1, 1, SHEET_CONFIG.GRUP_ALAMAT.headers.length).setValues([SHEET_CONFIG.GRUP_ALAMAT.headers]);
  formatHeaderRow(groupSheet, SHEET_CONFIG.GRUP_ALAMAT.headers.length, SHEET_CONFIG.GRUP_ALAMAT.color);

  var groupRows = groupsList.map(function(g) {
    var custCount = 0;
    var addrCount = 0;
    if (data.customers) {
      custCount = data.customers.filter(function(c) { return (c.group_name || '').toUpperCase() === g.toUpperCase(); }).length;
    }
    if (data.addresses) {
      addrCount = data.addresses.filter(function(a) { return (a.group_name || '').toUpperCase() === g.toUpperCase(); }).length;
    }
    return [g, custCount, addrCount, new Date().toLocaleString('id-ID')];
  });
  if (groupRows.length > 0) {
    groupSheet.getRange(2, 1, groupRows.length, SHEET_CONFIG.GRUP_ALAMAT.headers.length).setValues(groupRows);
  }

  // 4. JASA_KIRIM
  if (data.couriers && Array.isArray(data.couriers)) {
    var courSheet = ss.getSheetByName(SHEET_CONFIG.JASA_KIRIM.name);
    if (!courSheet) courSheet = ss.insertSheet(SHEET_CONFIG.JASA_KIRIM.name);
    courSheet.clearContents();
    courSheet.getRange(1, 1, 1, SHEET_CONFIG.JASA_KIRIM.headers.length).setValues([SHEET_CONFIG.JASA_KIRIM.headers]);
    formatHeaderRow(courSheet, SHEET_CONFIG.JASA_KIRIM.headers.length, SHEET_CONFIG.JASA_KIRIM.color);

    var courRows = data.couriers.map(function(c) {
      return [
        c.courier_id || '',
        c.courier_name || '',
        c.courier_category || '',
        Array.isArray(c.services) ? c.services.join(', ') : (c.services || ''),
        c.is_favorite ? 'YA' : 'TIDAK',
        c.is_active ? 'AKTIF' : 'NONAKTIF',
        c.created_at || '',
        c.updated_at || ''
      ];
    });
    if (courRows.length > 0) {
      courSheet.getRange(2, 1, courRows.length, SHEET_CONFIG.JASA_KIRIM.headers.length).setValues(courRows);
      stats.couriers = courRows.length;
    }
  }

  // 5. RIWAYAT_CETAK
  if (data.print_history && Array.isArray(data.print_history)) {
    var printSheet = ss.getSheetByName(SHEET_CONFIG.RIWAYAT_CETAK.name);
    if (!printSheet) printSheet = ss.insertSheet(SHEET_CONFIG.RIWAYAT_CETAK.name);
    printSheet.clearContents();
    printSheet.getRange(1, 1, 1, SHEET_CONFIG.RIWAYAT_CETAK.headers.length).setValues([SHEET_CONFIG.RIWAYAT_CETAK.headers]);
    formatHeaderRow(printSheet, SHEET_CONFIG.RIWAYAT_CETAK.headers.length, SHEET_CONFIG.RIWAYAT_CETAK.color);

    if (data.print_history.length > 0) {
      var printRows = data.print_history.map(function(p) {
        return [
          p.print_id || '',
          p.customer_id || '',
          p.address_id || '',
          p.recipient_name || '',
          p.shipping_courier || '',
          p.label_format || '',
          p.copies || 1,
          p.printed_at || ''
        ];
      });
      printSheet.getRange(2, 1, printRows.length, SHEET_CONFIG.RIWAYAT_CETAK.headers.length).setValues(printRows);
      stats.prints = printRows.length;
    }
  }

  // 6. PENGATURAN TOKO
  if (data.settings) {
    var setSheet = ss.getSheetByName(SHEET_CONFIG.PENGATURAN.name);
    if (!setSheet) setSheet = ss.insertSheet(SHEET_CONFIG.PENGATURAN.name);
    setSheet.clearContents();
    setSheet.getRange(1, 1, 1, SHEET_CONFIG.PENGATURAN.headers.length).setValues([SHEET_CONFIG.PENGATURAN.headers]);
    formatHeaderRow(setSheet, SHEET_CONFIG.PENGATURAN.headers.length, SHEET_CONFIG.PENGATURAN.color);

    var settingRows = [];
    var nowStr = new Date().toLocaleString('id-ID');
    for (var k in data.settings) {
      var valStr = String(data.settings[k] !== undefined && data.settings[k] !== null ? data.settings[k] : '');
      if (valStr.length > 30000) {
        valStr = '[GAMBAR_TERSIMPAN_DI_APLIKASI]';
      }
      settingRows.push([k, valStr, nowStr]);
    }
    if (settingRows.length > 0) {
      setSheet.getRange(2, 1, settingRows.length, SHEET_CONFIG.PENGATURAN.headers.length).setValues(settingRows);
    }
  }

  return stats;
}

/**
 * Membaca Seluruh Data dari Spreadsheet (Untuk Pull / Sinkronisasi ke Web)
 */
function getAllDataFromSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {
    customers: [],
    addresses: [],
    couriers: [],
    print_history: [],
    address_groups: [],
    settings: {}
  };

  // 1. Baca Pelanggan
  var custSheet = ss.getSheetByName(SHEET_CONFIG.PELANGGAN.name);
  if (custSheet && custSheet.getLastRow() > 1) {
    var custValues = custSheet.getRange(2, 1, custSheet.getLastRow() - 1, SHEET_CONFIG.PELANGGAN.headers.length).getValues();
    result.customers = custValues.map(function(r) {
      var phone = String(r[2] || '').trim();
      if (phone.length > 0 && !phone.startsWith('0') && !phone.startsWith('+')) {
        phone = '0' + phone;
      }
      return {
        customer_id: String(r[0] || '').trim(),
        customer_name: String(r[1] || '').trim(),
        primary_phone: phone,
        group_name: String(r[3] || '').trim(),
        notes: String(r[4] || '').trim(),
        created_at: String(r[5] || ''),
        updated_at: String(r[6] || ''),
        status: (r[7] === 'archived' || r[7] === 'deleted') ? r[7] : 'active'
      };
    }).filter(function(c) { return c.customer_id.length > 0 && c.status !== 'deleted'; });
  }

  // 2. Baca Alamat
  var addrSheet = ss.getSheetByName(SHEET_CONFIG.ALAMAT_PENGIRIMAN.name);
  if (addrSheet && addrSheet.getLastRow() > 1) {
    var addrValues = addrSheet.getRange(2, 1, addrSheet.getLastRow() - 1, SHEET_CONFIG.ALAMAT_PENGIRIMAN.headers.length).getValues();
    result.addresses = addrValues.map(function(r, idx) {
      var phone = String(r[5] || '').trim();
      if (phone.length > 0 && !phone.startsWith('0') && !phone.startsWith('+')) {
        phone = '0' + phone;
      }
      var addrId = String(r[0] || '').trim();
      if (!addrId) {
        addrId = 'ADDR-' + (idx + 1).toString().padStart(6, '0');
      }
      return {
        address_id: addrId,
        customer_id: String(r[1] || '').trim(),
        address_label: String(r[2] || 'Rumah').trim(),
        group_name: String(r[3] || '').trim(),
        recipient_name: String(r[4] || '').trim(),
        recipient_phone: phone,
        full_address: String(r[6] || '').trim(),
        village: String(r[7] || '').trim(),
        district: String(r[8] || '').trim(),
        city: String(r[9] || '').trim(),
        province: String(r[10] || '').trim(),
        postal_code: String(r[11] || '').trim(),
        shipping_courier: String(r[12] || '').trim(),
        shipping_service: String(r[13] || '').trim(),
        shipping_notes: String(r[14] || '').trim(),
        created_at: String(r[15] || ''),
        updated_at: String(r[16] || ''),
        status: (r[17] === 'archived' || r[17] === 'deleted') ? r[17] : 'active'
      };
    }).filter(function(a) { return a.address_id.length > 0 && a.status !== 'deleted'; });
  }

  // 3. Baca Grup Alamat
  var groupSheet = ss.getSheetByName(SHEET_CONFIG.GRUP_ALAMAT.name);
  if (groupSheet && groupSheet.getLastRow() > 1) {
    var groupValues = groupSheet.getRange(2, 1, groupSheet.getLastRow() - 1, 1).getValues();
    var grps = groupValues.map(function(r) { return String(r[0] || '').trim(); }).filter(Boolean);
    if (grps.length > 0) result.address_groups = grps;
  }

  // 4. Baca Jasa Kirim
  var courSheet = ss.getSheetByName(SHEET_CONFIG.JASA_KIRIM.name);
  if (courSheet && courSheet.getLastRow() > 1) {
    var courValues = courSheet.getRange(2, 1, courSheet.getLastRow() - 1, SHEET_CONFIG.JASA_KIRIM.headers.length).getValues();
    result.couriers = courValues.map(function(r) {
      return {
        courier_id: String(r[0] || ''),
        courier_name: String(r[1] || ''),
        courier_category: String(r[2] || 'Reguler & Ekspres'),
        services: String(r[3] || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean),
        is_favorite: String(r[4]).toUpperCase() === 'YA' || r[4] === true,
        is_active: String(r[5]).toUpperCase() !== 'NONAKTIF' && r[5] !== false,
        created_at: String(r[6] || ''),
        updated_at: String(r[7] || '')
      };
    }).filter(function(c) { return c.courier_id.length > 0; });
  }

  // 5. Baca Riwayat Cetak
  var printSheet = ss.getSheetByName(SHEET_CONFIG.RIWAYAT_CETAK.name);
  if (printSheet && printSheet.getLastRow() > 1) {
    var printValues = printSheet.getRange(2, 1, printSheet.getLastRow() - 1, SHEET_CONFIG.RIWAYAT_CETAK.headers.length).getValues();
    result.print_history = printValues.map(function(r) {
      return {
        print_id: String(r[0] || ''),
        customer_id: String(r[1] || ''),
        address_id: String(r[2] || ''),
        recipient_name: String(r[3] || ''),
        shipping_courier: String(r[4] || ''),
        label_format: String(r[5] || 'thermal_100x150'),
        copies: Number(r[6]) || 1,
        printed_at: String(r[7] || '')
      };
    }).filter(function(p) { return p.print_id.length > 0; });
  }

  // 6. Baca Pengaturan Toko
  var setSheet = ss.getSheetByName(SHEET_CONFIG.PENGATURAN.name);
  if (setSheet && setSheet.getLastRow() > 1) {
    var setValues = setSheet.getRange(2, 1, setSheet.getLastRow() - 1, 2).getValues();
    setValues.forEach(function(r) {
      var k = String(r[0] || '').trim();
      var v = r[1];
      if (k) {
        if (v === 'true') v = true;
        else if (v === 'false') v = false;
        result.settings[k] = v;
      }
    });
  }

  return result;
}

/**
 * Upsert baris Pelanggan tunggal (Pastikan hanya 1 baris di sheet PELANGGAN, hapus duplikat jika ada)
 */
function upsertCustomerRow(customer) {
  if (!customer || !customer.customer_id) return;
  if (customer.status === 'deleted') {
    deleteCustomerRow(customer.customer_id);
    return;
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.PELANGGAN.name);
  if (!sheet) return;

  var id = String(customer.customer_id).trim();
  var lastRow = sheet.getLastRow();
  var matchingRows = [];

  if (lastRow > 1) {
    var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < colA.length; i++) {
      if (String(colA[i][0]).trim().toUpperCase() === id.toUpperCase()) {
        matchingRows.push(i + 2);
      }
    }
  }

  var cleanGroup = customer.group_name === '-' ? '' : (customer.group_name || '');
  var rowData = [
    customer.customer_id,
    customer.customer_name || '',
    customer.primary_phone || '',
    cleanGroup,
    customer.notes || '',
    customer.created_at || '',
    customer.updated_at || '',
    customer.status || 'active'
  ];

  if (matchingRows.length > 0) {
    // Perbarui baris pertama yang cocok
    sheet.getRange(matchingRows[0], 1, 1, rowData.length).setValues([rowData]);
    // Hapus baris duplikat berikutnya jika ada sehingga tepat hanya 1 baris tersisa
    for (var d = matchingRows.length - 1; d >= 1; d--) {
      sheet.deleteRow(matchingRows[d]);
    }
  } else {
    sheet.appendRow(rowData);
  }
}

/**
 * Upsert baris Jasa Kirim tunggal
 */
function upsertCourierRow(courier) {
  if (!courier || !courier.courier_id) return;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.JASA_KIRIM.name);
  if (!sheet) return;

  var id = String(courier.courier_id).trim().toUpperCase();
  var lastRow = sheet.getLastRow();
  var rowIndex = -1;

  if (lastRow > 1) {
    var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < colA.length; i++) {
      if (String(colA[i][0]).trim().toUpperCase() === id) {
        rowIndex = i + 2;
        break;
      }
    }
  }

  var rowData = [
    courier.courier_id,
    courier.courier_name || '',
    courier.courier_category || 'Reguler & Ekspres',
    Array.isArray(courier.services) ? courier.services.join(', ') : (courier.services || ''),
    courier.is_favorite ? 'YA' : 'TIDAK',
    courier.is_active ? 'AKTIF' : 'NONAKTIF',
    courier.created_at || '',
    courier.updated_at || ''
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

/**
 * Hapus Baris Jasa Kirim dari Sheet JASA_KIRIM
 */
function deleteCourierRow(courierId) {
  if (!courierId) return;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.JASA_KIRIM.name);
  if (!sheet) return;

  var id = String(courierId).trim().toUpperCase();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = colA.length - 1; i >= 0; i--) {
    if (String(colA[i][0]).trim().toUpperCase() === id) {
      sheet.deleteRow(i + 2);
    }
  }
}

/**
 * Hapus Baris Pelanggan dan Alamat Terkait Secara Permanen dari Spreadsheet
 */
function deleteCustomerRow(customerId) {
  if (!customerId) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var custSheet = ss.getSheetByName(SHEET_CONFIG.PELANGGAN.name);
  var id = String(customerId).trim().toUpperCase();

  // 1. Hapus baris pelanggan dari sheet PELANGGAN
  if (custSheet && custSheet.getLastRow() > 1) {
    var colA = custSheet.getRange(2, 1, custSheet.getLastRow() - 1, 1).getValues();
    for (var i = colA.length - 1; i >= 0; i--) {
      if (String(colA[i][0]).trim().toUpperCase() === id) {
        custSheet.deleteRow(i + 2);
      }
    }
  }

  // 2. Hapus SEMUA alamat pengiriman dengan customer_id yang sama dari sheet ALAMAT_PENGIRIMAN
  var addrSheet = ss.getSheetByName(SHEET_CONFIG.ALAMAT_PENGIRIMAN.name);
  if (addrSheet && addrSheet.getLastRow() > 1) {
    var colB = addrSheet.getRange(2, 2, addrSheet.getLastRow() - 1, 1).getValues();
    for (var j = colB.length - 1; j >= 0; j--) {
      if (String(colB[j][0]).trim().toUpperCase() === id) {
        addrSheet.deleteRow(j + 2);
      }
    }
  }

  // 3. Bersihkan baris berstatus 'deleted' jika ada
  cleanAllDeletedRows();
}

/**
 * Update Status Pelanggan (Delete / Archive)
 */
function updateCustomerStatus(customerId, status) {
  if (!customerId) return;
  if (status === 'deleted') {
    deleteCustomerRow(customerId);
    return;
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.PELANGGAN.name);
  if (!sheet) return;

  var id = String(customerId).trim().toUpperCase();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    if (String(colA[i][0]).trim().toUpperCase() === id) {
      sheet.getRange(i + 2, 8).setValue(status || 'archived');
      break;
    }
  }
}

/**
 * Upsert baris Alamat tunggal (Pastikan hanya 1 baris per address_id di sheet ALAMAT_PENGIRIMAN)
 */
function upsertAddressRow(address) {
  if (!address || !address.address_id) return;
  if (address.status === 'deleted') {
    deleteAddressRow(address.address_id);
    return;
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.ALAMAT_PENGIRIMAN.name);
  if (!sheet) return;

  var id = String(address.address_id).trim();
  var lastRow = sheet.getLastRow();
  var matchingRows = [];

  if (lastRow > 1) {
    var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < colA.length; i++) {
      if (String(colA[i][0]).trim().toUpperCase() === id.toUpperCase()) {
        matchingRows.push(i + 2);
      }
    }
  }

  var cleanGroup = address.group_name === '-' ? '' : (address.group_name || '');
  var rowData = [
    address.address_id,
    address.customer_id || '',
    address.address_label || '',
    cleanGroup,
    address.recipient_name || '',
    address.recipient_phone || '',
    address.full_address || '',
    address.village || '',
    address.district || '',
    address.city || '',
    address.province || '',
    address.postal_code || '',
    address.shipping_courier || '',
    address.shipping_service || '',
    address.shipping_notes || '',
    address.created_at || '',
    address.updated_at || '',
    address.status || 'active'
  ];

  if (matchingRows.length > 0) {
    sheet.getRange(matchingRows[0], 1, 1, rowData.length).setValues([rowData]);
    for (var d = matchingRows.length - 1; d >= 1; d--) {
      sheet.deleteRow(matchingRows[d]);
    }
  } else {
    sheet.appendRow(rowData);
  }
}

/**
 * Hapus Baris Alamat Secara Permanen dari Sheet ALAMAT_PENGIRIMAN
 */
function deleteAddressRow(addressId) {
  if (!addressId) return;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.ALAMAT_PENGIRIMAN.name);
  if (!sheet) return;

  var id = String(addressId).trim().toUpperCase();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = colA.length - 1; i >= 0; i--) {
    if (String(colA[i][0]).trim().toUpperCase() === id) {
      sheet.deleteRow(i + 2);
    }
  }

  // Bersihkan baris berstatus 'deleted' jika ada
  cleanAllDeletedRows();
}

/**
 * Update Status Alamat (Delete / Archive)
 */
function updateAddressStatus(addressId, status) {
  if (!addressId) return;
  if (status === 'deleted') {
    deleteAddressRow(addressId);
    return;
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.ALAMAT_PENGIRIMAN.name);
  if (!sheet) return;

  var id = String(addressId).trim().toUpperCase();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    if (String(colA[i][0]).trim().toUpperCase() === id) {
      sheet.getRange(i + 2, 18).setValue(status || 'archived');
      break;
    }
  }
}

/**
 * Tambah baris riwayat cetak
 */
function appendPrintHistoryRow(record) {
  if (!record) return;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.RIWAYAT_CETAK.name);
  if (!sheet) return;

  sheet.appendRow([
    record.print_id || ('PRT-' + Date.now()),
    record.customer_id || '',
    record.address_id || '',
    record.recipient_name || '',
    record.shipping_courier || '',
    record.label_format || '',
    record.copies || 1,
    record.printed_at || new Date().toLocaleString('id-ID')
  ]);
}

/**
 * Simpan Pengaturan
 */
function saveSettingsRows(settings) {
  if (!settings) return;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.PENGATURAN.name);
  if (!sheet) return;

  sheet.clearContents();
  sheet.getRange(1, 1, 1, SHEET_CONFIG.PENGATURAN.headers.length).setValues([SHEET_CONFIG.PENGATURAN.headers]);
  formatHeaderRow(sheet, SHEET_CONFIG.PENGATURAN.headers.length, SHEET_CONFIG.PENGATURAN.color);

  var rows = [];
  var now = new Date().toLocaleString('id-ID');
  for (var k in settings) {
    var valStr = String(settings[k] !== undefined && settings[k] !== null ? settings[k] : '');
    if (valStr.length > 30000) {
      valStr = '[GAMBAR_TERSIMPAN_DI_APLIKASI]';
    }
    rows.push([k, valStr, now]);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
}

/**
 * Simpan Daftar Grup
 */
function saveAddressGroups(groups) {
  if (!groups || !Array.isArray(groups)) return;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG.GRUP_ALAMAT.name);
  if (!sheet) return;

  sheet.clearContents();
  sheet.getRange(1, 1, 1, SHEET_CONFIG.GRUP_ALAMAT.headers.length).setValues([SHEET_CONFIG.GRUP_ALAMAT.headers]);
  formatHeaderRow(sheet, SHEET_CONFIG.GRUP_ALAMAT.headers.length, SHEET_CONFIG.GRUP_ALAMAT.color);

  var now = new Date().toLocaleString('id-ID');
  var rows = groups.map(function(g) {
    return [g, 0, 0, now];
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  }
}

/**
 * Menu Handler: Inisialisasi Sheet
 */
function menuInitializeSheets() {
  ensureAllSheetsExist();
  SpreadsheetApp.getUi().alert('✨ Berhasil!\nSemua sheet dan kolom Yaxiya Jewelry telah siap.');
}

/**
 * Menu Handler: Format Header
 */
function menuFormatHeaders() {
  ensureAllSheetsExist();
  SpreadsheetApp.getUi().alert('🎨 Berhasil!\nFormat header elegan Yaxiya Jewelry berhasil diterapkan ke seluruh sheet.');
}

/**
 * Menu Handler: Cek Statistik
 */
function menuCheckStats() {
  var allData = getAllDataFromSheets();
  var msg = '📊 RINGKASAN DATABASE YAXIYA JEWELRY:\n\n' +
    '• Pelanggan: ' + allData.customers.length + ' orang\n' +
    '• Alamat Pengiriman: ' + allData.addresses.length + ' alamat\n' +
    '• Grup Alamat: ' + allData.address_groups.join(', ') + '\n' +
    '• Jasa Kirim: ' + (allData.couriers ? allData.couriers.length : 0) + ' ekspedisi\n' +
    '• Riwayat Cetak: ' + (allData.print_history ? allData.print_history.length : 0) + ' kali\n\n' +
    'Database siap digunakan dan tersinkronisasi.';
  SpreadsheetApp.getUi().alert(msg);
}

/**
 * Menu Handler: Buat Backup
 */
function menuCreateBackup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var backupName = 'BACKUP_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss');
  var allData = getAllDataFromSheets();
  
  var backupSheet = ss.insertSheet(backupName);
  backupSheet.getRange(1, 1).setValue('BACKUP DATABASE YAXIYA JEWELRY');
  backupSheet.getRange(2, 1).setValue('Tanggal: ' + new Date().toLocaleString('id-ID'));
  backupSheet.getRange(3, 1).setValue('Total Pelanggan: ' + allData.customers.length);
  backupSheet.getRange(4, 1).setValue('Total Alamat: ' + allData.addresses.length);
  backupSheet.getRange(6, 1).setValue(JSON.stringify(allData));
  SpreadsheetApp.getUi().alert('📦 Lembar Cadangan Berhasil Dibuat:\nSheet "' + backupName + '"');
}

/**
 * Bersihkan & Hapus Permanen Seluruh Baris yang Berstatus 'deleted' dari Sheet PELANGGAN dan ALAMAT_PENGIRIMAN
 */
function cleanAllDeletedRows() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Bersihkan dari Sheet PELANGGAN (Kolom 8: status)
    var custSheet = ss.getSheetByName(SHEET_CONFIG.PELANGGAN.name);
    if (custSheet && custSheet.getLastRow() > 1) {
      var lastRow = custSheet.getLastRow();
      var statusCol = custSheet.getRange(2, 8, lastRow - 1, 1).getValues();
      for (var i = statusCol.length - 1; i >= 0; i--) {
        var val = String(statusCol[i][0] || '').trim().toLowerCase();
        if (val === 'deleted') {
          custSheet.deleteRow(i + 2);
        }
      }
    }

    // 2. Bersihkan dari Sheet ALAMAT_PENGIRIMAN (Kolom 18: status)
    var addrSheet = ss.getSheetByName(SHEET_CONFIG.ALAMAT_PENGIRIMAN.name);
    if (addrSheet && addrSheet.getLastRow() > 1) {
      var lastRowAddr = addrSheet.getLastRow();
      var statusColAddr = addrSheet.getRange(2, 18, lastRowAddr - 1, 1).getValues();
      for (var j = statusColAddr.length - 1; j >= 0; j--) {
        var valAddr = String(statusColAddr[j][0] || '').trim().toLowerCase();
        if (valAddr === 'deleted') {
          addrSheet.deleteRow(j + 2);
        }
      }
    }
  } catch (e) {
    // Abaikan jika terjadi error pembersihan
  }
}

/**
 * Menu Handler: Purge Deleted Rows dari Toolbar Google Sheets
 */
function menuPurgeDeleted() {
  cleanAllDeletedRows();
  SpreadsheetApp.getUi().alert('🗑️ Berhasil!\nSemua baris berstatus "deleted" di sheet Pelanggan dan Alamat Pengiriman telah dihapus permanen.');
}

/**
 * Helper JSON Response
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
