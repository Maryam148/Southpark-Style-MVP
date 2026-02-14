import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = getStripe().webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`⚠️  Webhook signature verification failed: ${message}`);
        return NextResponse.json({ error: message }, { status: 400 });
    }

    // ── Handle events ──────────────────────────────────
    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.client_reference_id;

            if (!userId) {
                console.error("❌ No client_reference_id on session");
                break;
            }

            const supabaseAdmin = createAdminClient();

            // Mark user as paid
            const { error: updateError } = await supabaseAdmin
                .from("users")
                .update({
                    is_paid: true,
                    stripe_customer_id: session.customer as string | null,
                    plan: "pro",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userId);

            if (updateError) {
                console.error("❌ Failed to update user:", updateError);
            }

            // Insert payment record
            const { error: paymentError } = await supabaseAdmin
                .from("payments")
                .insert({
                    user_id: userId,
                    stripe_session_id: session.id,
                    stripe_customer_id: (session.customer as string) || null,
                    amount_cents: session.amount_total ?? 999,
                    currency: session.currency ?? "usd",
                    status: "succeeded",
                    credits_granted: 0,
                    metadata: { payment_intent: session.payment_intent },
                });

            if (paymentError) {
                console.error("❌ Failed to insert payment:", paymentError);
            }

            console.log(`✅ Payment succeeded for user ${userId}`);
            break;
        }
        case "invoice.payment_failed": {
            console.warn("❌ Invoice payment failed");
            break;
        }
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
