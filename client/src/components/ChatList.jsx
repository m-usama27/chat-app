import { MessageSquare } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { cn, formatTime } from "@/lib/utils";

/**
 * Displays a list of conversations with last message preview
 */
export default function ChatList({ conversations, activeConversation, onSelect }) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-3">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          No conversations yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Click "New Chat" to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">
        Conversations
      </p>
      {conversations.map((conv) => {
        const isActive = activeConversation?._id === conv.user._id;
        const lastMsg = conv.lastMessage;
        const isFromPartner =
          String(lastMsg.sender._id) === String(conv.user._id);

        return (
          <button
            key={conv.user._id}
            onClick={() => onSelect(conv.user)}
            className={cn(
              "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left",
              isActive && "bg-accent"
            )}
          >
            <UserAvatar user={conv.user} size="default" showStatus />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">
                  {conv.user.displayName || conv.user.username}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTime(lastMsg.createdAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {isFromPartner ? "" : "You: "}
                {lastMsg.content}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}