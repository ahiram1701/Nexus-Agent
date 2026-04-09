export interface AgentLog {
  id: number;
  thought: string;
  action: string;
  result: string;
  timestamp: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export interface AgentConfig {
  goal: string;
  intervalSeconds: number;
  isRunning: boolean;
}

export interface AgentMemory {
  content: string;
  updatedAt: string;
}

export type PuterConnectionStatus =
  | "loading"
  | "ready"
  | "auth_required"
  | "sdk_unavailable"
  | "error";

export type AgentIssueKind =
  | "sdk_unavailable"
  | "auth_required"
  | "authentication"
  | "network"
  | "storage"
  | "ai"
  | "parse"
  | "unknown";

export type AgentIssueSource =
  | "bootstrap"
  | "login"
  | "storage"
  | "config"
  | "cycle"
  | "chat";

export interface AgentIssue {
  id: string;
  kind: AgentIssueKind;
  source: AgentIssueSource;
  title: string;
  message: string;
  details?: string;
  timestamp: string;
  retryable: boolean;
}
