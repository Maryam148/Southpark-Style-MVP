/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/* ── Supabase mock chain ──────────────────────────────── */
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();

const chainable = {
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

// Initial fetch returns 2 assets
mockSelect.mockImplementation(() => {
    mockOrder.mockResolvedValueOnce({
        data: [
            {
                id: "a1",
                name: "jax_body",
                asset_type: "character",
                url: "https://res.cloudinary.com/test/jax_body.png",
                cloudinary_id: "jax_body",
            },
            {
                id: "a2",
                name: "school_bg",
                asset_type: "background",
                url: "https://res.cloudinary.com/test/school_bg.png",
                cloudinary_id: "school_bg",
            },
        ],
        error: null,
    });
    return chainable;
});

jest.mock("@/lib/supabaseClient", () => ({
    createClient: () => ({
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: "test-uid" } },
                error: null,
            }),
            onAuthStateChange: jest.fn(() => ({
                data: { subscription: { unsubscribe: jest.fn() } },
            })),
        },
        from: () => chainable,
    }),
}));

jest.mock("@/hooks/useUser", () => ({
    useUser: () => ({
        user: {
            id: "test-uid",
            email: "test@test.com",
            full_name: "Test",
            is_paid: true,
            plan: "pro",
        },
        loading: false,
        error: null,
        refresh: jest.fn(),
    }),
}));

// Must import after mocks
import type { Asset, AssetType } from "@/types";
import AssetLibraryClient from "@/app/dashboard/asset-library/AssetLibraryClient";

const mockInitialAssets: Asset[] = [
    {
        id: "a1",
        name: "jax_body",
        asset_type: "character" as AssetType,
        url: "https://res.cloudinary.com/test/jax_body.png",
        cloudinary_id: "jax_body",
        size_bytes: 1024,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "test-uid",
    },
    {
        id: "a2",
        name: "school_bg",
        asset_type: "background" as AssetType,
        url: "https://res.cloudinary.com/test/school_bg.png",
        cloudinary_id: "school_bg",
        size_bytes: 2048,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "test-uid",
    },
];

describe("AssetLibraryClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear fetch mocks
        (global.fetch as jest.Mock).mockReset();
    });

    it("renders upload button and asset grid", () => {
        render(
            <AssetLibraryClient
                initialAssets={mockInitialAssets}
                userId="test-uid"
            />
        );
        expect(
            screen.getByRole("button", { name: /upload asset/i })
        ).toBeInTheDocument();
        expect(screen.getByText("jax_body")).toBeInTheDocument();
        expect(screen.getByText("school_bg")).toBeInTheDocument();
    });

    it("shows empty state when no assets exist", () => {
        render(
            <AssetLibraryClient
                initialAssets={[]}
                userId="test-uid"
            />
        );
        expect(screen.getByText(/no assets yet/i)).toBeInTheDocument();
    });

    it("filters assets by type", () => {
        render(
            <AssetLibraryClient
                initialAssets={mockInitialAssets}
                userId="test-uid"
            />
        );

        // Initial state: 2 assets
        expect(screen.getByText(/all \(2\)/i)).toBeInTheDocument();

        // Click "Background" filter
        const bgFilter = screen.getByRole("button", { name: /background \(1\)/i });
        fireEvent.click(bgFilter);

        expect(screen.getByText("school_bg")).toBeInTheDocument();
        expect(screen.queryByText("jax_body")).not.toBeInTheDocument();
    });

    it("opens upload panel when upload button is clicked", () => {
        render(
            <AssetLibraryClient
                initialAssets={[]}
                userId="test-uid"
            />
        );

        const uploadBtn = screen.getByRole("button", { name: /upload asset/i });
        fireEvent.click(uploadBtn);

        expect(screen.getByText("Upload New Asset")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("jax_body")).toBeInTheDocument();
    });
});
