import { useAgentDashboard } from "@/hooks/use-agent-dashboard";
import { AgentHeader } from "@/components/AgentHeader";
import { LiveThoughtStream } from "@/components/LiveThoughtStream";
import { ConfigPanel } from "@/components/ConfigPanel";
import { MemoryEditor } from "@/components/MemoryEditor";
import { LogViewer } from "@/components/LogViewer";
import { ChatPanel } from "@/components/ChatPanel";
import { Loader2 } from "lucide-react";

export function Dashboard() {
  const {
    config,
    isLoadingConfig,
    updateConfig,
    isUpdatingConfig,
    toggleIsRunning,
    memory,
    updateMemory,
    isUpdatingMemory,
    logs,
    runCycle,
    isRunningCycle,
    chatMessages,
    sendChatMessage,
    isSendingChat,
  } = useAgentDashboard();

  if (isLoadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-primary animate-pulse">
          <Loader2 className="w-12 h-12 animate-spin" />
          <p className="font-mono text-sm tracking-widest">INITIALIZING NEXUS</p>
        </div>
      </div>
    );
  }

  const latestLog = logs?.[0];

  return (
    <div className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <AgentHeader 
        config={config} 
        onToggleRun={toggleIsRunning}
        onRunNow={() => runCycle()}
        isRunCyclePending={isRunningCycle}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Neural stream + logs */}
        <div className="xl:col-span-5 space-y-6 flex flex-col">
          <LiveThoughtStream 
            latestLog={latestLog} 
            isThinking={isRunningCycle} 
          />
          <LogViewer logs={logs} />
        </div>

        {/* Center: Chat */}
        <div className="xl:col-span-4" style={{ minHeight: "600px" }}>
          <div className="h-full" style={{ minHeight: "600px" }}>
            <ChatPanel
              messages={chatMessages as Array<{ id: number; role: "user" | "agent"; content: string; timestamp: string }>}
              onSend={sendChatMessage}
              isSending={isSendingChat}
            />
          </div>
        </div>

        {/* Right: Config + Memory */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <ConfigPanel 
            config={config} 
            onUpdate={(newConfig) => updateConfig({ data: newConfig })}
            isUpdating={isUpdatingConfig}
          />
          <div className="flex-1 min-h-[300px]">
            <MemoryEditor 
              memoryContent={memory?.content}
              updatedAt={memory?.updatedAt}
              onSave={(content) => updateMemory({ data: { content } })}
              isSaving={isUpdatingMemory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
