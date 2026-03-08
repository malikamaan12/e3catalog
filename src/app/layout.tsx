import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { MarketingBanner } from "@/components/landing/MarketingBanner";
import { MarketingPopup } from "@/components/landing/MarketingPopup";

export const metadata: Metadata = {
  title: "E3 Rentals — Premium Event Equipment",
  description: "The Digital Operating System for Event Rentals. Premium staging, lighting, sound, and furniture for world-class events.",
  keywords: "event rentals, staging, trusses, lighting, sound equipment, event furniture, premium rentals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning={true}>
        <SiteSettingsProvider>
          <MarketingBanner />
          <Navbar />
          {children}
          <MarketingPopup />
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
