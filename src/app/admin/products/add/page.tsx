"use client";

import { useState, useEffect } from "react";
import ProductWizard from "@/components/admin/ProductWizard";
import { USER_ROLES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export default function AddProductPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [catRes, venRes] = await Promise.all([
                    fetch("/api/categories"),
                    fetch("/api/admin/vendors").catch(() => null)
                ]);

                const catData = await catRes.json();
                setCategories(catData?.flat || catData?.tree || (Array.isArray(catData) ? catData : []));

                if (venRes && venRes.ok) {
                    const venData = await venRes.json();
                    setVendors(Array.isArray(venData) ? venData : []);
                }
            } catch (err) {
                console.error("Failed to load categories/vendors:", err);
            } finally {
                setLoading(false);
            }
        };

        loadInitial();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                <span className="text-xs font-black uppercase tracking-widest">Initializing Catalog Engine...</span>
            </div>
        );
    }

    return (
        <ProductWizard 
            categories={categories}
            vendors={vendors}
            currentUserRole={USER_ROLES.SUPER_ADMIN}
            isEditing={false}
            onSuccessRedirect="/admin/products"
        />
    );
}
