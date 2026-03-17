import type { PanelModuleCode } from "@/lib/subscription/module-access";

export type PanelIconKey =
  | "dashboard"
  | "pos"
  | "product"
  | "warehouse"
  | "customer"
  | "supplier"
  | "invoice"
  | "cash"
  | "payment"
  | "einvoice"
  | "report"
  | "user"
  | "subscription"
  | "history"
  | "settings";

export type PanelFeature = {
  href: string;
  label: string;
  description: string;
  icon: PanelIconKey;
};

export type PanelNavSection = {
  id: string;
  label: string;
  href: string;
  icon: PanelIconKey;
  moduleCode: PanelModuleCode;
  children: PanelFeature[];
};

export const panelNavSections: PanelNavSection[] = [
  {
    id: "ana-ekran",
    label: "Ana Ekran",
    href: "/panel",
    icon: "dashboard",
    moduleCode: "dashboard",
    children: [
      {
        href: "/panel",
        label: "Genel Gösterge Paneli",
        description: "Canlı satış, kasa ve stok KPI özetleri.",
        icon: "dashboard",
      },
      {
        href: "/panel/raporlar/kpi-ozeti",
        label: "KPI Özeti",
        description: "Günlük, haftalık ve aylık performans görünümü.",
        icon: "report",
      },
    ],
  },
  {
    id: "hizli-satis",
    label: "Hızlı Satış",
    href: "/pos",
    icon: "pos",
    moduleCode: "pos",
    children: [
      {
        href: "/pos",
        label: "POS Satış Ekranı",
        description: "Kasiyer odaklı tam ekran hızlı satış akışı.",
        icon: "pos",
      },
      {
        href: "/panel/pos/askidaki-sepetler",
        label: "Askıdaki Sepetler",
        description: "Askıya alınan sepetlerin geri çağrılması.",
        icon: "pos",
      },
      {
        href: "/panel/pos/iade-islemleri",
        label: "İade İşlemleri",
        description: "Satış iadesi ve fiş bazlı iade akışı.",
        icon: "pos",
      },
      {
        href: "/panel/pos/oturum-ve-kasa",
        label: "Oturum ve Kasa",
        description: "Kasa açılış/kapanış ve vardiya yönetimi.",
        icon: "cash",
      },
      {
        href: "/panel/pos/odeme-akislari",
        label: "Ödeme Akışları",
        description: "Nakit, kart ve karma ödeme yönetimi.",
        icon: "payment",
      },
    ],
  },
  {
    id: "urunler",
    label: "Ürünler",
    href: "/panel/urunler/yeni-urun-karti",
    icon: "product",
    moduleCode: "product",
    children: [
      {
        href: "/panel/urunler/yeni-urun-karti",
        label: "Yeni Ürün Kartı",
        description: "Yeni ürün kartı açma ve fiyat/stok alanlarını tanımlama.",
        icon: "product",
      },
      {
        href: "/panel/urunler/urun-listesi",
        label: "Ürün Listesi",
        description: "Kayıtlı ürünleri listeleme ve filtreleme.",
        icon: "product",
      },
      {
        href: "/panel/urunler/mevcut-urun-karti",
        label: "Mevcut Ürün Kartı",
        description: "Var olan ürün kartını açma ve düzenleme.",
        icon: "product",
      },
      {
        href: "/panel/urunler/urun-karti-basliklari",
        label: "Ürün Kartı Başlıkları",
        description: "Ürün kartı başlık ve alan gruplarını yönetme.",
        icon: "product",
      },
      {
        href: "/panel/urunler/urun-gruplari",
        label: "Ürün Grupları",
        description: "Ürünleri grup ve alt gruplara ayırma.",
        icon: "product",
      },
      {
        href: "/panel/urunler/toplu-urun-duzenle",
        label: "Toplu Ürün Düzenle",
        description: "Seçili ürünlerde toplu alan güncelleme.",
        icon: "product",
      },
      {
        href: "/panel/urunler/excel-disari-aktar",
        label: "Excel Dışarı Aktar",
        description: "Ürün listesini Excel olarak dışa aktarma.",
        icon: "product",
      },
      {
        href: "/panel/urunler/excel-iceri-aktar",
        label: "Excel İçeri Aktar",
        description: "Excel dosyasından ürün içe aktarma.",
        icon: "product",
      },
      {
        href: "/panel/urunler/excel-aktarim-log",
        label: "Excel Aktarım Log",
        description: "Excel aktarım geçmişi ve hata kayıtları.",
        icon: "history",
      },
      {
        href: "/panel/urunler/yeni-etiket-dizayni",
        label: "Yeni Etiket Dizaynı",
        description: "Yeni etiket şablonu oluşturma ekranı.",
        icon: "product",
      },
      {
        href: "/panel/urunler/etiket-dizaynlari",
        label: "Etiket Dizaynları",
        description: "Kayıtlı etiket tasarımlarını yönetme.",
        icon: "product",
      },
      {
        href: "/panel/urunler/toplu-etiket-yazdir",
        label: "Toplu Etiket Yazdır",
        description: "Seçilen ürünler için etiket toplu yazdırma.",
        icon: "product",
      },
      {
        href: "/panel/urunler/toplu-zam-indirim",
        label: "Toplu Zam/İndirim",
        description: "Fiyatlara oran bazlı toplu zam/indirim uygulama.",
        icon: "product",
      },
      {
        href: "/panel/urunler/seri-sayim-modulu",
        label: "Seri Sayım Modülü",
        description: "Seri bazlı sayım ve kontrol işlemleri.",
        icon: "product",
      },
    ],
  },
  {
    id: "stok",
    label: "Stok",
    href: "/panel/stok",
    icon: "warehouse",
    moduleCode: "inventory",
    children: [
      {
        href: "/panel/stok",
        label: "Stok Hareketleri",
        description: "Giriş, çıkış, transfer ve sayım hareketleri.",
        icon: "warehouse",
      },
      {
        href: "/panel/stok/depo-bazli-bakiye",
        label: "Depo Bazlı Bakiye",
        description: "Depo kırılımında anlık stok bakiyesi.",
        icon: "warehouse",
      },
      {
        href: "/panel/stok/stok-sayim",
        label: "Stok Sayım",
        description: "Periyodik sayım ve düzeltme operasyonları.",
        icon: "warehouse",
      },
      {
        href: "/panel/stok/stok-transfer",
        label: "Stok Transfer",
        description: "Depolar arası transfer kayıtları.",
        icon: "warehouse",
      },
    ],
  },
  {
    id: "musteriler",
    label: "Müşteriler",
    href: "/panel/musteriler",
    icon: "customer",
    moduleCode: "customer",
    children: [
      {
        href: "/panel/musteriler/yeni-musteri-karti",
        label: "Yeni Müşteri Kartı",
        description: "Yeni cari müşteri kaydı açma ekranı.",
        icon: "customer",
      },
      {
        href: "/panel/musteriler",
        label: "Müşteri Kartları",
        description: "Müşteri cari kartı ve risk limiti yönetimi.",
        icon: "customer",
      },
      {
        href: "/panel/musteriler/cari-ekstre",
        label: "Cari Ekstre",
        description: "Borç/alacak ve hareket dökümü.",
        icon: "customer",
      },
      {
        href: "/panel/musteriler/tahsilat-gecmisi",
        label: "Tahsilat Geçmişi",
        description: "Müşteri tahsilat geçmişi ve ödeme performansı.",
        icon: "customer",
      },
      {
        href: "/panel/musteriler/risk-ve-vade",
        label: "Risk ve Vade",
        description: "Risk limiti ve vade kontrol ekranı.",
        icon: "customer",
      },
      {
        href: "/panel/musteriler/cagri-takip",
        label: "Çağrı Takip",
        description: "Arayan telefon numarasından müşteri kartını hızlı bulma.",
        icon: "customer",
      },
    ],
  },
  {
    id: "tedarikciler",
    label: "Tedarikçiler",
    href: "/panel/tedarikciler",
    icon: "supplier",
    moduleCode: "supplier",
    children: [
      {
        href: "/panel/tedarikciler",
        label: "Tedarikçi Kartları",
        description: "Tedarikçi ve cari borç kart yönetimi.",
        icon: "supplier",
      },
      {
        href: "/panel/tedarikciler/borc-takibi",
        label: "Borç Takibi",
        description: "Tedarikçi borç yaşlandırma ve limit görünümü.",
        icon: "supplier",
      },
      {
        href: "/panel/tedarikciler/odeme-gecmisi",
        label: "Ödeme Geçmişi",
        description: "Tedarikçilere yapılan ödeme kayıtları.",
        icon: "supplier",
      },
      {
        href: "/panel/tedarikciler/vade-raporu",
        label: "Vade Raporu",
        description: "Tedarikçi vade takibi ve planlama.",
        icon: "supplier",
      },
    ],
  },
  {
    id: "irsaliye-fatura",
    label: "İrsaliye / Fatura",
    href: "/panel/fatura",
    icon: "invoice",
    moduleCode: "invoice",
    children: [
      {
        href: "/panel/fatura",
        label: "Belge Operasyonları",
        description: "Satış/alış belge süreçlerinin ana ekranı.",
        icon: "invoice",
      },
      {
        href: "/panel/fatura/satis-faturalari",
        label: "Satış Faturaları",
        description: "Satış fatura oluşturma ve durum takibi.",
        icon: "invoice",
      },
      {
        href: "/panel/fatura/alis-faturalari",
        label: "Alış Faturaları",
        description: "Alış faturasını ve mal kabul bağlantılarını yönetme.",
        icon: "invoice",
      },
      {
        href: "/panel/fatura/irsaliye",
        label: "İrsaliye",
        description: "Sevk irsaliyesi ve belge eşleştirme.",
        icon: "invoice",
      },
    ],
  },
  {
    id: "kasa-banka",
    label: "Kasa / Banka",
    href: "/panel/kasa",
    icon: "cash",
    moduleCode: "finance",
    children: [
      {
        href: "/panel/kasa",
        label: "Finans Operasyonları",
        description: "Tahsilat, ödeme ve kasa transfer ekranı.",
        icon: "cash",
      },
      {
        href: "/panel/kasa/kasa-hareketleri",
        label: "Kasa Hareketleri",
        description: "Günlük kasa giriş/çıkış hareket listesi.",
        icon: "cash",
      },
      {
        href: "/panel/kasa/banka-hareketleri",
        label: "Banka Hareketleri",
        description: "Banka hesap hareketleri ve mutabakat.",
        icon: "cash",
      },
      {
        href: "/panel/kasa/tahsilat-ve-odeme",
        label: "Tahsilat ve Ödeme",
        description: "Müşteri tahsilatı ve tedarikçi ödeme akışı.",
        icon: "payment",
      },
    ],
  },
  {
    id: "odeme-sistemi",
    label: "Ödeme Sistemi",
    href: "/panel/odeme",
    icon: "payment",
    moduleCode: "payment",
    children: [
      {
        href: "/panel/odeme",
        label: "Ödeme Linkleri",
        description: "Markalı ödeme linki üretme ve takip.",
        icon: "payment",
      },
      {
        href: "/panel/odeme/webhook-loglari",
        label: "Webhook Logları",
        description: "Sağlayıcı callback ve doğrulama kayıtları.",
        icon: "payment",
      },
      {
        href: "/panel/odeme/iade-islemleri",
        label: "İade İşlemleri",
        description: "Kısmi/tam iade ve mutabakat süreçleri.",
        icon: "payment",
      },
    ],
  },
  {
    id: "e-donusum",
    label: "e-Fatura / e-Arşiv",
    href: "/panel/e-fatura",
    icon: "einvoice",
    moduleCode: "einvoice",
    children: [
      {
        href: "/panel/e-fatura",
        label: "e-Belge Operasyonları",
        description: "e-Fatura ve e-Arşiv genel operasyon ekranı.",
        icon: "einvoice",
      },
      {
        href: "/panel/e-fatura/e-fatura-belgeleri",
        label: "e-Fatura Belgeleri",
        description: "e-Fatura gönderim ve durum takibi.",
        icon: "einvoice",
      },
      {
        href: "/panel/e-fatura/e-arsiv-belgeleri",
        label: "e-Arşiv Belgeleri",
        description: "e-Arşiv belge listesi ve yaşam döngüsü.",
        icon: "einvoice",
      },
    ],
  },
  {
    id: "raporlar",
    label: "Raporlar",
    href: "/panel/raporlar",
    icon: "report",
    moduleCode: "report",
    children: [
      {
        href: "/panel/raporlar",
        label: "Rapor Merkezi",
        description: "Operasyonel raporların ana görünümü.",
        icon: "report",
      },
      {
        href: "/panel/raporlar/satis-raporlari",
        label: "Satış Raporları",
        description: "Ciro, karlılık, kasiyer ve şube satışları.",
        icon: "report",
      },
      {
        href: "/panel/raporlar/stok-raporlari",
        label: "Stok Raporları",
        description: "Stok değerleme, kritik seviye ve SKT raporları.",
        icon: "report",
      },
      {
        href: "/panel/raporlar/finans-raporlari",
        label: "Finans Raporları",
        description: "Kasa, tahsilat, ödeme ve masraf raporları.",
        icon: "report",
      },
      {
        href: "/panel/raporlar/ozellik-matrisi",
        label: "Özellik Matrisi",
        description: "Sistem özelliklerinin hazır/kısmi/yeni durum görünümü.",
        icon: "report",
      },
    ],
  },
  {
    id: "kullanicilar",
    label: "Kullanıcılar",
    href: "/panel/kullanicilar",
    icon: "user",
    moduleCode: "user",
    children: [
      {
        href: "/panel/kullanicilar",
        label: "Kullanıcı Yönetimi",
        description: "Kullanıcı hesabı, rol ve durum yönetimi.",
        icon: "user",
      },
      {
        href: "/panel/kullanicilar/roller",
        label: "Rol Yönetimi",
        description: "Sistem ve özel rollerin yönetimi.",
        icon: "user",
      },
      {
        href: "/panel/kullanicilar/yetkiler",
        label: "Yetki Yönetimi",
        description: "Ekran ve işlem bazlı yetkilendirme.",
        icon: "user",
      },
      {
        href: "/panel/kullanicilar/aktivite-gecmisi",
        label: "Aktivite Geçmişi",
        description: "Kullanıcı bazlı giriş ve işlem takibi.",
        icon: "history",
      },
    ],
  },
  {
    id: "destek-merkezi",
    label: "Destek Merkezi",
    href: "/panel/destek",
    icon: "history",
    moduleCode: "support",
    children: [
      {
        href: "/panel/destek",
        label: "Destek Taleplerim",
        description: "Teknik destek talepleri ve mesajlasma kayitlari.",
        icon: "history",
      },
      {
        href: "/panel/destek/talep-gecmisi",
        label: "Talep Gecmisi",
        description: "Kapanan destek kayitlarinin geriye donuk incelemesi.",
        icon: "history",
      },
    ],
  },
  {
    id: "lisans-abonelik",
    label: "Lisans ve Abonelik",
    href: "/panel/abonelik",
    icon: "subscription",
    moduleCode: "subscription",
    children: [
      {
        href: "/panel/abonelik",
        label: "Abonelik Yönetimi",
        description: "Paket, dönem ve yenileme işlemleri.",
        icon: "subscription",
      },
      {
        href: "/panel/abonelik/mevcut-paket",
        label: "Mevcut Paket",
        description: "Aktif plan ve modül yetki kapsamı.",
        icon: "subscription",
      },
      {
        href: "/panel/abonelik/kullanim-ozeti",
        label: "Kullanım Özeti",
        description: "Kota ve kullanım sayaçlarını izleme.",
        icon: "subscription",
      },
      {
        href: "/panel/abonelik/fatura-gecmisi",
        label: "Fatura Geçmişi",
        description: "Abonelik fatura dönem kayıtları.",
        icon: "subscription",
      },
    ],
  },
  {
    id: "islem-gecmisi",
    label: "İşlem Geçmişi",
    href: "/panel/islem-gecmisi",
    icon: "history",
    moduleCode: "history",
    children: [
      {
        href: "/panel/islem-gecmisi",
        label: "Denetim Günlüğü",
        description: "Tüm modüllerin audit hareketleri.",
        icon: "history",
      },
      {
        href: "/panel/islem-gecmisi/iptal-kayitlari",
        label: "İptal Kayıtları",
        description: "Satış, belge ve işlem iptal kayıtları.",
        icon: "history",
      },
      {
        href: "/panel/islem-gecmisi/export-olaylari",
        label: "Export Olayları",
        description: "Excel/PDF dışa aktarma kayıtları.",
        icon: "history",
      },
      {
        href: "/panel/islem-gecmisi/ayar-degisiklikleri",
        label: "Ayar Değişiklikleri",
        description: "Firma, POS ve entegrasyon ayar değişiklik kayıtları.",
        icon: "history",
      },
      {
        href: "/panel/islem-gecmisi/guvenlik-olaylari",
        label: "Güvenlik Olayları",
        description: "Şüpheli oturum ve erişim olayları.",
        icon: "history",
      },
    ],
  },
  {
    id: "ayarlar",
    label: "Ayarlar",
    href: "/panel/ayarlar",
    icon: "settings",
    moduleCode: "settings",
    children: [
      {
        href: "/panel/ayarlar",
        label: "Firma Ayarları",
        description: "Firma bilgileri, iletişim ve logo ayarları.",
        icon: "settings",
      },
      {
        href: "/panel/ayarlar/pos-ayarlar",
        label: "POS Ayarları",
        description: "POS varsayılanları ve kasa parametreleri.",
        icon: "settings",
      },
      {
        href: "/panel/ayarlar/terazi-ayarlar",
        label: "Terazi Ayarları",
        description: "TEM, CAS, Dikomsan, Hana, Betsa ve TESS cihaz bağlantıları.",
        icon: "settings",
      },
      {
        href: "/panel/ayarlar/e-fatura-ayarlar",
        label: "e-Fatura Ayarları",
        description: "Sağlayıcı, alias ve belge konfigürasyonları.",
        icon: "einvoice",
      },
      {
        href: "/panel/ayarlar/entegrasyon-ayarlar",
        label: "Entegrasyon Ayarları",
        description: "Webhook, API anahtarı ve entegrasyon güvenliği.",
        icon: "settings",
      },
      {
        href: "/panel/ayarlar/yazici-ayarlar",
        label: "Yazıcı Ayarları",
        description: "Fiş, fatura ve etiket yazdırma ayarları.",
        icon: "settings",
      },
      {
        href: "/panel/ayarlar/sube-depo-yonetimi",
        label: "Şube/Depo Yönetimi",
        description: "Şube ve depo kartlarını tek ekrandan yönetme.",
        icon: "warehouse",
      },
      {
        href: "/panel/ayarlar/sms-ayarlar",
        label: "SMS Ayarları",
        description: "Satış sonrası müşteri SMS bilgilendirme ayarları.",
        icon: "settings",
      },
      {
        href: "/panel/ayarlar/kredi-karti-takip",
        label: "Kredi Kartı Takip",
        description: "Kart ödemelerde hesap kesim ve ödeme günü takibi.",
        icon: "settings",
      },
      {
        href: "/panel/ayarlar/yedekleme",
        label: "Yedekleme",
        description: "Otomatik günlük yedekleme ve geçmiş yönetimi.",
        icon: "settings",
      },
    ],
  },
];

export function findFeatureByPath(moduleSegment: string, featureSegment: string) {
  const targetPath = `/panel/${moduleSegment}/${featureSegment}`;
  for (const section of panelNavSections) {
    const feature = section.children.find((item) => item.href === targetPath);
    if (feature) {
      return { section, feature };
    }
  }

  return null;
}

