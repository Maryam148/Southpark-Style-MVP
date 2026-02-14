/**
 * Integration test — full flow simulation
 *
 * Tests the happy path and failure paths by chaining mock calls
 * across the register → pay → upload → generate pipeline.
 */
import { POST as createCheckout } from "@/app/api/stripe/create-checkout/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { POST as generate } from "@/app/api/generate/episode/route";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

const mockCreateServerSupabaseClient =
    createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>;
const mockCreateAdminClient =
    createAdminClient as jest.MockedFunction<typeof createAdminClient>;
const mockGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;

const validScript = JSON.stringify({
    episodeTitle: "Integration Test Episode",
    scenes: [
        {
            sceneId: "s1",
            sceneName: "Scene One",
            background: "classroom",
            characters: [
                {
                    name: "Jax",
                    position: "left",
                    dialogue: [{ line: "Hey!", mouthShape: "talking" }],
                },
            ],
            props: [],
        },
        {
            sceneId: "s2",
            sceneName: "Scene Two",
            background: "hallway",
            characters: [
                {
                    name: "Tyrell",
                    position: "right",
                    dialogue: [{ line: "What's up?", mouthShape: "talking" }],
                },
            ],
            props: [],
        },
        {
            sceneId: "s3",
            sceneName: "Scene Three",
            characters: [
                {
                    name: "Leo",
                    position: "center",
                    dialogue: [{ line: "Let's go!", mouthShape: "talking" }],
                },
            ],
            props: [],
        },
        {
            sceneId: "s4",
            sceneName: "Scene Four",
            background: "park",
            characters: [
                {
                    name: "Emily",
                    position: "left",
                    dialogue: [{ line: "See ya!", mouthShape: "talking" }],
                },
            ],
            props: [],
        },
    ],
});

describe("Integration: Full Happy Path", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("register → pay → upload script → generate → episode ready", async () => {
        // ── Step 1: Checkout creates a session URL ─────────
        const mockCheckoutCreate = jest
            .fn()
            .mockResolvedValue({ url: "https://checkout.stripe.com/test", id: "cs_test" });

        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "test@test.com" } },
                    error: null,
                }),
            },
            from: jest.fn(),
        } as any);

        mockGetStripe.mockReturnValueOnce({
            checkout: { sessions: { create: mockCheckoutCreate } },
        } as any);

        const checkoutRes = await createCheckout(
            new NextRequest("http://localhost:3000/api/stripe/create-checkout", {
                method: "POST",
                headers: { origin: "http://localhost:3000" },
            })
        );
        expect(checkoutRes.status).toBe(200);
        const { url } = await checkoutRes.json();
        expect(url).toContain("checkout.stripe.com");

        // ── Step 2: Webhook marks user as paid ──────────────
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
                            id: "cs_test",
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

        const webhookRes = await webhook(
            new NextRequest("http://localhost:3000/api/stripe/webhook", {
                method: "POST",
                body: "{}",
                headers: new Headers({ "stripe-signature": "valid" }),
            })
        );
        expect(webhookRes.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ is_paid: true, plan: "pro" })
        );

        // ── Step 3: Generate episode with 4 scenes ──────────
        const mockEqChain = {
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: {
                    id: "ep-1",
                    user_id: "uid-1",
                    script: validScript,
                    status: "draft",
                },
                error: null,
            }),
        };

        const mockEpisodeUpdate = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });

        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "test@test.com" } },
                    error: null,
                }),
            },
            from: jest.fn().mockImplementation((table: string) => {
                if (table === "episodes") {
                    return {
                        select: jest.fn().mockReturnValue(mockEqChain),
                        update: mockEpisodeUpdate,
                    };
                }
                if (table === "assets") {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                        }),
                    };
                }
                return {};
            }),
        } as any);

        const genRes = await generate(
            new NextRequest("http://localhost:3000/api/generate/episode", {
                method: "POST",
                body: JSON.stringify({ episode_id: "ep-1" }),
                headers: { "content-type": "application/json" },
            })
        );

        expect(genRes.status).toBe(200);

        const genBody = await genRes.json();
        expect(genBody.playable).toBeDefined();
        expect(genBody.playable.scenes).toHaveLength(4);
        expect(mockEpisodeUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ status: "completed" })
        );
    });
});

describe("Integration: Failure Paths", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("unauthenticated user cannot reach generate endpoint", async () => {
        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: null },
                    error: { message: "No session" },
                }),
            },
            from: jest.fn(),
        } as any);

        const res = await generate(
            new NextRequest("http://localhost:3000/api/generate/episode", {
                method: "POST",
                body: JSON.stringify({ episode_id: "ep-1" }),
                headers: { "content-type": "application/json" },
            })
        );
        expect(res.status).toBe(401);
    });

    it("missing episode_id returns 400", async () => {
        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "test@test.com" } },
                    error: null,
                }),
            },
            from: jest.fn(),
        } as any);

        const res = await generate(
            new NextRequest("http://localhost:3000/api/generate/episode", {
                method: "POST",
                body: JSON.stringify({}),
                headers: { "content-type": "application/json" },
            })
        );
        expect(res.status).toBe(400);
    });
});
