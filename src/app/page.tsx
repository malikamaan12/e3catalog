"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

const HeroSection = dynamic(() => import("@/components/landing/HeroSection"), { ssr: false });
const ProcessPipeline = dynamic(() => import("@/components/landing/ProcessPipeline"), { ssr: false });
const CategoryGrid = dynamic(() => import("@/components/landing/CategoryGrid"), { ssr: false });
const TrustMarquee = dynamic(() => import("@/components/landing/TrustMarquee"), { ssr: false });
const FinalCTA = dynamic(() => import("@/components/landing/FinalCTA"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer").then(mod => mod.Footer), { ssr: true });

export default function HomePage() {
  return (
    <main className="bg-navy overflow-x-hidden">
      {/* 1. HeroSection */}
      <HeroSection />

      {/* 4. Trust Blocks */}
      <TrustMarquee />

      {/* 2. Process Pipeline */}
      <ProcessPipeline />

      {/* 3. Category Grid */}
      <CategoryGrid />

      {/* 5. Final CTA */}
      <FinalCTA />

      {/* Site Footer */}
      <Footer />
    </main>
  );
}
