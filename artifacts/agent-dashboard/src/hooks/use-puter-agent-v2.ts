import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentConfig,
  AgentIssue,
  AgentIssueSource,
  AgentLog,
  AgentMemory,
  ChatMessage,
  PuterConnectionStatus,
} from "@/types/agent";
import {
  PUTER_SDK_WAIT_TIMEOUT_MS,
  PuterClientError,
  appendChatMessage,
  appendLog,
  createAgentIssue,
  loadChat,
  loadConfig,
  loadLogs,
  loadMemory,
  resetAgent,
  runAgentCycle,
  saveConfig,
  saveMemory,
  sendUserMessage,
} from "@/lib/puter";

const SDK_POLL_INTERVAL_MS = 100;
const MAX_VISIBLE_ISSUES = 8;

export function usePuterAgent() {
  const [memory, setMemory] = useState<AgentMemory | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<PuterConnectionStatus>("loading");
  const [activeIssue, setActiveIssue] = useState<AgentIssue | null>(null);
  const [recentIssues, setRecentIssues] = useState<AgentIssue[]>([]);
  const [lastCycleAt, setLastCycleAt] = useState<string | null>(null);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef<AgentConfig | null>(null);
  const memoryRef = useRef<AgentMemory | null>(null);
  const chatMessagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
  }, [chatMessages]);

  const recordIssue = useCallback((source: AgentIssueSource, error: unknown) => {
    const issue = createAgentIssue(error, source);

    setActiveIssue(issue);
    setRecentIssues((current) => {
      const deduped = current.filter(
        (item) =>
          !(
            item.kind === issue.kind &&
            item.source === issue.source &&
            item.message === issue.message
          ),
      );

      return [issue, ...deduped].slice(0, MAX_VISIBLE_ISSUES);
    });

    console.error(`[${source}] ${issue.title}`, error);
    return issue;
  }, []);

  const clearActiveIssueForSources = useCallback((sources: AgentIssueSource[]) => {
    setActiveIssue((current) => (
      current && sources.includes(current.source) ? null : current
    ));
  }, []);

  const dismissIssue = useCallback((issueId: string) => {
    setRecentIssues((current) => current.filter((item) => item.id !== issueId));
    setActiveIssue((current) => (current?.id === issueId ? null : current));
  }, []);

  const loadAll = useCallback(async () => {
    const [loadedMemory, loadedConfig, loadedLogs, loadedChat] = await Promise.all([
      loadMemory(),
      loadConfig(),
      loadLogs(),
      loadChat(),
    ]);

    setMemory(loadedMemory);
    memoryRef.current = loadedMemory;
    setConfig(loadedConfig);
    configRef.current = loadedConfig;
    setLogs(loadedLogs);
    setChatMessages(loadedChat);
    chatMessagesRef.current = loadedChat;
    setLastCycleAt(loadedLogs[0]?.timestamp ?? null);
    clearActiveIssueForSources(["bootstrap", "login", "storage", "config"]);
    setConnectionStatus("ready");
  }, [clearActiveIssueForSources]);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    setConnectionStatus("loading");

    try {
      let waited = 0;

      while (typeof window.puter === "undefined" && waited < PUTER_SDK_WAIT_TIMEOUT_MS) {
        await new Promise((resolve) => setTimeout(resolve, SDK_POLL_INTERVAL_MS));
        waited += SDK_POLL_INTERVAL_MS;
      }

      if (typeof window.puter === "undefined") {
        const issue = recordIssue(
          "bootstrap",
          new PuterClientError(
            "sdk_unavailable",
            "bootstrap",
            "No pudimos cargar Puter en esta sesión. Revisa tu conexión, extensiones que bloqueen scripts o firewall.",
            { retryable: true },
          ),
        );

        setConnectionStatus(issue.kind === "sdk_unavailable" ? "sdk_unavailable" : "error");
        return;
      }

      const loggedIn = window.puter.auth.isLoggedIn();

      if (!loggedIn) {
        const issue = recordIssue(
          "bootstrap",
          new PuterClientError(
            "auth_required",
            "bootstrap",
            "Necesitas iniciar sesión en Puter para usar IA, memoria y almacenamiento.",
            { retryable: true },
          ),
        );

        setConnectionStatus(issue.kind === "auth_required" ? "auth_required" : "error");
        return;
      }

      await loadAll();
    } catch (error) {
      const issue = recordIssue("bootstrap", error);

      setConnectionStatus(
        issue.kind === "sdk_unavailable"
          ? "sdk_unavailable"
          : issue.kind === "auth_required"
            ? "auth_required"
            : "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadAll, recordIssue]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const retryConnection = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  const login = useCallback(async () => {
    setIsLoading(true);

    try {
      if (!window.puter) {
        throw new PuterClientError(
          "sdk_unavailable",
          "login",
          "Puter todavía no está disponible para iniciar sesión.",
          { retryable: true },
        );
      }

      await window.puter.auth.signIn();
      await loadAll();
    } catch (error) {
      const issue = recordIssue("login", error);
      setConnectionStatus(issue.kind === "sdk_unavailable" ? "sdk_unavailable" : "auth_required");
    } finally {
      setIsLoading(false);
    }
  }, [loadAll, recordIssue]);

  const runCycle = useCallback(async () => {
    const currentConfig = configRef.current;
    const currentMemory = memoryRef.current;

    if (!currentConfig || isRunningCycle) {
      return;
    }

    setIsRunningCycle(true);

    try {
      const result = await runAgentCycle(currentConfig.goal, currentMemory?.content ?? "");

      const nextMemory = await saveMemory(result.newMemory);
      setMemory(nextMemory);
      memoryRef.current = nextMemory;

      const log = await appendLog({
        thought: result.thought,
        action: result.action,
        result: result.result,
      });

      setLogs((current) => [log, ...current].slice(0, 500));
      setLastCycleAt(log.timestamp);
      clearActiveIssueForSources(["cycle"]);
    } catch (error) {
      recordIssue("cycle", error);
    } finally {
      setIsRunningCycle(false);
    }
  }, [clearActiveIssueForSources, isRunningCycle, recordIssue]);

  useEffect(() => {
    if (!config) {
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (config.isRunning) {
      intervalRef.current = setInterval(() => {
        void runCycle();
      }, config.intervalSeconds * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config?.intervalSeconds, config?.isRunning, runCycle]);

  const updateMemory = useCallback(async (content: string) => {
    try {
      const nextMemory = await saveMemory(content);
      setMemory(nextMemory);
      memoryRef.current = nextMemory;
      clearActiveIssueForSources(["storage"]);
    } catch (error) {
      recordIssue("storage", error);
    }
  }, [clearActiveIssueForSources, recordIssue]);

  const updateConfig = useCallback(async (nextConfig: AgentConfig) => {
    try {
      await saveConfig(nextConfig);
      setConfig(nextConfig);
      configRef.current = nextConfig;
      clearActiveIssueForSources(["config"]);
    } catch (error) {
      recordIssue("config", error);
    }
  }, [clearActiveIssueForSources, recordIssue]);

  const toggleIsRunning = useCallback(async () => {
    if (!configRef.current) {
      return;
    }

    const updatedConfig = {
      ...configRef.current,
      isRunning: !configRef.current.isRunning,
    };

    try {
      await saveConfig(updatedConfig);
      setConfig(updatedConfig);
      configRef.current = updatedConfig;
      clearActiveIssueForSources(["config"]);
    } catch (error) {
      recordIssue("config", error);
    }
  }, [clearActiveIssueForSources, recordIssue]);

  const sendChatMessage = useCallback(async (content: string) => {
    if (isSendingChat) {
      return;
    }

    setIsSendingChat(true);

    try {
      const userMessage = await appendChatMessage("user", content);
      const historyWithUserMessage = [...chatMessagesRef.current, userMessage];

      setChatMessages(historyWithUserMessage);
      chatMessagesRef.current = historyWithUserMessage;

      const currentConfig = configRef.current;
      const currentMemory = memoryRef.current;
      const { reply, newMemory } = await sendUserMessage(
        content,
        currentConfig?.goal ?? "",
        currentMemory?.content ?? "",
        historyWithUserMessage,
      );

      const agentMessage = await appendChatMessage("agent", reply);
      const nextMessages = [...historyWithUserMessage, agentMessage];
      setChatMessages(nextMessages);
      chatMessagesRef.current = nextMessages;

      if (newMemory && newMemory !== currentMemory?.content) {
        const updatedMemory = await saveMemory(newMemory);
        setMemory(updatedMemory);
        memoryRef.current = updatedMemory;
      }

      clearActiveIssueForSources(["chat"]);
    } catch (error) {
      recordIssue("chat", error);
    } finally {
      setIsSendingChat(false);
    }
  }, [clearActiveIssueForSources, isSendingChat, recordIssue]);

  const reset = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      await resetAgent();
      const resetMemory = { content: "", updatedAt: new Date().toISOString() };
      const resetConfig = { goal: "", intervalSeconds: 30, isRunning: false };

      setMemory(resetMemory);
      memoryRef.current = resetMemory;
      setConfig(resetConfig);
      configRef.current = resetConfig;
      setLogs([]);
      setChatMessages([]);
      chatMessagesRef.current = [];
      setLastCycleAt(null);
      clearActiveIssueForSources(["storage", "config", "cycle", "chat"]);
    } catch (error) {
      recordIssue("storage", error);
    }
  }, [clearActiveIssueForSources, recordIssue]);

  return {
    memory,
    config,
    logs,
    chatMessages,
    isLoading,
    needsLogin: connectionStatus === "auth_required",
    connectionStatus,
    activeIssue,
    recentIssues,
    lastCycleAt,
    isRunningCycle,
    isSendingChat,
    dismissIssue,
    login,
    retryConnection,
    runCycle,
    updateMemory,
    updateConfig,
    toggleIsRunning,
    sendChatMessage,
    reset,
  };
}
