import { db, SyncTask, getCurrentDateFormatted, Customer, Address, Courier } from './db.js';
import { googleSheetsClient } from './googleSheets.js';

class SyncService {
  private isProcessing = false;
  private hasPendingRerun = false;
  private isPulling = false;
  private lastPullTime = 0;
  private triggerTimeout: NodeJS.Timeout | null = null;
  private isStarted = false;

  public getLastPullTime(): number {
    return this.lastPullTime;
  }

  public start() {
    if (this.isStarted) return;
    this.isStarted = true;
    console.log('[SyncService] Background automatic event-driven sync service running...');
    
    // Initial automatic pull from Google Spreadsheet immediately on startup (150ms)
    // to load initial data without manual push/pull
    setTimeout(() => {
      this.pullFromSpreadsheet(true).catch(err => {
        console.warn('[SyncService] Initial pull warning:', err.message);
      });
    }, 150);

    // Initial queue push after 2 seconds if any pending items exist
    setTimeout(() => {
      this.processQueue().catch(err => console.error('[SyncService] Initial push error:', err.message));
    }, 2000);
  }

  public triggerSync() {
    if (this.triggerTimeout) clearTimeout(this.triggerTimeout);
    this.triggerTimeout = setTimeout(() => {
      this.processQueue().catch(err => {
        console.warn('[SyncService] Realtime sync error:', err.message);
      });
    }, 80); // fast 80ms debounce for instantaneous push
  }

  public stop() {
    if (this.triggerTimeout) {
      clearTimeout(this.triggerTimeout);
      this.triggerTimeout = null;
    }
    this.isStarted = false;
  }

  private pullPromise: Promise<{ customers: number; addresses: number; couriers: number } | null> | null = null;

  // --- AUTOMATIC PULL FROM SPREADSHEET ---
  public async pullFromSpreadsheet(force = false): Promise<{ customers: number; addresses: number; couriers: number } | null> {
    if (this.pullPromise) {
      return this.pullPromise;
    }

    if (!force && this.lastPullTime > 0 && Date.now() - this.lastPullTime < 10000) {
      return {
        customers: db.getCustomers().length,
        addresses: db.getAddresses(undefined, false).length,
        couriers: db.getCouriers().length
      };
    }

    this.pullPromise = this.executePull().finally(() => {
      this.pullPromise = null;
    });

    return this.pullPromise;
  }

  private async executePull(): Promise<{ customers: number; addresses: number; couriers: number } | null> {
    const appsScriptUrl = db.getAppsScriptUrl();
    if (!appsScriptUrl) return null;

    try {
      const fetchUrl = appsScriptUrl.includes('?') 
        ? `${appsScriptUrl}&action=getAll` 
        : `${appsScriptUrl}?action=getAll`;

      const response = await fetch(fetchUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} saat menarik data spreadsheet`);
      }

      const json = await response.json();
      if (!json || !json.success || !json.data) {
        throw new Error(json?.error || 'Respon Google Apps Script tidak valid');
      }

      // Preserve any pending local modifications currently in the sync queue
      const pendingTasks = db.getPendingSyncTasks();
      const pendingCustIds = new Set(pendingTasks.filter(t => t.entity_type === 'PELANGGAN').map(t => t.entity_id));
      const pendingAddrIds = new Set(pendingTasks.filter(t => t.entity_type === 'ALAMAT_PENGIRIMAN').map(t => t.entity_id));

      const remoteData = json.data;

      // Normalize remote groups so ungrouped customers/addresses are strictly empty string "" and valid groups are uppercase
      const remoteGroupsFound = new Set<string>();
      if (Array.isArray(remoteData.address_groups)) {
        for (const g of remoteData.address_groups) {
          const clean = String(g || '').trim().toUpperCase();
          if (clean && clean !== '-' && clean !== 'NULL' && clean !== 'UNDEFINED') remoteGroupsFound.add(clean);
        }
      }
      if (Array.isArray(remoteData.customers)) {
        for (const c of remoteData.customers) {
          let g = (c.group_name || '').trim();
          if (g === '-' || g === 'null' || g === 'undefined') {
            c.group_name = '';
          } else if (g) {
            c.group_name = g.toUpperCase();
            remoteGroupsFound.add(c.group_name);
          }
        }
      }
      if (Array.isArray(remoteData.addresses)) {
        for (const a of remoteData.addresses) {
          let g = (a.group_name || '').trim();
          if (g === '-' || g === 'null' || g === 'undefined') {
            a.group_name = '';
          } else if (g) {
            a.group_name = g.toUpperCase();
            remoteGroupsFound.add(a.group_name);
          }

          // Read dedicated dropship fields
          const isDrop = a.is_dropship === true || 
            String(a.is_dropship).toUpperCase() === 'YA' || 
            String(a.is_dropship).toUpperCase() === 'TRUE' || 
            a.address_label === 'Dropship' || 
            Boolean(a.dropship_sender_name && String(a.dropship_sender_name).trim().length > 0);
          a.is_dropship = isDrop;
          if (a.dropship_sender_name) a.dropship_sender_name = String(a.dropship_sender_name).trim();
          if (a.dropship_sender_phone) a.dropship_sender_phone = String(a.dropship_sender_phone).trim();
          if (a.dropship_sender_city) a.dropship_sender_city = String(a.dropship_sender_city).trim();

          // If legacy shipping notes contained embedded Dropship info, recover it if dedicated fields were empty
          if (!a.dropship_sender_name && a.shipping_notes && a.shipping_notes.includes('Dropship:')) {
            const match = a.shipping_notes.match(/Dropship:\s*([^(|]+)(?:\(([^)]*)\))?(?:\s*-\s*Asal:\s*([^;,\n|]+))?/i);
            if (match) {
              a.is_dropship = true;
              if (match[1]) a.dropship_sender_name = match[1].trim();
              if (match[2]) a.dropship_sender_phone = match[2].trim();
              if (match[3]) a.dropship_sender_city = match[3].trim();
            }
          }

          // Keep shipping_notes completely pure and independent for custom shipping notes
          if (a.shipping_notes && a.shipping_notes.includes('Dropship:')) {
            a.shipping_notes = a.shipping_notes
              .replace(/\|\s*Dropship:\s*[^|]+/i, '')
              .replace(/Dropship:\s*[^|]+\|\s*/i, '')
              .replace(/Dropship:\s*[^(]+(?:\([^)]*\))?(?:\s*-\s*Asal:\s*[^;,\n]+)?/i, '')
              .trim();
          }
        }
      }
      if (remoteGroupsFound.size > 0) {
        remoteData.address_groups = Array.from(remoteGroupsFound);
      }

      // Auto-reconcile missing customers from remote addresses so customers are never lost
      if (Array.isArray(remoteData.addresses)) {
        if (!Array.isArray(remoteData.customers)) {
          remoteData.customers = [];
        }
        const remoteCustMap = new Set(remoteData.customers.map((c: any) => String(c.customer_id).trim().toUpperCase()));
        for (const addr of remoteData.addresses) {
          if (!addr || !addr.customer_id || addr.status === 'deleted') continue;
          const cidUpper = String(addr.customer_id).trim().toUpperCase();
          if (!remoteCustMap.has(cidUpper)) {
            remoteData.customers.push({
              customer_id: String(addr.customer_id).trim(),
              customer_name: (addr.recipient_name || `Pelanggan ${addr.customer_id}`).trim(),
              primary_phone: (addr.recipient_phone || '').trim(),
              group_name: (addr.group_name || '').trim(),
              notes: (addr.shipping_notes || '').trim(),
              created_at: addr.created_at || '',
              updated_at: addr.updated_at || '',
              status: 'active'
            });
            remoteCustMap.add(cidUpper);
          }
        }
      }

      // Merge remote customers without overwriting pending local edits
      if (Array.isArray(remoteData.customers)) {
        for (const localPendingCustId of pendingCustIds) {
          const localCust = db.getCustomerById(localPendingCustId);
          if (localCust) {
            const idx = remoteData.customers.findIndex((c: any) => c.customer_id === localPendingCustId);
            if (idx >= 0) {
              remoteData.customers[idx] = localCust;
            } else {
              remoteData.customers.unshift(localCust);
            }
          }
        }
      }

      // Merge remote addresses without overwriting pending local edits
      if (Array.isArray(remoteData.addresses)) {
        for (const localPendingAddrId of pendingAddrIds) {
          const localAddr = db.getAddressById(localPendingAddrId);
          if (localAddr) {
            const idx = remoteData.addresses.findIndex((a: any) => a.address_id === localPendingAddrId);
            if (idx >= 0) {
              remoteData.addresses[idx] = localAddr;
            } else {
              remoteData.addresses.unshift(localAddr);
            }
          }
        }
      }

      const result = db.importFullDatabase(remoteData);
      this.lastPullTime = Date.now();
      console.log(`[SyncService] Otomatis tersinkronisasi dari Spreadsheet: ${result.customers} pelanggan, ${result.addresses} alamat, ${result.couriers} jasa kirim.`);
      return result;
    } catch (err: any) {
      console.warn('[SyncService] Auto-pull gagal / offline:', err.message);
      return null;
    }
  }

  // --- AUTOMATIC PUSH TO SPREADSHEET ---
  public async processQueue(): Promise<{ processed: number; errors: number }> {
    if (this.isProcessing) {
      this.hasPendingRerun = true;
      return { processed: 0, errors: 0 };
    }

    this.isProcessing = true;
    let totalProcessed = 0;
    let totalErrors = 0;

    const appsScriptUrl = db.getAppsScriptUrl();

    try {
      while (true) {
        this.hasPendingRerun = false;
        const tasks = db.getPendingSyncTasks();
        if (tasks.length === 0) break;

        let hasDeleteOp = false;

        if (appsScriptUrl) {
          for (const task of tasks) {
            if (task.retry_count >= 5) continue;
            if (task.operation === 'DELETE') hasDeleteOp = true;
            // Mark task as SYNCED immediately so concurrent or debounced queue triggers never pick it up twice
            db.updateSyncTask(task.sync_id, 'SYNCED', null);
            try {
              await this.syncTaskToAppsScript(appsScriptUrl, task);
              totalProcessed++;
            } catch (taskErr: any) {
              totalErrors++;
              db.updateSyncTask(task.sync_id, 'FAILED', taskErr.message);
            }
          }
          if (hasDeleteOp) {
            await this.pushFullDatabaseToSpreadsheet().catch(() => {});
          }
        } else {
          try {
            await googleSheetsClient.ensureSheetsInitialized();
            for (const task of tasks) {
              if (task.retry_count >= 5) continue;
              db.updateSyncTask(task.sync_id, 'SYNCED', null);
              try {
                await this.syncSingleTask(task);
                totalProcessed++;
              } catch (err: any) {
                totalErrors++;
                db.updateSyncTask(task.sync_id, 'FAILED', err.message);
              }
            }
          } catch {}
        }

        if (!this.hasPendingRerun && db.getPendingSyncTasks().length === 0) {
          break;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { processed: totalProcessed, errors: totalErrors };
  }

  public async pushFullDatabaseToSpreadsheet(): Promise<boolean> {
    const appsScriptUrl = db.getAppsScriptUrl();
    if (!appsScriptUrl) return false;

    const full = db.getFullDatabase();
    const safeSettings = { ...full.settings };
    if (safeSettings.custom_logo_url && safeSettings.custom_logo_url.length > 500) {
      safeSettings.custom_logo_url = safeSettings.custom_logo_url.startsWith('data:') 
        ? '[LOGO_IMAGE_STORED_IN_APP]' 
        : safeSettings.custom_logo_url.slice(0, 500);
    }

    const payload = {
      action: 'syncAll',
      data: {
        ...full,
        customers: full.customers.map(c => ({ ...c, group_name: c.group_name || '-' })),
        addresses: full.addresses.map(a => ({ ...a, group_name: a.group_name || '-' })),
        settings: safeSettings
      }
    };

    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      const text = await res.text();
      return text.includes('true') || text.includes('berhasil');
    } catch (e: any) {
      console.warn('[SyncService] pushFullDatabaseToSpreadsheet error:', e.message);
      return false;
    }
  }

  public async syncCustomerToSpreadsheet(customer: Customer): Promise<void> {
    // 1. Mark pending task for this customer as SYNCED FIRST before fetch so queue doesn't duplicate
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'PELANGGAN' && t.entity_id === customer.customer_id) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }

    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        const cust = { ...customer };
        cust.group_name = cust.group_name && cust.group_name.trim() ? cust.group_name.trim() : '-';
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveCustomer', customer: cust }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] saveCustomer error:', e.message);
      }
    }
  }

  public async syncCustomerAndAddress(customer: Customer, address?: Address | null): Promise<void> {
    // 1. Immediately mark both pending tasks as SYNCED before doing any network calls
    // so background queue triggers NEVER pick them up and send duplicates
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if ((t.entity_type === 'PELANGGAN' && t.entity_id === customer.customer_id) ||
          (address && t.entity_type === 'ALAMAT_PENGIRIMAN' && t.entity_id === address.address_id)) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }

    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        const cust = { ...customer };
        cust.group_name = cust.group_name && cust.group_name.trim() ? cust.group_name.trim() : '-';
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveCustomer', customer: cust }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] saveCustomer error:', e.message);
      }

      if (address) {
        try {
          const addr = { ...address };
          addr.group_name = addr.group_name && addr.group_name.trim() ? addr.group_name.trim() : '-';
          await fetch(appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'saveAddress', address: addr }),
            redirect: 'follow'
          });
        } catch (e: any) {
          console.warn('[SyncService] saveAddress error:', e.message);
        }
      }
    }
  }

  public async deleteCustomerFromSpreadsheet(customerId: string, customerName?: string): Promise<void> {
    const idUpper = customerId.trim().toUpperCase();
    // 1. Mark pending tasks for this customer and ALL their shipping addresses as SYNCED FIRST
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if ((t.entity_type === 'PELANGGAN' && t.entity_id.trim().toUpperCase() === idUpper) ||
          (t.entity_type === 'ALAMAT_PENGIRIMAN' && t.payload?.customer_id && String(t.payload.customer_id).trim().toUpperCase() === idUpper)) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }

    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'deleteCustomer', 
            customer_id: customerId,
            customer_name: customerName || ''
          }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] deleteCustomer call warning:', e.message);
      }
    }
  }

  public async deleteCustomersBulkFromSpreadsheet(items: string[] | Array<{ customer_id: string; customer_name?: string }>): Promise<void> {
    if (!items || items.length === 0) return;
    const normalizedItems: Array<{ customer_id: string; customer_name?: string }> = items.map(item => 
      typeof item === 'string' ? { customer_id: item } : item
    );
    const customerIds = normalizedItems.map(x => x.customer_id);
    const idSet = new Set(customerIds.map(x => x.trim().toUpperCase()));

    // Mark pending tasks for these entities and their shipping addresses as SYNCED FIRST
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'PELANGGAN' && idSet.has(t.entity_id.trim().toUpperCase())) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      } else if (t.entity_type === 'ALAMAT_PENGIRIMAN') {
        const payloadCid = t.payload?.customer_id ? String(t.payload.customer_id).trim().toUpperCase() : '';
        if (payloadCid && idSet.has(payloadCid)) {
          db.updateSyncTask(t.sync_id, 'SYNCED', null);
        }
      }
    }

    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'bulkDeleteCustomers', 
            items: normalizedItems,
            customer_ids: customerIds 
          }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] bulkDeleteCustomers call warning:', e.message);
      }
    }
  }

  public async syncAddressToSpreadsheet(address: Address): Promise<void> {
    const idUpper = address.address_id.trim().toUpperCase();
    // 1. Mark pending task for this address as SYNCED FIRST
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'ALAMAT_PENGIRIMAN' && t.entity_id.trim().toUpperCase() === idUpper) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }

    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        const addr = { ...address };
        addr.group_name = addr.group_name && addr.group_name.trim() ? addr.group_name.trim() : '-';
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveAddress', address: addr }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] saveAddress error:', e.message);
      }
    }
  }

  public async deleteAddressFromSpreadsheet(addressId: string): Promise<void> {
    const idUpper = addressId.trim().toUpperCase();
    // 1. Mark pending tasks for this address as SYNCED FIRST
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'ALAMAT_PENGIRIMAN' && t.entity_id.trim().toUpperCase() === idUpper) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }

    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteAddress', address_id: addressId }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] deleteAddress call warning:', e.message);
      }
    }
  }

  public async deleteAddressesBulkFromSpreadsheet(addressIds: string[]): Promise<void> {
    if (!addressIds || addressIds.length === 0) return;
    const idSet = new Set(addressIds.map(x => x.trim().toUpperCase()));
    // 1. Mark pending tasks for these addresses as SYNCED FIRST
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'ALAMAT_PENGIRIMAN' && idSet.has(t.entity_id.trim().toUpperCase())) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }

    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'bulkDeleteAddresses', address_ids: addressIds }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] bulkDeleteAddresses call warning:', e.message);
      }
    }
  }

  public async syncCourierToSpreadsheet(courier: Courier): Promise<void> {
    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveCourier', courier }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] saveCourier error:', e.message);
      }
    }
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'JASA_KIRIM' && t.entity_id === courier.courier_id) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }
  }

  public async deleteCourierFromSpreadsheet(courierId: string): Promise<void> {
    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteCourier', courier_id: courierId }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] deleteCourier error:', e.message);
      }
    }
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'JASA_KIRIM' && t.entity_id === courierId) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }
  }

  public async syncGroupsToSpreadsheet(groups: string[]): Promise<boolean> {
    const appsScriptUrl = db.getAppsScriptUrl();
    if (!appsScriptUrl) return false;
    try {
      const cleanGroups = groups.map(g => g.trim().toUpperCase()).filter(g => g && g !== '-');
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveGroups', groups: cleanGroups }),
        redirect: 'follow'
      });
      const data = await res.json().catch(() => null);
      return !!(data && data.success);
    } catch (e: any) {
      console.warn('[SyncService] saveGroups warning:', e.message);
      return false;
    }
  }

  private async syncSingleTask(task: SyncTask): Promise<void> {
    const payload = task.payload;

    if (task.entity_type === 'PELANGGAN') {
      const c = payload;
      const row = [
        c.customer_id,
        c.customer_name,
        c.primary_phone,
        c.group_name || '',
        c.notes || '',
        c.created_at,
        c.updated_at,
        c.status
      ];
      await googleSheetsClient.upsertRow('PELANGGAN', c.customer_id, row);
    } 
    else if (task.entity_type === 'ALAMAT_PENGIRIMAN') {
      const a = payload;
      const isDrop = (a.is_dropship || a.address_label === 'Dropship' || (a.dropship_sender_name && String(a.dropship_sender_name).trim().length > 0)) ? 'YA' : 'TIDAK';
      const row = [
        a.address_id,
        a.customer_id,
        a.address_label,
        a.group_name || '',
        a.recipient_name,
        a.recipient_phone,
        a.full_address,
        a.village || '',
        a.district || '',
        a.city,
        a.province,
        a.postal_code || '',
        a.shipping_courier || '',
        a.shipping_service || '',
        a.shipping_notes || '',
        isDrop,
        a.dropship_sender_name || '',
        a.dropship_sender_phone || '',
        a.dropship_sender_city || '',
        a.created_at,
        a.updated_at,
        a.status
      ];
      await googleSheetsClient.upsertRow('ALAMAT_PENGIRIMAN', a.address_id, row);
    }
    else if (task.entity_type === 'JASA_KIRIM') {
      const k = payload;
      const row = [
        k.courier_id,
        k.courier_name,
        k.courier_category,
        Array.isArray(k.services) ? k.services.join(', ') : (k.services || ''),
        k.is_favorite ? 'YA' : 'TIDAK',
        k.is_active ? 'AKTIF' : 'NONAKTIF',
        k.created_at,
        k.updated_at
      ];
      await googleSheetsClient.upsertRow('JASA_KIRIM', k.courier_id, row);
    }
    else if (task.entity_type === 'RIWAYAT_CETAK') {
      const p = payload;
      const row = [
        p.print_id,
        p.customer_id,
        p.address_id,
        p.recipient_name,
        p.shipping_courier,
        p.label_format,
        p.copies,
        p.printed_at
      ];
      await googleSheetsClient.appendRow('RIWAYAT_CETAK', row);
    }
  }

  private async syncTaskToAppsScript(url: string, task: SyncTask): Promise<void> {
    let action = 'saveCustomer';
    let bodyData: any = {};

    if (task.entity_type === 'PELANGGAN') {
      if (task.operation === 'DELETE') {
        action = 'deleteCustomer';
        bodyData = { customer_id: task.entity_id };
      } else {
        action = 'saveCustomer';
        const cust = { ...task.payload };
        // If empty group, pass '-' so legacy Apps Script deployment does not fall back to HERMES
        cust.group_name = cust.group_name && cust.group_name.trim() ? cust.group_name.trim() : '-';
        bodyData = { customer: cust };
      }
    } else if (task.entity_type === 'ALAMAT_PENGIRIMAN') {
      if (task.operation === 'DELETE') {
        action = 'deleteAddress';
        bodyData = { address_id: task.entity_id };
      } else {
        action = 'saveAddress';
        const addr = { ...task.payload };
        addr.group_name = addr.group_name && addr.group_name.trim() ? addr.group_name.trim() : '-';
        bodyData = { address: addr };
      }
    } else if (task.entity_type === 'RIWAYAT_CETAK') {
      action = 'recordPrint';
      bodyData = { record: task.payload };
    } else if (task.entity_type === 'JASA_KIRIM') {
      if (task.operation === 'DELETE') {
        action = 'deleteCourier';
        bodyData = { courier_id: task.entity_id };
      } else {
        // Try single courier save
        try {
          const singleRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'saveCourier', courier: task.payload }),
            redirect: 'follow'
          });
          const singleJson = await singleRes.json().catch(() => null);
          if (singleJson && singleJson.success) {
            return;
          }
        } catch {}

        action = 'syncAll';
        const full = db.getFullDatabase();
        const safeSettings = { ...full.settings };
        if (safeSettings.custom_logo_url && safeSettings.custom_logo_url.length > 500) {
          safeSettings.custom_logo_url = safeSettings.custom_logo_url.startsWith('data:') 
            ? '[LOGO_IMAGE_STORED_IN_APP]' 
            : safeSettings.custom_logo_url.slice(0, 500);
        }
        bodyData = { 
          data: { 
            ...full, 
            customers: full.customers.map(c => ({ ...c, group_name: c.group_name || '-' })),
            addresses: full.addresses.map(a => ({ ...a, group_name: a.group_name || '-' })),
            settings: safeSettings 
          } 
        };
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...bodyData }),
      redirect: 'follow'
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      if (text.includes('exceed') || text.includes('melebihi') || text.includes('Error')) {
        throw new Error(text.slice(0, 200));
      }
      json = { success: true };
    }

    if (json && json.success === false) {
      throw new Error(json.error || 'Apps Script returned error');
    }
  }
}

export const syncService = new SyncService();
