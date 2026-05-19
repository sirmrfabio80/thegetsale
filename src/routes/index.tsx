import { createFileRoute, redirect } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { PreviewSection } from "@/components/marketing/PreviewSection";
import { FinalCTA } from "@/components/marketing/FinalCTA";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.auth?.status === "authenticated") {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "The Get — Know when to buy. Know when to wait." },
      {
        name: "description",
        content:
          "Private shopping intelligence for premium fashion. Follow the houses you care about and get calmer signals on price, availability, and timing.",
      },
      { property: "og:title", content: "The Get — Know when to buy. Know when to wait." },
      {
        property: "og:description",
        content:
          "Private shopping intelligence for premium fashion. Calmer signals on price, availability, and timing.",
      },
    ],
  }),
  component: Marketing,
});

function Marketing() {
  return (
    <MarketingLayout>
      <Hero />
      <HowItWorks />
      <PreviewSection />
      <section className="mx-auto w-full max-w-3xl border-t border-border px-5 py-20 text-center md:px-10 md:py-24">
        <p className="font-serif text-2xl italic leading-relaxed text-foreground md:text-3xl">
          "Most of the games retailers play with you have a tempo. Once you can hear it, the shopping gets quieter."
        </p>
        <p className="eyebrow mt-6">The Get — Editor's note</p>
      </section>
      <FinalCTA />
    </MarketingLayout>
  );
}
