import { notFound } from "next/navigation";
import { ProductFeatureClient } from "@/app/panel/urunler/product-feature-client";

const supportedFeatures = new Set([
  "mevcut-urun-karti",
  "urun-karti-basliklari",
  "urun-gruplari",
  "toplu-urun-duzenle",
  "excel-disari-aktar",
  "excel-iceri-aktar",
  "excel-aktarim-log",
  "yeni-etiket-dizayni",
  "etiket-dizaynlari",
  "toplu-etiket-yazdir",
  "toplu-zam-indirim",
  "seri-sayim-modulu",
]);

type PageProps = {
  params: Promise<{ feature: string }>;
};

export default async function ProductFeaturePage({ params }: PageProps) {
  const { feature } = await params;

  if (!supportedFeatures.has(feature)) {
    notFound();
  }

  return <ProductFeatureClient feature={feature} />;
}
