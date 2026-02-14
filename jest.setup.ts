import "@testing-library/jest-dom";
import fetchMock from "jest-fetch-mock";

// ── Polyfill Response.json ────────────────────────────────
if (typeof Response.json !== "function") {
    Response.json = (data: any, init?: ResponseInit) => {
        const body = JSON.stringify(data);
        return new Response(body, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...(init?.headers || {}),
            },
        });
    };
}

// ── Enable fetch mocking globally ────────────────────────
fetchMock.enableMocks();

// ── Mock next/navigation ─────────────────────────────────
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: mockRefresh,
        replace: mockReplace,
        back: jest.fn(),
        forward: jest.fn(),
        prefetch: jest.fn(),
    }),
    usePathname: () => "/dashboard",
    useSearchParams: () => new URLSearchParams(),
    redirect: jest.fn(),
}));

// ── Mock next/headers ────────────────────────────────────
jest.mock("next/headers", () => ({
    cookies: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        getAll: jest.fn(() => []),
    })),
    headers: jest.fn(() => new Map()),
}));

// ── Mock Supabase clients ────────────────────────────────
const mockSupabaseAuth = {
    getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-uid", email: "test@test.com" } },
        error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signUp: jest.fn().mockResolvedValue({
        data: { user: { id: "test-uid", email: "test@test.com" } },
        error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
    })),
};

const mockSupabaseFrom = jest.fn();

const mockSupabaseQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((cb) => cb({ data: null, error: null })),
};

mockSupabaseFrom.mockReturnValue(mockSupabaseQueryBuilder);

const mockSupabaseClient = {
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
    storage: {
        from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
            getPublicUrl: jest.fn(() => ({ data: { publicUrl: "http://test.com/v.mp4" } })),
        })),
    },
};

const mockCreateClient = jest.fn(() => mockSupabaseClient);
const mockCreateServerClient = jest.fn(async () => mockSupabaseClient);
const mockCreateAdminClient = jest.fn(() => mockSupabaseClient);

jest.mock("@/lib/supabaseClient", () => ({
    createClient: mockCreateClient,
}));

jest.mock("@/lib/supabaseServer", () => ({
    createServerSupabaseClient: mockCreateServerClient,
}));

jest.mock("@/lib/supabaseAdmin", () => ({
    createAdminClient: mockCreateAdminClient,
}));

// ── Mock Stripe ──────────────────────────────────────────
const mockStripeInstance = {
    checkout: {
        sessions: {
            create: jest.fn().mockResolvedValue({
                url: "https://checkout.stripe.com/test",
                id: "cs_test_123",
            }),
        },
    },
    webhooks: {
        constructEvent: jest.fn(),
    },
};

const mockGetStripe = jest.fn(() => mockStripeInstance);

jest.mock("@/lib/stripe", () => ({
    getStripe: mockGetStripe,
}));

// ── Mock Cloudinary ──────────────────────────────────────
const mockCloudinary = {
    config: jest.fn(),
    uploader: {
        upload: jest.fn().mockResolvedValue({
            public_id: "test_asset",
            secure_url: "https://res.cloudinary.com/test/image/upload/test.png",
        }),
        destroy: jest.fn().mockResolvedValue({ result: "ok" }),
    },
};

jest.mock("@/lib/cloudinary", () => ({
    __esModule: true,
    default: mockCloudinary,
}));

// ── Mock Canvas API ──────────────────────────────────────
const mockCanvasContext = {
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    drawImage: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    beginPath: jest.fn(),
    roundRect: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    canvas: { width: 1280, height: 720 },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "" as CanvasTextAlign,
};

// Use defineProperty to ensure the mock is applied to the prototype early
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    writable: true,
    value: jest.fn((type: string) => {
        if (type === "2d") return mockCanvasContext;
        return null;
    }),
});

// ── Export mocks for test access ─────────────────────────
(globalThis as Record<string, unknown>).__mockSupabaseClient = mockSupabaseClient;
(globalThis as Record<string, unknown>).__mockSupabaseAuth = mockSupabaseAuth;
(globalThis as Record<string, unknown>).__mockSupabaseFrom = mockSupabaseFrom;
(globalThis as Record<string, unknown>).__mockSupabaseQueryBuilder = mockSupabaseQueryBuilder;
(globalThis as Record<string, unknown>).__mockCanvasContext = mockCanvasContext;
(globalThis as Record<string, unknown>).__mockRouterPush = mockPush;
(globalThis as Record<string, unknown>).__mockRouterRefresh = mockRefresh;
(globalThis as Record<string, unknown>).__mockGetStripe = mockGetStripe;
