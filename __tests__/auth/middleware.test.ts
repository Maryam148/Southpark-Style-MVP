/**
 * Middleware unit tests
 * Tests the auth guard logic independently by mocking the Supabase client.
 */
import { middleware } from "@/middleware";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

jest.mock("@supabase/ssr", () => ({
    createServerClient: jest.fn(),
}));

const mockedCreateServerClient = createServerClient as jest.Mock;

function buildRequest(path: string): NextRequest {
    return new NextRequest(new URL(`http://localhost:3000${path}`), {
        headers: new Headers(),
    });
}

describe("Auth Middleware", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function setupMock(user: { id: string; email: string } | null) {
        mockedCreateServerClient.mockReturnValue({
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user },
                    error: user ? null : { message: "No session" },
                }),
            },
        });
    }

    it("redirects unauthenticated user from /dashboard to /login", async () => {
        setupMock(null);
        const req = buildRequest("/dashboard");
        const res = await middleware(req);
        expect(res?.status).toBe(307);
        expect(res?.headers.get("location")).toContain("/login");
    });

    it("redirects unauthenticated user from /dashboard/generate to /login", async () => {
        setupMock(null);
        const req = buildRequest("/dashboard/generate");
        const res = await middleware(req);
        expect(res?.status).toBe(307);
        expect(res?.headers.get("location")).toContain("/login");
    });

    it("allows authenticated user to access /dashboard", async () => {
        setupMock({ id: "uid-1", email: "user@test.com" });
        const req = buildRequest("/dashboard");
        const res = await middleware(req);
        // Should NOT redirect — returns a next() response
        expect(res?.status).not.toBe(307);
    });

    it("redirects authenticated user away from /login", async () => {
        setupMock({ id: "uid-1", email: "user@test.com" });
        const req = buildRequest("/login");
        const res = await middleware(req);
        expect(res?.status).toBe(307);
        expect(res?.headers.get("location")).toContain("/dashboard");
    });

    it("redirects authenticated user away from /register", async () => {
        setupMock({ id: "uid-1", email: "user@test.com" });
        const req = buildRequest("/register");
        const res = await middleware(req);
        expect(res?.status).toBe(307);
        expect(res?.headers.get("location")).toContain("/dashboard");
    });

    it("calls supabase.auth.getUser on every protected request", async () => {
        const mockGetUser = jest.fn().mockResolvedValue({
            data: { user: { id: "uid-1", email: "user@test.com" } },
            error: null,
        });
        mockedCreateServerClient.mockReturnValue({
            auth: { getUser: mockGetUser },
        });
        const req = buildRequest("/dashboard");
        await middleware(req);
        expect(mockGetUser).toHaveBeenCalledTimes(1);
    });
});
