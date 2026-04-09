import {
  MAX_CHAT_MESSAGES,
  MAX_LOG_ENTRIES,
  appendChatMessage,
  appendLog,
  loadChat,
  loadLogs,
  runAgentCycle,
} from "@/lib/puter";

interface MockPuterOptions {
  chatResponse?: string;
}

function createPuterMock(options: MockPuterOptions = {}) {
  const store = new Map<string, string>();
  const chatResponse = options.chatResponse ?? '{"thought":"ok","action":"act","result":"done","newMemory":"next"}';

  return {
    ai: {
      chat: vi.fn().mockResolvedValue(chatResponse),
    },
    kv: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      list: vi.fn(async () => Array.from(store.keys())),
    },
    fs: {
      write: vi.fn(async () => {}),
      read: vi.fn(),
    },
    auth: {
      isLoggedIn: vi.fn(() => true),
      signIn: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  };
}

describe("puter persistence helpers", () => {
  afterEach(() => {
    delete (window as Window & { puter?: unknown }).puter;
  });

  it("keeps the newest MAX_LOG_ENTRIES activity items", async () => {
    window.puter = createPuterMock() as never;

    for (let index = 0; index < MAX_LOG_ENTRIES + 5; index += 1) {
      await appendLog({
        thought: `thought-${index}`,
        action: `action-${index}`,
        result: `result-${index}`,
      });
    }

    const logs = await loadLogs();

    expect(logs).toHaveLength(MAX_LOG_ENTRIES);
    expect(logs[0]?.thought).toBe(`thought-${MAX_LOG_ENTRIES + 4}`);
    expect(logs.at(-1)?.thought).toBe("thought-5");
  });

  it("keeps the newest MAX_CHAT_MESSAGES chat items", async () => {
    window.puter = createPuterMock() as never;

    for (let index = 0; index < MAX_CHAT_MESSAGES + 5; index += 1) {
      await appendChatMessage("user", `message-${index}`);
    }

    const messages = await loadChat();

    expect(messages).toHaveLength(MAX_CHAT_MESSAGES);
    expect(messages[0]?.content).toBe("message-5");
    expect(messages.at(-1)?.content).toBe(`message-${MAX_CHAT_MESSAGES + 4}`);
  });

  it("throws a parse error when the cycle response is not valid JSON", async () => {
    window.puter = createPuterMock({ chatResponse: "not-json" }) as never;

    await expect(runAgentCycle("goal", "memory")).rejects.toMatchObject({
      kind: "parse",
      source: "cycle",
    });
  });
});
