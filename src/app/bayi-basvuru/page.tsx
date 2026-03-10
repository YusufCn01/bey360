import { DealerApplicationForm } from "@/components/forms/dealer-application-form";

export default function DealerApplicationPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#2d3a82_0%,#1f2960_42%,#1a2356_100%)] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full items-center justify-center">
        <DealerApplicationForm />
      </div>
    </div>
  );
}
