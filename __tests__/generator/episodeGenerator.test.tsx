/**
 * POST /api/generate/episode — unit tests
 */
import { POST } from "@/app/api/generate/episode/route";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const mockCreateServerSupabaseClient =
    createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>;

function buildRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest("http://localhost:3000/api/generate/episode", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
    });
}

const validScript = JSON.stringify({
    episodeTitle: "Test Episode",
    scenes: [
        {
            sceneId: "s1",
            sceneName: "Opening",
            background: "school",
            characters: [
                {
                    name: "Jax",
                    position: "left",
                    dialogue: [{ line: "Hello!", mouthShape: "talking" }],
                },
            ],
            props: [],
        },
    ],
});

describe("POST /api/generate/episode", () => {
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

        const res = await POST(buildRequest({ episode_id: "ep-1" }));
        expect(res.status).toBe(401);
    });

    it("returns 400 if episode_id is missing", async () => {
        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "test@test.com" } },
                    error: null,
                }),
            },
            from: jest.fn(),
        } as any);

        const res = await POST(buildRequest({}));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain("episode_id");
    });

    it("returns 404 if episode not found", async () => {
        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: "Not found" },
                        }),
                    }),
                }),
            }),
        });

        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "test@test.com" } },
                    error: null,
                }),
            },
            from: mockFrom,
        } as any);

        const res = await POST(buildRequest({ episode_id: "nonexistent" }));
        expect(res.status).toBe(404);
    });

    it("resolves character assets and falls back to colored SVGs", async () => {
        // Call counter to know which `.from()` call we're on
        let fromCallCount = 0;

        const mockFrom = jest.fn().mockImplementation((table: string) => {
            fromCallCount++;
            if (table === "episodes") {
                return {
                    select: jest.fn().mockReturnValue({
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
                    }),
                    update: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    }),
                };
            }
            if (table === "assets") {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({
                            data: [], // No assets uploaded — should use placeholders
                            error: null,
                        }),
                    }),
                };
            }
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
                update: jest.fn().mockReturnThis(),
            };
        });

        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "test@test.com" } },
                    error: null,
                }),
            },
            from: mockFrom,
        } as any);

        const res = await POST(buildRequest({ episode_id: "ep-1" }));
        expect(res.status).toBe(200);

        const body = await res.json();
        // Should contain resolved scenes with placeholder SVG data URLs
        expect(body.playable).toBeDefined();
    });

    it("saves resolved episode back to Supabase with status 'completed'", async () => {
        const mockUpdate = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            }),
        });

        const mockFrom = jest.fn().mockImplementation((table: string) => {
            if (table === "episodes") {
                return {
                    select: jest.fn().mockReturnValue({
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
                    }),
                    update: mockUpdate,
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
        });

        mockCreateServerSupabaseClient.mockResolvedValueOnce({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: "uid-1", email: "test@test.com" } },
                    error: null,
                }),
            },
            from: mockFrom,
        } as any);

        const res = await POST(buildRequest({ episode_id: "ep-1" }));
        expect(res.status).toBe(200);

        // The update should have been called with status "completed"
        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "completed",
            })
        );
    });
});
