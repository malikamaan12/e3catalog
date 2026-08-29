import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://e3catalog.vercel.app");

    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/catalog", "/catalog/*", "/how-it-works", "/vendors", "/vendors/terms", "/vendors/policy", "/privacy"],
                disallow: ["/admin", "/admin/*", "/dashboard", "/dashboard/*", "/api/*", "/login", "/signup"],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
