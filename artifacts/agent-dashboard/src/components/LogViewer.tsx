import { motion } from "framer-motion";
import { format } from "date-fns";
import { Terminal, Activity, CheckCircle2 } from "lucide-react";
import type { AgentLogEntry } from "@workspace/api-client-react/src/generated/api.schemas";

interface LogViewerProps {
  logs: AgentLogEntry[];
}

export function LogViewer({ logs }: LogViewerProps) {
  return (
    <div className="glass-panel rounded-3xl flex flex-col h-[500px] overflow-hidden">
      <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-muted-foreground" />
          Activity Log
        </h3>
        <div className="px-2 py-1 rounded-md bg-white/5 text-xs font-mono text-muted-foreground border border-white/10">
          {logs.length} ENTRIES
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Activity className="w-8 h-8 mb-2" />
            <p className="text-sm font-mono">No cycles recorded yet.</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              key={log.id}
              className="group relative pl-6 pb-6 border-l border-white/10 last:border-transparent last:pb-0"
            >
              {/* Timeline node */}
              <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-primary/50 group-hover:bg-primary group-hover:shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all" />
              
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent border border-accent/20">
                  ID: {log.id}
                </span>
              </div>
              
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-3 group-hover:border-white/10 transition-colors">
                <p className="text-sm text-gray-200 leading-relaxed">
                  <span className="text-muted-foreground mr-2">{"// Thought:"}</span>
                  {log.thought}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 bg-black/40 rounded border border-white/5 p-2 font-mono text-xs text-primary/90 flex items-start gap-2">
                    <Activity className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="break-all">{log.action}</span>
                  </div>
                  <div className="flex-1 bg-black/40 rounded border border-white/5 p-2 font-mono text-xs text-green-400/90 flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="break-all truncate">{log.result}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
