import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Edit2, Save, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MemoryEditorProps {
  memoryContent?: string;
  updatedAt?: string;
  onSave: (content: string) => void;
  isSaving: boolean;
}

export function MemoryEditor({ memoryContent = "", updatedAt, onSave, isSaving }: MemoryEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(memoryContent);

  useEffect(() => {
    if (!isEditing) {
      setContent(memoryContent);
    }
  }, [memoryContent, isEditing]);

  const handleSave = () => {
    onSave(content);
    setIsEditing(false);
  };

  return (
    <div className="glass-panel rounded-3xl flex flex-col h-full overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      <div className="p-6 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
            <Database className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-white leading-none">Core Memory</h3>
            {updatedAt && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {!isEditing ? (
            <motion.button
              key="edit-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || content === memoryContent}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : "Save"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 flex-1 relative z-10">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full min-h-[200px] bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-gray-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
            placeholder="Agent memory state..."
          />
        ) : (
          <div className="w-full h-full min-h-[200px] bg-black/20 border border-transparent rounded-xl p-4 text-sm text-gray-300 font-mono overflow-y-auto whitespace-pre-wrap">
            {memoryContent || <span className="text-muted-foreground italic">Memory is empty.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
