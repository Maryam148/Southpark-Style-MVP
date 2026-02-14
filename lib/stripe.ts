import Stripe from "stripe";

/**
 * Lazily-initialised Stripe instance.
 * Avoids throwing at build time when env vars aren't set.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error("Missing STRIPE_SECRET_KEY environment variable");
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2026-01-28.clover",
            typescript: true,
        });
    }
    return _stripe;
}
