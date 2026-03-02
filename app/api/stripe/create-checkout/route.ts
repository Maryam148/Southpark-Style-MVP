import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const PLAN_CONFIGS = {
    pro: {
        name: "SkunkStudio Pro",
        description: "10 minutes of video/month, MP4 export, no watermark.",
        amount: 9900, // $99.00
    },
    creator_plus: {
        name: "SkunkStudio Creator+",
        description: "30 minutes of video/month, priority rendering, expanded storage.",
        amount: 24900, // $249.00
    },
} as const;

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

        const body = await req.json().catch(() => ({}));
        const plan = (body.plan ?? "pro") as keyof typeof PLAN_CONFIGS;
        const config = PLAN_CONFIGS[plan];

        if (!config) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL;

        const session = await getStripe().checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            client_reference_id: user.id,
            customer_email: user.email,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        recurring: { interval: "month" },
                        product_data: {
                            name: config.name,
                            description: config.description,
                        },
                        unit_amount: config.amount,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                user_id: user.id,
                plan,
            },
            success_url: `${origin}/dashboard/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/dashboard/upgrade`,
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
