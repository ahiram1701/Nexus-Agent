import { Power, Play, Square, RefreshCcw } from "lucide-react";
import type { AgentConfig } from "@/types/agent";

interface AgentHeaderProps {
  config?: AgentConfig | null;
  onToggleRun: () => void;
  onRunNow: () => void;
  isRunCyclePending: boolean;
}

export function AgentHeader({ config, onToggleRun, onRunNow, isRunCyclePending }: AgentHeaderProps) {
  const isRunning = config?.isRunning || false;

  return (
    <header className="glass-panel rounded-3xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden z-20">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <img
          src={`${import.meta.env.BASE_URL}images/ai-bg.png`}
          alt="Tech Background"
          className="w-full h-full object-cover mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-transparent" />
      </div>

      <div className="flex items-center gap-4 relative z-10">
        <div className={`p-3 rounded-2xl flex items-center justify-center transition-all duration-500 ${isRunning ? 'bg-primary/20 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-white/5'}`}>
          <Power className={`w-8 h-8 ${isRunning ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
            Nexus Agent
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-2.5 w-2.5">
              {isRunning && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
            </span>
            <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
              {isRunning ? 'System Active · Powered by Puter' : 'System Standby · Powered by Puter'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto relative z-10">
        <button
          onClick={onRunNow}
          disabled={isRunCyclePending}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <RefreshCcw className={`w-4 h-4 ${isRunCyclePending ? 'animate-spin' : ''}`} />
          <span>Run Cycle</span>
        </button>

        <button
          onClick={onToggleRun}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-95 ${
            isRunning
              ? 'bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border border-destructive/50 hover:bg-destructive/30 hover:shadow-destructive/20'
              : 'bg-gradient-to-r from-primary to-primary/80 text-black border border-primary hover:shadow-primary/30'
          }`}
        >
          {isRunning ? (
            <><Square className="w-4 h-4 fill-current" />Stop Auto-Run</>
          ) : (
            <><Play className="w-4 h-4 fill-current" />Start Auto-Run</>
          )}
        </button>
      </div>
    </header>
  );
}
