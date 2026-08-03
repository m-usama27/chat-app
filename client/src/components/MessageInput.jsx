import { useState, useRef, useEffect } from "react";
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Message input component with auto-resizing textarea
 */
export default function MessageInput({ onSend }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [message]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-card p-3">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={cn(
              "w-full resize-none rounded-2xl border border-input bg-background px-4 py-2.5 pr-10",
              "text-sm placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "max-h-[120px] min-h-[42px]"
            )}
          />
          <button
            type="button"
            className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>
        <Button
          type="submit"
          size="icon"
          className="rounded-full h-10 w-10 shrink-0"
          disabled={!message.trim()}
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}