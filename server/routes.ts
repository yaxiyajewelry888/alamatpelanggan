import { Router, Request, Response } from 'express';
import { db, Customer, Address, Courier, getCurrentDateFormatted } from './db.js';
import { googleSheetsClient } from './googleSheets.js';
import { syncService } from './syncService.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export const apiRouter = Router();

// --- 1. DASHBOARD STATS ---
apiRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    if (syncService.getLastPullTime() === 0) {
      await syncService.pullFromSpreadsheet(true);
    }
    const stats = db.getStats();
    const sheetsStatus = googleSheetsClient.getStatus();
    res.json({
      success: true,
      data: {
        ...stats,
        sheetsStatus
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- SETTINGS (STORE & PRINT LOGO/ADDRESS) ---
apiRouter.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- 2. CUSTOMERS ---
apiRouter.get('/customers', async (req: Request, res: Response) => {
  try {
    if (syncService.getLastPullTime() === 0) {
      await syncService.pullFromSpreadsheet(true);
    }

    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const status = (req.query.status as string) || 'active';
    const courierFilter = (req.query.courier as string) || '';
    const provinceFilter = (req.query.province as string) || '';
    const cityFilter = (req.query.city as string) || '';
    const groupFilter = (req.query.group_name as string) || (req.query.group as string) || '';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 20);

    const includeArchived = status === 'all' || status === 'archived';
    let allCustomers = db.getCustomers(includeArchived);

    if (status === 'archived') {
      allCustomers = allCustomers.filter(c => c.status === 'archived');
    } else if (status === 'active') {
      allCustomers = allCustomers.filter(c => c.status === 'active');
    }

    const allAddresses = db.getAddresses(undefined, true);
    const addressMap = new Map<string, Address[]>();
    for (const a of allAddresses) {
      if (!addressMap.has(a.customer_id)) addressMap.set(a.customer_id, []);
      addressMap.get(a.customer_id)!.push(a);
    }

    // Filter by search query across customer and recipient details
    let filtered = allCustomers.filter(c => {
      const addresses = addressMap.get(c.customer_id) || [];

      // Group filter (support '__empty__' for customers without a group)
      if (groupFilter) {
        if (groupFilter === '__empty__') {
          const isCustEmpty = !c.group_name || c.group_name.trim() === '';
          const hasEmptyAddr = addresses.some(a => !a.group_name || a.group_name.trim() === '');
          if (!isCustEmpty && !hasEmptyAddr) return false;
        } else {
          const matchesCustomerGroup = (c.group_name || '').toLowerCase() === groupFilter.toLowerCase();
          const hasGroup = addresses.some(a => (a.group_name || '').toLowerCase() === groupFilter.toLowerCase());
          if (!matchesCustomerGroup && !hasGroup) return false;
        }
      }

      // Query search
      if (q) {
        const matchCustomerId = c.customer_id.toLowerCase().includes(q);
        const matchCustomerName = c.customer_name.toLowerCase().includes(q);
        const matchCustomerPhone = c.primary_phone.toLowerCase().includes(q);
        const matchCustomerGroup = (c.group_name || '').toLowerCase().includes(q);
        const matchNotes = (c.notes || '').toLowerCase().includes(q);
        const matchAddress = addresses.some(a => 
          a.recipient_name.toLowerCase().includes(q) ||
          a.recipient_phone.toLowerCase().includes(q) ||
          a.address_label.toLowerCase().includes(q) ||
          (a.group_name || '').toLowerCase().includes(q) ||
          a.full_address.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.district.toLowerCase().includes(q)
        );
        if (!matchCustomerId && !matchCustomerName && !matchCustomerPhone && !matchCustomerGroup && !matchNotes && !matchAddress) {
          return false;
        }
      }

      // Courier filter
      if (courierFilter) {
        const hasCourier = addresses.some(a => a.shipping_courier.toLowerCase() === courierFilter.toLowerCase());
        if (!hasCourier) return false;
      }

      // Province filter
      if (provinceFilter) {
        const hasProvince = addresses.some(a => a.province.toLowerCase().includes(provinceFilter.toLowerCase()));
        if (!hasProvince) return false;
      }

      // City filter
      if (cityFilter) {
        const hasCity = addresses.some(a => a.city.toLowerCase().includes(cityFilter.toLowerCase()));
        if (!hasCity) return false;
      }

      return true;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedCustomers = filtered.slice(startIndex, startIndex + limit);

    // Attach address count and brief address list
    const results = paginatedCustomers.map(c => {
      const addrs = (addressMap.get(c.customer_id) || []).filter(a => a.status !== 'deleted');
      return {
        ...c,
        address_count: addrs.length,
        addresses: addrs
      };
    });

    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/customers/next-id', (req: Request, res: Response) => {
  try {
    const nextId = db.generateNextCustomerId();
    res.json({ success: true, next_id: nextId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/customers/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const customer = db.getCustomerById(id);
    if (!customer) {
      return res.status(404).json({ success: false, error: `Pelanggan ${id} tidak ditemukan` });
    }
    const addresses = db.getAddresses(id, true);
    res.json({
      success: true,
      data: {
        ...customer,
        addresses
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/customers', async (req: Request, res: Response) => {
  try {
    const { customer_id, customer_name, primary_phone, group_name, notes, initial_address } = req.body;
    if (!customer_name || !primary_phone) {
      return res.status(400).json({ success: false, error: 'Nama pelanggan dan nomor telepon wajib diisi.' });
    }

    const newCustomer = db.createCustomer({
      customer_id,
      customer_name,
      primary_phone,
      group_name: (group_name || '').trim(),
      notes
    });

    let createdAddress: Address | null = null;
    if (initial_address && initial_address.full_address) {
      createdAddress = db.createAddress({
        customer_id: newCustomer.customer_id,
        address_label: initial_address.address_label || 'Rumah',
        recipient_name: initial_address.recipient_name || newCustomer.customer_name,
        recipient_phone: initial_address.recipient_phone || newCustomer.primary_phone,
        full_address: initial_address.full_address,
        village: initial_address.village || '',
        district: initial_address.district || '',
        city: initial_address.city || '',
        province: initial_address.province || '',
        postal_code: initial_address.postal_code || '',
        shipping_courier: initial_address.shipping_courier || '',
        shipping_service: initial_address.shipping_service || '',
        shipping_notes: initial_address.shipping_notes || '',
        group_name: (initial_address.group_name || group_name || newCustomer.group_name || '').trim()
      });
    }

    // Direct atomic push to Google Spreadsheet: marks queue tasks SYNCED up front and syncs without race condition
    await syncService.syncCustomerAndAddress(newCustomer, createdAddress);

    res.status(201).json({
      success: true,
      data: {
        ...newCustomer,
        addresses: createdAddress ? [createdAddress] : []
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { customer_id, customer_name, primary_phone, group_name, notes, status } = req.body;
    const updated = db.updateCustomer(id, { customer_id, customer_name, primary_phone, group_name, notes, status });
    
    // Direct sync to Google Spreadsheet: row is immediately updated
    if (customer_id && customer_id.trim() !== id) {
      await syncService.deleteCustomerFromSpreadsheet(id);
      await syncService.syncCustomerToSpreadsheet(updated);
      const customerAddrs = db.getAddresses(updated.customer_id);
      for (const a of customerAddrs) {
        await syncService.syncAddressToSpreadsheet(a);
      }
    } else {
      await syncService.syncCustomerToSpreadsheet(updated);
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/customers/:id/archive', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const archived = db.archiveCustomer(id);
    await syncService.syncCustomerToSpreadsheet(archived);
    res.json({ success: true, data: archived });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/customers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const result = db.deleteCustomer(id);

    // Directly delete row from Google Spreadsheet in background
    syncService.deleteCustomerFromSpreadsheet(id).catch(e => console.warn('[Route] deleteCustomer sync warning:', e.message));

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.post('/customers/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { customer_ids } = req.body;
    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Daftar ID pelanggan terpilih kosong.' });
    }
    const result = db.deleteCustomersBulk(customer_ids);
    syncService.deleteCustomersBulkFromSpreadsheet(customer_ids).catch(e => console.warn('[Route] bulkDeleteCustomers sync warning:', e.message));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- 3. ADDRESSES & GROUPS ---
apiRouter.get('/address-groups', (req: Request, res: Response) => {
  try {
    const groups = db.getGroupNames();
    res.json({ success: true, data: groups });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/address-groups', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nama grup wajib diisi.' });
    }
    const groups = db.createGroupName(name.trim());
    res.status(201).json({ success: true, data: groups });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.put('/address-groups', (req: Request, res: Response) => {
  try {
    const { old_name, new_name } = req.body;
    if (!old_name || !new_name) {
      return res.status(400).json({ success: false, error: 'Nama grup lama dan baru wajib diisi.' });
    }
    const result = db.updateGroupName(old_name, new_name);
    syncService.processQueue().catch(() => {});
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/address-groups/:name', (req: Request, res: Response) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const result = db.deleteGroupName(name);
    syncService.processQueue().catch(() => {});
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.get('/addresses', async (req: Request, res: Response) => {
  try {
    if (syncService.getLastPullTime() === 0) {
      await syncService.pullFromSpreadsheet(true);
    }

    const customerId = req.query.customer_id as string;
    const groupFilter = (req.query.group_name as string) || (req.query.group as string) || '';
    
    let addresses = db.getAddresses(customerId, false);
    if (groupFilter) {
      if (groupFilter === '__empty__') {
        addresses = addresses.filter(a => !a.group_name || a.group_name.trim() === '');
      } else {
        addresses = addresses.filter(a => (a.group_name || '').toLowerCase() === groupFilter.toLowerCase());
      }
    }

    res.json({ success: true, data: addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/addresses', async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      address_label,
      recipient_name,
      recipient_phone,
      full_address,
      village,
      district,
      city,
      province,
      postal_code,
      shipping_courier,
      shipping_service,
      shipping_notes,
      group_name
    } = req.body;

    if (!customer_id || !full_address) {
      return res.status(400).json({ success: false, error: 'ID Pelanggan dan Alamat Lengkap wajib diisi.' });
    }

    const customer = db.getCustomerById(customer_id);
    const finalRecipientName = (recipient_name || customer?.customer_name || 'Pelanggan').trim();
    const finalPhone = (recipient_phone || customer?.primary_phone || '08000000000').trim();
    const finalCity = (city || 'Jakarta Barat').trim();

    const newAddress = db.createAddress({
      customer_id,
      address_label: address_label || 'Rumah',
      recipient_name: finalRecipientName,
      recipient_phone: finalPhone,
      full_address: full_address.trim(),
      village: village || '',
      district: district || '',
      city: finalCity,
      province: province || 'DKI Jakarta',
      postal_code: postal_code || '',
      shipping_courier: shipping_courier || 'JNE',
      shipping_service: shipping_service || 'Reguler',
      shipping_notes: shipping_notes || '',
      group_name: (group_name !== undefined ? group_name : (customer?.group_name || '')).trim()
    });

    await syncService.syncAddressToSpreadsheet(newAddress);
    res.status(201).json({ success: true, data: newAddress });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.post('/addresses/quick-bulk', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Daftar data alamat kosong atau tidak valid.' });
    }

    let createdCustomersCount = 0;
    let createdAddressesCount = 0;

    for (const item of items) {
      const cid = (item.customerId || item.customer_id || '').trim();
      if (!cid) continue;

      let cust = db.getCustomerById(cid);
      if (!cust) {
        // Automatically create customer if ID does not exist yet!
        cust = db.createCustomer({
          customer_id: cid,
          customer_name: (item.customerName || item.recipientName || 'Pelanggan ' + cid).trim(),
          primary_phone: (item.phone || item.recipientPhone || '08000000000').trim(),
          group_name: (item.groupName || '').trim(),
          notes: item.notes || ''
        });
        createdCustomersCount++;
      }

      if (item.fullAddress || item.full_address) {
        db.createAddress({
          customer_id: cid,
          address_label: item.label || item.address_label || 'Rumah',
          recipient_name: (item.recipientName || item.recipient_name || cust.customer_name).trim(),
          recipient_phone: (item.phone || item.recipientPhone || cust.primary_phone).trim(),
          full_address: (item.fullAddress || item.full_address).trim(),
          village: item.village || '',
          district: item.district || '',
          city: (item.city || 'Jakarta Barat').trim(),
          province: item.province || 'DKI Jakarta',
          postal_code: item.postalCode || item.postal_code || '',
          shipping_courier: item.courier || item.shipping_courier || 'JNE',
          shipping_service: item.service || item.shipping_service || 'Reguler',
          shipping_notes: item.notes || item.shipping_notes || '',
          group_name: (item.groupName !== undefined ? item.groupName : (cust.group_name || '')).trim()
        });
        createdAddressesCount++;
      }
    }

    await syncService.pushFullDatabaseToSpreadsheet();
    res.json({
      success: true,
      message: `Berhasil menambahkan ${createdCustomersCount} pelanggan dan ${createdAddressesCount} alamat!`,
      data: {
        createdCustomersCount,
        createdAddressesCount
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.put('/addresses/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const updated = db.updateAddress(id, req.body);
    await syncService.syncAddressToSpreadsheet(updated);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/addresses/:id/archive', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const archived = db.archiveAddress(id);
    await syncService.syncAddressToSpreadsheet(archived);
    res.json({ success: true, data: archived });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/addresses/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const result = db.deleteAddress(id);
    syncService.deleteAddressFromSpreadsheet(id).catch(e => console.warn('[Route] deleteAddress sync warning:', e.message));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.post('/addresses/bulk-delete', async (req: Request, res: Response) => {
  try {
    const { address_ids } = req.body;
    if (!Array.isArray(address_ids) || address_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Daftar ID alamat terpilih kosong.' });
    }
    const result = db.deleteAddressesBulk(address_ids);
    syncService.deleteAddressesBulkFromSpreadsheet(address_ids).catch(e => console.warn('[Route] bulkDeleteAddresses sync warning:', e.message));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- 4. COURIERS ---
apiRouter.get('/couriers', async (req: Request, res: Response) => {
  try {
    if (syncService.getLastPullTime() === 0) {
      await syncService.pullFromSpreadsheet(true);
    }
    const couriers = db.getCouriers();
    res.json({ success: true, data: couriers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/couriers', async (req: Request, res: Response) => {
  try {
    const { courier_id, courier_name, courier_category, services, is_favorite, is_active } = req.body;
    if (!courier_name) {
      return res.status(400).json({ success: false, error: 'Nama jasa kirim wajib diisi.' });
    }
    const finalId = (courier_id || courier_name.toUpperCase().replace(/\s+/g, '_')).trim();
    const newCourier = db.createCourier({
      courier_id: finalId,
      courier_name: courier_name.trim(),
      courier_category: courier_category || 'Lainnya',
      services: Array.isArray(services) ? services : (services ? services.split(',').map((s: string) => s.trim()) : ['Reguler']),
      is_favorite: !!is_favorite,
      is_active: is_active !== false
    });
    await syncService.syncCourierToSpreadsheet(newCourier);
    res.status(201).json({ success: true, data: newCourier });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.put('/couriers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const updated = db.updateCourier(id, req.body);
    await syncService.syncCourierToSpreadsheet(updated);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/couriers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const result = db.deleteCourier(id);
    syncService.deleteCourierFromSpreadsheet(id).catch(e => console.warn('[Route] deleteCourier sync warning:', e.message));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- 5. PRINT HISTORY & RECORDING ---
apiRouter.get('/print-history', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;
    const history = db.getPrintHistory(limit);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/print-history', (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];
    for (const item of items) {
      const { customer_id, address_id, recipient_name, shipping_courier, label_format, copies } = item;
      const rec = db.recordPrint({
        customer_id: customer_id || 'YX-UNKNOWN',
        address_id: address_id || 'ADDR-UNKNOWN',
        recipient_name: recipient_name || 'Pelanggan',
        shipping_courier: shipping_courier || '-',
        label_format: label_format || 'thermal_100x150',
        copies: parseInt(copies, 10) || 1
      });
      results.push(rec);
    }
    syncService.processQueue().catch(() => {});
    res.status(201).json({ success: true, data: results });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- STANDALONE DIRECT PRINT PAGE ---
apiRouter.get('/print-page', (req: Request, res: Response) => {
  try {
    const idsParam = (req.query.ids as string) || '';
    const format = (req.query.format as string) === 'hvs_a4_3part' ? 'hvs_a4_3part' : 'thermal_100x150';
    const copies = Math.max(1, parseInt(req.query.copies as string, 10) || 1);
    const a4Mode = (req.query.a4_mode as string) || 'single_per_sheet';
    const isDropship = req.query.is_dropship === 'true';
    const dropshipName = (req.query.dropship_name as string) || '';
    const dropshipPhone = (req.query.dropship_phone as string) || '';
    const dropshipCity = (req.query.dropship_city as string) || '';
    const showId = req.query.show_id === 'true';
    const fontSize = (req.query.font_size as string) || 'standard';

    const settings = db.getSettings();
    const idList = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    
    let targetAddresses: Address[] = [];
    if (idList.length > 0) {
      for (const id of idList) {
        const addr = db.getAddressById(id);
        if (addr) targetAddresses.push(addr);
      }
    }
    if (targetAddresses.length === 0) {
      targetAddresses = db.getAddresses(undefined, false).slice(0, 1);
    }

    // Multiply by copies
    const printItems: Address[] = [];
    for (const addr of targetAddresses) {
      for (let c = 0; c < copies; c++) {
        printItems.push(addr);
      }
      // Record print
      try {
        db.recordPrint({
          customer_id: addr.customer_id,
          address_id: addr.address_id,
          recipient_name: addr.recipient_name,
          shipping_courier: addr.shipping_courier || 'Ekspedisi',
          label_format: format,
          copies
        });
      } catch {}
    }

    const effectiveSenderName = isDropship && dropshipName.trim() ? dropshipName.trim() : settings.store_name;
    const effectiveSenderPhone = isDropship && dropshipPhone.trim() ? dropshipPhone.trim() : settings.phone;
    const effectiveSenderAddress = isDropship 
      ? (dropshipCity.trim() ? `Pengiriman dari: ${dropshipCity.trim()}` : '') 
      : `${settings.address}, ${settings.city}`;

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const printDate = `${day} ${month} ${year}, ${hours}:${minutes} WIB`;

    let labelsHtml = '';

    if (format === 'thermal_100x150') {
      labelsHtml = printItems.map((item, idx) => `
        <div class="thermal-card page-break" style="width: 100mm; height: 148mm; padding: 4.5mm; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; display: flex; flex-direction: column; justify-content: space-between; border: 2px solid #000; margin: 0 auto;">
          <div>
            <!-- HEADER ATAS: PENGIRIM (Logo di kiri, Detail di sampingnya. DROPSHIP = LOGO OTOMATIS HILANG) -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #000; padding-bottom: 3mm; gap: 3mm;">
              <div style="display: flex; align-items: center; gap: 3mm; min-width: 0;">
                ${!isDropship && settings.show_logo_on_print && settings.logo_mode !== 'none' ? `
                  <div style="flex-shrink: 0; display: flex; align-items: center;">
                    ${(settings.logo_mode === 'custom' || settings.custom_logo_url) && settings.custom_logo_url ? `
                      <img src="${settings.custom_logo_url}" alt="Logo Toko" style="max-height: 12mm; max-width: 25mm; object-fit: contain; display: block;" onerror="this.style.display='none'" />
                    ` : `
                      <img src="/assets/aistudio/LOGO_YAXIYA_Pink_-_Copy_c18e8ec2.png" alt="Yaxiya Jewelry" style="max-height: 12mm; max-width: 25mm; object-fit: contain; display: block;" />
                    `}
                  </div>
                ` : ''}
                <div style="min-width: 0; line-height: 1.25;">
                  <div style="font-size: 7.5pt; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 0.5px;">PENGIRIM:</div>
                  <div style="font-weight: 900; font-size: 11pt; text-transform: uppercase; word-wrap: break-word;">${effectiveSenderName}</div>
                  <div style="font-family: monospace; font-size: 9pt; font-weight: 800;">${effectiveSenderPhone}</div>
                  ${effectiveSenderAddress ? `<div style="font-size: 7.5pt; color: #333; margin-top: 1px; word-wrap: break-word;">${effectiveSenderAddress}</div>` : ''}
                </div>
              </div>
            </div>

            <!-- BAGIAN TENGAH: PENERIMA -->
            <div style="padding: 3mm 0; border-bottom: 2px dashed #000;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; font-weight: 800; margin-bottom: 1.5mm;">
                <span style="letter-spacing: 0.5px;">PENERIMA:</span>
                ${showId ? `<span style="font-family: monospace; font-size: 8.5pt; background: #eee; padding: 1px 4px; border-radius: 2px; border: 1px solid #ccc;">ID: ${item.customer_id}</span>` : ''}
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
            Tgl Cetak: ${printDate}
          </div>
        </div>
      `).join('');
    } else {
      // HVS A4 (3 Bagian per Lembar)
      const renderA4ItemHtml = (item: Address, slotIdx: number, modeLabel: string) => `
        <div style="height: 91mm; border: 1.5px dashed #000; padding: 3mm 4mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; margin-bottom: 2mm; position: relative;">
          <div>
            <!-- HEADER ATAS: PENGIRIM -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 1.5mm;">
              <div style="display: flex; align-items: center; gap: 2.5mm;">
                ${!isDropship && settings.show_logo_on_print && settings.logo_mode !== 'none' ? `
                  <div style="flex-shrink: 0; display: inline-flex; align-items: center;">
                    ${(settings.logo_mode === 'custom' || settings.custom_logo_url) && settings.custom_logo_url ? `
                      <img src="${settings.custom_logo_url}" alt="Logo Toko" style="max-height: 9mm; max-width: 22mm; object-fit: contain; display: block;" onerror="this.style.display='none'" />
                    ` : `
                      <img src="/assets/aistudio/LOGO_YAXIYA_Pink_-_Copy_c18e8ec2.png" alt="Yaxiya Jewelry" style="max-height: 9mm; max-width: 22mm; object-fit: contain; display: block;" />
                    `}
                  </div>
                ` : ''}
                <div>
                  <span style="font-size: 7pt; font-weight: 800; color: #444;">PENGIRIM: </span>
                  <strong style="font-size: 9.5pt; text-transform: uppercase;">${effectiveSenderName}</strong>
                  <span style="font-family: monospace; font-size: 8pt; font-weight: 800; margin-left: 2mm;">(${effectiveSenderPhone})</span>
                </div>
              </div>
              ${showId ? `<div style="font-family: monospace; font-size: 7.5pt; font-weight: 800;">ID: ${item.customer_id}</div>` : ''}
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
            ✂ Gunting Di Sini (Cut Line) · Tgl Cetak: ${printDate}
          </div>
        </div>
      `;

      const renderEmptySlotHtml = (slotIdx: number) => `
        <div style="height: 91mm; border: 1px dotted #ccc; background: #fafafa; margin-bottom: 2mm; box-sizing: border-box; display: flex; align-items: center; justify-content: center; color: #999; font-size: 8pt; font-family: monospace;">
          [Area Kosong Lembar A4 · Bagian ${slotIdx + 1}/3]
        </div>
      `;

      if (a4Mode === 'single_per_sheet') {
        // Mode 1: 1 Lembar Hanya 1 Alamat, sesuai jumlah salinan (maks 3 per lembar)
        targetAddresses.forEach(addr => {
          const sheetsForThisAddr = Math.max(1, Math.ceil(copies / 3));
          for (let s = 0; s < sheetsForThisAddr; s++) {
            const countOnThisSheet = Math.min(copies - s * 3, 3);
            labelsHtml += `
              <div class="a4-page page-break" style="width: 200mm; height: 287mm; padding: 3mm; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; display: flex; flex-direction: column; justify-content: flex-start; margin: 0 auto;">
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
          labelsHtml += `
            <div class="a4-page page-break" style="width: 200mm; height: 287mm; padding: 3mm; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #000; background: #fff; display: flex; flex-direction: column; justify-content: flex-start; margin: 0 auto;">
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
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cetak Label - ${effectiveSenderName}</title>
  <style>
    @page {
      size: ${format === 'thermal_100x150' ? '100mm 150mm' : '210mm 297mm'};
      margin: ${format === 'thermal_100x150' ? '0' : '4mm'};
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    @media screen {
      body {
        background: #e2e8f0;
        padding: 20px 0;
      }
      .thermal-card {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 20px !important;
      }
      .a4-page {
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 20px !important;
      }
      .action-banner {
        position: sticky;
        top: 0;
        z-index: 9999;
        background: #0f172a;
        color: #fff;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        margin-bottom: 20px;
      }
      .btn-print {
        background: #be185d;
        color: white;
        border: none;
        padding: 8px 20px;
        font-size: 13px;
        font-weight: bold;
        border-radius: 8px;
        cursor: pointer;
      }
      .btn-print:hover {
        background: #9d174d;
      }
    }
    @media print {
      .action-banner {
        display: none !important;
      }
      body {
        background: #fff !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-banner">
    <div>
      <strong>Yaxiya Jewelry — Siap Cetak Label</strong>
      <span style="font-size: 12px; color: #94a3b8; margin-left: 10px;">Format: ${format === 'thermal_100x150' ? 'Thermal 100 × 150 mm' : 'HVS A4 21 × 29,7 cm'} (${printItems.length} Label)</span>
    </div>
    <div style="display: flex; gap: 10px; align-items: center;">
      <button class="btn-print" onclick="window.print()">🖨 KLIK UNTUK MENCETAK (PRINT)</button>
    </div>
  </div>
  ${labelsHtml}
  <script>
    // Auto trigger print dialog
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(fullHtml);
  } catch (err: any) {
    res.status(500).send(`Gagal memuat halaman cetak: ${err.message}`);
  }
});

// --- 6. ACTIVITY LOGS ---
apiRouter.get('/activities', (req: Request, res: Response) => {
  try {
    const logs = db.getActivityLogs(100);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 7. SYNC STATUS & TRIGGER ---
apiRouter.get('/sync/status', (req: Request, res: Response) => {
  try {
    const syncStats = db.getSyncStats();
    const sheetsStatus = googleSheetsClient.getStatus();
    res.json({
      success: true,
      data: {
        syncStats,
        sheetsStatus
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/sync/trigger', async (req: Request, res: Response) => {
  try {
    const result = await syncService.processQueue();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- GOOGLE APPS SCRIPT (CODE.GS) & SPREADSHEET SYNC ENDPOINTS ---
apiRouter.get('/spreadsheet/config', (req: Request, res: Response) => {
  try {
    const url = db.getAppsScriptUrl();
    const spreadsheetId = db.getSpreadsheetId();
    const stats = db.getStats();
    res.json({
      success: true,
      data: {
        apps_script_url: url,
        spreadsheet_id: spreadsheetId,
        spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        is_configured: !!url,
        is_permanent: true,
        stats: {
          totalCustomers: stats.totalCustomers,
          totalAddresses: stats.totalAddresses,
          totalPrinted: stats.totalLabelsPrinted
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/spreadsheet/config', (req: Request, res: Response) => {
  try {
    const { apps_script_url, spreadsheet_id } = req.body;
    let savedUrl = db.getAppsScriptUrl();
    if (apps_script_url !== undefined) {
      savedUrl = db.setAppsScriptUrl(apps_script_url);
    }
    let savedId = db.getSpreadsheetId();
    if (spreadsheet_id !== undefined) {
      savedId = db.setSpreadsheetId(spreadsheet_id);
    }
    res.json({ 
      success: true, 
      data: { 
        apps_script_url: savedUrl, 
        spreadsheet_id: savedId,
        spreadsheet_url: `https://docs.google.com/spreadsheets/d/${savedId}/edit`
      } 
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.post('/spreadsheet/clean-dummy', async (req: Request, res: Response) => {
  try {
    const cleanResult = db.cleanDummyData();
    const appsScriptUrl = db.getAppsScriptUrl();

    let remoteSyncResult: any = null;
    if (appsScriptUrl) {
      try {
        const fullData = db.getFullDatabase();
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'syncAll',
            data: fullData
          }),
          redirect: 'follow'
        });
        remoteSyncResult = await response.json();
      } catch (syncErr: any) {
        console.warn('Could not push clean state to spreadsheet:', syncErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Semua data dummy berhasil dihapus dari sistem & disinkronkan ke Google Spreadsheet!',
      removed: cleanResult,
      remoteSync: remoteSyncResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/spreadsheet/test-connection', async (req: Request, res: Response) => {
  try {
    const targetUrl = (req.body.url || db.getAppsScriptUrl() || '').trim();
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'URL Web App Apps Script belum diisi.' });
    }

    const testUrl = targetUrl.includes('?') ? `${targetUrl}&action=ping` : `${targetUrl}?action=ping`;
    const start = Date.now();
    const response = await fetch(testUrl, { method: 'GET', redirect: 'follow' });
    const latency = Date.now() - start;
    const data = await response.json();

    if (data.success) {
      res.json({
        success: true,
        message: 'Koneksi ke Google Apps Script berhasil terhubung!',
        latencyMs: latency,
        data
      });
    } else {
      res.status(400).json({
        success: false,
        error: data.error || 'Google Apps Script merespon tetapi mengembalikan status error.'
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: `Koneksi gagal: ${err.message}` });
  }
});

apiRouter.post('/spreadsheet/sync-push', async (req: Request, res: Response) => {
  try {
    const appsScriptUrl = db.getAppsScriptUrl();
    if (!appsScriptUrl) {
      return res.status(400).json({
        success: false,
        error: 'URL Web App Google Apps Script belum dikonfigurasi. Silakan simpan URL di pengaturan terlebih dahulu.'
      });
    }

    const fullData = db.getFullDatabase();
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'syncAll',
        data: fullData
      }),
      redirect: 'manual'
    });

    let result: any = null;
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get('location');
      if (loc) {
        const echoRes = await fetch(loc);
        result = await echoRes.json();
      }
    } else {
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch {
        result = { success: true, message: 'Sync berhasil diproses' };
      }
    }

    db.logActivity('SINKRONISASI', `Ekspor/Push data ke Google Spreadsheet berhasil (${fullData.customers.length} pelanggan, ${fullData.addresses.length} alamat)`);
    res.json({
      success: true,
      data: result,
      counts: {
        customers: fullData.customers.length,
        addresses: fullData.addresses.length,
        couriers: fullData.couriers.length,
        prints: fullData.print_history.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Gagal mengirim data ke Google Spreadsheet' });
  }
});

apiRouter.post('/spreadsheet/sync-pull', async (req: Request, res: Response) => {
  try {
    const imported = await syncService.pullFromSpreadsheet(true);
    if (!imported) {
      throw new Error('Gagal menarik data dari Google Spreadsheet atau URL belum dikonfigurasi.');
    }
    res.json({
      success: true,
      message: 'Berhasil menarik semua data dari Google Spreadsheet ke sistem!',
      data: imported
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Gagal menarik data dari Google Spreadsheet' });
  }
});

apiRouter.get('/spreadsheet/code-gs', (req: Request, res: Response) => {
  try {
    const codeGsPath = path.resolve(process.cwd(), 'code.gs');
    if (fs.existsSync(codeGsPath)) {
      const code = fs.readFileSync(codeGsPath, 'utf-8');
      res.json({ success: true, code });
    } else {
      res.status(404).json({ success: false, error: 'File code.gs tidak ditemukan.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 8. EXPORT (CSV / XLSX) ---
apiRouter.get('/export', (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'xlsx';
    const type = (req.query.type as string) || 'combined'; // 'customers' | 'addresses' | 'combined'

    const customers = db.getCustomers(true);
    const addresses = db.getAddresses(undefined, true);

    const wb = XLSX.utils.book_new();

    if (type === 'customers' || type === 'combined') {
      const customerSheetData = customers.map(c => ({
        'ID Pelanggan': c.customer_id,
        'Nama Pelanggan': c.customer_name,
        'No. Telepon': c.primary_phone,
        'Grup Alamat': c.group_name || '',
        'Catatan': c.notes,
        'Tanggal Dibuat': c.created_at,
        'Tanggal Diperbarui': c.updated_at,
        'Status': c.status
      }));
      const wsCust = XLSX.utils.json_to_sheet(customerSheetData);
      XLSX.utils.book_append_sheet(wb, wsCust, 'Pelanggan');
    }

    if (type === 'addresses' || type === 'combined') {
      const addressSheetData = addresses.map(a => {
        const parent = customers.find(c => c.customer_id === a.customer_id);
        return {
          'ID Alamat': a.address_id,
          'ID Pelanggan': a.customer_id,
          'Nama Pelanggan Utama': parent ? parent.customer_name : '-',
          'Label Alamat': a.address_label,
          'Grup Alamat': a.group_name || '',
          'Nama Penerima': a.recipient_name,
          'No. Telepon Penerima': a.recipient_phone,
          'Alamat Lengkap': a.full_address,
          'Kelurahan/Desa': a.village,
          'Kecamatan': a.district,
          'Kota/Kabupaten': a.city,
          'Provinsi': a.province,
          'Kode Pos': a.postal_code,
          'Jasa Kirim': a.shipping_courier,
          'Layanan': a.shipping_service,
          'Catatan Pengiriman': a.shipping_notes,
          'Tanggal Dibuat': a.created_at,
          'Status': a.status
        };
      });
      const wsAddr = XLSX.utils.json_to_sheet(addressSheetData);
      XLSX.utils.book_append_sheet(wb, wsAddr, 'Alamat_Pengiriman');
    }

    db.logActivity('EKSPOR_DATA', `Mengekspor data (${type}) ke format ${format.toUpperCase()}`);

    if (format === 'csv') {
      const firstSheetName = wb.SheetNames[0];
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheetName]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Yaxiya_Data_${type}_${Date.now()}.csv"`);
      return res.send(csv);
    } else {
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Yaxiya_Data_${type}_${Date.now()}.xlsx"`);
      return res.send(buf);
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 9. IMPORT PREVIEW & COMMIT ---
apiRouter.post('/import/preview', (req: Request, res: Response) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'Data file base64 tidak ditemukan.' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '', raw: false });

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'File Excel / CSV kosong.' });
    }

    // Inspect columns and validate
    const sample = rows[0];
    const columns = Object.keys(sample);

    const parsedCustomers: Partial<Customer>[] = [];
    const parsedAddresses: Partial<Address>[] = [];
    const errors: string[] = [];

    // Check duplicate IDs against database
    const existingCustomerIds = new Set(db.getCustomers(true).map(c => c.customer_id.toLowerCase()));
    let duplicateCustomersCount = 0;

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      // Normalization of headers
      const getVal = (...keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
            return String(row[k]).trim();
          }
        }
        return '';
      };

      const customer_id = getVal('customer_id', 'ID Pelanggan', 'ID_Pelanggan', 'id_pelanggan');
      const customer_name = getVal('customer_name', 'Nama Pelanggan', 'Nama_Pelanggan', 'nama_pelanggan', 'Nama');
      const primary_phone = getVal('primary_phone', 'No. Telepon', 'No Telepon', 'Telepon', 'Nomor Telepon', 'phone');
      const recipient_name = getVal('recipient_name', 'Nama Penerima', 'Penerima');
      const recipient_phone = getVal('recipient_phone', 'No. Telepon Penerima', 'Telepon Penerima');
      const full_address = getVal('full_address', 'Alamat Lengkap', 'Alamat');
      const city = getVal('city', 'Kota', 'Kota/Kabupaten', 'Kabupaten');
      const province = getVal('province', 'Provinsi');
      const courier = getVal('shipping_courier', 'Jasa Kirim', 'Kurir', 'Ekspedisi');

      if (!customer_name && !recipient_name) {
        errors.push(`Baris ${rowNum}: Nama pelanggan atau penerima tidak ditemukan.`);
        return;
      }

      if (customer_id && existingCustomerIds.has(customer_id.toLowerCase())) {
        duplicateCustomersCount++;
      }

      parsedCustomers.push({
        customer_id: customer_id || `AUTO-${rowNum}`,
        customer_name: customer_name || recipient_name,
        primary_phone: primary_phone || recipient_phone || '08',
        notes: getVal('notes', 'Catatan', 'Keterangan'),
        status: 'active'
      });

      if (full_address || city) {
        parsedAddresses.push({
          address_id: getVal('address_id', 'ID Alamat') || `AUTO-ADDR-${rowNum}`,
          customer_id: customer_id || `AUTO-${rowNum}`,
          address_label: getVal('address_label', 'Label Alamat') || 'Alamat Impor',
          recipient_name: recipient_name || customer_name,
          recipient_phone: recipient_phone || primary_phone || '08',
          full_address: full_address || '',
          village: getVal('village', 'Kelurahan', 'Desa'),
          district: getVal('district', 'Kecamatan'),
          city: city || 'Jakarta',
          province: province || 'DKI Jakarta',
          postal_code: getVal('postal_code', 'Kode Pos'),
          shipping_courier: courier || 'JNE',
          shipping_service: getVal('shipping_service', 'Layanan'),
          shipping_notes: getVal('shipping_notes', 'Catatan Pengiriman'),
          status: 'active'
        });
      }
    });

    res.json({
      success: true,
      filename,
      totalRows: rows.length,
      columns,
      detectedCustomers: parsedCustomers.length,
      detectedAddresses: parsedAddresses.length,
      duplicateCustomersCount,
      errors: errors.slice(0, 10),
      previewRows: rows.slice(0, 5)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/import/commit', (req: Request, res: Response) => {
  try {
    const { base64Data, duplicateStrategy } = req.body; // 'skip' | 'update' | 'new_id'
    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'Data base64 tidak ada.' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '', raw: false });

    const getVal = (row: any, ...keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
      return '';
    };

    const customersToAdd: Customer[] = [];
    const addressesToAdd: Address[] = [];
    const timestamp = db.getStats().recentCustomers[0]?.created_at || '13-10-2026 00:00:00';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let cid = getVal(row, 'customer_id', 'ID Pelanggan', 'id_pelanggan');
      const cname = getVal(row, 'customer_name', 'Nama Pelanggan', 'Nama', 'recipient_name', 'Nama Penerima');
      const cphone = getVal(row, 'primary_phone', 'No. Telepon', 'Telepon', 'recipient_phone', 'No. Telepon Penerima') || '08000000000';
      const cnotes = getVal(row, 'notes', 'Catatan');

      if (!cname) continue;

      if (!cid || cid.startsWith('AUTO-')) {
        cid = db.generateNextCustomerId();
      } else {
        const existing = db.getCustomerById(cid);
        if (existing) {
          if (duplicateStrategy === 'skip') {
            continue;
          } else if (duplicateStrategy === 'new_id') {
            cid = db.generateNextCustomerId();
          }
          // If 'update', keep cid and update existing
        }
      }

      customersToAdd.push({
        customer_id: cid,
        customer_name: cname,
        primary_phone: cphone,
        notes: cnotes,
        created_at: timestamp,
        updated_at: timestamp,
        status: 'active'
      });

      const full_address = getVal(row, 'full_address', 'Alamat Lengkap', 'Alamat');
      if (full_address) {
        let aid = getVal(row, 'address_id', 'ID Alamat') || db.generateNextAddressId();
        addressesToAdd.push({
          address_id: aid,
          customer_id: cid,
          address_label: getVal(row, 'address_label', 'Label Alamat') || 'Alamat Impor',
          recipient_name: getVal(row, 'recipient_name', 'Nama Penerima') || cname,
          recipient_phone: getVal(row, 'recipient_phone', 'No. Telepon Penerima') || cphone,
          full_address: full_address,
          village: getVal(row, 'village', 'Kelurahan', 'Desa'),
          district: getVal(row, 'district', 'Kecamatan'),
          city: getVal(row, 'city', 'Kota', 'Kota/Kabupaten') || 'Jakarta',
          province: getVal(row, 'province', 'Provinsi') || 'DKI Jakarta',
          postal_code: getVal(row, 'postal_code', 'Kode Pos'),
          shipping_courier: getVal(row, 'shipping_courier', 'Jasa Kirim', 'Kurir') || 'JNE',
          shipping_service: getVal(row, 'shipping_service', 'Layanan') || 'Reguler',
          shipping_notes: getVal(row, 'shipping_notes', 'Catatan Pengiriman'),
          created_at: timestamp,
          updated_at: timestamp,
          status: 'active'
        });
      }
    }

    const importResult = db.importCustomersAndAddresses(customersToAdd, addressesToAdd);
    syncService.processQueue().catch(() => {});

    res.json({
      success: true,
      data: importResult
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/import/quick-paste', (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data alamat yang dikirim.' });
    }

    const customersToAdd: Customer[] = [];
    const addressesToAdd: Address[] = [];
    const timestamp = getCurrentDateFormatted();

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      let cid = (it.customerId || '').trim();
      const cname = (it.customerName || it.recipientName || '').trim() || (cid ? `Pelanggan ${cid}` : `Pelanggan ${i + 1}`);
      const phone = (it.phone || '').trim() || '08000000000';
      const grp = (it.groupName || '').trim();

      if (!cid) {
        cid = db.generateNextCustomerId();
      }

      customersToAdd.push({
        customer_id: cid,
        customer_name: cname,
        primary_phone: phone,
        group_name: grp,
        notes: (it.notes || '').trim(),
        created_at: timestamp,
        updated_at: timestamp,
        status: 'active'
      });

      const fullAddr = (it.fullAddress || '').trim();
      const recipient = (it.recipientName || cname).trim();
      const recipientPhone = (it.phone || phone).trim();
      const aid = (it.addressId || '').trim() || db.generateNextAddressId();

      addressesToAdd.push({
        address_id: aid,
        customer_id: cid,
        address_label: (it.label || 'Alamat Utama').trim(),
        recipient_name: recipient,
        recipient_phone: recipientPhone,
        full_address: fullAddr,
        village: (it.village || '').trim(),
        district: (it.district || '').trim(),
        city: (it.city || 'Jakarta Barat').trim(),
        province: (it.province || 'DKI Jakarta').trim(),
        postal_code: (it.postalCode || '').trim(),
        shipping_courier: (it.courier || 'JNE').trim(),
        shipping_service: (it.service || 'Reguler').trim(),
        shipping_notes: (it.shippingNotes || it.notes || '').trim(),
        group_name: grp,
        created_at: timestamp,
        updated_at: timestamp,
        status: 'active'
      });
    }

    const result = db.importCustomersAndAddresses(customersToAdd, addressesToAdd);
    syncService.processQueue().catch(() => {});

    res.json({
      success: true,
      message: `Berhasil menambahkan & memperbarui ${result.importedCustomers} pelanggan dan ${result.importedAddresses} alamat ke sistem!`,
      data: result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

