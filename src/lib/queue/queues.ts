import { Queue } from "bullmq";
import { env } from "@/lib/env";

let eInvoiceOutboundQueue: Queue | null = null;
let paymentWebhookQueue: Queue | null = null;

export function getEInvoiceOutboundQueue() {
  if (!eInvoiceOutboundQueue) {
    eInvoiceOutboundQueue = new Queue("einvoice-outbound", {
      connection: {
        url: env.REDIS_URL,
      },
      prefix: env.QUEUE_PREFIX,
    });
  }

  return eInvoiceOutboundQueue;
}

export function getPaymentWebhookQueue() {
  if (!paymentWebhookQueue) {
    paymentWebhookQueue = new Queue("payment-webhook", {
      connection: {
        url: env.REDIS_URL,
      },
      prefix: env.QUEUE_PREFIX,
    });
  }

  return paymentWebhookQueue;
}

export type EInvoiceOutboundJob = {
  tenantId: string;
  documentId: string;
  providerCode: string;
  idempotencyKey: string;
};
