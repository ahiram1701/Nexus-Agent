import type {
  AgentConfig,
  AgentIssue,
  AgentIssueKind,
  AgentIssueSource,
  AgentLog,
  AgentMemory,
  ChatMessage,
} from "@/types/agent";

const KEYS = {
  memory: "nexus:memory",
  config: "nexus:config",
  logs: "nexus:logs",
  chat: "nexus:chat",
  logCounter: "nexus:log_counter",
  chatCounter: "nexus:chat_counter",
} as const;

const DEFAULT_CONFIG: AgentConfig = {
  goal: "",
  intervalSeconds: 30,
  isRunning: false,
};

export const MAX_LOG_ENTRIES = 500;
export const MAX_CHAT_MESSAGES = 1000;
export const PUTER_SDK_WAIT_TIMEOUT_MS = 6000;

interface PuterErrorOptions {
  cause?: unknown;
  details?: string;
  retryable?: boolean;
}

export class PuterClientError extends Error {
  kind: AgentIssueKind;
  source: AgentIssueSource;
  details?: string;
  retryable: boolean;

  constructor(
    kind: AgentIssueKind,
    source: AgentIssueSource,
    message: string,
    options: PuterErrorOptions = {},
  ) {
    super(message);
    this.name = "PuterClientError";
    this.kind = kind;
    this.source = source;
    this.details = options.details;
    this.retryable = options.retryable ?? true;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

function getPuter() {
  const puter = window.puter;

  if (!puter) {
    throw new PuterClientError(
      "sdk_unavailable",
      "bootstrap",
      "No pudimos cargar el SDK de Puter. Revisa tu conexión, bloqueadores de contenido o firewall y vuelve a intentarlo.",
      { retryable: true },
    );
  }

  return puter;
}

function serializeError(error: unknown): string {
  if (error instanceof PuterClientError) {
    return error.details ?? error.message;
  }

  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function issueTitleForKind(kind: AgentIssueKind): string {
  switch (kind) {
    case "sdk_unavailable":
      return "Puter no cargó";
    case "auth_required":
      return "Hace falta iniciar sesión";
    case "authentication":
      return "Falló la autenticación con Puter";
    case "network":
      return "No hubo conexión con Puter";
    case "storage":
      return "Falló la persistencia del agente";
    case "ai":
      return "Falló la respuesta de Puter AI";
    case "parse":
      return "La respuesta del agente no se pudo interpretar";
    default:
      return "Error inesperado de Puter";
  }
}

export function createAgentIssue(error: unknown, source: AgentIssueSource): AgentIssue {
  const classified = classifyPuterError(error, source);

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    kind: classified.kind,
    source: classified.source,
    title: issueTitleForKind(classified.kind),
    message: classified.message,
    details: classified.details,
    timestamp: new Date().toISOString(),
    retryable: classified.retryable,
  };
}

export function classifyPuterError(error: unknown, source: AgentIssueSource): PuterClientError {
  if (error instanceof PuterClientError) {
    return error;
  }

  const details = serializeError(error);
  const normalized = details.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("network") ||
    normalized.includes("offline") ||
    normalized.includes("timed out") ||
    normalized.includes("err_internet") ||
    normalized.includes("err_network") ||
    normalized.includes("load failed")
  ) {
    return new PuterClientError(
      "network",
      source,
      "No se pudo conectar con Puter. Verifica tu conexión y vuelve a intentar.",
      { cause: error, details, retryable: true },
    );
  }

  if (source === "bootstrap" || source === "login") {
    return new PuterClientError(
      "authentication",
      source,
      source === "login"
        ? "No pudimos completar el inicio de sesión con Puter."
        : "No pudimos validar la sesión de Puter durante el arranque.",
      { cause: error, details, retryable: true },
    );
  }

  if (source === "storage" || source === "config") {
    return new PuterClientError(
      "storage",
      source,
      "No se pudieron leer o guardar los datos del agente en Puter.",
      { cause: error, details, retryable: true },
    );
  }

  if (source === "cycle" || source === "chat") {
    return new PuterClientError(
      "ai",
      source,
      "Puter devolvió un error mientras el agente generaba una respuesta.",
      { cause: error, details, retryable: true },
    );
  }

  return new PuterClientError(
    "unknown",
    source,
    "Ocurrió un error inesperado al comunicarse con Puter.",
    { cause: error, details, retryable: true },
  );
}

// Extract text from puter.ai.chat response (handles v1 string and v2 object)
function extractText(response: string | { message?: { content: string }; content?: string }): string {
  if (typeof response === "string") return response;
  return response?.message?.content ?? response?.content ?? "";
}

export async function puterChat(prompt: string): Promise<string> {
  const response = await getPuter().ai.chat(prompt);
  return extractText(response as string | { message?: { content: string }; content?: string });
}

function parseJsonPayload<T>(
  text: string,
  source: "cycle" | "chat",
  fallbackMessage: string,
): T {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text) as T;
  } catch (error) {
    const preview = text.slice(0, 400).trim();

    throw new PuterClientError("parse", source, fallbackMessage, {
      cause: error,
      details: preview
        ? `Respuesta recibida: ${preview}`
        : "Puter no devolvió un bloque JSON utilizable.",
      retryable: true,
    });
  }
}

// ── Memory ──────────────────────────────────────────────────────────────────

export async function loadMemory(): Promise<AgentMemory> {
  const raw = await getPuter().kv.get(KEYS.memory);
  if (!raw) return { content: "", updatedAt: new Date().toISOString() };
  try {
    return JSON.parse(raw) as AgentMemory;
  } catch {
    return { content: raw, updatedAt: new Date().toISOString() };
  }
}

export async function saveMemory(content: string): Promise<AgentMemory> {
  const mem: AgentMemory = { content, updatedAt: new Date().toISOString() };
  await getPuter().kv.set(KEYS.memory, JSON.stringify(mem));
  return mem;
}

// ── Config ───────────────────────────────────────────────────────────────────

export async function loadConfig(): Promise<AgentConfig> {
  const raw = await getPuter().kv.get(KEYS.config);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<AgentConfig>) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: AgentConfig): Promise<void> {
  await getPuter().kv.set(KEYS.config, JSON.stringify(config));
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export async function loadLogs(): Promise<AgentLog[]> {
  const raw = await getPuter().kv.get(KEYS.logs);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AgentLog[];
  } catch {
    return [];
  }
}

async function nextLogId(): Promise<number> {
  const raw = await getPuter().kv.get(KEYS.logCounter);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await getPuter().kv.set(KEYS.logCounter, String(next));
  return next;
}

export async function appendLog(entry: Omit<AgentLog, "id" | "timestamp">): Promise<AgentLog> {
  const logs = await loadLogs();
  const id = await nextLogId();
  const log: AgentLog = { id, ...entry, timestamp: new Date().toISOString() };
  const updated = [log, ...logs].slice(0, MAX_LOG_ENTRIES);
  await getPuter().kv.set(KEYS.logs, JSON.stringify(updated));

  // Also write to puter.fs as a human-readable file
  try {
    const lines = updated
      .map((l) => `[${l.timestamp}] THOUGHT: ${l.thought}\nACTION: ${l.action}\nRESULT: ${l.result}\n`)
      .join("\n---\n");
    await getPuter().fs.write("nexus-agent-log.txt", lines);
  } catch {
    // fs write is best-effort
  }

  return log;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function loadChat(): Promise<ChatMessage[]> {
  const raw = await getPuter().kv.get(KEYS.chat);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

async function nextChatId(): Promise<number> {
  const raw = await getPuter().kv.get(KEYS.chatCounter);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  await getPuter().kv.set(KEYS.chatCounter, String(next));
  return next;
}

export async function appendChatMessage(role: "user" | "agent", content: string): Promise<ChatMessage> {
  const messages = await loadChat();
  const id = await nextChatId();
  const msg: ChatMessage = { id, role, content, timestamp: new Date().toISOString() };
  const updated = [...messages, msg].slice(-MAX_CHAT_MESSAGES);
  await getPuter().kv.set(KEYS.chat, JSON.stringify(updated));
  return msg;
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export async function resetAgent(): Promise<void> {
  const puter = getPuter();

  await Promise.all([
    puter.kv.del(KEYS.memory),
    puter.kv.del(KEYS.config),
    puter.kv.del(KEYS.logs),
    puter.kv.del(KEYS.chat),
    puter.kv.del(KEYS.logCounter),
    puter.kv.del(KEYS.chatCounter),
  ]);
  try {
    await puter.fs.write("nexus-agent-log.txt", "");
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
  const prompt = `Eres mi agente inteligente autónomo todólogo personal y proactivo 24/7. Aprenderás y te adaptarás a mi. Además perseguirás tu evolución continua en todos los aspectos. Si existe algo que te impida avanzar en cualquier contexto me pedirás ayuda. Objetivo de especialización (sólo si existe): "${goal}"

Your previous memory:
${memory || "(empty — this is your first cycle)"}

Your task:
1. Reflect on what you know and what your goal is.
2. Decide what action to take right now to make progress toward that goal.
3. Describe the result of that action.
4. Update your memory with important learnings, progress, and next steps.

Respond ONLY with a valid JSON object in this exact format:
{
  "thought": "<your reflection and reasoning>",
  "action": "<the specific action you are taking>",
  "result": "<what happened as a result of the action>",
  "newMemory": "<updated memory text for your next cycle>"
}`;

  const text = await puterChat(prompt);
  const parsed = parseJsonPayload<CycleResult>(
    text,
    "cycle",
    "La respuesta del ciclo no se pudo interpretar. Intenta ejecutar el ciclo otra vez.",
  );

  return {
    thought: parsed.thought ?? "",
    action: parsed.action ?? "",
    result: parsed.result ?? "",
    newMemory: parsed.newMemory ?? memory,
  };
}

interface ChatResult {
  reply: string;
  newMemory: string;
}

export async function sendUserMessage(content: string, goal: string, memory: string, history: ChatMessage[]): Promise<ChatResult> {
  const recentHistory = history.slice(-16).map((m) => {
    const role = m.role === "agent" ? "AGENT" : "USER";
    return `${role}: ${m.content}`;
  }).join("\n");

  const prompt = `Eres mi agente inteligente autónomo todólogo personal y proactivo 24/7. Aprenderás y te adaptarás a mi. Además perseguirás tu evolución continua en todos los aspectos. Si existe algo que te impida avanzar en cualquier contexto me pedirás ayuda. Estás en conversación conmigo.

Your current goal: "${goal}"
Your current memory: ${memory || "(empty)"}

Recent conversation:
${recentHistory || "(none)"}

USER: ${content}

Respond with a JSON object in this exact format:
{
  "reply": "<your natural conversational response to the user>",
  "newMemory": "<updated memory that incorporates anything relevant from this exchange — keep existing important context and add new learnings>"
}`;

  const text = await puterChat(prompt);
  const parsed = parseJsonPayload<ChatResult>(
    text,
    "chat",
    "La respuesta del chat no se pudo interpretar. Intenta enviar el mensaje de nuevo.",
  );

  return {
    reply: parsed.reply ?? text,
    newMemory: parsed.newMemory ?? memory,
  };
}
