import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { Sliders, Save, Upload, CheckCircle2, Store, MapPin, Phone, Image as ImageIcon, RotateCcw, Link as LinkIcon, ExternalLink, AlertTriangle, Trash2, Eye, Globe, Sparkles } from 'lucide-react';
import { YaxiyaLogo } from '../utils/logo';
import { updateFavicon, DEFAULT_FAVICON_URL } from '../utils/faviconHelper';

interface StoreSettingsViewProps {
  onSettingsSaved: () => void;
}

export const StoreSettingsView: React.FC<StoreSettingsViewProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'YAXIYA JEWELRY',
    phone: '0812-8889-9928',
    address: 'Pusat Grosir Perhiasan Titanium & Lapis Emas 18K',
    city: 'Jakarta Barat, DKI Jakarta',
    logo_mode: 'official',
    custom_logo_url: '',
    show_logo_on_print: true
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setSettings(d.data);
          const activeLogo = (d.data.logo_mode === 'custom' || d.data.custom_logo_url) && d.data.custom_logo_url
            ? d.data.custom_logo_url
            : undefined;
          updateFavicon(activeLogo);
        }
      })
      .catch(err => console.error('Error fetching settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageLoadError(false);
      setSettings(prev => ({
        ...prev,
        logo_mode: 'custom',
        custom_logo_url: base64
      }));
      // Instantly update browser favicon in real-time
      updateFavicon(base64);
      window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: base64 } }));
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (val: string) => {
    setImageLoadError(false);
    let cleanUrl = val.trim();
    // Auto convert Google Drive share links to direct raw image thumbnail
    const gDriveMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (gDriveMatch && cleanUrl.includes('drive.google.com')) {
      cleanUrl = `https://drive.google.com/thumbnail?id=${gDriveMatch[1]}&sz=w1000`;
    }

    setSettings(prev => ({
      ...prev,
      logo_mode: 'custom',
      custom_logo_url: cleanUrl,
      show_logo_on_print: true
    }));

    // Instantly update browser favicon in real-time
    updateFavicon(cleanUrl);
    window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: cleanUrl } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Pengaturan toko & logo label berhasil disimpan dan langsung diterapkan ke seluruh label alamat.');
        
        // Sync favicon with saved settings
        const activeLogo = settings.logo_mode === 'custom' && settings.custom_logo_url
          ? settings.custom_logo_url
          : undefined;
        updateFavicon(activeLogo);
        window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: activeLogo } }));

        onSettingsSaved();
      } else {
        alert(data.error || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        Memuat pengaturan toko dan label...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display">
          Pengaturan Toko & Label Cetak
        </h1>
        <p className="text-xs text-slate-500">
          Atur logo toko (bisa via link URL atau upload file), identitas pengirim default, dan alamat asal yang tercetak pada label thermal 100×150 mm & HVS A4
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* LOGO SETTINGS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Logo Label Pengiriman
              </h2>
            </div>
            <span className="text-[11px] text-pink-700 font-semibold bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
              Tampil di Thermal & A4
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Pilih jenis logo yang ingin ditampilkan di bagian header pengirim label alamat. Anda dapat menggunakan <strong>Link URL Gambar Online</strong> atau mengunggah gambar logo toko Anda.
          </p>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Option 1: Custom Logo (Link URL / Upload) */}
            <div
              onClick={() => setSettings(prev => ({ ...prev, logo_mode: 'custom' }))}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.logo_mode === 'custom'
                  ? 'border-pink-500 bg-pink-50/60 ring-2 ring-pink-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-pink-600" />
                    Logo Kustom (Link URL)
                  </span>
                  <input
                    type="radio"
                    name="logo_mode"
                    checked={settings.logo_mode === 'custom'}
                    onChange={() => {
                      setSettings(prev => ({ ...prev, logo_mode: 'custom' }));
                      const activeLogo = settings.custom_logo_url || DEFAULT_FAVICON_URL;
                      updateFavicon(activeLogo);
                      window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: activeLogo } }));
                    }}
                    className="text-pink-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pakai link URL gambar logo toko Anda atau upload file dari perangkat.
                </p>
              </div>

              <div className="mt-3 p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center min-h-[44px]">
                {settings.custom_logo_url && !imageLoadError ? (
                  <img
                    src={settings.custom_logo_url}
                    alt="Logo Kustom"
                    className="max-h-8 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] font-mono text-slate-400">Link URL / Gambar</span>
                )}
              </div>
            </div>

            {/* Option 2: Official Logo */}
            <div
              onClick={() => {
                setSettings(prev => ({ ...prev, logo_mode: 'official' }));
                updateFavicon(DEFAULT_FAVICON_URL);
                window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: DEFAULT_FAVICON_URL } }));
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.logo_mode === 'official'
                  ? 'border-pink-500 bg-pink-50/60 ring-2 ring-pink-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Logo Resmi Yaxiya</span>
                  <input
                    type="radio"
                    name="logo_mode"
                    checked={settings.logo_mode === 'official'}
                    onChange={() => {
                      setSettings(prev => ({ ...prev, logo_mode: 'official' }));
                      updateFavicon(DEFAULT_FAVICON_URL);
                      window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: DEFAULT_FAVICON_URL } }));
                    }}
                    className="text-pink-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Logo vektor mahkota & permata resmi Yaxiya Jewelry.
                </p>
              </div>
              <div className="mt-3 p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center min-h-[44px]">
                <YaxiyaLogo size="sm" />
              </div>
            </div>

            {/* Option 3: None / Text Only */}
            <div
              onClick={() => {
                setSettings(prev => ({ ...prev, logo_mode: 'none' }));
                updateFavicon(DEFAULT_FAVICON_URL);
                window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: DEFAULT_FAVICON_URL } }));
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.logo_mode === 'none'
                  ? 'border-pink-500 bg-pink-50/60 ring-2 ring-pink-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Tanpa Logo (Hanya Teks)</span>
                  <input
                    type="radio"
                    name="logo_mode"
                    checked={settings.logo_mode === 'none'}
                    onChange={() => {
                      setSettings(prev => ({ ...prev, logo_mode: 'none' }));
                      updateFavicon(DEFAULT_FAVICON_URL);
                      window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: DEFAULT_FAVICON_URL } }));
                    }}
                    className="text-pink-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hanya menampilkan teks nama toko pengirim tanpa gambar logo.
                </p>
              </div>
              <div className="mt-3 p-2 bg-white rounded-lg border border-slate-200 text-center font-bold text-xs font-mono text-slate-700 min-h-[44px] flex items-center justify-center">
                {settings.store_name}
              </div>
            </div>
          </div>

          {/* CUSTOM LOGO CONFIGURATION BOX (Link URL & File Upload) */}
          {settings.logo_mode === 'custom' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-pink-200/80 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <LinkIcon className="w-3.5 h-3.5 text-pink-600" />
                  Link URL Logo Gambar Online:
                </label>
                <span className="text-[10px] text-slate-500">
                  Dukung link gambar publik (PNG, JPG, SVG, WebP)
                </span>
              </div>

              {/* URL Input & Actions */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={settings.custom_logo_url.startsWith('data:') ? '' : settings.custom_logo_url}
                    onChange={e => handleUrlChange(e.target.value)}
                    placeholder="Contoh: https://i.imgur.com/logo-toko.png atau link CDN gambar Anda"
                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none"
                  />
                  {settings.custom_logo_url && !settings.custom_logo_url.startsWith('data:') && (
                    <button
                      type="button"
                      onClick={() => handleUrlChange('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Hapus URL"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {settings.custom_logo_url && settings.custom_logo_url.startsWith('http') && (
                  <a
                    href={settings.custom_logo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shrink-0"
                    title="Buka Link di Tab Baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Tes Link</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2.5 rounded-xl bg-pink-100/70 hover:bg-pink-100 text-pink-800 border border-pink-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-pink-700" />
                  <span>Upload File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              {/* Preview Box & Validation */}
              {settings.custom_logo_url && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                      <img
                        src={settings.custom_logo_url}
                        alt="Pratinjau Logo"
                        className="max-h-full max-w-full object-contain"
                        onError={() => setImageLoadError(true)}
                        onLoad={() => setImageLoadError(false)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {imageLoadError ? 'Gagal Memuat Gambar' : 'Logo Berhasil Dimuat'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {settings.custom_logo_url.startsWith('data:') ? 'File Terunggah' : 'Link URL Aktif'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-md font-mono">
                        {settings.custom_logo_url.startsWith('data:') ? '[Data Gambar Lokal Base64]' : settings.custom_logo_url}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSettings(prev => ({ ...prev, custom_logo_url: '', logo_mode: 'official' }));
                      setImageLoadError(false);
                      updateFavicon(DEFAULT_FAVICON_URL);
                      window.dispatchEvent(new CustomEvent('favicon-updated', { detail: { custom_logo_url: DEFAULT_FAVICON_URL } }));
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 self-end md:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Logo Ini</span>
                  </button>
                </div>
              )}

              {imageLoadError && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Perhatian:</strong> Link gambar tidak dapat dimuat atau diblokir oleh CORS/kebijakan akses. Pastikan link langsung menuju file gambar publik (akhiran .png, .jpg, dll) atau gunakan tombol <strong>"Upload File"</strong> untuk mengunggah langsung.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LIVE BROWSER TAB FAVICON SYNC CARD */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-pink-50/80 via-white to-pink-50/40 border border-pink-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Favicon Tab Browser (Otomatis Sinkron)</span>
                    <Sparkles className="w-3.5 h-3.5 text-pink-600 animate-pulse" />
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Favicon tab browser website otomatis menyesuaikan dengan logo label toko ini setiap kali diubah.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Real-Time Synced
              </span>
            </div>

            {/* Browser Tab Simulation Preview */}
            <div className="bg-slate-200/80 p-2.5 rounded-lg border border-slate-300/80 flex items-center gap-3">
              <div className="bg-white px-3 py-1.5 rounded-t-lg border-t-2 border-pink-600 shadow-xs flex items-center gap-2 max-w-sm">
                <div className="w-4 h-4 rounded bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100">
                  <img
                    src={
                      (settings.logo_mode === 'custom' || settings.custom_logo_url) && settings.custom_logo_url && !imageLoadError
                        ? settings.custom_logo_url
                        : DEFAULT_FAVICON_URL
                    }
                    alt="Favicon"
                    className="w-3.5 h-3.5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_FAVICON_URL;
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-800 truncate">
                  {settings.store_name || 'Yaxiya Jewelry'} — Shipping Address Manager
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                ← Tampilan favicon pada tab browser Anda saat ini
              </span>
            </div>
          </div>

          {/* SIMULATION PREVIEW: Real Header Label for both Thermal & A4 */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-pink-600" />
                Simulasi Tampilan Logo di Label Alamat (Thermal 100×150 mm & HVS A4):
              </span>
              <span className="text-[11px] text-pink-700 font-semibold bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                Pratinjau Otomatis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Thermal Label Header */}
              <div className="p-3 bg-white rounded-xl border-2 border-black shadow-xs">
                <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase font-mono">
                  1. Format Roll Thermal 100 × 150 mm:
                </div>
                <div className="flex items-center gap-3 border-b-2 border-black pb-2.5">
                  {settings.show_logo_on_print && settings.logo_mode !== 'none' ? (
                    <div className="shrink-0 flex items-center justify-center">
                      {(settings.logo_mode === 'custom' || settings.custom_logo_url) && settings.custom_logo_url ? (
                        <img
                          src={settings.custom_logo_url}
                          alt="Logo Toko"
                          className="max-h-11 max-w-[80px] object-contain block"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : settings.logo_mode === 'official' ? (
                        <YaxiyaLogo variant="monochrome" size="sm" />
                      ) : (
                        <div className="w-9 h-9 border-2 border-black font-black text-xs flex items-center justify-center">
                          YX
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[8.5px] font-extrabold uppercase text-slate-500 tracking-wider">
                      PENGIRIM:
                    </div>
                    <div className="font-black text-xs text-black uppercase truncate">
                      {settings.store_name}
                    </div>
                    <div className="font-mono font-bold text-[11px] text-black">
                      {settings.phone}
                    </div>
                    <div className="text-[9.5px] text-slate-600 line-clamp-1">
                      {settings.address}, {settings.city}
                    </div>
                  </div>
                </div>
              </div>

              {/* HVS A4 Label Header */}
              <div className="p-3 bg-white rounded-xl border-2 border-dashed border-black shadow-xs">
                <div className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase font-mono">
                  2. Format Kertas HVS A4 (1/3 Halaman):
                </div>
                <div className="flex items-center gap-2.5 border-b border-black pb-2">
                  {settings.show_logo_on_print && settings.logo_mode !== 'none' ? (
                    <div className="shrink-0 flex items-center justify-center">
                      {(settings.logo_mode === 'custom' || settings.custom_logo_url) && settings.custom_logo_url ? (
                        <img
                          src={settings.custom_logo_url}
                          alt="Logo Toko"
                          className="max-h-8 max-w-[65px] object-contain block"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="font-black text-[9px] border border-black px-1.5 py-0.5">
                          YX
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[8px] font-extrabold uppercase text-slate-500">
                      PENGIRIM:
                    </div>
                    <div className="font-black text-[11px] text-black uppercase truncate">
                      {settings.store_name} <span className="font-mono font-normal text-[10px]">({settings.phone})</span>
                    </div>
                    <div className="text-[9px] text-slate-500 line-clamp-1">
                      {settings.city}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={settings.show_logo_on_print}
              onChange={e => setSettings(prev => ({ ...prev, show_logo_on_print: e.target.checked }))}
              className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-slate-300"
            />
            <span>Tampilkan Logo pada Label Cetak Alamat (Thermal 100×150 mm & HVS A4)</span>
          </label>
        </div>

        {/* DEFAULT SENDER DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Store className="w-4 h-4 text-pink-700" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Identitas Pengirim Default (Toko Yaxiya)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Nama Toko Pengirim *
              </label>
              <input
                type="text"
                required
                value={settings.store_name}
                onChange={e => setSettings(prev => ({ ...prev, store_name: e.target.value }))}
                placeholder="Contoh: YAXIYA JEWELRY"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-pink-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Nomor Telepon Pengirim *
              </label>
              <input
                type="tel"
                required
                value={settings.phone}
                onChange={e => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Contoh: 0812-8889-9928"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-pink-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Alamat Lengkap Asal Pengirim *
            </label>
            <input
              type="text"
              required
              value={settings.address}
              onChange={e => setSettings(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Contoh: Pusat Grosir Perhiasan Titanium & Lapis Emas 18K"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-pink-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Kota / Provinsi Asal *
            </label>
            <input
              type="text"
              required
              value={settings.city}
              onChange={e => setSettings(prev => ({ ...prev, city: e.target.value }))}
              placeholder="Contoh: Jakarta Barat, DKI Jakarta"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-pink-500 outline-none"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-md shadow-pink-600/20 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Default'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
