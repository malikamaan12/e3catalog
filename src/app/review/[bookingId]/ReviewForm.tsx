"use client";

import { useState } from "react";
import { Star, CheckCircle, Package, Truck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ReviewForm({ booking }: { booking: any }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);

    const [conditionScore, setConditionScore] = useState(0);
    const [hoverCondition, setHoverCondition] = useState(0);

    const [deliveryScore, setDeliveryScore] = useState(0);
    const [hoverDelivery, setHoverDelivery] = useState(0);

    const [comment, setComment] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (rating === 0) {
            setError("Please provide an overall rating.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: booking.id,
                    rating,
                    conditionScore,
                    deliveryScore,
                    comment
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to submit review");

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-[var(--color-obsidian)] rounded-2xl border border-[var(--color-slate)]/20 shadow-2xl">
                <div className="w-20 h-20 bg-[var(--color-gold)]/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-[var(--color-gold)]" />
                </div>
                <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-white mb-4">Verified Review Submitted!</h2>
                <p className="text-[var(--color-slate)] max-w-md mx-auto mb-8">
                    Thank you for helping us maintain a premium, reliable marketplace. Your feedback shapes the future of E3 Rentals.
                </p>
                <button 
                    onClick={() => router.push("/catalog")}
                    className="px-8 py-3 bg-[var(--color-gold)] text-black font-bold rounded-xl hover:bg-white transition-colors"
                >
                    Return to Catalog
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-[var(--color-obsidian)] rounded-2xl border border-[var(--color-slate)]/20 shadow-2xl p-6 md:p-10">
            <div className="flex items-center gap-6 pb-8 border-b border-[var(--color-slate)]/10 mb-8">
                {booking.product.thumbnailUrl ? (
                    <div className="w-24 h-24 rounded-xl overflow-hidden relative flex-shrink-0 bg-black/50">
                        <Image src={booking.product.thumbnailUrl} alt={booking.product.name} fill className="object-cover" />
                    </div>
                ) : (
                    <div className="w-24 h-24 rounded-xl bg-[var(--color-slate)]/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-[var(--color-slate)]" />
                    </div>
                )}
                <div>
                    <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white leading-tight mb-2">
                        {booking.product.name}
                    </h2>
                    <p className="text-[var(--color-gold)] text-sm font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Verified Rental • {booking.vendor?.companyName || "E3 Platform Partner"}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="space-y-8">
                {/* Overall Rating */}
                <div>
                    <label className="block text-sm font-bold text-[var(--color-slate)] mb-3">Overall Experience</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className="focus:outline-none transition-transform hover:scale-110"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                            >
                                <Star
                                    className={`w-10 h-10 ${
                                        star <= (hoverRating || rating)
                                            ? "fill-[var(--color-gold)] text-[var(--color-gold)]"
                                            : "text-[var(--color-slate)]/30"
                                    } transition-colors`}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Condition Rating */}
                    <div className="bg-black/20 p-5 rounded-xl border border-[var(--color-slate)]/5">
                        <label className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                            <Package className="w-4 h-4 text-[var(--color-gold)]" />
                            Equipment Condition
                        </label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setConditionScore(star)}
                                    onMouseEnter={() => setHoverCondition(star)}
                                    onMouseLeave={() => setHoverCondition(0)}
                                >
                                    <Star className={`w-6 h-6 ${star <= (hoverCondition || conditionScore) ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-[var(--color-slate)]/30"}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Delivery Rating */}
                    <div className="bg-black/20 p-5 rounded-xl border border-[var(--color-slate)]/5">
                        <label className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                            <Truck className="w-4 h-4 text-[var(--color-gold)]" />
                            Vendor Delivery & Support
                        </label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setDeliveryScore(star)}
                                    onMouseEnter={() => setHoverDelivery(star)}
                                    onMouseLeave={() => setHoverDelivery(0)}
                                >
                                    <Star className={`w-6 h-6 ${star <= (hoverDelivery || deliveryScore) ? "fill-[var(--color-gold)] text-[var(--color-gold)]" : "text-[var(--color-slate)]/30"}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Comment */}
                <div>
                    <label className="block text-sm font-bold text-[var(--color-slate)] mb-3">Written Review (Optional)</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Tell others about your experience with this equipment and vendor..."
                        className="w-full bg-black/20 border border-[var(--color-slate)]/20 rounded-xl p-4 text-white placeholder-[var(--color-slate)]/50 focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)] outline-none min-h-[120px] resize-y"
                    />
                </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[var(--color-slate)]/10">
                <button
                    type="submit"
                    disabled={isSubmitting || rating === 0}
                    className="w-full py-4 bg-[var(--color-gold)] hover:bg-white text-black font-bold text-lg rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                    {isSubmitting ? "Submitting Verified Review..." : "Submit Review"}
                </button>
            </div>
        </form>
    );
}
