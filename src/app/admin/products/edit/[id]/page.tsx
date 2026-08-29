"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ProductWizard from "@/components/admin/ProductWizard";
import { USER_ROLES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params?.id as string;

    const [categories, setCategories] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [catRes, venRes, prodRes] = await Promise.all([
                    fetch("/api/categories"),
                    fetch("/api/admin/vendors").catch(() => null),
                    fetch(`/api/admin/products`)
                ]);

                const catData = await catRes.json();
                setCategories(catData?.flat || catData?.tree || (Array.isArray(catData) ? catData : []));

                if (venRes && venRes.ok) {
                    const venData = await venRes.json();
                    setVendors(Array.isArray(venData) ? venData : []);
                }

                if (prodRes.ok) {
                    const productsList = await prodRes.json();
                    if (Array.isArray(productsList)) {
                        const target = productsList.find((p: any) => p.id === productId || p.slug === productId);
                        if (target) {
                            setProduct(target);
                        } else {
                            setError("Product not found in system");
                        }
                    }
                }
            } catch (err: any) {
                console.error("Failed to load edit product data:", err);
                setError(err.message || "Failed to load product");
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            loadData();
        }
    }, [productId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                <span className="text-xs font-black uppercase tracking-widest">Loading Asset Specifications...</span>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-white gap-4">
                <p className="text-red-400 font-bold">{error || "Product not found"}</p>
                <button 
                    onClick={() => router.push("/admin/products")}
                    className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold uppercase"
                >
                    Back to Catalog
                </button>
            </div>
        );
    }

    return (
        <ProductWizard 
            initialData={product}
            categories={categories}
            vendors={vendors}
            currentUserRole={USER_ROLES.SUPER_ADMIN}
            isEditing={true}
            onSuccessRedirect="/admin/products"
        />
    );
}
