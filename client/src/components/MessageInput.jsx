import { useState, useRef, useEffect } from "react";
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { emitTyping, emitStopTyping } from "@/services/socket";

/**
 * Message input component with auto-resizing textarea and typing indicators.
 *
 * Emits "typing" / "stop_typing" socket events so the other participant
 * sees a live typing indicator. The "typing" event is sent once when the
 * user starts typing, and "stop_typing" is sent after 2s of inactivity or
 * when the message is submitted.
 */
export default function MessageInput({ onSend, recipientId }) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [message]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Emit typing indicator when the user types
  const handleChange = (e) => {
    setMessage(e.target.value);

    if (!recipientId) return;

    // Emit "typing" only once when the user starts typing
    if (!isTypingRef.current && e.target.value.trim()) {
      isTypingRef.current = true;
      emitTyping(recipientId);
    }

    // Clear and reset the stop-typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // After 2 seconds of no typing, emit "stop_typing"
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitStopTyping(recipientId);
    }, 2000);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    // Stop typing indicator when the message is sent
    if (recipientId && isTypingRef.current) {
      isTypingRef.current = false;
      emitStopTyping(recipientId);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

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
            onChange={handleChange}
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