export type RequestContext = {
  correlationId: string;
  tenantSlug?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
};
