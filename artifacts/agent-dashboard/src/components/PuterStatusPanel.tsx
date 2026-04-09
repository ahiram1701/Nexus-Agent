import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCcw, ShieldCheck, UserRoundCheck } from "lucide-react";
import type { AgentIssue, PuterConnectionStatus } from "@/types/agent";

interface PuterStatusPanelProps {
  connectionStatus: PuterConnectionStatus;
  recentIssues: AgentIssue[];
  lastCycleAt: string | null;
  onRetryConnection: () => void;
  isRetrying: boolean;
}

const STATUS_COPY: Record<
  PuterConnectionStatus,
  { label: string; description: string; tone: string; icon: typeof ShieldCheck }
> = {
  loading: {
    label: "Initializing",
    description: "Revisando disponibilidad del SDK, autenticación y datos persistidos.",
    tone: "text-amber-300 border-amber-300/20 bg-amber-300/10",
    icon: RefreshCcw,
  },
  ready: {
    label: "Connected",
    description: "Puter está listo para autenticación, almacenamiento y ciclos del agente.",
    tone: "text-emerald-300 border-emerald-300/20 bg-emerald-300/10",
    icon: ShieldCheck,
  },
  auth_required: {
    label: "Login Required",
    description: "La app abrió bien, pero Puter necesita una sesión válida para continuar.",
    tone: "text-sky-300 border-sky-300/20 bg-sky-300/10",
    icon: UserRoundCheck,
  },
  sdk_unavailable: {
    label: "SDK Unavailable",
    description: "El script de Puter no terminó de cargar en esta sesión.",
    tone: "text-orange-300 border-orange-300/20 bg-orange-300/10",
    icon: CloudOff,
  },
  error: {
    label: "Attention Needed",
    description: "Hay un problema activo con Puter que requiere revisión manual o reintento.",
    tone: "text-red-300 border-red-300/20 bg-red-300/10",
    icon: AlertTriangle,
  },
};

export function PuterStatusPanel({
  connectionStatus,
  recentIssues,
  lastCycleAt,
  onRetryConnection,
  isRetrying,
}: PuterStatusPanelProps) {
  const status = STATUS_COPY[connectionStatus];
  const StatusIcon = status.icon;
  const visibleIssues = recentIssues.slice(0, 3);

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-36 h-36 bg-primary/5 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex items-center justify-between gap-4 relative z-10">
        <div>
          <h3 className="font-display font-semibold text-lg text-white">Puter Health</h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">SDK, auth, cycles and recent issues</p>
        </div>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${status.tone}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${connectionStatus === "loading" ? "animate-spin" : ""}`} />
          <span>{status.label}</span>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Connection</p>
          <p className="text-sm text-gray-200 leading-relaxed mt-2">{status.description}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono">Last Successful Cycle</p>
          <p className="text-sm text-gray-200 leading-relaxed mt-2">
            {lastCycleAt
              ? `${formatDistanceToNow(new Date(lastCycleAt), { addSuffix: true })} (${new Date(lastCycleAt).toLocaleString()})`
              : "Aún no hay ningún ciclo completado en esta sesión."}
          </p>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">Recent Issues</h4>
          <span className="text-[11px] font-mono text-muted-foreground">{recentIssues.length} tracked</span>
        </div>

        {visibleIssues.length === 0 ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <p>No hay errores recientes registrados por la app.</p>
          </div>
        ) : (
          visibleIssues.map((issue) => (
            <div
              key={issue.id}
              className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-100">{issue.title}</p>
                  <p className="text-xs text-red-100/70 font-mono mt-1">
                    {issue.source.toUpperCase()} · {formatDistanceToNow(new Date(issue.timestamp), { addSuffix: true })}
                  </p>
                </div>
                {issue.retryable ? (
                  <span className="text-[10px] uppercase tracking-[0.18em] text-red-100/80 font-mono">Retryable</span>
                ) : null}
              </div>
              <p className="text-sm text-red-50/90 leading-relaxed">{issue.message}</p>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onRetryConnection}
        disabled={isRetrying}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium transition-colors disabled:opacity-60"
      >
        <RefreshCcw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
        <span>{isRetrying ? "Refreshing Puter..." : "Refresh Puter Status"}</span>
      </button>
    </div>
  );
}
