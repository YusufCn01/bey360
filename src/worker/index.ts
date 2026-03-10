import { Worker } from "bullmq";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendEInvoiceDocument } from "@/modules/einvoice/application/einvoice-service";

const worker = new Worker(
  "einvoice-outbound",
  async (job) => {
    const { tenantId, documentId, providerCode } = job.data as {
      tenantId: string;
      documentId: string;
      providerCode: string;
    };

    logger.info({ jobId: job.id, tenantId, documentId, providerCode }, "e-Fatura gonderim isi basladi");
    const providerReference = await sendEInvoiceDocument({ tenantId, documentId, providerCode });
    logger.info({ jobId: job.id, providerReference }, "e-Fatura gonderim isi tamamlandi");
  },
  {
    connection: {
      url: env.REDIS_URL,
    },
    prefix: env.QUEUE_PREFIX,
    concurrency: 5,
  },
);

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, error }, "Worker is basarisiz");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job?.id }, "Worker is tamamlandi");
});
