import { google, sheets_v4 } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '1Q0xxgKTDv4AhSQKt2mJdqnuxm1U3AuWAHJ89ArlHx-Q';

export interface SheetDefinition {
  title: string;
  headers: string[];
}

export const REQUIRED_SHEETS: SheetDefinition[] = [
  {
    title: 'PELANGGAN',
    headers: ['customer_id', 'customer_name', 'primary_phone', 'notes', 'created_at', 'updated_at', 'status']
  },
  {
    title: 'ALAMAT_PENGIRIMAN',
    headers: ['address_id', 'customer_id', 'address_label', 'recipient_name', 'recipient_phone', 'full_address', 'village', 'district', 'city', 'province', 'postal_code', 'shipping_courier', 'shipping_service', 'shipping_notes', 'created_at', 'updated_at', 'status']
  },
  {
    title: 'JASA_KIRIM',
    headers: ['courier_id', 'courier_name', 'courier_category', 'services', 'is_favorite', 'is_active', 'created_at', 'updated_at']
  },
  {
    title: 'RIWAYAT_CETAK',
    headers: ['print_id', 'customer_id', 'address_id', 'recipient_name', 'shipping_courier', 'label_format', 'copies', 'printed_at']
  },
  {
    title: 'LOG_SINKRONISASI',
    headers: ['sync_id', 'entity_type', 'entity_id', 'operation', 'sync_status', 'error_message', 'created_at', 'synced_at']
  }
];

export class GoogleSheetsClient {
  private sheets: sheets_v4.Sheets | null = null;
  private isInitialized = false;
  private authError: string | null = null;

  constructor() {
    this.initAuth();
  }

  private initAuth() {
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

      if (!email || !privateKey) {
        this.authError = 'Kredensial Service Account belum dikonfigurasi di environment. Data lokal tersimpan aman di database utama.';
        return;
      }

      // Handle raw or escaped newlines in private key
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      const auth = new google.auth.JWT({
        email,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.authError = null;
    } catch (err: any) {
      this.authError = `Gagal menginisialisasi Google Auth: ${err.message || String(err)}`;
      this.sheets = null;
    }
  }

  public getStatus() {
    return {
      spreadsheetId: SPREADSHEET_ID,
      configured: !!this.sheets,
      initialized: this.isInitialized,
      error: this.authError
    };
  }

  public async ensureSheetsInitialized(): Promise<void> {
    if (!this.sheets) {
      this.initAuth();
      if (!this.sheets) {
        throw new Error(this.authError || 'Google Sheets API belum terhubung dengan kredensial.');
      }
    }

    try {
      // 1. Get spreadsheet metadata
      const res = await this.sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
      });

      const existingSheets = res.data.sheets || [];
      const existingTitles = existingSheets.map(s => s.properties?.title).filter(Boolean) as string[];

      // 2. Add missing sheets
      const requests: sheets_v4.Schema$Request[] = [];
      for (const required of REQUIRED_SHEETS) {
        if (!existingTitles.includes(required.title)) {
          requests.push({
            addSheet: {
              properties: {
                title: required.title,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: required.headers.length + 2,
                  frozenRowCount: 1
                }
              }
            }
          });
        }
      }

      if (requests.length > 0) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests }
        });
        console.log(`[GoogleSheets] Sheet baru dibuat: ${requests.map(r => r.addSheet?.properties?.title).join(', ')}`);
      }

      // 3. Ensure headers exist on each sheet
      for (const required of REQUIRED_SHEETS) {
        const headerCheck = await this.sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${required.title}!A1:Z1`
        });

        const rowValues = headerCheck.data.values;
        if (!rowValues || rowValues.length === 0 || rowValues[0].length === 0) {
          // Write headers
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${required.title}!A1:${this.columnToLetter(required.headers.length)}1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [required.headers]
            }
          });
          console.log(`[GoogleSheets] Header ditambahkan ke sheet: ${required.title}`);
        }
      }

      this.isInitialized = true;
      this.authError = null;
    } catch (err: any) {
      this.authError = `Gagal memeriksa/menginisialisasi Google Spreadsheet: ${err.message || String(err)}`;
      throw err;
    }
  }

  // Helper converting 1-based column index to letter (1 -> A, 2 -> B, etc.)
  private columnToLetter(column: number): string {
    let temp: number;
    let letter = '';
    while (column > 0) {
      temp = (column - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      column = (column - temp - 1) / 26;
    }
    return letter;
  }

  // Upsert a record into sheet based on ID column (Column A)
  public async upsertRow(sheetTitle: string, id: string, rowValues: any[]): Promise<void> {
    if (!this.sheets) {
      throw new Error(this.authError || 'Google Sheets API belum diinisialisasi.');
    }

    // Read column A to find matching ID
    const colARes = await this.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetTitle}!A:A`
    });

    const colA = colARes.data.values || [];
    let matchedRowIndex = -1; // 1-based row index

    for (let i = 1; i < colA.length; i++) {
      if (colA[i][0] && String(colA[i][0]).trim().toLowerCase() === String(id).trim().toLowerCase()) {
        matchedRowIndex = i + 1;
        break;
      }
    }

    const endColLetter = this.columnToLetter(rowValues.length);

    if (matchedRowIndex > 0) {
      // Update existing row
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetTitle}!A${matchedRowIndex}:${endColLetter}${matchedRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowValues]
        }
      });
      console.log(`[GoogleSheets] Baris diperbarui di ${sheetTitle} row ${matchedRowIndex} (ID: ${id})`);
    } else {
      // Append new row
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetTitle}!A:${endColLetter}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues]
        }
      });
      console.log(`[GoogleSheets] Baris baru ditambahkan di ${sheetTitle} (ID: ${id})`);
    }
  }

  // Append a log or print entry
  public async appendRow(sheetTitle: string, rowValues: any[]): Promise<void> {
    if (!this.sheets) {
      throw new Error(this.authError || 'Google Sheets API belum diinisialisasi.');
    }

    const endColLetter = this.columnToLetter(rowValues.length);
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetTitle}!A:${endColLetter}`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues]
      }
    });
  }
}

export const googleSheetsClient = new GoogleSheetsClient();
