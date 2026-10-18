export interface PrintOptions {
  addressIds: string[];
  format: 'thermal_100x150' | 'hvs_a4_3part';
  copies?: number;
  a4Mode?: 'single_per_sheet' | 'mixed_bulk';
  isDropship?: boolean;
  dropshipName?: string;
  dropshipPhone?: string;
  dropshipCity?: string;
  showId?: boolean;
  fontSize?: 'small' | 'standard' | 'large';
  onPrintRecorded?: () => void;
}

export function buildPrintUrl(options: PrintOptions): string {
  const params = new URLSearchParams({
    ids: options.addressIds.join(','),
    format: options.format,
    copies: String(options.copies || 1),
    a4_mode: options.a4Mode || 'single_per_sheet',
    is_dropship: options.isDropship ? 'true' : 'false',
    dropship_name: options.dropshipName || '',
    dropship_phone: options.dropshipPhone || '',
    dropship_city: options.dropshipCity || '',
    show_id: options.showId === false ? 'false' : 'true',
    font_size: options.fontSize || 'standard'
  });
  return `/api/print-page?${params.toString()}`;
}

/**
 * Opens the print preview and print dialog in a new browser window.
 * Ensures compatibility across browsers and handles popup blockers gracefully.
 */
export function openPrintWindow(options: PrintOptions): { success: boolean; url: string } {
  const url = buildPrintUrl(options);

  // Record print history in background
  if (options.addressIds.length > 0) {
    const payload = options.addressIds.map(id => ({
      address_id: id,
      label_format: options.format,
      copies: options.copies || 1
    }));
    fetch('/api/print-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(() => {
        if (options.onPrintRecorded) options.onPrintRecorded();
      })
      .catch(err => console.warn('Gagal mencatat riwayat cetak:', err));
  }

  // Open in new window/tab
  let win: Window | null = null;
  try {
    win = window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.warn('window.open blocked:', e);
  }

  // Fallback: If window.open was blocked or returned null, try simulated link click
  if (!win || win.closed || typeof win.closed === 'undefined') {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener,noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.warn('Anchor click fallback failed:', e);
    }
  }

  const success = Boolean(win && !win.closed && typeof win.closed !== 'undefined');
  return { success, url };
}
