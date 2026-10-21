import fs from 'fs';
import path from 'path';

export interface Customer {
  customer_id: string;
  customer_name: string;
  primary_phone: string;
  group_name?: string; // e.g. HERMES, DIAMOND, CHANEL
  notes: string;
  created_at: string; // DD-MM-YYYY HH:mm:ss
  updated_at: string;
  status: 'active' | 'archived' | 'deleted';
}

export interface Address {
  address_id: string;
  customer_id: string;
  address_label: string;
  recipient_name: string;
  recipient_phone: string;
  full_address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postal_code: string;
  shipping_courier: string;
  shipping_service: string;
  shipping_notes: string;
  group_name?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'deleted';
}

export interface Courier {
  courier_id: string;
  courier_name: string;
  courier_category: string;
  services: string[];
  is_favorite: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrintRecord {
  print_id: string;
  customer_id: string;
  address_id: string;
  recipient_name: string;
  shipping_courier: string;
  label_format: 'thermal_100x150' | 'hvs_a4_3part';
  copies: number;
  printed_at: string;
}

export interface SyncTask {
  sync_id: string;
  entity_type: 'PELANGGAN' | 'ALAMAT_PENGIRIMAN' | 'JASA_KIRIM' | 'RIWAYAT_CETAK';
  entity_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload?: any;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  error_message: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface ActivityLog {
  log_id: string;
  action_type: 
    | 'TAMBAH_PELANGGAN' 
    | 'EDIT_PELANGGAN' 
    | 'ARSIP_PELANGGAN' 
    | 'HAPUS_PELANGGAN' 
    | 'TAMBAH_ALAMAT' 
    | 'EDIT_ALAMAT' 
    | 'ARSIP_ALAMAT' 
    | 'HAPUS_ALAMAT' 
    | 'TAMBAH_GRUP_ALAMAT'
    | 'EDIT_GRUP_ALAMAT'
    | 'HAPUS_GRUP_ALAMAT'
    | 'CETAK_LABEL' 
    | 'SINKRONISASI' 
    | 'IMPOR_DATA' 
    | 'EKSPOR_DATA';
  description: string;
  entity_id?: string;
  timestamp: string;
}

export interface StoreSettings {
  store_name: string;
  phone: string;
  address: string;
  city: string;
  logo_mode: 'official' | 'custom' | 'none';
  custom_logo_url: string;
  show_logo_on_print: boolean;
}

interface DatabaseSchema {
  customers: Customer[];
  addresses: Address[];
  couriers: Courier[];
  print_history: PrintRecord[];
  sync_queue: SyncTask[];
  activity_logs: ActivityLog[];
  address_groups?: string[];
  settings?: StoreSettings;
  apps_script_url?: string;
  spreadsheet_id?: string;
}

export const PERMANENT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbymST6-L81TVqQ1XHvf2pi68pllwjut4BQtidADPi-jIaoEDf45HsIEBCxMkMrf7DwV5w/exec';
export const PERMANENT_SPREADSHEET_ID = '1Q0xxgKTDv4AhSQKt2mJdqnuxm1U3AuWAHJ89ArlHx-Q';

export function getCurrentDateFormatted(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const d = pad(now.getDate());
  const m = pad(now.getMonth() + 1);
  const y = now.getFullYear();
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${d}-${m}-${y} ${hh}:${mm}:${ss}`;
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.resolve('/tmp') : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'yaxiya_db.json');
const ORIGINAL_DB_FILE = path.resolve(process.cwd(), 'data', 'yaxiya_db.json');

const INITIAL_COURIERS: Courier[] = [
  // Reguler & Ekspres
  { courier_id: 'JNE', courier_name: 'JNE', courier_category: 'Reguler & Ekspres', services: ['Reguler (REG)', 'YES (Yakin Esok Sampai)', 'OKE (Ongkos Kirim Ekonomis)', 'JTR (JNE Trucking)'], is_favorite: true, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'JNT', courier_name: 'J&T Express', courier_category: 'Reguler & Ekspres', services: ['EZ (Reguler)', 'Super', 'ECO (Ekonomi)', 'DFOD'], is_favorite: true, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'SICEPAT', courier_name: 'SiCepat Ekspres', courier_category: 'Reguler & Ekspres', services: ['SIUNTUNG (Reguler)', 'BEST (Besok Sampai Tujuan)', 'GOKIL (Kargo)', 'HALO'], is_favorite: true, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'SPX', courier_name: 'SPX Express (Shopee Express)', courier_category: 'Reguler & Ekspres', services: ['Standard', 'Hemat', 'Instant', 'Sameday', 'Ambil di Tempat'], is_favorite: true, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'ANTERAJA', courier_name: 'AnterAja', courier_category: 'Reguler & Ekspres', services: ['Reguler', 'Next Day', 'Same Day', 'Cargo'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'NINJA', courier_name: 'Ninja Xpress', courier_category: 'Reguler & Ekspres', services: ['Standard', 'Fast', 'COD'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'IDEXPRESS', courier_name: 'ID Express', courier_category: 'Reguler & Ekspres', services: ['Reguler', 'Same Day', 'Lite (Kecil)'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'POS', courier_name: 'Pos Indonesia', courier_category: 'Reguler & Ekspres', services: ['Pos Reguler', 'Pos Nextday', 'Pos Jumbo Ekonomi'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'LION', courier_name: 'Lion Parcel', courier_category: 'Reguler & Ekspres', services: ['ONEPACK', 'REGPACK', 'LANDPACK', 'BOSSPACK'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'TIKI', courier_name: 'TIKI', courier_category: 'Reguler & Ekspres', services: ['REG', 'ONS (Over Night Services)', 'TDS (Two Days Services)', 'ECO'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'SAP', courier_name: 'SAP Express', courier_category: 'Reguler & Ekspres', services: ['Reguler', 'One Day Service', 'Cargo'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'RPX', courier_name: 'RPX', courier_category: 'Reguler & Ekspres', services: ['Reguler Package', 'Next Day Package', 'MidDay Package'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'PCP', courier_name: 'PCP Express', courier_category: 'Reguler & Ekspres', services: ['Reguler', 'Express'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'LEXID', courier_name: 'LEXID', courier_category: 'Reguler & Ekspres', services: ['Reguler', 'Express'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },

  // Kargo dari Spreadsheet & Populer
  { courier_id: 'INDAH', courier_name: 'Indah Logistik', courier_category: 'Kargo', services: ['Darat', 'Laut', 'Udara', 'City Kurir'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'DAKOTA', courier_name: 'Dakota Cargo', courier_category: 'Kargo', services: ['Regular Cargo', 'Top Urgent'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'JNTCARGO', courier_name: 'J&T Cargo', courier_category: 'Kargo', services: ['Kargo Standar', 'SLA Khusus'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'JTR', courier_name: 'JNE Trucking (JTR)', courier_category: 'Kargo', services: ['JTR Standar', 'JTR <150kg'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'KALOG', courier_name: 'KALOG Express', courier_category: 'Kargo', services: ['Stasiun ke Stasiun', 'Door to Door'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'SENTRAL', courier_name: 'Sentral Cargo', courier_category: 'Kargo', services: ['Kargo Udara', 'Kargo Darat'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'HTI', courier_name: 'HTI', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'LARIS_CAGO', courier_name: 'LARIS CAGO', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'ACC_CARGO', courier_name: 'ACC CARGO', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'LANCAR_CARGO', courier_name: 'LANCAR CARGO', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'HIRA', courier_name: 'HIRA', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'MUJI_JAYA', courier_name: 'MUJI JAYA', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'LARIS_CARGO_2', courier_name: 'laris cargo', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'TAKANA', courier_name: 'TAKANA', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'TRASINDO', courier_name: 'TRASINDO', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },
  { courier_id: 'CMC', courier_name: 'CMC', courier_category: 'Kargo', services: ['Standar'], is_favorite: false, is_active: true, created_at: '13-10-2026 07:41:55', updated_at: '13-10-2026 07:41:55' },

  // Instan & Same-day
  { courier_id: 'GOSEND', courier_name: 'GoSend', courier_category: 'Instan & Same-day', services: ['Instant', 'Same Day', 'Multi Delivery'], is_favorite: true, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'GRAB', courier_name: 'GrabExpress', courier_category: 'Instan & Same-day', services: ['Instant Bike', 'Same Day Bike', 'Instant Car'], is_favorite: true, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'LALAMOVE', courier_name: 'Lalamove', courier_category: 'Instan & Same-day', services: ['Motor', 'Sedan / MPV', 'Van', 'Pick Up'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'BORZO', courier_name: 'Borzo', courier_category: 'Instan & Same-day', services: ['Kurir Motor', 'Mobil'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'DELIVEREE', courier_name: 'Deliveree', courier_category: 'Instan & Same-day', services: ['Ekonomi', 'Pickup', 'Box Kecil'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'PAXEL', courier_name: 'Paxel', courier_category: 'Instan & Same-day', services: ['Next Day Dingin', 'Instant', 'Sameday'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'KURIR_LOKAL', courier_name: 'Kurir Lokal', courier_category: 'Kurir Toko Sendiri', services: ['Antar Wilayah', 'COD Langsung'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'TOKO_SENDIRI', courier_name: 'Kurir Toko Sendiri', courier_category: 'Kurir Toko Sendiri', services: ['Pengantaran Khusus Yaxiya', 'VIP Delivery'], is_favorite: true, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },

  // Internasional
  { courier_id: 'DHL', courier_name: 'DHL Express', courier_category: 'Internasional', services: ['Express Worldwide', 'Express Envelope'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'FEDEX', courier_name: 'FedEx', courier_category: 'Internasional', services: ['International Priority', 'International Economy'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'UPS', courier_name: 'UPS', courier_category: 'Internasional', services: ['UPS Worldwide Express', 'UPS Saver'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'EMS', courier_name: 'EMS Pos Indonesia', courier_category: 'Internasional', services: ['EMS Barang', 'EMS Dokumen'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'ARAMEX', courier_name: 'Aramex', courier_category: 'Internasional', services: ['Value Express', 'Priority Express'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'SF', courier_name: 'SF Express', courier_category: 'Internasional', services: ['Standard Express', 'Economy Express'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
  { courier_id: 'LAINNYA', courier_name: 'Lainnya', courier_category: 'Lainnya', services: ['Custom'], is_favorite: false, is_active: true, created_at: '13-10-2026 00:00:00', updated_at: '13-10-2026 00:00:00' },
];

class DatabaseEngine {
  private data: DatabaseSchema = {
    customers: [],
    addresses: [],
    couriers: [],
    print_history: [],
    sync_queue: [],
    activity_logs: []
  };

  private syncListeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  public onSyncNeeded(listener: () => void) {
    this.syncListeners.push(listener);
  }

  public notifySyncNeeded() {
    for (const listener of this.syncListeners) {
      try {
        listener();
      } catch (err) {
        // ignore listener execution error
      }
    }
  }

  private init() {
    if (isVercel && !fs.existsSync(DB_FILE) && fs.existsSync(ORIGINAL_DB_FILE)) {
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.copyFileSync(ORIGINAL_DB_FILE, DB_FILE);
      } catch (err) {
        console.warn('Could not copy seed DB file to /tmp:', err);
      }
    } else if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist
        this.data.customers = this.data.customers || [];
        this.data.addresses = this.data.addresses || [];
        this.data.couriers = this.data.couriers && this.data.couriers.length > 0 ? this.data.couriers : [...INITIAL_COURIERS];
        this.data.print_history = this.data.print_history || [];
        this.data.sync_queue = this.data.sync_queue || [];
        this.data.activity_logs = this.data.activity_logs || [];

        // Ensure permanent Apps Script & Spreadsheet ID are embedded
        this.data.apps_script_url = this.data.apps_script_url || PERMANENT_APPS_SCRIPT_URL;
        this.data.spreadsheet_id = this.data.spreadsheet_id || PERMANENT_SPREADSHEET_ID;

        // Ensure address_groups is initialized with default HERMES, DIAMOND, CHANEL
        const DEFAULT_GROUPS = ['HERMES', 'DIAMOND', 'CHANEL'];
        if (!this.data.address_groups || !Array.isArray(this.data.address_groups) || this.data.address_groups.length === 0) {
          this.data.address_groups = [...DEFAULT_GROUPS];
        }

        // Clean any customer/address groups that were forcefully set to 'HERMES' or '-' previously
        // Default group for customers without a specific group is EMPTY ("")
        for (const cust of this.data.customers) {
          const g = (cust.group_name || '').trim();
          if (g === '-' || g === ' ' || (g === 'HERMES' && !cust.notes?.toLowerCase().includes('hermes'))) {
            cust.group_name = '';
          }
        }
        for (const addr of this.data.addresses) {
          const g = (addr.group_name || '').trim();
          if (g === '-' || g === ' ' || (g === 'HERMES' && !addr.shipping_notes?.toLowerCase().includes('hermes'))) {
            addr.group_name = '';
          }
        }
      } catch (err) {
        console.error('Error reading db file, re-initializing:', err);
        this.seedInitialData();
      }
    } else {
      this.seedInitialData();
    }
  }

  private save() {
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to atomically save db file:', err);
      // Fallback direct write
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    }
  }

  private seedInitialData() {
    const timestamp = getCurrentDateFormatted();
    this.data.couriers = [...INITIAL_COURIERS];
    this.data.customers = [];
    this.data.addresses = [];
    this.data.print_history = [];
    this.data.sync_queue = [];
    this.data.address_groups = ['HERMES', 'DIAMOND', 'CHANEL'];
    this.data.apps_script_url = PERMANENT_APPS_SCRIPT_URL;
    this.data.spreadsheet_id = PERMANENT_SPREADSHEET_ID;
    this.data.settings = {
      store_name: 'Yaxiya Jewelry Official Store',
      phone: '081234567890',
      address: 'Pusat Grosir Pasar Pagi Mangga Dua Lt. Dasar Blok B No. 12-14',
      city: 'Jakarta Utara, DKI Jakarta 14430',
      logo_mode: 'official',
      custom_logo_url: '',
      show_logo_on_print: true
    };
    this.data.activity_logs = [{
      log_id: `LOG-${Date.now()}`,
      action_type: 'SINKRONISASI',
      description: 'Sistem dihubungkan secara permanen ke Google Spreadsheet (ID: 1Q0xxgKTDv4AhSQKt2mJdqnuxm1U3AuWAHJ89ArlHx-Q)',
      timestamp
    }];

    this.save();
  }

  // Helper to remove any dummy data and link permanently to Google Spreadsheet
  public cleanDummyData(): { removedCustomers: number; removedAddresses: number; removedPrints: number } {
    const removedCustomers = this.data.customers.length;
    const removedAddresses = this.data.addresses.length;
    const removedPrints = this.data.print_history.length;

    this.data.customers = [];
    this.data.addresses = [];
    this.data.print_history = [];
    this.data.sync_queue = [];
    this.data.apps_script_url = PERMANENT_APPS_SCRIPT_URL;
    this.data.spreadsheet_id = PERMANENT_SPREADSHEET_ID;

    this.logActivity('SINKRONISASI', `Data dummy dibersihkan (${removedCustomers} pelanggan, ${removedAddresses} alamat, ${removedPrints} riwayat cetak). Terhubung permanen ke Google Spreadsheet.`);
    this.save();
    return { removedCustomers, removedAddresses, removedPrints };
  }

  // --- CUSTOMER METHODS ---
  public getCustomers(includeArchived = false): Customer[] {
    return this.data.customers.filter(c => {
      if (c.status === 'deleted') return false;
      if (!includeArchived && c.status === 'archived') return false;
      return true;
    });
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find(c => c.customer_id === id && c.status !== 'deleted');
  }

  public generateNextCustomerId(): string {
    const prefix = 'YX-';
    let maxNum = 0;
    for (const c of this.data.customers) {
      if (c.customer_id.startsWith(prefix)) {
        const numPart = parseInt(c.customer_id.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(6, '0')}`;
  }

  public createCustomer(input: Omit<Customer, 'created_at' | 'updated_at' | 'status'> & { customer_id?: string; status?: 'active' | 'archived' }): Customer {
    const finalId = input.customer_id?.trim() || this.generateNextCustomerId();
    
    // Check uniqueness
    const existing = this.data.customers.find(c => c.customer_id.toLowerCase() === finalId.toLowerCase() && c.status !== 'deleted');
    if (existing) {
      throw new Error(`ID Pelanggan "${finalId}" sudah digunakan oleh "${existing.customer_name}". Gunakan ID lain.`);
    }

    const timestamp = getCurrentDateFormatted();
    const newCustomer: Customer = {
      customer_id: finalId,
      customer_name: input.customer_name.trim(),
      primary_phone: input.primary_phone.trim(),
      group_name: (input.group_name || '').trim(),
      notes: input.notes?.trim() || '',
      created_at: timestamp,
      updated_at: timestamp,
      status: input.status || 'active'
    };

    this.data.customers.unshift(newCustomer);

    this.logActivity('TAMBAH_PELANGGAN', `Pelanggan baru ditambahkan: ${newCustomer.customer_name} (${newCustomer.customer_id})${newCustomer.group_name ? ` [Grup: ${newCustomer.group_name}]` : ''}`, newCustomer.customer_id);
    this.enqueueSync('PELANGGAN', newCustomer.customer_id, 'CREATE', newCustomer);

    this.save();
    return newCustomer;
  }

  public updateCustomer(id: string, updates: Partial<Omit<Customer, 'created_at'>> & { customer_id?: string }): Customer {
    const customer = this.getCustomerById(id);
    if (!customer) {
      throw new Error(`Pelanggan dengan ID "${id}" tidak ditemukan.`);
    }

    const timestamp = getCurrentDateFormatted();
    const oldId = customer.customer_id;
    const newId = updates.customer_id ? updates.customer_id.trim() : oldId;

    if (newId && newId !== oldId) {
      // Check collision
      const collision = this.data.customers.find(c => c.customer_id.toLowerCase() === newId.toLowerCase() && c.customer_id !== oldId);
      if (collision) {
        throw new Error(`ID Pelanggan "${newId}" sudah digunakan oleh "${collision.customer_name}". Harap gunakan ID berbeda.`);
      }

      customer.customer_id = newId;

      // Cascade update all addresses for this customer
      for (const addr of this.data.addresses) {
        if (addr.customer_id === oldId) {
          addr.customer_id = newId;
          addr.updated_at = timestamp;
          this.enqueueSync('ALAMAT_PENGIRIMAN', addr.address_id, 'UPDATE', addr);
        }
      }

      // Cascade update print history
      for (const p of this.data.print_history) {
        if (p.customer_id === oldId) {
          p.customer_id = newId;
        }
      }

      // In Apps Script, delete the old customer row so it doesn't linger
      this.enqueueSync('PELANGGAN', oldId, 'DELETE', { customer_id: oldId });
    }

    if (updates.customer_name !== undefined) customer.customer_name = updates.customer_name.trim();
    if (updates.primary_phone !== undefined) customer.primary_phone = updates.primary_phone.trim();
    if (updates.group_name !== undefined) customer.group_name = updates.group_name.trim();
    if (updates.notes !== undefined) customer.notes = updates.notes.trim();
    if (updates.status !== undefined) customer.status = updates.status;
    customer.updated_at = timestamp;

    this.logActivity('EDIT_PELANGGAN', `Data pelanggan diperbarui: ${customer.customer_name} (${customer.customer_id})${customer.group_name ? ` [Grup: ${customer.group_name}]` : ''}`, customer.customer_id);
    this.enqueueSync('PELANGGAN', customer.customer_id, 'UPDATE', customer);

    this.save();
    return customer;
  }

  public archiveCustomer(id: string): Customer {
    const customer = this.getCustomerById(id);
    if (!customer) throw new Error(`Pelanggan dengan ID "${id}" tidak ditemukan.`);

    customer.status = 'archived';
    customer.updated_at = getCurrentDateFormatted();

    this.logActivity('ARSIP_PELANGGAN', `Pelanggan diarsipkan: ${customer.customer_name} (${customer.customer_id})`, customer.customer_id);
    this.enqueueSync('PELANGGAN', customer.customer_id, 'UPDATE', customer);

    this.save();
    return customer;
  }

  public deleteCustomer(id: string): { success: boolean; customer_id: string } {
    const customer = this.getCustomerById(id);
    if (!customer) throw new Error(`Pelanggan dengan ID "${id}" tidak ditemukan.`);

    const customerName = customer.customer_name;
    const customerId = customer.customer_id;
    const idUpper = id.trim().toUpperCase();

    // Hard delete ONLY this selected customer from database memory & file
    this.data.customers = this.data.customers.filter(c => c.customer_id.trim().toUpperCase() !== idUpper);

    // Hard delete associated addresses belonging ONLY to this customer
    const relatedAddresses = this.data.addresses.filter(a => a.customer_id.trim().toUpperCase() === idUpper);
    for (const addr of relatedAddresses) {
      this.enqueueSync('ALAMAT_PENGIRIMAN', addr.address_id, 'DELETE', { address_id: addr.address_id, customer_id: customerId });
    }
    this.data.addresses = this.data.addresses.filter(a => a.customer_id.trim().toUpperCase() !== idUpper);

    this.logActivity('HAPUS_PELANGGAN', `Pelanggan dihapus permanen: ${customerName} (${customerId}) dan seluruh alamat pengiriman terkait dihapus`, customerId);
    this.enqueueSync('PELANGGAN', customerId, 'DELETE', { customer_id: customerId });

    this.save();
    return { success: true, customer_id: id };
  }

  public deleteCustomersBulk(ids: string[]): { success: boolean; deletedCount: number; deletedIds: string[] } {
    if (!ids || ids.length === 0) return { success: true, deletedCount: 0, deletedIds: [] };
    const idSet = new Set(ids.map(x => x.trim().toUpperCase()));
    const toDeleteCusts = this.data.customers.filter(c => idSet.has(c.customer_id.trim().toUpperCase()));
    
    // Hard delete ONLY selected customers
    this.data.customers = this.data.customers.filter(c => !idSet.has(c.customer_id.trim().toUpperCase()));
    
    // Delete addresses belonging ONLY to these selected customers
    const relatedAddresses = this.data.addresses.filter(a => idSet.has(a.customer_id.trim().toUpperCase()));
    for (const addr of relatedAddresses) {
      this.enqueueSync('ALAMAT_PENGIRIMAN', addr.address_id, 'DELETE', { address_id: addr.address_id, customer_id: addr.customer_id });
    }
    this.data.addresses = this.data.addresses.filter(a => !idSet.has(a.customer_id.trim().toUpperCase()));

    for (const c of toDeleteCusts) {
      this.enqueueSync('PELANGGAN', c.customer_id, 'DELETE', { customer_id: c.customer_id });
    }

    this.logActivity('HAPUS_PELANGGAN', `${toDeleteCusts.length} pelanggan terpilih dihapus permanen`);
    this.save();
    return { success: true, deletedCount: toDeleteCusts.length, deletedIds: toDeleteCusts.map(c => c.customer_id) };
  }

  // --- ADDRESS METHODS ---
  public getAddresses(customerId?: string, includeArchived = false, groupName?: string): Address[] {
    return this.data.addresses.filter(a => {
      if (a.status === 'deleted') return false;
      if (!includeArchived && a.status === 'archived') return false;
      if (customerId && a.customer_id !== customerId) return false;
      if (groupName && (a.group_name || '').toLowerCase() !== groupName.toLowerCase()) return false;
      return true;
    });
  }

  public getGroupNames(): string[] {
    const list = this.data.address_groups && this.data.address_groups.length > 0
      ? [...this.data.address_groups]
      : ['HERMES', 'DIAMOND', 'CHANEL'];

    const set = new Set<string>(list);

    // Also include any active groups used by addresses or customers
    for (const a of this.data.addresses) {
      if (a.status !== 'deleted' && a.group_name && a.group_name.trim()) {
        set.add(a.group_name.trim());
      }
    }
    for (const c of this.data.customers) {
      if (c.status !== 'deleted' && c.group_name && c.group_name.trim()) {
        set.add(c.group_name.trim());
      }
    }

    return Array.from(set);
  }

  public createGroupName(name: string): string[] {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Nama grup tidak boleh kosong.');
    }

    this.data.address_groups = this.data.address_groups || ['HERMES', 'DIAMOND', 'CHANEL'];
    const exists = this.data.address_groups.some(g => g.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      throw new Error(`Grup "${cleanName}" sudah ada.`);
    }

    this.data.address_groups.push(cleanName);
    this.logActivity('TAMBAH_GRUP_ALAMAT', `Grup alamat baru "${cleanName}" ditambahkan`, cleanName);
    this.save();
    return this.getGroupNames();
  }

  public updateGroupName(oldName: string, newName: string): { oldName: string; newName: string; updatedCount: number } {
    const cleanOld = (oldName || '').trim();
    const cleanNew = (newName || '').trim();

    if (!cleanOld || !cleanNew) {
      throw new Error('Nama grup lama dan nama grup baru wajib diisi.');
    }

    this.data.address_groups = this.data.address_groups || ['HERMES', 'DIAMOND', 'CHANEL'];
    
    // Check if new name already exists elsewhere
    const conflict = this.data.address_groups.some(g => g.toLowerCase() === cleanNew.toLowerCase() && g.toLowerCase() !== cleanOld.toLowerCase());
    if (conflict) {
      throw new Error(`Grup dengan nama "${cleanNew}" sudah ada.`);
    }

    // Update in address_groups list
    let foundInList = false;
    this.data.address_groups = this.data.address_groups.map(g => {
      if (g.toLowerCase() === cleanOld.toLowerCase()) {
        foundInList = true;
        return cleanNew;
      }
      return g;
    });

    if (!foundInList) {
      this.data.address_groups.push(cleanNew);
    }

    let updatedCount = 0;
    const timestamp = getCurrentDateFormatted();

    // Update all matching addresses
    for (const addr of this.data.addresses) {
      if (addr.group_name && addr.group_name.toLowerCase() === cleanOld.toLowerCase()) {
        addr.group_name = cleanNew;
        addr.updated_at = timestamp;
        updatedCount++;
        this.enqueueSync('ALAMAT_PENGIRIMAN', addr.address_id, 'UPDATE', addr);
      }
    }

    // Update all matching customers
    for (const cust of this.data.customers) {
      if (cust.group_name && cust.group_name.toLowerCase() === cleanOld.toLowerCase()) {
        cust.group_name = cleanNew;
        cust.updated_at = timestamp;
        this.enqueueSync('PELANGGAN', cust.customer_id, 'UPDATE', cust);
      }
    }

    this.logActivity('EDIT_GRUP_ALAMAT', `Grup alamat diperbarui dari "${cleanOld}" menjadi "${cleanNew}" (${updatedCount} alamat terpengaruh)`, cleanNew);
    this.save();

    return { oldName: cleanOld, newName: cleanNew, updatedCount };
  }

  public deleteGroupName(name: string): { success: boolean; deleted: string; clearedCount: number } {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Nama grup yang akan dihapus tidak valid.');
    }

    this.data.address_groups = this.data.address_groups || ['HERMES', 'DIAMOND', 'CHANEL'];
    this.data.address_groups = this.data.address_groups.filter(g => g.toLowerCase() !== cleanName.toLowerCase());

    let clearedCount = 0;
    const timestamp = getCurrentDateFormatted();

    // Clear group from addresses
    for (const addr of this.data.addresses) {
      if (addr.group_name && addr.group_name.toLowerCase() === cleanName.toLowerCase()) {
        addr.group_name = '';
        addr.updated_at = timestamp;
        clearedCount++;
        this.enqueueSync('ALAMAT_PENGIRIMAN', addr.address_id, 'UPDATE', addr);
      }
    }

    // Clear group from customers
    for (const cust of this.data.customers) {
      if (cust.group_name && cust.group_name.toLowerCase() === cleanName.toLowerCase()) {
        cust.group_name = '';
        cust.updated_at = timestamp;
        this.enqueueSync('PELANGGAN', cust.customer_id, 'UPDATE', cust);
      }
    }

    this.logActivity('HAPUS_GRUP_ALAMAT', `Grup alamat "${cleanName}" dihapus (${clearedCount} alamat kini tanpa grup)`, cleanName);
    this.save();

    return { success: true, deleted: cleanName, clearedCount };
  }

  public getAddressById(addressId: string): Address | undefined {
    return this.data.addresses.find(a => a.address_id === addressId && a.status !== 'deleted');
  }

  public generateNextAddressId(): string {
    const prefix = 'ADDR-';
    let maxNum = 0;
    for (const a of this.data.addresses) {
      if (a.address_id.startsWith(prefix)) {
        const numPart = parseInt(a.address_id.slice(prefix.length), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(6, '0')}`;
  }

  public createAddress(input: Omit<Address, 'address_id' | 'created_at' | 'updated_at' | 'status'> & { address_id?: string; status?: 'active' | 'archived' }): Address {
    let customer = this.getCustomerById(input.customer_id);
    if (!customer) {
      // Auto-create customer with manual ID so user never gets blocked
      customer = this.createCustomer({
        customer_id: input.customer_id.trim(),
        customer_name: input.recipient_name?.trim() || `Pelanggan ${input.customer_id.trim()}`,
        primary_phone: input.recipient_phone?.trim() || '',
        group_name: (input.group_name || '').trim(),
        notes: '',
        status: 'active'
      });
    }

    const finalId = input.address_id?.trim() || this.generateNextAddressId();
    const timestamp = getCurrentDateFormatted();

    const newAddress: Address = {
      address_id: finalId,
      customer_id: input.customer_id,
      address_label: input.address_label?.trim() || 'Alamat Utama',
      recipient_name: input.recipient_name?.trim() || customer.customer_name,
      recipient_phone: input.recipient_phone?.trim() || customer.primary_phone,
      full_address: input.full_address?.trim() || '',
      village: input.village?.trim() || '',
      district: input.district?.trim() || '',
      city: input.city?.trim() || '',
      province: input.province?.trim() || '',
      postal_code: input.postal_code?.trim() || '',
      shipping_courier: input.shipping_courier?.trim() || '',
      shipping_service: input.shipping_service?.trim() || '',
      shipping_notes: input.shipping_notes?.trim() || '',
      group_name: (input.group_name !== undefined ? input.group_name : (customer.group_name || '')).trim(),
      created_at: timestamp,
      updated_at: timestamp,
      status: input.status || 'active'
    };

    this.data.addresses.unshift(newAddress);

    this.logActivity('TAMBAH_ALAMAT', `Alamat baru "${newAddress.address_label}" (${newAddress.recipient_name})${newAddress.group_name ? ` [Grup: ${newAddress.group_name}]` : ''} ditambahkan untuk ${customer.customer_name} (${customer.customer_id})`, newAddress.address_id);
    this.enqueueSync('ALAMAT_PENGIRIMAN', newAddress.address_id, 'CREATE', newAddress);

    this.save();
    return newAddress;
  }

  public updateAddress(addressId: string, updates: Partial<Omit<Address, 'address_id' | 'created_at'>>): Address {
    const address = this.getAddressById(addressId);
    if (!address) {
      throw new Error(`Alamat dengan ID "${addressId}" tidak ditemukan.`);
    }

    const timestamp = getCurrentDateFormatted();
    if (updates.customer_id !== undefined && updates.customer_id.trim()) address.customer_id = updates.customer_id.trim();
    if (updates.address_label !== undefined) address.address_label = updates.address_label.trim();
    if (updates.recipient_name !== undefined) address.recipient_name = updates.recipient_name.trim();
    if (updates.recipient_phone !== undefined) address.recipient_phone = updates.recipient_phone.trim();
    if (updates.full_address !== undefined) address.full_address = updates.full_address.trim();
    if (updates.village !== undefined) address.village = updates.village.trim();
    if (updates.district !== undefined) address.district = updates.district.trim();
    if (updates.city !== undefined) address.city = updates.city.trim();
    if (updates.province !== undefined) address.province = updates.province.trim();
    if (updates.postal_code !== undefined) address.postal_code = updates.postal_code.trim();
    if (updates.shipping_courier !== undefined) address.shipping_courier = updates.shipping_courier.trim();
    if (updates.shipping_service !== undefined) address.shipping_service = updates.shipping_service.trim();
    if (updates.shipping_notes !== undefined) address.shipping_notes = updates.shipping_notes.trim();
    if (updates.group_name !== undefined) address.group_name = updates.group_name.trim();
    if (updates.status !== undefined) address.status = updates.status;
    address.updated_at = timestamp;

    this.logActivity('EDIT_ALAMAT', `Alamat "${address.address_label}" (${address.recipient_name}) diperbarui untuk pelanggan ${address.customer_id}`, address.address_id);
    this.enqueueSync('ALAMAT_PENGIRIMAN', address.address_id, 'UPDATE', address);

    this.save();
    return address;
  }

  public archiveAddress(addressId: string): Address {
    const address = this.getAddressById(addressId);
    if (!address) throw new Error(`Alamat dengan ID "${addressId}" tidak ditemukan.`);

    address.status = 'archived';
    address.updated_at = getCurrentDateFormatted();

    this.logActivity('ARSIP_ALAMAT', `Alamat diarsipkan: ${address.address_label} (${address.address_id})`, address.address_id);
    this.enqueueSync('ALAMAT_PENGIRIMAN', address.address_id, 'UPDATE', address);

    this.save();
    return address;
  }

  public deleteAddress(addressId: string): { success: boolean; address_id: string } {
    const address = this.getAddressById(addressId);
    if (!address) throw new Error(`Alamat dengan ID "${addressId}" tidak ditemukan.`);

    const label = address.address_label;
    const cid = address.customer_id;
    const idUpper = addressId.trim().toUpperCase();

    // Hard delete ONLY this selected address from memory & file
    this.data.addresses = this.data.addresses.filter(a => a.address_id.trim().toUpperCase() !== idUpper);

    this.logActivity('HAPUS_ALAMAT', `Alamat dihapus permanen: ${label} (${addressId}) dari pelanggan ${cid} dan baris spreadsheet dihapus`, addressId);
    this.enqueueSync('ALAMAT_PENGIRIMAN', addressId, 'DELETE', { address_id: addressId });

    this.save();
    return { success: true, address_id: addressId };
  }

  public deleteAddressesBulk(addressIds: string[]): { success: boolean; deletedCount: number; deletedIds: string[] } {
    if (!addressIds || addressIds.length === 0) return { success: true, deletedCount: 0, deletedIds: [] };
    const idSet = new Set(addressIds.map(x => x.trim().toUpperCase()));
    const toDeleteAddrs = this.data.addresses.filter(a => idSet.has(a.address_id.trim().toUpperCase()));

    // Hard delete ONLY the selected addresses
    this.data.addresses = this.data.addresses.filter(a => !idSet.has(a.address_id.trim().toUpperCase()));

    for (const a of toDeleteAddrs) {
      this.enqueueSync('ALAMAT_PENGIRIMAN', a.address_id, 'DELETE', { address_id: a.address_id });
    }

    this.logActivity('HAPUS_ALAMAT', `${toDeleteAddrs.length} alamat terpilih dihapus permanen`);
    this.save();
    return { success: true, deletedCount: toDeleteAddrs.length, deletedIds: toDeleteAddrs.map(a => a.address_id) };
  }

  // --- COURIER METHODS ---
  public getCouriers(): Courier[] {
    return this.data.couriers;
  }

  public createCourier(input: Omit<Courier, 'created_at' | 'updated_at'>): Courier {
    const timestamp = getCurrentDateFormatted();
    const existing = this.data.couriers.find(c => c.courier_id.toLowerCase() === input.courier_id.toLowerCase());
    if (existing) {
      throw new Error(`Jasa kirim dengan ID "${input.courier_id}" sudah ada.`);
    }

    const newCourier: Courier = {
      ...input,
      created_at: timestamp,
      updated_at: timestamp
    };

    this.data.couriers.push(newCourier);
    this.enqueueSync('JASA_KIRIM', newCourier.courier_id, 'CREATE', newCourier);
    this.save();
    return newCourier;
  }

  public updateCourier(courierId: string, updates: Partial<Courier>): Courier {
    const courier = this.data.couriers.find(c => c.courier_id === courierId);
    if (!courier) throw new Error(`Jasa kirim "${courierId}" tidak ditemukan.`);

    Object.assign(courier, updates, { updated_at: getCurrentDateFormatted() });
    this.enqueueSync('JASA_KIRIM', courier.courier_id, 'UPDATE', courier);
    this.save();
    return courier;
  }

  public deleteCourier(courierId: string): { success: boolean; courier_id: string } {
    const courier = this.data.couriers.find(c => c.courier_id === courierId);
    if (!courier) throw new Error(`Jasa kirim "${courierId}" tidak ditemukan.`);

    this.data.couriers = this.data.couriers.filter(c => c.courier_id !== courierId);
    this.enqueueSync('JASA_KIRIM', courierId, 'DELETE', { courier_id: courierId });
    this.save();
    return { success: true, courier_id: courierId };
  }

  // --- PRINT HISTORY ---
  public recordPrint(record: Omit<PrintRecord, 'print_id' | 'printed_at'>): PrintRecord {
    const print_id = `PRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const printed_at = getCurrentDateFormatted();
    const fullRecord: PrintRecord = {
      ...record,
      print_id,
      printed_at
    };

    this.data.print_history.unshift(fullRecord);
    this.logActivity('CETAK_LABEL', `Mencetak label (${record.label_format === 'thermal_100x150' ? 'Thermal 100x150' : 'HVS A4 3-Bagian'}) untuk ${record.recipient_name} (${record.shipping_courier}) - ${record.copies} salinan`, record.address_id);
    this.enqueueSync('RIWAYAT_CETAK', print_id, 'CREATE', fullRecord);

    this.save();
    return fullRecord;
  }

  public getPrintHistory(limit = 100): PrintRecord[] {
    return this.data.print_history.slice(0, limit);
  }

  // --- ACTIVITY LOGS ---
  public logActivity(action_type: ActivityLog['action_type'], description: string, entity_id?: string) {
    const log: ActivityLog = {
      log_id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action_type,
      description,
      entity_id,
      timestamp: getCurrentDateFormatted()
    };
    this.data.activity_logs.unshift(log);
    // Keep max 1000 activities
    if (this.data.activity_logs.length > 1000) {
      this.data.activity_logs = this.data.activity_logs.slice(0, 1000);
    }
  }

  public getActivityLogs(limit = 100): ActivityLog[] {
    return this.data.activity_logs.slice(0, limit);
  }

  // --- SYNC QUEUE ---
  public enqueueSync(entity_type: SyncTask['entity_type'], entity_id: string, operation: SyncTask['operation'], payload: any) {
    const sync_id = `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const task: SyncTask = {
      sync_id,
      entity_type,
      entity_id,
      operation,
      payload,
      sync_status: 'PENDING',
      retry_count: 0,
      error_message: null,
      created_at: getCurrentDateFormatted(),
      synced_at: null
    };
    this.data.sync_queue.push(task);
    this.save();
    this.notifySyncNeeded();
  }

  public getPendingSyncTasks(): SyncTask[] {
    return this.data.sync_queue.filter(t => t.sync_status === 'PENDING' || t.sync_status === 'FAILED');
  }

  public updateSyncTask(sync_id: string, status: SyncTask['sync_status'], errorMessage: string | null = null) {
    const task = this.data.sync_queue.find(t => t.sync_id === sync_id);
    if (task) {
      task.sync_status = status;
      task.error_message = errorMessage;
      if (status === 'SYNCED') {
        task.synced_at = getCurrentDateFormatted();
      } else if (status === 'FAILED') {
        task.retry_count += 1;
      }
      this.save();
    }
  }

  public getSyncStats() {
    const totalTasks = this.data.sync_queue.length;
    const pendingTasks = this.data.sync_queue.filter(t => t.sync_status === 'PENDING').length;
    const failedTasks = this.data.sync_queue.filter(t => t.sync_status === 'FAILED').length;
    const syncedTasks = this.data.sync_queue.filter(t => t.sync_status === 'SYNCED').length;
    return { totalTasks, pendingTasks, failedTasks, syncedTasks };
  }

  // --- DASHBOARD STATS ---
  public getStats() {
    const activeCustomers = this.getCustomers(false);
    const activeAddresses = this.getAddresses(undefined, false);
    const unassignedCourierAddresses = activeAddresses.filter(a => !a.shipping_courier || a.shipping_courier.trim() === '');
    const totalPrinted = this.data.print_history.reduce((acc, curr) => acc + (curr.copies || 1), 0);
    const couriers = this.getCouriers();
    const totalCouriers = couriers.length;
    const activeCouriers = couriers.filter(c => c.is_active).length;

    return {
      totalCustomers: activeCustomers.length,
      totalAddresses: activeAddresses.length,
      totalLabelsPrinted: totalPrinted,
      totalCouriers,
      activeCouriers,
      unassignedCourierAddresses: unassignedCourierAddresses.length,
      recentCustomers: activeCustomers.slice(0, 5),
      recentActivities: this.getActivityLogs(8),
      syncStats: this.getSyncStats()
    };
  }

  // Bulk import support
  public importCustomersAndAddresses(customersList: Customer[], addressesList: Address[]): { importedCustomers: number; importedAddresses: number } {
    let importedCustomers = 0;
    let importedAddresses = 0;

    for (const c of customersList) {
      const idx = this.data.customers.findIndex(item => item.customer_id === c.customer_id);
      if (idx >= 0) {
        this.data.customers[idx] = { ...this.data.customers[idx], ...c, updated_at: getCurrentDateFormatted() };
      } else {
        this.data.customers.push(c);
        importedCustomers++;
      }
      this.enqueueSync('PELANGGAN', c.customer_id, idx >= 0 ? 'UPDATE' : 'CREATE', c);
    }

    for (const a of addressesList) {
      const idx = this.data.addresses.findIndex(item => item.address_id === a.address_id);
      if (idx >= 0) {
        this.data.addresses[idx] = { ...this.data.addresses[idx], ...a, updated_at: getCurrentDateFormatted() };
      } else {
        this.data.addresses.push(a);
        importedAddresses++;
      }
      this.enqueueSync('ALAMAT_PENGIRIMAN', a.address_id, idx >= 0 ? 'UPDATE' : 'CREATE', a);
    }

    this.logActivity('IMPOR_DATA', `Berhasil mengimpor ${importedCustomers} pelanggan dan ${importedAddresses} alamat.`);
    this.save();
    return { importedCustomers, importedAddresses };
  }

  // --- STORE & PRINT LABEL SETTINGS ---
  public getSettings(): StoreSettings {
    if (!this.data.settings) {
      this.data.settings = {
        store_name: 'YAXIYA JEWELRY',
        phone: '0812-8889-9928',
        address: 'Pusat Grosir Perhiasan Titanium & Lapis Emas 18K',
        city: 'Jakarta Barat, DKI Jakarta',
        logo_mode: 'official',
        custom_logo_url: '',
        show_logo_on_print: true
      };
      this.save();
    }
    return this.data.settings;
  }

  public updateSettings(updates: Partial<StoreSettings>): StoreSettings {
    const current = this.getSettings();
    this.data.settings = {
      ...current,
      ...updates
    };
    this.logActivity('SINKRONISASI', 'Pengaturan toko & logo label diperbarui');
    this.save();
    return this.data.settings;
  }

  public getAppsScriptUrl(): string {
    return this.data.apps_script_url || process.env.GOOGLE_APPS_SCRIPT_URL || PERMANENT_APPS_SCRIPT_URL;
  }

  public setAppsScriptUrl(url: string): string {
    this.data.apps_script_url = (url || '').trim() || PERMANENT_APPS_SCRIPT_URL;
    this.logActivity('SINKRONISASI', `URL Web App Google Apps Script diperbarui`);
    this.save();
    return this.data.apps_script_url;
  }

  public getSpreadsheetId(): string {
    return this.data.spreadsheet_id || process.env.SPREADSHEET_ID || PERMANENT_SPREADSHEET_ID;
  }

  public setSpreadsheetId(id: string): string {
    this.data.spreadsheet_id = (id || '').trim() || PERMANENT_SPREADSHEET_ID;
    this.logActivity('SINKRONISASI', `ID Google Spreadsheet diperbarui: ${this.data.spreadsheet_id}`);
    this.save();
    return this.data.spreadsheet_id;
  }

  public getFullDatabase() {
    return {
      customers: this.getCustomers(),
      addresses: this.getAddresses(undefined, false),
      couriers: this.getCouriers(),
      print_history: this.getPrintHistory(500),
      address_groups: this.getGroupNames(),
      settings: this.getSettings(),
      apps_script_url: this.getAppsScriptUrl(),
      spreadsheet_id: this.getSpreadsheetId(),
      exported_at: getCurrentDateFormatted()
    };
  }

  public importFullDatabase(payload: any): { customers: number; addresses: number; couriers: number } {
    if (payload.customers && Array.isArray(payload.customers)) {
      const seenCustIds = new Set<string>();
      const uniqueCustomers: Customer[] = [];

      for (const rawCust of payload.customers) {
        if (!rawCust || !rawCust.customer_id || rawCust.status === 'deleted') continue;
        let cid = String(rawCust.customer_id).trim();
        const cidUpper = cid.toUpperCase();

        if (seenCustIds.has(cidUpper)) {
          // Check if this is an identical duplicate row, if so skip it
          const existing = uniqueCustomers.find(x => x.customer_id.toUpperCase() === cidUpper);
          if (existing && existing.customer_name.trim().toLowerCase() === (rawCust.customer_name || '').trim().toLowerCase()) {
            continue;
          }
          // If different customer had accidental ID clash, make unique
          cid = `${cid}_2`;
        }
        seenCustIds.add(cid.toUpperCase());

        let grp = (rawCust.group_name || '').trim();
        if (grp === '-' || grp === ' ' || (grp === 'HERMES' && !rawCust.notes?.toLowerCase().includes('hermes'))) {
          grp = '';
        }

        uniqueCustomers.push({
          ...rawCust,
          customer_id: cid,
          group_name: grp
        });
      }
      this.data.customers = uniqueCustomers;
    }

    if (payload.addresses && Array.isArray(payload.addresses)) {
      const seenAddrIds = new Set<string>();
      const uniqueAddresses: Address[] = [];

      for (const rawAddr of payload.addresses) {
        if (!rawAddr || !rawAddr.address_id || rawAddr.status === 'deleted') continue;
        const aid = String(rawAddr.address_id).trim();
        const aidUpper = aid.toUpperCase();

        if (seenAddrIds.has(aidUpper)) {
          continue; // Skip duplicate address row
        }
        seenAddrIds.add(aidUpper);

        let grp = (rawAddr.group_name || '').trim();
        if (grp === '-' || grp === ' ' || (grp === 'HERMES' && !rawAddr.shipping_notes?.toLowerCase().includes('hermes'))) {
          grp = '';
        }

        uniqueAddresses.push({
          ...rawAddr,
          address_id: aid,
          group_name: grp
        });
      }
      this.data.addresses = uniqueAddresses;
    }
    if (payload.address_groups && Array.isArray(payload.address_groups)) {
      this.data.address_groups = payload.address_groups;
    }
    if (payload.couriers && Array.isArray(payload.couriers) && payload.couriers.length > 0) {
      this.data.couriers = payload.couriers;
    }
    if (payload.settings && typeof payload.settings === 'object') {
      this.data.settings = { ...this.getSettings(), ...payload.settings };
    }
    this.logActivity('SINKRONISASI', `Sinkronisasi data dari Google Spreadsheet berhasil diterapkan (${this.data.customers.length} pelanggan, ${this.data.addresses.length} alamat, ${this.data.couriers.length} jasa kirim)`);
    this.save();
    return {
      customers: this.data.customers.length,
      addresses: this.data.addresses.length,
      couriers: this.data.couriers.length
    };
  }
}

export const db = new DatabaseEngine();
