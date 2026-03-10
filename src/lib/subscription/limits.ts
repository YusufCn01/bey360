export type TenantPlanCode = "starter" | "standard" | "professional" | "enterprise" | "custom";

export type PlanLimits = {
  maxUsers: number;
  maxProducts: number;
  maxInvoicesPerMonth: number;
  maxTransactionsPerMonth: number;
  maxStorageMb: number;
};

export const planLimits: Record<TenantPlanCode, PlanLimits> = {
  starter: {
    maxUsers: 3,
    maxProducts: 1000,
    maxInvoicesPerMonth: 500,
    maxTransactionsPerMonth: 5000,
    maxStorageMb: 2048,
  },
  standard: {
    maxUsers: 10,
    maxProducts: 10000,
    maxInvoicesPerMonth: 3000,
    maxTransactionsPerMonth: 30000,
    maxStorageMb: 10240,
  },
  professional: {
    maxUsers: 50,
    maxProducts: 100000,
    maxInvoicesPerMonth: 20000,
    maxTransactionsPerMonth: 200000,
    maxStorageMb: 51200,
  },
  enterprise: {
    maxUsers: 250,
    maxProducts: 1000000,
    maxInvoicesPerMonth: 100000,
    maxTransactionsPerMonth: 1000000,
    maxStorageMb: 512000,
  },
  custom: {
    maxUsers: 100000,
    maxProducts: 10000000,
    maxInvoicesPerMonth: 1000000,
    maxTransactionsPerMonth: 10000000,
    maxStorageMb: 1000000,
  },
};
