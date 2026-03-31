import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { MarketingBanner } from "@/components/landing/MarketingBanner";
import { MarketingPopup } from "@/components/landing/MarketingPopup";
import { Toaster } from "react-hot-toast";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Premium Event Equipment Rentals in Qatar | E3 Digital Operating System",
  description: "Elevate your corporate events and exhibitions in Qatar. E3 Rentals offers premium AV, staging, and event equipment with instant 3D models, real-time availability, and MOCI-compliant professional quotes.",
  keywords: "premium event rentals Qatar, corporate event equipment Doha, exhibition supplies Qatar, 3D event planning Qatar, Civil Defence approved event structures, MOCI approved tent rentals, KAHRAMAA compliant event lighting, event logistics Qatar",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "E3 Rentals ERP",
  },
  formatDetection: {
    telephone: false,
  },
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
          <SmoothScroll />
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
