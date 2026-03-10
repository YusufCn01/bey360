export type LoginRequest = {
  tenantSlug: string;
  loginId: string;
  password: string;
};

export type AuthSession = {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  email: string;
  sessionId: string;
  roleCodes: string[];
};
