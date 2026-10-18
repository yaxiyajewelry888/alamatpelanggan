export interface Customer {
  customer_id: string;
  customer_name: string;
  primary_phone: string;
  group_name?: string; // Group name: HERMES, DIAMOND, CHANEL, etc.
  notes: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'deleted';
  address_count?: number;
  addresses?: Address[];
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
  group_name?: string; // Group name: HERMES, DIAMOND, CHANEL, etc.
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

export interface SyncStats {
  totalTasks: number;
  pendingTasks: number;
  failedTasks: number;
  syncedTasks: number;
}

export interface SheetsStatus {
  spreadsheetId: string;
  configured: boolean;
  initialized: boolean;
  error: string | null;
}

export interface DashboardStats {
  totalCustomers: number;
  totalAddresses: number;
  totalLabelsPrinted: number;
  totalCouriers: number;
  activeCouriers: number;
  unassignedCourierAddresses: number;
  recentCustomers: Customer[];
  recentActivities: ActivityLog[];
  syncStats: SyncStats;
  sheetsStatus: SheetsStatus;
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
