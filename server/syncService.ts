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

    // Subscribe to DB real-time change events for instant push when data changes from system
    db.onSyncNeeded(() => {
      this.triggerSync();
    });
    
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

      // Normalize remote groups so ungrouped customers are strictly empty string ""
      if (Array.isArray(remoteData.customers)) {
        for (const c of remoteData.customers) {
          const g = (c.group_name || '').trim();
          if (g === '-' || g === ' ' || (g === 'HERMES' && !c.notes?.toLowerCase().includes('hermes'))) {
            c.group_name = '';
          }
        }
      }
      if (Array.isArray(remoteData.addresses)) {
        for (const a of remoteData.addresses) {
          const g = (a.group_name || '').trim();
          if (g === '-' || g === ' ' || (g === 'HERMES' && !a.shipping_notes?.toLowerCase().includes('hermes'))) {
            a.group_name = '';
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
            try {
              await this.syncTaskToAppsScript(appsScriptUrl, task);
              db.updateSyncTask(task.sync_id, 'SYNCED', null);
              totalProcessed++;
            } catch (taskErr: any) {
              totalErrors++;
              db.updateSyncTask(task.sync_id, 'FAILED', taskErr.message);
            }
          }

          // If any delete operation was performed, do a clean sweep via pushFullDatabaseToSpreadsheet
          // to ensure old rows are completely wiped out even if Apps Script deployment is older
          if (hasDeleteOp) {
            await this.pushFullDatabaseToSpreadsheet().catch(() => {});
          }
        } else {
          try {
            await googleSheetsClient.ensureSheetsInitialized();
            for (const task of tasks) {
              if (task.retry_count >= 5) continue;
              try {
                await this.syncSingleTask(task);
                db.updateSyncTask(task.sync_id, 'SYNCED', null);
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
    await this.processQueue();
  }

  public async deleteCustomerFromSpreadsheet(customerId: string): Promise<void> {
    const appsScriptUrl = db.getAppsScriptUrl();
    if (appsScriptUrl) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteCustomer', customer_id: customerId }),
          redirect: 'follow'
        });
      } catch (e: any) {
        console.warn('[SyncService] deleteCustomer call warning:', e.message);
      }
      // Ensure the row is completely wiped from spreadsheet
      await this.pushFullDatabaseToSpreadsheet();
    }
    // Mark pending tasks for this entity as SYNCED
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if ((t.entity_type === 'PELANGGAN' && t.entity_id === customerId) ||
          (t.entity_type === 'ALAMAT_PENGIRIMAN' && t.payload?.customer_id === customerId)) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
    }
  }

  public async syncAddressToSpreadsheet(address: Address): Promise<void> {
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
    await this.processQueue();
  }

  public async deleteAddressFromSpreadsheet(addressId: string): Promise<void> {
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
      await this.pushFullDatabaseToSpreadsheet();
    }
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'ALAMAT_PENGIRIMAN' && t.entity_id === addressId) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
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
      } catch {}
      await this.pushFullDatabaseToSpreadsheet().catch(() => {});
    }
    await this.processQueue();
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
      } catch {}
      await this.pushFullDatabaseToSpreadsheet().catch(() => {});
    }
    const tasks = db.getPendingSyncTasks();
    for (const t of tasks) {
      if (t.entity_type === 'JASA_KIRIM' && t.entity_id === courierId) {
        db.updateSyncTask(t.sync_id, 'SYNCED', null);
      }
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
