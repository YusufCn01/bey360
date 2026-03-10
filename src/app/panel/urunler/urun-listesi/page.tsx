import { ProductsClient } from "@/app/panel/urunler/products-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProductListPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ürün Listesi</CardTitle>
      </CardHeader>
      <CardContent>
        <ProductsClient />
      </CardContent>
    </Card>
  );
}
