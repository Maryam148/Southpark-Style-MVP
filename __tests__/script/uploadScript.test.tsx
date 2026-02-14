/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// We need to mock useUser before importing the page
const mockUser = {
    id: "test-uid",
    email: "test@test.com",
    full_name: "Test User",
    is_paid: true,
    plan: "pro",
};

jest.mock("@/hooks/useUser", () => ({
    useUser: () => ({
        user: mockUser,
        authUser: { id: "test-uid", email: "test@test.com" },
        loading: false,
        error: null,
        refresh: jest.fn(),
    }),
}));

const mockInsert = jest.fn().mockResolvedValue({ error: null });
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
        from: () => ({
            insert: mockInsert,
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: "test-uid" }, error: null }),
        }),
    }),
}));

import UploadScriptClient from "@/app/dashboard/upload-script/UploadScriptClient";

const validJSON = JSON.stringify({
    episodeTitle: "Test Episode",
    scenes: [
        {
            sceneId: "s1",
            sceneName: "Opening",
            background: "test_bg",
            characters: [
                {
                    name: "Jax",
                    position: "left",
                    dialogue: [{ line: "Hello!", mouthShape: "talking" }],
                },
            ],
        },
        {
            sceneId: "s2",
            sceneName: "Closing",
            background: "test_bg_2",
            characters: [
                {
                    name: "Tyrell",
                    position: "right",
                    dialogue: [{ line: "Bye!", mouthShape: "talking" }],
                },
            ],
        },
    ],
});

describe("UploadScriptClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders show title, episode title, and script textarea", () => {
        render(<UploadScriptClient userId="test-uid" />);
        expect(screen.getByLabelText(/show title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/episode title/i)).toBeInTheDocument();
        expect(
            screen.getByPlaceholderText(/episodeTitle.*scenes/i) ||
            screen.getByLabelText(/script json/i)
        ).toBeInTheDocument();
    });

    it("shows validation errors for invalid JSON before submission", async () => {
        render(<UploadScriptClient userId="test-uid" />);

        const textarea = screen.getByLabelText(/script json/i);
        fireEvent.change(textarea, { target: { value: "not json" } });

        const validateBtn = screen.getByRole("button", { name: /validate/i });
        fireEvent.click(validateBtn);

        await waitFor(() => {
            expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
        });
    });

    it("calls Supabase insert with status 'draft' on valid submission", async () => {
        render(<UploadScriptClient userId="test-uid" />);

        // Fill in required fields
        fireEvent.change(screen.getByLabelText(/show title/i), {
            target: { value: "My Show" },
        });

        const textarea = screen.getByLabelText(/script json/i);
        fireEvent.change(textarea, { target: { value: validJSON } });

        // Validate first
        const validateBtn = screen.getByRole("button", { name: /validate/i });
        fireEvent.click(validateBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Invalid JSON/i)).not.toBeInTheDocument();
        });

        // Submit
        const submitBtn = screen.getByRole("button", { name: /Save as Draft/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "draft",
                    user_id: "test-uid",
                })
            );
        });
    });

    it("shows error if Supabase insert fails", async () => {
        mockInsert.mockResolvedValueOnce({
            error: { message: "Database error" },
        });

        render(<UploadScriptClient userId="test-uid" />);

        fireEvent.change(screen.getByLabelText(/show title/i), {
            target: { value: "My Show" },
        });

        const textarea = screen.getByLabelText(/script json/i);
        fireEvent.change(textarea, { target: { value: validJSON } });

        const validateBtn = screen.getByRole("button", { name: /validate/i });
        fireEvent.click(validateBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Invalid JSON/i)).not.toBeInTheDocument();
        });

        const submitBtn = screen.getByRole("button", { name: /Save as Draft/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/Failed to save: Database error/i)).toBeInTheDocument();
        });
    });
});
