import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { Sliders, Save, Upload, CheckCircle2, Store, MapPin, Phone, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { YaxiyaLogo } from '../utils/logo';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setSettings(d.data);
        }
      })
      .catch(err => console.error('Error fetching settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSettings(prev => ({
        ...prev,
        logo_mode: 'custom',
        custom_logo_url: base64
      }));
    };
    reader.readAsDataURL(file);
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
        setSuccessMessage('Pengaturan toko & logo label berhasil disimpan dan akan tampil di semua label cetak.');
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
          Atur identitas pengirim default, logo, alamat asal toko yang tercetak pada label thermal 100×150 mm dan HVS A4
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* LOGO SETTINGS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ImageIcon className="w-4 h-4 text-pink-700" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Logo Label Pengiriman
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Option 1: Official Logo */}
            <div
              onClick={() => setSettings(prev => ({ ...prev, logo_mode: 'official' }))}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.logo_mode === 'official'
                  ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Logo Resmi Yaxiya</span>
                  <input
                    type="radio"
                    name="logo_mode"
                    checked={settings.logo_mode === 'official'}
                    onChange={() => setSettings(prev => ({ ...prev, logo_mode: 'official' }))}
                    className="text-pink-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Logo vektor resmi Yaxiya Jewelry dengan simbol mahkota & permata fuchsia.
                </p>
              </div>
              <div className="mt-3 p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                <YaxiyaLogo size="sm" />
              </div>
            </div>

            {/* Option 2: Custom Logo Upload */}
            <div
              onClick={() => {
                setSettings(prev => ({ ...prev, logo_mode: 'custom' }));
                if (!settings.custom_logo_url && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.logo_mode === 'custom'
                  ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Upload Logo Kustom</span>
                  <input
                    type="radio"
                    name="logo_mode"
                    checked={settings.logo_mode === 'custom'}
                    onChange={() => setSettings(prev => ({ ...prev, logo_mode: 'custom' }))}
                    className="text-pink-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Unggah gambar logo toko Anda (PNG, JPG, SVG).
                </p>
              </div>
              
              <div className="mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {settings.custom_logo_url ? (
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center gap-2">
                    <img
                      src={settings.custom_logo_url}
                      alt="Custom Logo"
                      className="max-h-8 max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-[10px] text-pink-700 underline font-semibold ml-2"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-2 bg-white rounded-lg border border-dashed border-slate-300 text-xs text-slate-600 font-semibold flex items-center justify-center gap-1.5 hover:border-pink-400"
                  >
                    <Upload className="w-3.5 h-3.5 text-pink-600" />
                    <span>Pilih Gambar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Option 3: None / Text Only */}
            <div
              onClick={() => setSettings(prev => ({ ...prev, logo_mode: 'none' }))}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                settings.logo_mode === 'none'
                  ? 'border-pink-500 bg-pink-50/50 ring-2 ring-pink-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Tanpa Logo (Hanya Teks)</span>
                  <input
                    type="radio"
                    name="logo_mode"
                    checked={settings.logo_mode === 'none'}
                    onChange={() => setSettings(prev => ({ ...prev, logo_mode: 'none' }))}
                    className="text-pink-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hanya menampilkan teks nama toko tanpa gambar lambang.
                </p>
              </div>
              <div className="mt-3 p-2 bg-white rounded-lg border border-slate-200 text-center font-bold text-xs font-mono text-slate-700">
                {settings.store_name}
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
            <span>Tampilkan Logo pada Label Cetak</span>
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
