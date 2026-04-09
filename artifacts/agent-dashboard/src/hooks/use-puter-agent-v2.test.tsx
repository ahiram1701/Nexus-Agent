import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { usePuterAgent } from "@/hooks/use-puter-agent-v2";
import { PUTER_SDK_WAIT_TIMEOUT_MS, PuterClientError } from "@/lib/puter";

const puterModuleMocks = vi.hoisted(() => ({
  loadMemory: vi.fn(),
  saveMemory: vi.fn(),
  loadConfig: vi.fn(),
  saveConfig: vi.fn(),
  loadLogs: vi.fn(),
  appendLog: vi.fn(),
  loadChat: vi.fn(),
  appendChatMessage: vi.fn(),
  runAgentCycle: vi.fn(),
  sendUserMessage: vi.fn(),
  resetAgent: vi.fn(),
}));

vi.mock("@/lib/puter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/puter")>("@/lib/puter");

  return {
    ...actual,
    loadMemory: puterModuleMocks.loadMemory,
    saveMemory: puterModuleMocks.saveMemory,
    loadConfig: puterModuleMocks.loadConfig,
    saveConfig: puterModuleMocks.saveConfig,
    loadLogs: puterModuleMocks.loadLogs,
    appendLog: puterModuleMocks.appendLog,
    loadChat: puterModuleMocks.loadChat,
    appendChatMessage: puterModuleMocks.appendChatMessage,
    runAgentCycle: puterModuleMocks.runAgentCycle,
    sendUserMessage: puterModuleMocks.sendUserMessage,
    resetAgent: puterModuleMocks.resetAgent,
  };
});

function createWindowPuter(loggedIn = true) {
  return {
    auth: {
      isLoggedIn: vi.fn(() => loggedIn),
      signIn: vi.fn().mockResolvedValue({ username: "tester", uuid: "uuid-1" }),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    ai: { chat: vi.fn() },
    kv: { get: vi.fn(), set: vi.fn(), del: vi.fn(), list: vi.fn() },
    fs: { write: vi.fn(), read: vi.fn() },
  };
}

describe("usePuterAgent", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.puter = createWindowPuter(true) as never;

    puterModuleMocks.loadMemory.mockResolvedValue({ content: "memory", updatedAt: "2026-04-09T00:00:00.000Z" });
    puterModuleMocks.saveMemory.mockImplementation(async (content: string) => ({
      content,
      updatedAt: "2026-04-09T00:00:00.000Z",
    }));
    puterModuleMocks.loadConfig.mockResolvedValue({ goal: "goal", intervalSeconds: 30, isRunning: false });
    puterModuleMocks.saveConfig.mockResolvedValue(undefined);
    puterModuleMocks.loadLogs.mockResolvedValue([]);
    puterModuleMocks.appendLog.mockResolvedValue({
      id: 1,
      thought: "thought",
      action: "action",
      result: "result",
      timestamp: "2026-04-09T00:00:00.000Z",
    });
    puterModuleMocks.loadChat.mockResolvedValue([]);
    puterModuleMocks.appendChatMessage.mockImplementation(async (role: "user" | "agent", content: string) => ({
      id: 1,
      role,
      content,
      timestamp: "2026-04-09T00:00:00.000Z",
    }));
    puterModuleMocks.runAgentCycle.mockResolvedValue({
      thought: "thought",
      action: "action",
      result: "result",
      newMemory: "new-memory",
    });
    puterModuleMocks.sendUserMessage.mockResolvedValue({
      reply: "reply",
      newMemory: "new-memory",
    });
    puterModuleMocks.resetAgent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete (window as Window & { puter?: unknown }).puter;
  });

  it("reports auth_required instead of pretending the app failed to load", async () => {
    window.puter = createWindowPuter(false) as never;

    const { result } = renderHook(() => usePuterAgent());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connectionStatus).toBe("auth_required");
    expect(result.current.activeIssue?.kind).toBe("auth_required");
  });

  it("reports sdk_unavailable when Puter never appears", async () => {
    vi.useFakeTimers();
    delete (window as Window & { puter?: unknown }).puter;

    const { result } = renderHook(() => usePuterAgent());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PUTER_SDK_WAIT_TIMEOUT_MS + 100);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.connectionStatus).toBe("sdk_unavailable");
    expect(result.current.activeIssue?.kind).toBe("sdk_unavailable");
  });

  it("keeps parse errors visible after a failed cycle", async () => {
    puterModuleMocks.runAgentCycle.mockRejectedValue(
      new PuterClientError(
        "parse",
        "cycle",
        "La respuesta del ciclo no se pudo interpretar.",
        { retryable: true },
      ),
    );

    const { result } = renderHook(() => usePuterAgent());

    await waitFor(() => expect(result.current.connectionStatus).toBe("ready"));

    await act(async () => {
      await result.current.runCycle();
    });

    await waitFor(() => expect(result.current.recentIssues[0]?.kind).toBe("parse"));

    expect(result.current.activeIssue?.source).toBe("cycle");
  });
});
