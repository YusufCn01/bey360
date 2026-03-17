export type ProductCreateInput = {
  tenantId: string;
  userId: string;
  name: string;
  code?: string;
  description?: string;
  barcode?: string;
  parallelBarcodes?: string[];
  defaultUnit?: string;
  salePrice?: number;
  purchasePrice?: number;
  vatRate?: number;
  openingStock?: number;
  warehouseId?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  expiryTracking?: boolean;
  imageUrl?: string;
  purchaseCurrency?: string;
  saleCurrency1?: string;
  salePrice2?: number;
  saleCurrency2?: string;
  salePrice3?: number;
  saleCurrency3?: string;
  salePrice4?: number;
  saleCurrency4?: string;
  specialCode1?: string;
  specialCode2?: string;
  specialCode3?: string;
  specialCode4?: string;
  productGroup?: string;
  productSubGroup?: string;
  expiryDate?: string;
  discountRate?: number;
  lockedForSale?: boolean;
  isScaleProduct?: boolean;
  scaleProductCode?: string;
  scaleBarcodeMode?: "weight" | "price";
  scaleTareGrams?: number;
};

export type ProductListFilter = {
  tenantId: string;
  search?: string;
  status?: string;
  limit: number;
};

export type StockMovementListFilter = {
  tenantId: string;
  productId?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
};
