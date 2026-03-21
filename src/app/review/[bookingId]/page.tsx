import { db } from "@/lib/db";
import { bookings, reviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import ReviewForm from "./ReviewForm";

export default async function ReviewPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = await params;
    // Look up the booking securely
    const bookingData = await db.query.bookings.findFirst({
        where: eq(bookings.id, bookingId),
        with: {
            product: {
                with: {
                    vendor: true
                }
            }
        }
    });

    if (!bookingData) {
        return (
            <main className="min-h-screen bg-[var(--color-space)] pt-24 pb-12 flex items-center justify-center">
                <div className="text-center p-8 bg-[var(--color-obsidian)] rounded-2xl border border-[var(--color-slate)]/20 shadow-2xl max-w-lg mx-auto">
                    <h1 className="text-2xl font-bold text-white mb-4">Invalid Link</h1>
                    <p className="text-[var(--color-slate)]">This review link is invalid or has expired.</p>
                </div>
            </main>
        );
    }

    // Check if review already exists
    const existingReview = await db.query.reviews.findFirst({
        where: eq(reviews.bookingId, bookingId)
    });

    if (existingReview) {
        return (
            <main className="min-h-screen bg-[var(--color-space)] pt-24 pb-12 flex items-center justify-center font-[family-name:var(--font-body)]">
                <div className="text-center p-10 bg-[var(--color-obsidian)] rounded-2xl border border-[var(--color-slate)]/20 shadow-2xl max-w-lg mx-auto">
                    <div className="text-6xl mb-6 py-2">🎉</div>
                    <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-white mb-2">Review Already Submitted</h1>
                    <p className="text-[var(--color-slate)] mb-6">You have already provided feedback for this booking. Thank you for your review!</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--color-space)] pt-32 pb-24 px-4 font-[family-name:var(--font-body)]">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-gold)] to-yellow-200 drop-shadow-sm mb-4">
                        Post-Event Feedback
                    </h1>
                    <p className="text-[var(--color-slate)] text-lg max-w-xl mx-auto">
                        Your honest feedback directly impacts vendor rankings and helps the E3 ecosystem thrive.
                    </p>
                </div>

                <ReviewForm booking={bookingData} />
            </div>
        </main>
    );
}
