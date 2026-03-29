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
