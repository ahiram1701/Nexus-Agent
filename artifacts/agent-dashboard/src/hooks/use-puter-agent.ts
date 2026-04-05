import { useState, useEffect, useRef, useCallback } from "react";
import type { AgentLog, ChatMessage, AgentConfig, AgentMemory } from "@/types/agent";
import {
  loadMemory, saveMemory,
  loadConfig, saveConfig,
  loadLogs, appendLog,
  loadChat, appendChatMessage,
  runAgentCycle, sendUserMessage,
  resetAgent,
} from "@/lib/puter";

export function usePuterAgent() {
  const [memory, setMemory] = useState<AgentMemory | null>(null);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef<AgentConfig | null>(null);
  const memoryRef = useRef<AgentMemory | null>(null);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { memoryRef.current = memory; }, [memory]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mem, cfg, logList, chat] = await Promise.all([
        loadMemory(),
        loadConfig(),
        loadLogs(),
        loadChat(),
      ]);
      setMemory(mem);
      setConfig(cfg);
      setLogs(logList);
      setChatMessages(chat);
      setNeedsLogin(false);
    } catch (err) {
      console.error("Puter load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      // Wait for Puter SDK to be injected by the script tag
      let waited = 0;
      while (typeof window.puter === "undefined" && waited < 6000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
      }

      if (typeof window.puter === "undefined") {
        // Puter SDK didn't load (probably offline / blocked)
        setIsLoading(false);
        setNeedsLogin(true);
        return;
      }

      // Check if already authenticated
      try {
        const loggedIn = window.puter.auth.isLoggedIn();
        if (!loggedIn) {
          setNeedsLogin(true);
          setIsLoading(false);
          return;
        }
      } catch {
        // isLoggedIn may throw in some environments — assume not logged in
        setNeedsLogin(true);
        setIsLoading(false);
        return;
      }

      await loadAll();
    }
    init();
  }, [loadAll]);

  // ── Login flow ────────────────────────────────────────────────────────────
  const login = useCallback(async () => {
    try {
      await window.puter.auth.signIn();
      await loadAll();
    } catch (err) {
      console.error("Puter login error:", err);
    }
  }, [loadAll]);

  // ── Auto-run loop ─────────────────────────────────────────────────────────
  const runCycle = useCallback(async () => {
    const cfg = configRef.current;
    const mem = memoryRef.current;
    if (!cfg || isRunningCycle) return;

    setIsRunningCycle(true);
    try {
      const result = await runAgentCycle(cfg.goal, mem?.content ?? "");

      const newMem = await saveMemory(result.newMemory);
      setMemory(newMem);
      memoryRef.current = newMem;

      const log = await appendLog({
        thought: result.thought,
        action: result.action,
        result: result.result,
      });
      setLogs((prev) => [log, ...prev].slice(0, 100));
    } catch (err) {
      console.error("Agent cycle error:", err);
    } finally {
      setIsRunningCycle(false);
    }
  }, [isRunningCycle]);

  useEffect(() => {
    if (!config) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (config.isRunning) {
      intervalRef.current = setInterval(() => {
        runCycle();
      }, config.intervalSeconds * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config?.isRunning, config?.intervalSeconds, runCycle]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const updateMemory = useCallback(async (content: string) => {
    const newMem = await saveMemory(content);
    setMemory(newMem);
  }, []);

  const updateConfig = useCallback(async (newConfig: AgentConfig) => {
    await saveConfig(newConfig);
    setConfig(newConfig);
  }, []);

  const toggleIsRunning = useCallback(async () => {
    if (!config) return;
    const updated = { ...config, isRunning: !config.isRunning };
    await saveConfig(updated);
    setConfig(updated);
  }, [config]);

  const sendChatMessage = useCallback(async (content: string) => {
    if (isSendingChat) return;
    setIsSendingChat(true);
    try {
      const userMsg = await appendChatMessage("user", content);
      setChatMessages((prev) => [...prev, userMsg]);

      const cfg = configRef.current;
      const mem = memoryRef.current;
      const { reply, newMemory } = await sendUserMessage(content, cfg?.goal ?? "", mem?.content ?? "", [...chatMessages, userMsg]);

      const agentMsg = await appendChatMessage("agent", reply);
      setChatMessages((prev) => [...prev, agentMsg]);

      // Update memory with what was learned from the conversation
      if (newMemory && newMemory !== mem?.content) {
        const updatedMem = await saveMemory(newMemory);
        setMemory(updatedMem);
        memoryRef.current = updatedMem;
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsSendingChat(false);
    }
  }, [isSendingChat, chatMessages]);

  const reset = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    await resetAgent();
    setMemory({ content: "", updatedAt: new Date().toISOString() });
    setConfig({ goal: "Continuously observe, analyze, and optimize the user's workflow by identifying inefficiencies, suggesting improvements, and taking actions when possible.", intervalSeconds: 30, isRunning: false });
    setLogs([]);
    setChatMessages([]);
  }, []);

  return {
    memory,
    config,
    logs,
    chatMessages,
    isLoading,
    needsLogin,
    isRunningCycle,
    isSendingChat,
    login,
    runCycle,
    updateMemory,
    updateConfig,
    toggleIsRunning,
    sendChatMessage,
    reset,
  };
}
