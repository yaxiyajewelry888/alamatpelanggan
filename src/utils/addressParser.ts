/**
 * Smart Indonesian Address and Customer Data Parser
 * Capable of parsing:
 * 1. Labelled text (Nama: ..., No HP: ..., ID: ...)
 * 2. Tab-separated values (TSV) from Excel / Google Sheets copy-paste
 * 3. Comma-separated values (CSV)
 * 4. Freeform multi-line WhatsApp / chat messages
 */

export interface ParsedAddressEntry {
  customerId?: string;
  customerName?: string;
  recipientName?: string;
  phone?: string;
  fullAddress?: string;
  village?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  courier?: string;
  service?: string;
  notes?: string;
  groupName?: string;
  rawText?: string;
}

const COMMON_COURIERS = [
  'J&T REG', 'J&T CARGO', 'J&T', 'JNE REG', 'JNE YES', 'JNE OKE', 'JNE JTR', 'JNE',
  'SICEPAT REG', 'SICEPAT GOKIL', 'SICEPAT', 'TIKI REG', 'TIKI ONS', 'TIKI',
  'POS REGULER', 'POS KILAT', 'POS INDONESIA', 'POS', 'ANTERAJA', 'WAHANA',
  'NINJA XPRESS', 'NINJA', 'ID EXPRESS', 'LION PARCEL', 'INDAH CARGO', 'DAKOTA CARGO',
  'LARIS CARGO', 'TAKANA', 'TRASINDO', 'CMC', 'LANCAR CARGO', 'BARAKA', 'SENTRAL CARGO'
];

const KNOWN_PROVINCES = [
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Banten', 'Bali', 'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau',
  'Kepulauan Riau', 'Jambi', 'Sumatera Selatan', 'Kepulauan Bangka Belitung',
  'Bengkulu', 'Lampung', 'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan',
  'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara', 'Gorontalo',
  'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Maluku', 'Maluku Utara',
  'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya'
];

export function parseSingleAddressText(rawText: string): ParsedAddressEntry {
  if (!rawText || !rawText.trim()) return {};

  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return {};

  // Check if it's a single tab-separated line (e.g. 1 row copied from Sheets)
  if (lines.length === 1 && lines[0].includes('\t')) {
    const multi = parseTabularText(rawText);
    return multi.length > 0 ? multi[0] : {};
  }

  const result: ParsedAddressEntry = {
    rawText: rawText.trim()
  };

  const remainingLines: string[] = [];

  // 1. Process line by line looking for labeled keys
  for (const line of lines) {
    const lower = line.toLowerCase();

    // Check ID Pelanggan
    const idMatch = line.match(/^(?:id\s*pelanggan|id\s*cust(?:omer)?|cust(?:omer)?\s*id|id|kode\s*pelanggan)\s*[:=\-]\s*(.+)$/i);
    if (idMatch) {
      result.customerId = idMatch[1].trim().toUpperCase();
      continue;
    }

    // Check Nama Pelanggan / Penerima
    const nameMatch = line.match(/^(?:nama\s*penerima|penerima|nama\s*pelanggan|nama|name|kepada|att(?:n)?)\s*[:=\-]\s*(.+)$/i);
    if (nameMatch) {
      const val = nameMatch[1].trim();
      if (!result.recipientName) result.recipientName = val;
      if (!result.customerName) result.customerName = val;
      continue;
    }

    // Check Telepon / HP
    const phoneMatch = line.match(/^(?:no\.?\s*(?:hp|telp|telepon|wa|whatsapp)|hp|telp|telepon|wa|phone)\s*[:=\-]\s*(.+)$/i);
    if (phoneMatch) {
      result.phone = cleanPhoneNumber(phoneMatch[1]);
      continue;
    }

    // Check Alamat
    const addrMatch = line.match(/^(?:alamat\s*lengkap|alamat\s*pengiriman|alamat|address)\s*[:=\-]\s*(.+)$/i);
    if (addrMatch) {
      result.fullAddress = addrMatch[1].trim();
      continue;
    }

    // Check Kelurahan / Desa
    const kelMatch = line.match(/^(?:kelurahan|desa|kel|ds)\s*[:=\-]\s*(.+)$/i);
    if (kelMatch) {
      result.village = kelMatch[1].trim();
      continue;
    }

    // Check Kecamatan
    const kecMatch = line.match(/^(?:kecamatan|kec)\s*[:=\-]\s*(.+)$/i);
    if (kecMatch) {
      result.district = kecMatch[1].trim();
      continue;
    }

    // Check Kota / Kabupaten
    const cityMatch = line.match(/^(?:kota\s*\/kabupaten|kabupaten|kota|kab|city)\s*[:=\-]\s*(.+)$/i);
    if (cityMatch) {
      result.city = cityMatch[1].trim();
      continue;
    }

    // Check Provinsi
    const provMatch = line.match(/^(?:provinsi|prov|province)\s*[:=\-]\s*(.+)$/i);
    if (provMatch) {
      result.province = provMatch[1].trim();
      continue;
    }

    // Check Kode Pos
    const posMatch = line.match(/^(?:kode\s*pos|kodepos|pos|zip|postal(?:\s*code)?)\s*[:=\-]\s*(\d{5})$/i);
    if (posMatch) {
      result.postalCode = posMatch[1].trim();
      continue;
    }

    // Check Ekspedisi / Kurir
    const courierMatch = line.match(/^(?:ekspedisi|kurir|jasa\s*kirim|pengiriman|shipping|courier)\s*[:=\-]\s*(.+)$/i);
    if (courierMatch) {
      result.courier = courierMatch[1].trim().toUpperCase();
      continue;
    }

    // Check Catatan
    const notesMatch = line.match(/^(?:catatan|keterangan|notes?|pesan)\s*[:=\-]\s*(.+)$/i);
    if (notesMatch) {
      result.notes = notesMatch[1].trim();
      continue;
    }

    // Check Grup
    const groupMatch = line.match(/^(?:grup\s*alamat|grup|group)\s*[:=\-]\s*(.+)$/i);
    if (groupMatch) {
      result.groupName = groupMatch[1].trim().toUpperCase();
      continue;
    }

    remainingLines.push(line);
  }

  // 2. Unlabeled / Freeform heuristic parsing on remaining lines
  for (let i = 0; i < remainingLines.length; i++) {
    const line = remainingLines[i];

    // Check if line looks like an ID code (e.g. PL6749, OL210, YX-00129, PL-1234, etc.)
    if (!result.customerId) {
      const standaloneIdMatch = line.match(/^(?:PL|OL|YX|CUST)[\-_]?[0-9A-Z]{2,8}$/i);
      if (standaloneIdMatch) {
        result.customerId = standaloneIdMatch[0].toUpperCase();
        continue;
      }
    }

    // Check for phone number inside line
    if (!result.phone) {
      const phoneRegex = /(?:\+62|62|08)[0-9\-\s]{8,15}/;
      const pMatch = line.match(phoneRegex);
      if (pMatch) {
        result.phone = cleanPhoneNumber(pMatch[0]);
        // If line is basically just the phone number, continue
        if (cleanPhoneNumber(line) === result.phone) {
          continue;
        }
      }
    }

    // Check for postal code
    if (!result.postalCode) {
      const zipMatch = line.match(/\b([1-9][0-9]{4})\b/);
      if (zipMatch) {
        result.postalCode = zipMatch[1];
      }
    }

    // Check for courier keyword in line
    if (!result.courier) {
      for (const c of COMMON_COURIERS) {
        if (new RegExp(`\\b${c}\\b`, 'i').test(line)) {
          result.courier = c;
          break;
        }
      }
    }

    // Check for province name in line
    if (!result.province) {
      for (const prov of KNOWN_PROVINCES) {
        if (line.toLowerCase().includes(prov.toLowerCase())) {
          result.province = prov;
          break;
        }
      }
    }
  }

  // 3. Name & Address deduction if not yet assigned
  const candidateTextLines = remainingLines.filter(line => {
    // skip line if it was strictly an ID
    if (result.customerId && line.toUpperCase() === result.customerId) return false;
    // skip line if it was strictly a phone number
    if (result.phone && cleanPhoneNumber(line) === result.phone) return false;
    // skip line if it's strictly a courier name
    if (result.courier && line.toUpperCase() === result.courier) return false;
    return true;
  });

  if (!result.recipientName && candidateTextLines.length > 0) {
    // First candidate line usually is the name
    result.recipientName = candidateTextLines[0];
    if (!result.customerName) result.customerName = candidateTextLines[0];
    candidateTextLines.shift();
  }

  if (!result.fullAddress && candidateTextLines.length > 0) {
    result.fullAddress = candidateTextLines.join(', ');
  }

  // Extract Kelurahan, Kecamatan, Kota, Provinsi from fullAddress if present
  if (result.fullAddress) {
    const fa = result.fullAddress;

    if (!result.village) {
      const kel = fa.match(/(?:kelurahan|kel\.?|desa|ds\.?)\s+([A-Za-z0-9\s]+?)(?:,|\bkec|\bkab|\bkota|\bprov|$)/i);
      if (kel && kel[1]) result.village = kel[1].trim();
    }

    if (!result.district) {
      const kec = fa.match(/(?:kecamatan|kec\.?)\s+([A-Za-z0-9\s]+?)(?:,|\bkel|\bkab|\bkota|\bprov|$)/i);
      if (kec && kec[1]) result.district = kec[1].trim();
    }

    if (!result.city) {
      const kota = fa.match(/(?:kota|kabupaten|kab\.?)\s+([A-Za-z0-9\s]+?)(?:,|\bkec|\bkel|\bprov|$)/i);
      if (kota && kota[1]) {
        result.city = kota[1].trim();
      }
    }

    if (!result.province) {
      for (const prov of KNOWN_PROVINCES) {
        if (fa.toLowerCase().includes(prov.toLowerCase())) {
          result.province = prov;
          break;
        }
      }
    }
  }

  // Set default group (empty by default if not provided)
  if (!result.groupName) {
    result.groupName = '';
  }

  // Set default courier
  if (!result.courier) {
    result.courier = 'JNE';
  }

  return result;
}

/**
 * Parses tab-separated (TSV) or comma-separated (CSV) rows from spreadsheet copy-paste
 */
export function parseTabularText(text: string): ParsedAddressEntry[] {
  if (!text || !text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Determine delimiter: tab (\t) preferred, then comma or semicolon
  const firstLine = lines[0];
  let delimiter = '\t';
  if (!firstLine.includes('\t')) {
    if (firstLine.includes(';') && (firstLine.match(/;/g) || []).length >= 2) {
      delimiter = ';';
    } else if (firstLine.includes(',') && (firstLine.match(/,/g) || []).length >= 2) {
      delimiter = ',';
    } else {
      // Not a table, fallback to single address parser
      return [parseSingleAddressText(text)];
    }
  }

  // Split lines into cells
  const matrix = lines.map(line => line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, '')));

  // Check if first row is a header
  const headerCandidates = matrix[0].map(h => h.toLowerCase());
  const isHeaderRow = headerCandidates.some(h => 
    h.includes('id') || h.includes('nama') || h.includes('alamat') || h.includes('telp') || h.includes('phone') || h.includes('penerima')
  );

  let headerMap: Record<string, number> = {};
  let dataRows = matrix;

  if (isHeaderRow) {
    headerCandidates.forEach((h, idx) => {
      if (h.includes('id') && (h.includes('pelanggan') || h.includes('cust') || h === 'id')) headerMap.customerId = idx;
      else if (h.includes('nama') && (h.includes('penerima') || h === 'penerima')) headerMap.recipientName = idx;
      else if (h.includes('nama') && (h.includes('pelanggan') || h === 'nama')) headerMap.customerName = idx;
      else if (h.includes('telp') || h.includes('phone') || h.includes('hp') || h.includes('wa')) headerMap.phone = idx;
      else if (h.includes('alamat') && !h.includes('grup') && !h.includes('label')) headerMap.fullAddress = idx;
      else if (h.includes('label')) headerMap.label = idx;
      else if (h.includes('grup') || h.includes('group')) headerMap.groupName = idx;
      else if (h.includes('kelurahan') || h.includes('desa')) headerMap.village = idx;
      else if (h.includes('kecamatan')) headerMap.district = idx;
      else if (h.includes('kota') || h.includes('kabupaten')) headerMap.city = idx;
      else if (h.includes('provinsi')) headerMap.province = idx;
      else if (h.includes('pos')) headerMap.postalCode = idx;
      else if (h.includes('kurir') || h.includes('ekspedisi') || h.includes('kirim')) headerMap.courier = idx;
      else if (h.includes('catatan') || h.includes('notes')) headerMap.notes = idx;
    });
    dataRows = matrix.slice(1);
  }

  const results: ParsedAddressEntry[] = [];

  for (const row of dataRows) {
    if (row.length === 0 || row.every(c => !c)) continue;

    if (isHeaderRow && Object.keys(headerMap).length > 0) {
      const entry: ParsedAddressEntry = {
        customerId: headerMap.customerId !== undefined ? row[headerMap.customerId]?.toUpperCase() : undefined,
        customerName: headerMap.customerName !== undefined ? row[headerMap.customerName] : undefined,
        recipientName: headerMap.recipientName !== undefined ? row[headerMap.recipientName] : undefined,
        phone: headerMap.phone !== undefined ? cleanPhoneNumber(row[headerMap.phone]) : undefined,
        fullAddress: headerMap.fullAddress !== undefined ? row[headerMap.fullAddress] : undefined,
        village: headerMap.village !== undefined ? row[headerMap.village] : undefined,
        district: headerMap.district !== undefined ? row[headerMap.district] : undefined,
        city: headerMap.city !== undefined ? row[headerMap.city] : undefined,
        province: headerMap.province !== undefined ? row[headerMap.province] : undefined,
        postalCode: headerMap.postalCode !== undefined ? row[headerMap.postalCode] : undefined,
        courier: headerMap.courier !== undefined ? row[headerMap.courier] : undefined,
        notes: headerMap.notes !== undefined ? row[headerMap.notes] : undefined,
        groupName: headerMap.groupName !== undefined ? (row[headerMap.groupName] || '').trim() : ''
      };

      if (!entry.recipientName && entry.customerName) entry.recipientName = entry.customerName;
      if (!entry.customerName && entry.recipientName) entry.customerName = entry.recipientName;
      if (entry.recipientName || entry.fullAddress || entry.customerId) {
        results.push(entry);
      }
    } else {
      // Positional heuristic for unlabeled rows:
      // Typically: [ID Pelanggan, Nama, No HP, Alamat, Kota, Provinsi, Kurir]
      // Or: [Nama, No HP, Alamat, ...]
      let custId: string | undefined;
      let name: string | undefined;
      let phone: string | undefined;
      let addr: string | undefined;
      let city: string | undefined;
      let prov: string | undefined;
      let courier: string | undefined;

      const firstCell = row[0] || '';
      const isFirstCellId = /^(?:PL|OL|YX|CUST)[\-_]?[0-9A-Z]{2,8}$/i.test(firstCell) || (firstCell.length <= 10 && /\d/.test(firstCell) && !firstCell.startsWith('08'));

      let offset = 0;
      if (isFirstCellId) {
        custId = firstCell.toUpperCase();
        offset = 1;
      }

      name = row[offset] || '';
      phone = cleanPhoneNumber(row[offset + 1] || '');
      addr = row[offset + 2] || '';
      city = row[offset + 3] || '';
      prov = row[offset + 4] || '';
      courier = row[offset + 5] || 'JNE';

      // Look for phone in any cell if not matched
      if (!phone) {
        for (let c = offset; c < row.length; c++) {
          if (row[c] && /(?:\+62|62|08)[0-9]{7,13}/.test(row[c])) {
            phone = cleanPhoneNumber(row[c]);
            break;
          }
        }
      }

      results.push({
        customerId: custId,
        customerName: name,
        recipientName: name,
        phone,
        fullAddress: addr,
        city,
        province: prov,
        courier,
        groupName: ''
      });
    }
  }

  return results;
}

function cleanPhoneNumber(str: string): string {
  if (!str) return '';
  let cleaned = str.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}
