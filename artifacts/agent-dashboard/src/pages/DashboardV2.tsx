import { AgentHeader } from "@/components/AgentHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { ConfigPanel } from "@/components/ConfigPanel";
import { LiveThoughtStream } from "@/components/LiveThoughtStream";
import { LogViewer } from "@/components/LogViewer";
import { MemoryEditor } from "@/components/MemoryEditor";
import { PuterStatusPanel } from "@/components/PuterStatusPanel";
import { usePuterAgent } from "@/hooks/use-puter-agent-v2";
import { AlertTriangle, Cpu, Loader2, LogIn, RefreshCcw, ShieldAlert } from "lucide-react";

function ConnectionGate({
  title,
  description,
  details,
  primaryAction,
  primaryLabel,
  secondaryAction,
  secondaryLabel,
  isBusy,
}: {
  title: string;
  description: string;
  details?: string;
  primaryAction: () => void;
  primaryLabel: string;
  secondaryAction?: () => void;
  secondaryLabel?: string;
  isBusy: boolean;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-panel rounded-3xl p-10 flex flex-col items-center gap-6 max-w-lg w-full text-center">
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
          <ShieldAlert className="w-12 h-12 text-destructive" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-display font-bold text-white">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          {details ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-2">Details</p>
              <p className="text-xs text-gray-300 leading-relaxed break-words">{details}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={primaryAction}
            disabled={isBusy}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-primary to-primary/80 text-black shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
          >
            {isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
            {primaryLabel}
          </button>
          {secondaryAction && secondaryLabel ? (
            <button
              onClick={secondaryAction}
              disabled={isBusy}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              <LogIn className="w-5 h-5" />
              {secondaryLabel}
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground font-mono">puter.ai · puter.kv · puter.fs</p>
      </div>
    </div>
  );
}

export function DashboardV2() {
  const {
    config,
    memory,
    logs,
    chatMessages,
    isLoading,
    connectionStatus,
    activeIssue,
    recentIssues,
    lastCycleAt,
    isRunningCycle,
    isSendingChat,
    login,
    retryConnection,
    runCycle,
    updateMemory,
    updateConfig,
    toggleIsRunning,
    sendChatMessage,
    reset,
  } = usePuterAgent();

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

  if (connectionStatus === "auth_required") {
    return (
      <ConnectionGate
        title="Conecta tu cuenta de Puter"
        description={activeIssue?.message ?? "La aplicación ya abrió, pero Puter necesita una sesión válida para continuar."}
        details={activeIssue?.details}
        primaryAction={login}
        primaryLabel="Connect with Puter"
        secondaryAction={retryConnection}
        secondaryLabel="Retry Bootstrap"
        isBusy={isLoading}
      />
    );
  }

  if (connectionStatus === "sdk_unavailable" || connectionStatus === "error") {
    return (
      <ConnectionGate
        title={activeIssue?.title ?? "Puter no se pudo inicializar"}
        description={activeIssue?.message ?? "La app no logró completar la inicialización de Puter en esta sesión."}
        details={activeIssue?.details}
        primaryAction={retryConnection}
        primaryLabel="Retry Puter Bootstrap"
        secondaryAction={connectionStatus === "error" ? login : undefined}
        secondaryLabel={connectionStatus === "error" ? "Try Sign-In" : undefined}
        isBusy={isLoading}
      />
    );
  }

  const latestLog = logs[0];

  return (
    <div className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {activeIssue ? (
        <div className="rounded-3xl border border-red-400/25 bg-red-400/10 p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-2xl bg-red-400/10 border border-red-400/20">
              <AlertTriangle className="w-5 h-5 text-red-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-100">{activeIssue.title}</p>
              <p className="text-sm text-red-50/80 leading-relaxed mt-1">{activeIssue.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-red-100/70 font-mono">
            <Cpu className="w-4 h-4" />
            <span>{activeIssue.source.toUpperCase()}</span>
          </div>
        </div>
      ) : null}

      <AgentHeader
        config={config}
        onToggleRun={toggleIsRunning}
        onRunNow={runCycle}
        isRunCyclePending={isRunningCycle}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
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

        <div className="xl:col-span-4 flex flex-col gap-6">
          <PuterStatusPanel
            connectionStatus={connectionStatus}
            recentIssues={recentIssues}
            lastCycleAt={lastCycleAt}
            onRetryConnection={retryConnection}
            isRetrying={isLoading}
          />
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
