export const INDONESIA_PROVINCES = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Kepulauan Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Banten',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Gorontalo',
  'Sulawesi Tengah',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya'
];

export const COMMON_CITIES: Record<string, string[]> = {
  'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur', 'Jakarta Utara', 'Kepulauan Seribu'],
  'Jawa Barat': ['Kota Bandung', 'Kab. Bandung', 'Kab. Bandung Barat', 'Kota Bekasi', 'Kab. Bekasi', 'Kota Bogor', 'Kab. Bogor', 'Kota Depok', 'Kota Cimahi', 'Kota Cirebon', 'Kab. Cirebon', 'Kota Sukabumi', 'Kab. Sukabumi', 'Kota Tasikmalaya', 'Kab. Tasikmalaya', 'Kota Banjar', 'Kab. Garut', 'Kab. Cianjur', 'Kab. Kuningan', 'Kab. Majalengka', 'Kab. Sumedang', 'Kab. Indramayu', 'Kab. Subang', 'Kab. Purwakarta', 'Kab. Karawang', 'Kab. Pangandaran'],
  'Jawa Tengah': ['Kota Semarang', 'Kab. Semarang', 'Kota Surakarta (Solo)', 'Kota Salatiga', 'Kota Magelang', 'Kota Pekalongan', 'Kota Tegal', 'Kab. Banyumas (Purwokerto)', 'Kab. Cilacap', 'Kab. Brebes', 'Kab. Tegal', 'Kab. Pemalang', 'Kab. Pekalongan', 'Kab. Batang', 'Kab. Kendal', 'Kab. Demak', 'Kab. Kudus', 'Kab. Jepara', 'Kab. Pati', 'Kab. Rembang', 'Kab. Blora', 'Kab. Grobogan', 'Kab. Sragen', 'Kab. Karanganyar', 'Kab. Wonogiri', 'Kab. Sukoharjo', 'Kab. Klaten', 'Kab. Boyolali', 'Kab. Magelang', 'Kab. Purworejo', 'Kab. Kebumen', 'Kab. Wonosobo', 'Kab. Temanggung', 'Kab. Banjarnegara', 'Kab. Purbalingga'],
  'DI Yogyakarta': ['Kota Yogyakarta', 'Kab. Sleman', 'Kab. Bantul', 'Kab. Gunungkidul', 'Kab. Kulon Progo'],
  'Jawa Timur': ['Kota Surabaya', 'Kota Malang', 'Kab. Malang', 'Kota Batu', 'Kota Kediri', 'Kab. Kediri', 'Kota Blitar', 'Kab. Blitar', 'Kota Madiun', 'Kab. Madiun', 'Kota Mojokerto', 'Kab. Mojokerto', 'Kota Pasuruan', 'Kab. Pasuruan', 'Kota Probolinggo', 'Kab. Probolinggo', 'Kab. Sidoarjo', 'Kab. Gresik', 'Kab. Jombang', 'Kab. Bojonegoro', 'Kab. Lamongan', 'Kab. Tuban', 'Kab. Nganjuk', 'Kab. Tulungagung', 'Kab. Trenggalek', 'Kab. Ponorogo', 'Kab. Pacitan', 'Kab. Magetan', 'Kab. Ngawi', 'Kab. Bangkalan', 'Kab. Sampang', 'Kab. Pamekasan', 'Kab. Sumenep', 'Kab. Jember', 'Kab. Banyuwangi', 'Kab. Bondowoso', 'Kab. Situbondo', 'Kab. Lumajang'],
  'Banten': ['Kota Tangerang', 'Kota Tangerang Selatan', 'Kab. Tangerang', 'Kota Serang', 'Kab. Serang', 'Kota Cilegon', 'Kab. Lebak', 'Kab. Pandeglang'],
  'Bali': ['Kota Denpasar', 'Kab. Badung', 'Kab. Gianyar', 'Kab. Tabanan', 'Kab. Buleleng', 'Kab. Klungkung', 'Kab. Bangli', 'Kab. Karangasem', 'Kab. Jembrana'],
  'Sumatera Utara': ['Kota Medan', 'Kota Binjai', 'Kota Pematangsiantar', 'Kota Tebing Tinggi', 'Kota Tanjungbalai', 'Kab. Deli Serdang', 'Kab. Karo', 'Kab. Simalungun', 'Kab. Asahan'],
  'Sumatera Barat': ['Kota Padang', 'Kota Bukittinggi', 'Kota Payakumbuh', 'Kota Pariaman', 'Kota Solok'],
  'Sumatera Selatan': ['Kota Palembang', 'Kota Prabumulih', 'Kota Lubuklinggau', 'Kab. Ogan Ilir', 'Kab. Banyuasin']
};

export const ADDRESS_LABEL_SUGGESTIONS = [
  'Rumah',
  'Kantor',
  'Dropship 1',
  'Dropship 2',
  'Dropship VIP',
  'Toko Utama',
  'Cabang Toko',
  'Keluarga',
  'Gudang'
];

export const COURIER_CATEGORIES = [
  'Semua Kategori',
  'Reguler & Ekspres',
  'Instan & Same-day',
  'Kargo',
  'Internasional',
  'Kurir Toko Sendiri',
  'Lainnya'
];

export const SENDER_INFO = {
  storeName: 'YAXIYA JEWELRY',
  phone: '0812-8889-9928',
  address: 'Pusat Grosir Perhiasan Titanium & Lapis Emas 18K',
  city: 'Jakarta Barat, DKI Jakarta'
};
