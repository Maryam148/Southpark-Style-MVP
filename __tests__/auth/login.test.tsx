/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

// Access global mocks
const mockAuth = (globalThis as Record<string, any>).__mockSupabaseAuth;
const mockPush = (globalThis as Record<string, any>).__mockRouterPush;

describe("LoginPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders login form with email and password fields", () => {
        render(<LoginPage />);
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("calls supabase.auth.signInWithPassword with correct credentials", async () => {
        mockAuth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

        render(<LoginPage />);
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: "user@test.com" },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: "password123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() => {
            expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
                email: "user@test.com",
                password: "password123",
            });
        });
    });

    it("shows error message if supabase returns an error", async () => {
        mockAuth.signInWithPassword.mockResolvedValueOnce({
            data: {},
            error: { message: "Invalid login credentials" },
        });

        render(<LoginPage />);
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: "bad@test.com" },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: "wrong" },
        });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
        });
    });

    it("redirects to /dashboard on successful login", async () => {
        mockAuth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

        render(<LoginPage />);
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: "user@test.com" },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: "password123" },
        });
        fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/dashboard");
        });
    });
});
