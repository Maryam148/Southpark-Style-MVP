/**
 * POST /api/stripe/create-checkout — unit tests
 */
import { POST } from "@/app/api/stripe/create-checkout/route";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getStripe } from "@/lib/stripe";

const mockCreateServerSupabaseClient =
    createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>;
const mockStripe = getStripe as jest.MockedFunction<typeof getStripe>;

function buildRequest(): NextRequest {
    return new NextRequest("http://localhost:3000/api/stripe/create-checkout", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
    });
}

describe("POST /api/stripe/create-checkout", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 if user is not authenticated", async () => {
        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "No session" },
                }),
            },
            from: jest.fn(),
        } as any);

        const res = await POST(buildRequest());
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe("Unauthorized");
    });

    it("calls stripe.checkout.sessions.create with correct params", async () => {
        const mockCreate = jest.fn().mockResolvedValue({
            url: "https://checkout.stripe.com/test",
            id: "cs_test_123",
        });

        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "user@test.com" } },
                    error: null,
                }),
            },
            from: jest.fn(),
        } as any);

        mockStripe.mockReturnValueOnce({
            checkout: { sessions: { create: mockCreate } },
        } as any);

        const res = await POST(buildRequest());
        expect(res.status).toBe(200);

        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "payment",
                client_reference_id: "uid-1",
                customer_email: "user@test.com",
                line_items: expect.arrayContaining([
                    expect.objectContaining({
                        price_data: expect.objectContaining({
                            unit_amount: 999,
                        }),
                    }),
                ]),
            })
        );
    });

    it("returns 200 with a valid checkout URL on success", async () => {
        const mockCreate = jest.fn().mockResolvedValue({
            url: "https://checkout.stripe.com/pay/cs_test_123",
        });

        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "user@test.com" } },
                    error: null,
                }),
            },
            from: jest.fn(),
        } as any);

        mockStripe.mockReturnValueOnce({
            checkout: { sessions: { create: mockCreate } },
        } as any);

        const res = await POST(buildRequest());
        const body = await res.json();
        expect(body.url).toContain("checkout.stripe.com");
    });

    it("returns 500 if Stripe throws an error", async () => {
        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "user@test.com" } },
                    error: null,
                }),
            },
            from: jest.fn(),
        } as any);

        mockStripe.mockReturnValueOnce({
            checkout: {
                sessions: {
                    create: jest.fn().mockRejectedValue(new Error("Stripe down")),
                },
            },
        } as any);

        const res = await POST(buildRequest());
        expect(res.status).toBe(500);
    });
});
