import { usePuterAgent } from "@/hooks/use-puter-agent";
import { AgentHeader } from "@/components/AgentHeader";
import { LiveThoughtStream } from "@/components/LiveThoughtStream";
import { ConfigPanel } from "@/components/ConfigPanel";
import { MemoryEditor } from "@/components/MemoryEditor";
import { LogViewer } from "@/components/LogViewer";
import { ChatPanel } from "@/components/ChatPanel";
import { Loader2, Cpu, LogIn } from "lucide-react";

export function Dashboard() {
  const {
    config,
    memory,
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
  } = usePuterAgent();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-primary animate-pulse">
          <Loader2 className="w-12 h-12 animate-spin" />
          <p className="font-mono text-sm tracking-widest uppercase">Initializing Nexus · Puter</p>
        </div>
      </div>
    );
  }

  // Puter login required
  if (needsLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
            <Cpu className="w-12 h-12 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-white">Nexus Agent</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este agente usa <span className="text-primary font-semibold">Puter</span> para IA, memoria y almacenamiento.
              Inicia sesión con tu cuenta de Puter para continuar.
            </p>
          </div>
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-primary to-primary/80 text-black shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Conectar con Puter
          </button>
          <p className="text-xs text-muted-foreground font-mono">
            puter.ai · puter.kv · puter.fs
          </p>
        </div>
      </div>
    );
  }

  const latestLog = logs[0];

  return (
    <div className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <AgentHeader
        config={config}
        onToggleRun={toggleIsRunning}
        onRunNow={runCycle}
        isRunCyclePending={isRunningCycle}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Chat + Neural stream + logs */}
        <div className="xl:col-span-8 space-y-6 flex flex-col">
          <div className="h-[480px]">
            <ChatPanel
              messages={chatMessages}
              onSend={sendChatMessage}
              isSending={isSendingChat}
            />
          </div>
          <LiveThoughtStream
            latestLog={latestLog}
            isThinking={isRunningCycle}
          />
          <LogViewer logs={logs} />
        </div>

        {/* Right: Config + Memory */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <ConfigPanel
            config={config}
            onUpdate={updateConfig}
            onReset={reset}
            isUpdating={false}
          />
          <div className="flex-1 min-h-[300px]">
            <MemoryEditor
              memoryContent={memory?.content}
              updatedAt={memory?.updatedAt}
              onSave={updateMemory}
              isSaving={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
