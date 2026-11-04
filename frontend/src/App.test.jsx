import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App.jsx";

vi.mock("./services/taskService.js", () => ({
  getAllTasks: vi.fn().mockResolvedValue({ tasks: [] }),
  getDashboardStats: vi.fn().mockResolvedValue({ totalTasks: 0, openTasks: 0, completedTasks: 0, overdueTasks: 0 }),
  getWeeklyTasks: vi.fn().mockResolvedValue([]),
  searchTasks: vi.fn().mockResolvedValue({ tasks: [] }),
  createTask: vi.fn().mockResolvedValue({}),
  updateTask: vi.fn().mockResolvedValue({}),
  deleteTask: vi.fn().mockResolvedValue({}),
  updateTaskStatus: vi.fn().mockResolvedValue({}),
}));

vi.mock("./services/authService.js", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "user-1", name: "Test User", email: "test@example.com" }),
  loginAccount: vi.fn(),
  registerAccount: vi.fn(),
}));

beforeEach(() => {
  localStorage.setItem("taskflow_token", "test-token");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe("TaskFlow dashboard", () => {
  it("renders a dashboard and an empty state when there are no tasks", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /make room for what matters/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("A little breathing room")).toBeInTheDocument());
  });

  it("opens the task form and validates required fields", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("A little breathing room")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: "Add a task" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.submit(screen.getByRole("dialog").querySelector("form"));
    expect(await screen.findByText("Add a title, date, and time before saving.")).toBeInTheDocument();
  });

  it("opens My week and shows the weekly task report", async () => {
    const { getWeeklyTasks } = await import("./services/taskService.js");
    getWeeklyTasks.mockResolvedValueOnce([{
      weekStart: "2026-11-02T00:00:00.000Z",
      weekEnd: "2026-11-08T00:00:00.000Z",
      totalTasks: 2,
      openTasks: 1,
      completedTasks: 1,
      progressPercentage: 50,
      tasks: [
        {
          _id: "report-task-1",
          title: "Finish weekly report",
          description: "Review this week's work",
          scheduledDate: "2026-11-04T00:00:00.000Z",
          scheduledTime: "14:00",
          priority: "High",
          status: "In Progress",
        },
        {
          _id: "report-task-2",
          title: "Send project update",
          scheduledDate: "2026-11-05T00:00:00.000Z",
          scheduledTime: "15:00",
          priority: "Medium",
          status: "Completed",
        },
      ],
    }]);

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /my week/i }));
    expect(await screen.findByRole("heading", { name: /my week/i })).toBeInTheDocument();
    expect(await screen.findByText("Finish weekly report")).toBeInTheDocument();
    expect(screen.getByText("50% complete")).toBeInTheDocument();
    expect(getWeeklyTasks).toHaveBeenCalled();
  });
});
