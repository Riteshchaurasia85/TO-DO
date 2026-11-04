import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthScreen from "./AuthScreen.jsx";
import { loginAccount } from "./services/authService.js";

vi.mock("./services/authService.js", () => ({
  loginAccount: vi.fn().mockResolvedValue({
    user: { id: "user-1", name: "Ari", email: "ari@example.com" },
    token: "session-token",
  }),
  registerAccount: vi.fn().mockResolvedValue({
    user: { id: "user-1", name: "Ari", email: "ari@example.com" },
    token: "session-token",
  }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("account screen", () => {
  it("switches between manual signup and login forms", () => {
    render(<AuthScreen onAuthenticated={vi.fn()} />);
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Log in" }));
    expect(screen.queryByLabelText("Your name")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("creates an account and saves the returned session", async () => {
    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ari" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "ari@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create my account" }));
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith({
      id: "user-1", name: "Ari", email: "ari@example.com",
    }));
    expect(localStorage.getItem("taskflow_token")).toBe("session-token");
  });

  it("logs into an existing account", async () => {
    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);
    fireEvent.click(screen.getByRole("tab", { name: "Log in" }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "ari@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in to TaskFlow" }));
    await waitFor(() => expect(loginAccount).toHaveBeenCalledWith({
      email: "ari@example.com", password: "password123",
    }));
    expect(onAuthenticated).toHaveBeenCalledWith({ id: "user-1", name: "Ari", email: "ari@example.com" });
  });
});
