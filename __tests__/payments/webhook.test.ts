/**
 * POST /api/stripe/webhook — unit tests
 */
import { POST } from "@/app/api/stripe/webhook/route";
import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabaseAdmin";

jest.mock("@/lib/stripe");
jest.mock("@/lib/supabaseAdmin");

const mockGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<
    typeof createAdminClient
>;

function buildWebhookRequest(body: string, sig: string | null): NextRequest {
    const headers = new Headers({ "content-type": "text/plain" });
    if (sig) headers.set("stripe-signature", sig);
    return new NextRequest("http://localhost:3000/api/stripe/webhook", {
        method: "POST",
        body,
        headers,
    });
}

describe("POST /api/stripe/webhook", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    });

    it("returns 400 if webhook signature is missing", async () => {
        const res = await POST(buildWebhookRequest("{}", null));
        expect(res.status).toBe(400);
    });

    it("returns 400 if webhook signature verification fails", async () => {
        mockGetStripe.mockReturnValueOnce({
            webhooks: {
                constructEvent: jest
                    .fn()
                    .mockImplementation(() => {
                        throw new Error("Signature mismatch");
                    }),
            },
        } as any);

        const res = await POST(buildWebhookRequest("{}", "bad_sig"));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain("Signature mismatch");
    });

    it("returns 200 for unhandled event types", async () => {
        mockGetStripe.mockReturnValueOnce({
            webhooks: {
                constructEvent: jest.fn().mockReturnValue({
                    type: "customer.created",
                    data: { object: {} },
                }),
            },
        } as any);

        const res = await POST(buildWebhookRequest("{}", "valid_sig"));
        expect(res.status).toBe(200);
    });

    it("updates user is_paid on checkout.session.completed", async () => {
        const mockUpdate = jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
        });
        const mockInsert = jest.fn().mockResolvedValue({ error: null });

        mockGetStripe.mockReturnValueOnce({
            webhooks: {
                constructEvent: jest.fn().mockReturnValue({
                    type: "checkout.session.completed",
                    data: {
                        object: {
                            id: "cs_test_123",
                            client_reference_id: "uid-1",
                            customer: "cus_test",
                            amount_total: 999,
                            currency: "usd",
                            payment_intent: "pi_test",
                        },
                    },
                }),
            },
        } as any);

        mockCreateAdminClient.mockReturnValueOnce({
            from: jest.fn((table: string) => {
                if (table === "users") return { update: mockUpdate };
                if (table === "payments") return { insert: mockInsert };
                return {};
            }),
        } as any);

        const res = await POST(buildWebhookRequest("{}", "valid_sig"));
        expect(res.status).toBe(200);

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                is_paid: true,
                plan: "pro",
            })
        );
    });

    it("returns 200 after successful processing", async () => {
        mockGetStripe.mockReturnValueOnce({
            webhooks: {
                constructEvent: jest.fn().mockReturnValue({
                    type: "checkout.session.completed",
                    data: {
                        object: {
                            id: "cs_test_123",
                            client_reference_id: "uid-1",
                            customer: "cus_test",
                            amount_total: 999,
                            currency: "usd",
                            payment_intent: "pi_test",
                        },
                    },
                }),
            },
        } as any);

        mockCreateAdminClient.mockReturnValueOnce({
            from: jest.fn(() => ({
                update: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null }),
                }),
                insert: jest.fn().mockResolvedValue({ error: null }),
            })),
        } as any);

        const res = await POST(buildWebhookRequest("{}", "valid_sig"));
        const body = await res.json();
        expect(body.received).toBe(true);
    });
});
