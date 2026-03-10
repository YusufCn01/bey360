import { PaymentPageClient } from "@/app/odeme/mock/[reference]/payment-page-client";

type PageProps = {
  params: Promise<{
    reference: string;
  }>;
};

export default async function MockPaymentPage(props: PageProps) {
  const { reference } = await props.params;
  return <PaymentPageClient reference={reference} />;
}
