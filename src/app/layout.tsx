import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { MarketingBanner } from "@/components/landing/MarketingBanner";
import { MarketingPopup } from "@/components/landing/MarketingPopup";
import { Toaster } from "react-hot-toast";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1a2035",
              color: "#e8dcc8",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#c9a84c", secondary: "#1a2035" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#1a2035" },
            },
          }}
        />
        <SpeedInsights />
      </body>
    </html>
  );
}
