import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Target, Clock, RotateCcw, AlertTriangle } from "lucide-react";
import type { AgentConfig } from "@/types/agent";

interface ConfigPanelProps {
  config?: AgentConfig | null;
  onUpdate: (config: AgentConfig) => void;
  onReset: () => Promise<void>;
  isUpdating: boolean;
}

export function ConfigPanel({ config, onUpdate, onReset, isUpdating }: ConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState(config?.goal || "");
  const [interval, setIntervalVal] = useState(config?.intervalSeconds?.toString() || "30");
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    onUpdate({
      ...config,
      goal,
      intervalSeconds: parseInt(interval, 10) || 30,
    });
    setOpen(false);
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await onReset();
    } finally {
      setIsResetting(false);
      setConfirmReset(false);
      setOpen(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="font-display font-semibold text-lg text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Agent Directive
        </h3>
        <Dialog open={open} onOpenChange={(val) => {
          if (val && config) {
            setGoal(config.goal);
            setIntervalVal(config.intervalSeconds.toString());
          }
          if (!val) setConfirmReset(false);
          setOpen(val);
        }}>
          <DialogTrigger asChild>
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors border border-white/5">
              <Settings className="w-4 h-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border border-white/10 text-foreground shadow-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-white">Configure Directive</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-6 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Primary Goal</label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none h-24"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Cycle Interval (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="3600"
                  value={interval}
                  onChange={(e) => setIntervalVal(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/80 text-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                >
                  {isUpdating ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>

            {/* Divider */}
            <div className="border-t border-white/10 mt-2 pt-4">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive/80 hover:text-destructive bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 hover:border-destructive/40 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resetear agente
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive/90 leading-relaxed">
                      Esto borrará toda la memoria, logs, historial del chat y configuración del agente. Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/10 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isResetting}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-bold bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/40 transition-all disabled:opacity-50"
                    >
                      {isResetting ? "Reseteando..." : "Sí, resetear"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="bg-black/30 rounded-xl p-4 border border-white/5">
          <p className="text-sm text-gray-300 leading-relaxed italic">
            "{config?.goal || 'No goal set. Configure the agent to begin.'}"
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Clock className="w-3 h-3" />
          Runs every {config?.intervalSeconds || 0}s · via puter.ai
        </div>
      </div>
    </div>
  );
}
