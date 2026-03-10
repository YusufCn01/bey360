export const permissions = {
  dashboardView: "dashboard:view",
  productView: "product:view",
  productCreate: "product:create",
  salePos: "sale:pos",
  saleReturn: "sale:return",
  saleDiscount: "sale:discount",
  reportView: "report:view",
  tenantUserManage: "tenant:user.manage",
} as const;

export type PermissionKey = (typeof permissions)[keyof typeof permissions];
