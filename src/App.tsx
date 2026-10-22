import React, { useState, useEffect } from 'react';
import { Customer, Address, Courier, DashboardStats, StoreSettings } from './types';
import { Sidebar, NavMenu } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { CustomerListView } from './views/CustomerListView';
import { PrintHistoryView } from './views/PrintHistoryView';
import { CourierSettingsView } from './views/CourierSettingsView';
import { ImportExportView } from './views/ImportExportView';
import { ActivityHistoryView } from './views/ActivityHistoryView';
import { StoreSettingsView } from './views/StoreSettingsView';
import { PrintPageView } from './views/PrintPageView';

import { CustomerModal } from './components/CustomerModal';
import { AddressModal } from './components/AddressModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { PrintModal } from './components/PrintModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

import { 
  Menu, 
  UserPlus, 
  MapPinPlus, 
  Search, 
  RefreshCw,
  Database
} from 'lucide-react';
import { YaxiyaLogo } from './utils/logo';

export default function App() {
  const [currentMenu, setCurrentMenu] = useState<NavMenu>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Core Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allCouriers, setAllCouriers] = useState<Courier[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | undefined>(undefined);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null);
  const [addressCustomerTarget, setAddressCustomerTarget] = useState<Customer | null>(null);

  // Customer Detail Popup Modal
  const [isCustomerDetailModalOpen, setIsCustomerDetailModalOpen] = useState(false);
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);

  // Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printAddresses, setPrintAddresses] = useState<Address[]>([]);
  const [printA4Mode, setPrintA4Mode] = useState<'single_per_sheet' | 'mixed_bulk'>('single_per_sheet');

  // Delete Confirm Modal
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName: string;
    onDelete: () => Promise<void>;
    onArchive?: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    itemName: '',
    onDelete: async () => {},
  });

  const reloadData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Window focus & custom events listener for refreshing data
  useEffect(() => {
    const onFocus = () => {
      reloadData();
    };
    const onCouriersUpdated = () => {
      fetch('/api/couriers')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAllCouriers(data.data);
          }
        })
        .catch(err => console.error('Error refreshing couriers:', err));
    };
    const onSettingsUpdated = () => {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStoreSettings(data.data);
          }
        })
        .catch(err => console.error('Error refreshing settings:', err));
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('couriers-updated', onCouriersUpdated);
    window.addEventListener('settings-updated', onSettingsUpdated);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('couriers-updated', onCouriersUpdated);
      window.removeEventListener('settings-updated', onSettingsUpdated);
    };
  }, []);

  // Fetch Dashboard Stats, Customers, Couriers, Settings
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.data);
        }
      })
      .catch(err => console.error('Error fetching stats:', err));

    fetch('/api/customers?limit=1000')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAllCustomers(data.data);
        }
      })
      .catch(err => console.error('Error fetching customers:', err));

    fetch('/api/couriers')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAllCouriers(data.data);
        }
      })
      .catch(err => console.error('Error fetching couriers:', err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStoreSettings(data.data);
        }
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, [refreshTrigger]);

  // Map of customers by ID for fast lookup
  const customersMap: Record<string, Customer> = {};
  allCustomers.forEach(c => {
    customersMap[c.customer_id] = c;
  });

  // --- Customer Handlers ---
  const handleOpenAddCustomer = () => {
    setCustomerToEdit(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (customerData: any) => {
    const isEdit = !!customerToEdit;
    const url = isEdit ? `/api/customers/${customerToEdit.customer_id}` : '/api/customers';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Gagal menyimpan pelanggan');
    }
    // If customer ID changed during edit and detail modal is showing the old ID, update it!
    if (isEdit && customerData.customer_id && customerToEdit && detailCustomerId === customerToEdit.customer_id) {
      setDetailCustomerId(customerData.customer_id.trim());
    }
    reloadData();
  };

  const handleDeleteCustomerPrompt = (customer: Customer) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Hapus / Arsipkan Pelanggan',
      message: `Apakah Anda yakin ingin menghapus pelanggan ${customer.customer_name} (${customer.customer_id})? Data alamat terkait juga akan dinonaktifkan. Anda dapat memilih untuk mengarsipkan agar data tetap dapat dipulihkan.`,
      itemName: `${customer.customer_name} (${customer.customer_id})`,
      onDelete: async () => {
        // Optimistic UI update: instantly remove customer from view
        setAllCustomers(prev => prev.filter(c => c.customer_id !== customer.customer_id));
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        if (detailCustomerId === customer.customer_id) {
          setIsCustomerDetailModalOpen(false);
        }
        try {
          await fetch(`/api/customers/${customer.customer_id}`, { method: 'DELETE' });
        } finally {
          reloadData();
        }
      },
      onArchive: async () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`/api/customers/${customer.customer_id}/archive`, { method: 'PATCH' });
        } finally {
          reloadData();
        }
      }
    });
  };

  const handleDeleteCustomersBulkPrompt = (customerIds: string[]) => {
    if (!customerIds || customerIds.length === 0) return;
    const selectedList = allCustomers.filter(c => customerIds.includes(c.customer_id));
    const names = selectedList.map(c => `${c.customer_name} (${c.customer_id})`).slice(0, 5).join(', ');
    const moreText = selectedList.length > 5 ? ` dan ${selectedList.length - 5} lainnya` : '';
    setDeleteModalState({
      isOpen: true,
      title: 'Hapus Pelanggan Terpilih',
      message: `Apakah Anda yakin ingin menghapus permanen ${customerIds.length} pelanggan terpilih? Hanya data pelanggan yang dipilih (${names}${moreText}) beserta seluruh alamat terkait yang akan dihapus permanen.`,
      itemName: `${customerIds.length} pelanggan terpilih`,
      onDelete: async () => {
        // Optimistic UI update: instantly remove selected customers
        const idSet = new Set(customerIds);
        setAllCustomers(prev => prev.filter(c => !idSet.has(c.customer_id)));
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch('/api/customers/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_ids: customerIds })
          });
        } finally {
          reloadData();
        }
      }
    });
  };

  const handleDeleteAddressesBulkPrompt = (addressIds: string[]) => {
    if (!addressIds || addressIds.length === 0) return;
    setDeleteModalState({
      isOpen: true,
      title: 'Hapus Alamat Terpilih',
      message: `Apakah Anda yakin ingin menghapus permanen ${addressIds.length} alamat pengiriman terpilih? Hanya alamat yang dipilih yang akan dihapus, data pelanggan utama dan alamat lainnya tetap aman.`,
      itemName: `${addressIds.length} alamat terpilih`,
      onDelete: async () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch('/api/addresses/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address_ids: addressIds })
          });
        } finally {
          reloadData();
        }
      }
    });
  };

  // --- Address Handlers ---
  const handleOpenAddAddress = (customerId?: string) => {
    setAddressToEdit(null);
    if (customerId) {
      const target = allCustomers.find(c => c.customer_id === customerId);
      setAddressCustomerTarget(target || null);
    } else {
      setAddressCustomerTarget(null);
    }
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (address: Address) => {
    setAddressToEdit(address);
    const target = allCustomers.find(c => c.customer_id === address.customer_id);
    setAddressCustomerTarget(target || null);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (addressData: any) => {
    const isEdit = !!addressToEdit;
    const url = isEdit ? `/api/addresses/${addressToEdit.address_id}` : '/api/addresses';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addressData)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Gagal menyimpan alamat');
    }
    reloadData();
  };

  const handleDeleteAddressPrompt = (address: Address) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Hapus / Arsipkan Alamat',
      message: `Hapus alamat "${address.address_label}" (${address.recipient_name})? Menghapus alamat ini tidak akan menghapus data pelanggan utama.`,
      itemName: `${address.address_label} - ${address.recipient_name}`,
      onDelete: async () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`/api/addresses/${address.address_id}`, { method: 'DELETE' });
        } finally {
          reloadData();
        }
      },
      onArchive: async () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`/api/addresses/${address.address_id}/archive`, { method: 'PATCH' });
        } finally {
          reloadData();
        }
      }
    });
  };

  // --- Detail Popup Handler ---
  const handleOpenCustomerDetailPopup = (customerId: string) => {
    setDetailCustomerId(customerId);
    setIsCustomerDetailModalOpen(true);
  };

  // --- Print Handlers ---
  // Mode Satuan: 1 Lembar A4 Hanya 1 Alamat sesuai salinan yang dipilih (maks 3 per lembar)
  const handleOpenPrintForCustomer = (customer: Customer) => {
    setPrintA4Mode('single_per_sheet');
    if (customer.addresses && customer.addresses.length > 0) {
      const activeAddrs = customer.addresses.filter(a => a.status !== 'deleted');
      if (activeAddrs.length > 0) {
        setPrintAddresses(activeAddrs);
        setCurrentMenu('print_page');
        return;
      }
    }
    
    // Fetch fresh addresses for this customer
    fetch(`/api/addresses?customer_id=${customer.customer_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data.length > 0) {
          const activeAddrs = d.data.filter((a: Address) => a.status !== 'deleted');
          if (activeAddrs.length > 0) {
            setPrintAddresses(activeAddrs);
            setCurrentMenu('print_page');
          } else {
            handleOpenCustomerDetailPopup(customer.customer_id);
          }
        } else {
          handleOpenCustomerDetailPopup(customer.customer_id);
        }
      })
      .catch(() => {
        handleOpenCustomerDetailPopup(customer.customer_id);
      });
  };

  const handleOpenPrintAddresses = (
    addresses: Address[], 
    customer?: Customer, 
    mode: 'single_per_sheet' | 'mixed_bulk' = 'single_per_sheet'
  ) => {
    if (addresses.length === 0) return;
    setIsCustomerDetailModalOpen(false);
    setPrintAddresses(addresses);
    setPrintA4Mode(mode);
    setCurrentMenu('print_page');
  };

  const handleReprintAddress = (customerId: string, addressId: string) => {
    fetch(`/api/addresses?customer_id=${customerId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data.length > 0) {
          const match = d.data.find((a: Address) => a.address_id === addressId);
          setPrintA4Mode('single_per_sheet');
          if (match) {
            setPrintAddresses([match]);
            setCurrentMenu('print_page');
          } else {
            setPrintAddresses([d.data[0]]);
            setCurrentMenu('print_page');
          }
        }
      });
  };

  const handleUpdateCourier = async (courierId: string, updates: Partial<Courier>) => {
    await fetch(`/api/couriers/${courierId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    reloadData();
  };

  const handleAddCourier = async (courierData: any) => {
    const res = await fetch('/api/couriers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courierData)
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.error || 'Gagal menambahkan kurir');
    reloadData();
  };

  const handleDeleteCourierPrompt = (courier: Courier) => {
    setDeleteModalState({
      isOpen: true,
      title: 'Hapus Jasa Kirim',
      message: `Hapus jasa kirim "${courier.courier_name}" (${courier.courier_id})? Data di Google Spreadsheet juga akan diperbarui. Hanya jasa kirim ini yang akan dihapus, seluruh data pelanggan dan alamat 100% aman.`,
      itemName: `${courier.courier_name} (${courier.courier_id})`,
      onDelete: async () => {
        // Optimistic UI update: remove instantly from view
        setAllCouriers(prev => prev.filter(c => c.courier_id !== courier.courier_id));
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        try {
          await fetch(`/api/couriers/${courier.courier_id}`, { method: 'DELETE' });
        } finally {
          reloadData();
        }
      }
    });
  };

  const handleMenuSelect = (menu: NavMenu) => {
    setCurrentMenu(menu);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentMenu={currentMenu}
        onNavigate={handleMenuSelect}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        syncStats={stats?.syncStats}
        sheetsStatus={stats?.sheetsStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all">
        {/* Top Navbar: Clean & Practical, without standalone add buttons */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 flex items-center justify-between no-print shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div 
              onClick={() => handleMenuSelect('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
              title="Kembali ke Dashboard"
            >
              <img 
                src="/assets/aistudio/LOGO_YAXIYA_Pink_-_Copy_c18e8ec2.png" 
                alt="Yaxiya Jewelry"
                className="h-7 w-auto object-contain shrink-0 lg:hidden"
              />
              <div>
                <span className="text-xs font-bold text-pink-700 uppercase tracking-widest block font-display group-hover:text-pink-800 transition-colors">
                  YAXIYA JEWELRY
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Pusat Manajemen Pengiriman & Multi-Alamat
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Navigation Pill */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Sistem Operasional Siap</span>
            </div>
            <button
              onClick={() => setCurrentMenu('customer_list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentMenu === 'customer_list'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
              }`}
            >
              Daftar Pelanggan & Alamat
            </button>
          </div>
        </header>

        {/* Dynamic Main View */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {currentMenu === 'dashboard' && (
            <DashboardView
              stats={stats}
              allCouriers={allCouriers}
              onNavigate={handleMenuSelect}
              onOpenAddCustomer={handleOpenAddCustomer}
              onOpenAddAddress={() => handleOpenAddAddress()}
              onOpenPrintForCustomer={handleOpenPrintForCustomer}
              onSelectCustomerDetail={handleOpenCustomerDetailPopup}
            />
          )}

          {currentMenu === 'customer_list' && (
            <CustomerListView
              onOpenAddCustomer={handleOpenAddCustomer}
              onOpenEditCustomer={handleOpenEditCustomer}
              onOpenAddAddress={handleOpenAddAddress}
              onOpenEditAddress={handleOpenEditAddress}
              onSelectCustomerDetail={handleOpenCustomerDetailPopup}
              onOpenPrintForCustomer={handleOpenPrintForCustomer}
              onOpenPrintSingleAddress={(addr, cust) => handleOpenPrintAddresses([addr], cust, 'single_per_sheet')}
              onOpenPrintAddresses={(addrs, cust, mode) => handleOpenPrintAddresses(addrs, cust, mode)}
              onDeleteCustomer={handleDeleteCustomerPrompt}
              onDeleteAddress={handleDeleteAddressPrompt}
              onDeleteCustomersBulk={handleDeleteCustomersBulkPrompt}
              allCouriers={allCouriers}
              storeSettings={storeSettings}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentMenu === 'print_history' && (
            <PrintHistoryView
              onReprintAddress={handleReprintAddress}
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentMenu === 'couriers' && (
            <CourierSettingsView
              couriers={allCouriers}
              onUpdateCourier={handleUpdateCourier}
              onAddCourier={handleAddCourier}
              onDeleteCourier={handleDeleteCourierPrompt}
              refreshCouriers={reloadData}
            />
          )}

          {currentMenu === 'settings' && (
            <StoreSettingsView
              onSettingsSaved={reloadData}
            />
          )}

          {currentMenu === 'import_export' && (
            <ImportExportView
              onImportCompleted={reloadData}
            />
          )}

          {currentMenu === 'activity_logs' && (
            <ActivityHistoryView
              refreshTrigger={refreshTrigger}
            />
          )}

          {currentMenu === 'print_page' && (
            <PrintPageView
              initialAddresses={printAddresses}
              customersMap={customersMap}
              defaultSettings={storeSettings}
              initialA4Mode={printA4Mode}
              onBack={() => setCurrentMenu('customer_list')}
              onPrintSuccess={() => reloadData()}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Add / Edit Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        customerToEdit={customerToEdit}
        existingCustomers={allCustomers}
        allCouriers={allCouriers}
      />

      {/* 2. Add / Edit Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
        addressToEdit={addressToEdit}
        targetCustomer={addressCustomerTarget}
        allCustomers={allCustomers}
        allCouriers={allCouriers}
      />

      {/* 3. Customer Multi-Address Detail Modal (Popup dari Daftar Pelanggan) */}
      <CustomerDetailModal
        isOpen={isCustomerDetailModalOpen}
        onClose={() => setIsCustomerDetailModalOpen(false)}
        customerId={detailCustomerId}
        onOpenAddAddress={handleOpenAddAddress}
        onOpenEditAddress={handleOpenEditAddress}
        onOpenEditCustomer={handleOpenEditCustomer}
        onOpenPrintAddresses={handleOpenPrintAddresses}
        onDeleteAddress={handleDeleteAddressPrompt}
        onDeleteAddressesBulk={handleDeleteAddressesBulkPrompt}
        refreshTrigger={refreshTrigger}
      />

      {/* 4. Thermal & HVS Label Print Modal */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        addresses={printAddresses}
        customersMap={customersMap}
        defaultSettings={storeSettings}
        onPrintSuccess={() => reloadData()}
      />

      {/* 5. Safe Deletion / Archiving Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
        title={deleteModalState.title}
        message={deleteModalState.message}
        itemName={deleteModalState.itemName}
        onConfirmDelete={deleteModalState.onDelete}
        onConfirmArchive={deleteModalState.onArchive}
      />
    </div>
  );
}
