import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreVertical, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import MessageInput from "@/components/MessageInput";
import { joinRoom, leaveRoom } from "@/services/socket";
import { cn, formatTime, formatDate } from "@/lib/utils";

export default function ChatWindow({ onBack }) {
  const {
    user,
    activeConversation,
    messages,
    sendMessage,
    socketConnected,
    typingUsers,
  } = useApp();

  const messagesEndRef = useRef(null);
  const viewportRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevMessageCountRef = useRef(0);
  const prevConversationRef = useRef(null);

  // Get current user ID (handles both 'id' and '_id' from different sources)
  const currentUserId = user?.id || user?._id;

  // Check if the other participant is currently typing
  const isTyping = activeConversation
    ? !!typingUsers[String(activeConversation._id)]
    : false;

  // Reset scroll state when conversation changes
  // (messages are loaded directly in selectConversation in AppContext)
  useEffect(() => {
    if (activeConversation?._id) {
      prevMessageCountRef.current = 0;
      setIsAtBottom(true);
    }
  }, [activeConversation?._id]);

  // Join/leave conversation room via Socket.IO when the active chat changes
  useEffect(() => {
    const currentId = activeConversation?._id;
    const prevId = prevConversationRef.current;

    // Leave the previous conversation room (if any)
    if (prevId && prevId !== currentId) {
      leaveRoom(prevId);
    }

    // Join the new conversation room (if any)
    if (currentId) {
      joinRoom(currentId);
    }

    // Update ref for next comparison
    prevConversationRef.current = currentId;

    // Cleanup: leave the room when the component unmounts
    return () => {
      if (currentId) {
        leaveRoom(currentId);
      }
    };
  }, [activeConversation?._id]);

  // Track whether the user is scrolled to the bottom of the chat
  const handleScroll = useCallback((event) => {
    const target = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = target;
    // Consider "at bottom" if within 50px of the bottom edge
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsAtBottom(distanceFromBottom < 50);
  }, []);

  // Auto-scroll to bottom only when genuinely new messages arrive AND user is at bottom
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isAtBottom && hasNewMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  // When the user sends a message, force-scroll to bottom
  const handleSend = useCallback(
    async (content) => {
      const result = await sendMessage(activeConversation._id, content);
      if (result.success) {
        setIsAtBottom(true);
      }
      return result;
    },
    [activeConversation?._id, sendMessage]
  );

  if (!activeConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-10 h-10 text-muted-foreground"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.263 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.965-2.708-3.228A48.176 48.176 0 0 0 12 3.003c-2.392 0-4.736.175-7.043.51C3.373 3.776 2.25 5.14 2.25 6.741v6.018Z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground">
          Select a conversation
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a chat from the sidebar to start messaging
        </p>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Reconnecting banner — shown when the socket is disconnected */}
      {!socketConnected && (
        <div className="flex items-center justify-center gap-2 py-1.5 px-4 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs font-medium border-b border-yellow-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Reconnecting...
        </div>
      )}

      {/* Chat Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <UserAvatar user={activeConversation} size="default" showStatus />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">
            {activeConversation.displayName || activeConversation.username}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isTyping ? (
              <span className="text-primary">typing...</span>
            ) : activeConversation.status === "online" ? (
              "Active now"
            ) : (
              `Last seen ${formatTime(activeConversation.lastSeen)}`
            )}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages - native scrollable div for reliable touch scrolling on mobile */}
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin"
      >
        <div className="p-4 space-y-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserAvatar user={activeConversation} size="xl" />
              <p className="text-lg font-semibold mt-4">
                {activeConversation.displayName || activeConversation.username}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This is the beginning of your conversation with{" "}
                {activeConversation.displayName || activeConversation.username}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Send a message to start chatting
              </p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date} className="space-y-1">
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {date}
                  </span>
                </div>

                {/* Messages */}
                {msgs.map((msg, index) => {
                  const isOwn =
                    String(msg.sender._id) === String(currentUserId);
                  const prevMsg = msgs[index - 1];
                  const showAvatar =
                    !isOwn &&
                    (!prevMsg ||
                      String(prevMsg.sender._id) !==
                        String(msg.sender._id));

                  return (
                    <div
                      key={msg._id || index}
                      className={cn(
                        "flex items-end gap-2 animate-slide-in",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      {/* Avatar for received messages */}
                      {!isOwn && (
                        <div className="w-8 shrink-0">
                          {showAvatar && (
                            <UserAvatar user={msg.sender} size="sm" />
                          )}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        <p className="text-sm break-words whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1 text-right",
                            isOwn
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        onSend={handleSend}
        recipientId={activeConversation._id}
      />
    </div>
  );
}