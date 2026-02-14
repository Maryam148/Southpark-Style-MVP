/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "@/app/(auth)/register/page";

const mockAuth = (globalThis as Record<string, any>).__mockSupabaseAuth;
const mockFrom = (globalThis as Record<string, any>).__mockSupabaseFrom;
const mockPush = (globalThis as Record<string, any>).__mockRouterPush;

describe("RegisterPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("renders registration form with name, email, and password", () => {
        render(<RegisterPage />);
        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("calls supabase.auth.signUp with email and password", async () => {
        mockAuth.signUp.mockResolvedValueOnce({
            data: { user: { id: "new-uid", email: "new@test.com" } },
            error: null,
        });
        mockFrom.mockReturnValueOnce({
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        });

        render(<RegisterPage />);
        fireEvent.change(screen.getByLabelText(/full name/i), {
            target: { value: "Test User" },
        });
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: "new@test.com" },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: "StrongPass1!" },
        });
        fireEvent.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() => {
            expect(mockAuth.signUp).toHaveBeenCalledWith({
                email: "new@test.com",
                password: "StrongPass1!",
                options: { data: { full_name: "Test User" } },
            });
        });
    });

    it("shows success message after registration", async () => {
        mockAuth.signUp.mockResolvedValueOnce({
            data: { user: { id: "new-uid", email: "new@test.com" } },
            error: null,
        });
        mockFrom.mockReturnValueOnce({
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        });

        render(<RegisterPage />);
        fireEvent.change(screen.getByLabelText(/full name/i), {
            target: { value: "Test User" },
        });
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: "new@test.com" },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: "StrongPass1!" },
        });
        fireEvent.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText(/account created/i)).toBeInTheDocument();
        });
    });

    it("shows error if email already exists", async () => {
        mockAuth.signUp.mockResolvedValueOnce({
            data: { user: null },
            error: { message: "User already registered" },
        });

        render(<RegisterPage />);
        fireEvent.change(screen.getByLabelText(/full name/i), {
            target: { value: "Test User" },
        });
        fireEvent.change(screen.getByLabelText(/email/i), {
            target: { value: "existing@test.com" },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: "StrongPass1!" },
        });
        fireEvent.click(screen.getByRole("button", { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText(/user already registered/i)).toBeInTheDocument();
        });
    });
});
