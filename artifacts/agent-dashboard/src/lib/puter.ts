import type { AgentLog, ChatMessage, AgentConfig, AgentMemory } from "@/types/agent";

const KEYS = {
  memory: "nexus:memory",
  config: "nexus:config",
  logs: "nexus:logs",
  chat: "nexus:chat",
  logCounter: "nexus:log_counter",
  chatCounter: "nexus:chat_counter",
} as const;

const DEFAULT_CONFIG: AgentConfig = {
  goal: "Continuously observe, analyze, and optimize the user's workflow by identifying inefficiencies, suggesting improvements, and taking actions when possible.",
  intervalSeconds: 30,
  isRunning: false,
};

// Extract text from puter.ai.chat response (handles v1 string and v2 object)
function extractText(response: string | { message?: { content: string }; content?: string }): string {
  if (typeof response === "string") return response;
  return response?.message?.content ?? response?.content ?? "";
}

export async function puterChat(prompt: string): Promise<string> {
  const response = await window.puter.ai.chat(prompt);
  return extractText(response as string | { message?: { content: string }; content?: string });
}

// ── Memory ──────────────────────────────────────────────────────────────────

export async function loadMemory(): Promise<AgentMemory> {
  const raw = await window.puter.kv.get(KEYS.memory);
  if (!raw) return { content: "", updatedAt: new Date().toISOString() };
  try {
    return JSON.parse(raw) as AgentMemory;
  } catch {
    return { content: raw, updatedAt: new Date().toISOString() };
  }
}

export async function saveMemory(content: string): Promise<AgentMemory> {
  const mem: AgentMemory = { content, updatedAt: new Date().toISOString() };
  await window.puter.kv.set(KEYS.memory, JSON.stringify(mem));
  return mem;
}

// ── Config ───────────────────────────────────────────────────────────────────

export async function loadConfig(): Promise<AgentConfig> {
  const raw = await window.puter.kv.get(KEYS.config);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AgentConfig>) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: AgentConfig): Promise<void> {
  await window.puter.kv.set(KEYS.config, JSON.stringify(config));
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export async function loadLogs(): Promise<AgentLog[]> {
  const raw = await window.puter.kv.get(KEYS.logs);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AgentLog[];
  } catch {
    return [];
  }
}

async function nextLogId(): Promise<number> {
  const raw = await window.puter.kv.get(KEYS.logCounter);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await window.puter.kv.set(KEYS.logCounter, String(next));
  return next;
}

export async function appendLog(entry: Omit<AgentLog, "id" | "timestamp">): Promise<AgentLog> {
  const logs = await loadLogs();
  const id = await nextLogId();
  const log: AgentLog = { id, ...entry, timestamp: new Date().toISOString() };
  const updated = [log, ...logs].slice(0, 100); // keep last 100
  await window.puter.kv.set(KEYS.logs, JSON.stringify(updated));

  // Also write to puter.fs as a human-readable file
  try {
    const lines = updated
      .map((l) => `[${l.timestamp}] THOUGHT: ${l.thought}\nACTION: ${l.action}\nRESULT: ${l.result}\n`)
      .join("\n---\n");
    await window.puter.fs.write("nexus-agent-log.txt", lines);
  } catch {
    // fs write is best-effort
  }

  return log;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function loadChat(): Promise<ChatMessage[]> {
  const raw = await window.puter.kv.get(KEYS.chat);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

async function nextChatId(): Promise<number> {
  const raw = await window.puter.kv.get(KEYS.chatCounter);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await window.puter.kv.set(KEYS.chatCounter, String(next));
  return next;
}

export async function appendChatMessage(role: "user" | "agent", content: string): Promise<ChatMessage> {
  const messages = await loadChat();
  const id = await nextChatId();
  const msg: ChatMessage = { id, role, content, timestamp: new Date().toISOString() };
  const updated = [...messages, msg].slice(-200); // keep last 200
  await window.puter.kv.set(KEYS.chat, JSON.stringify(updated));
  return msg;
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export async function resetAgent(): Promise<void> {
  await Promise.all([
    window.puter.kv.del(KEYS.memory),
    window.puter.kv.del(KEYS.config),
    window.puter.kv.del(KEYS.logs),
    window.puter.kv.del(KEYS.chat),
    window.puter.kv.del(KEYS.logCounter),
    window.puter.kv.del(KEYS.chatCounter),
  ]);
  try {
    await window.puter.fs.write("nexus-agent-log.txt", "");
  } catch {
    // best-effort
  }
}

// ── Agent Cycle ───────────────────────────────────────────────────────────────

interface CycleResult {
  thought: string;
  action: string;
  result: string;
  newMemory: string;
}

export async function runAgentCycle(goal: string, memory: string): Promise<CycleResult> {
  const prompt = `You are an autonomous AI agent. Your goal is: "${goal}"

Your previous memory:
${memory || "(empty — this is your first cycle)"}

Your task:
1. Reflect on what you know and what your goal is.
2. Decide what action to take right now to make progress toward that goal.
3. Describe the result of that action (simulate it if needed).
4. Update your memory with important learnings, progress, and next steps.

Respond ONLY with a valid JSON object in this exact format:
{
  "thought": "<your reflection and reasoning>",
  "action": "<the specific action you are taking>",
  "result": "<what happened as a result of the action>",
  "newMemory": "<updated memory text for your next cycle>"
}`;

  const text = await puterChat(prompt);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as CycleResult;
    return {
      thought: parsed.thought ?? "",
      action: parsed.action ?? "",
      result: parsed.result ?? "",
      newMemory: parsed.newMemory ?? memory,
    };
  } catch {
    return {
      thought: "Processed this cycle.",
      action: "Reflected on current goal.",
      result: "Cycle completed.",
      newMemory: memory,
    };
  }
}

export async function sendUserMessage(content: string, goal: string, memory: string, history: ChatMessage[]): Promise<string> {
  const recentHistory = history.slice(-16).map((m) => {
    const role = m.role === "agent" ? "AGENT" : "USER";
    return `${role}: ${m.content}`;
  }).join("\n");

  const prompt = `You are an autonomous AI agent in direct conversation with the user.

Your current goal: "${goal}"
Your current memory: ${memory || "(empty)"}

Recent conversation:
${recentHistory || "(none)"}

USER: ${content}

Respond naturally and helpfully as the agent. Be concise and in character. Reference your goal and memory when relevant. Do NOT wrap your reply in JSON.`;

  return await puterChat(prompt);
}
