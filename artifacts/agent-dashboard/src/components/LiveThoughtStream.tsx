import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Cpu, Zap, Loader2 } from "lucide-react";
import type { AgentLogEntry } from "@workspace/api-client-react/src/generated/api.schemas";

interface LiveThoughtStreamProps {
  latestLog?: AgentLogEntry;
  isThinking: boolean;
}

export function LiveThoughtStream({ latestLog, isThinking }: LiveThoughtStreamProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-3">
          <BrainCircuit className="w-6 h-6 text-primary" />
          Neural Stream
        </h2>
        {isThinking && (
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold tracking-wide animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            SYNTHESIZING
          </div>
        )}
      </div>

      <div className="min-h-[200px] flex flex-col justify-center relative z-10">
        <AnimatePresence mode="wait">
          {isThinking ? (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center space-y-4 text-center py-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Cpu className="w-12 h-12 text-primary animate-pulse relative z-10" />
              </div>
              <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest animate-pulse">
                Processing objective...
              </p>
            </motion.div>
          ) : latestLog ? (
            <motion.div
              key={latestLog.id}
              initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Latest Thought
                </div>
                <p className="text-lg md:text-xl text-white font-medium leading-relaxed">
                  "{latestLog.thought}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <div className="text-xs font-mono text-primary mb-2 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Action
                  </div>
                  <p className="text-sm text-gray-300 font-mono break-all">
                    {latestLog.action}
                  </p>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <div className="text-xs font-mono text-accent mb-2 flex items-center gap-2">
                    <BrainCircuit className="w-3 h-3" /> Result
                  </div>
                  <p className="text-sm text-gray-300 font-mono break-all">
                    {latestLog.result}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-mono text-sm">Awaiting neural input.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
