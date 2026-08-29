import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://e3catalog.vercel.app");

    // Static public routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: `${baseUrl}/catalog`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/how-it-works`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/vendors`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/vendors/terms`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/vendors/policy`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
    ];

    try {
        // Fetch active products
        const allProducts = await db
            .select({
                slug: products.slug,
                updatedAt: products.updatedAt,
            })
            .from(products)
            .where(eq(products.isPublished, true));

        const productRoutes: MetadataRoute.Sitemap = allProducts.map((product) => ({
            url: `${baseUrl}/catalog/${product.slug}`,
            lastModified: product.updatedAt || new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        }));

        return [...staticRoutes, ...productRoutes];
    } catch {
        return staticRoutes;
    }
}
