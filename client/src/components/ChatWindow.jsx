import { useEffect, useRef } from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import UserAvatar from "@/components/UserAvatar";
import MessageInput from "@/components/MessageInput";
import { cn, formatTime, formatDate } from "@/lib/utils";

export default function ChatWindow({ onBack }) {
  const {
    user,
    activeConversation,
    messages,
    loadMessages,
    sendMessage,
  } = useApp();

  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation?._id) {
      loadMessages(activeConversation._id);
    }
  }, [activeConversation?._id, loadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            {activeConversation.status === "online"
              ? "Active now"
              : `Last seen ${formatTime(activeConversation.lastSeen)}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 scrollbar-thin" ref={scrollRef}>
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
                  const isOwn = msg.sender._id === user._id;
                  const prevMsg = msgs[index - 1];
                  const showAvatar =
                    !isOwn && (!prevMsg || prevMsg.sender._id !== msg.sender._id);

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
      </ScrollArea>

      {/* Message Input */}
      <MessageInput
        onSend={(content) => sendMessage(activeConversation._id, content)}
      />
    </div>
  );
}