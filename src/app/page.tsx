"use client";

import dynamic from "next/dynamic";

const HeroSection = dynamic(() => import("@/components/landing/HeroSection"), { ssr: false });
const TrustCarousel = dynamic(() => import("@/components/landing/TrustCarousel"), { ssr: false });
const CategoryGrid = dynamic(() => import("@/components/landing/CategoryGrid"), { ssr: false });
const ComplianceGuarantee = dynamic(() => import("@/components/landing/ComplianceGuarantee"), { ssr: false });
const ProcessPipeline = dynamic(() => import("@/components/landing/ProcessPipeline"), { ssr: false });
const FinalCTA = dynamic(() => import("@/components/landing/FinalCTA"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer").then(mod => mod.Footer), { ssr: true });

export default function HomePage() {
  return (
    <main className="bg-navy overflow-x-hidden">
      {/* 1. Hero — "The Digital Operating System" */}
      <HeroSection />

      {/* 2. Digital Advantage — "Why Leading Planners Choose E3" */}
      <TrustCarousel />

      {/* 3. Catalog Grid — "Explore Our Fleet" */}
      <CategoryGrid />

      {/* 4. Compliance Guarantee — "Safety is Our Foundation" */}
      <ComplianceGuarantee />

      {/* 5. How It Works — "From Concept to Execution in 4 Steps" */}
      <ProcessPipeline />

      {/* 6. Final CTA */}
      <FinalCTA />

      {/* 7. Footer */}
      <Footer />
    </main>
  );
}
