import { notFound, redirect } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureWorkspaceClient } from "@/app/panel/feature-workspace-client";
import { findFeatureByPath } from "@/lib/navigation/panel-nav";

type PageProps = {
  params: Promise<{ module: string; feature: string }>;
};

export default async function PanelFeaturePage({ params }: PageProps) {
  const { module: moduleSegment, feature: featureSegment } = await params;

  if (moduleSegment === "stok" && (featureSegment === "sube-tanimlari" || featureSegment === "depo-tanimlari")) {
    redirect("/panel/ayarlar/sube-depo-yonetimi");
  }

  if (moduleSegment === "pos") {
    redirect(`/pos?focus=${encodeURIComponent(featureSegment)}`);
  }

  const featureResult = findFeatureByPath(moduleSegment, featureSegment);

  if (!featureResult) {
    notFound();
  }

  const { section, feature } = featureResult;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{feature.label}</CardTitle>
          <p className="text-sm text-slate-600">{feature.description}</p>
          <p className="text-xs text-slate-500">Kategori: {section.label}</p>
        </CardHeader>
      </Card>

      <FeatureWorkspaceClient moduleSegment={moduleSegment} featureSegment={featureSegment} />
    </div>
  );
}
