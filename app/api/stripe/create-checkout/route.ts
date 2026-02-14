import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

        const session = await getStripe().checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            client_reference_id: user.id,
            customer_email: user.email,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "SkunkStudio Pro — Episode Generation",
                            description:
                                "Unlock AI-powered South Park-style episode generation. One-time payment.",
                        },
                        unit_amount: 999, // $9.99 in cents
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                user_id: user.id,
            },
            success_url: `${origin}/dashboard/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/dashboard/payment/cancel`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("Stripe checkout error:", error);
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
