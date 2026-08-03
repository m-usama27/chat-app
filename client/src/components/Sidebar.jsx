import { useState, useEffect } from "react";
import { Search, Settings, LogOut, MessageSquare, X, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { userAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import UserAvatar from "@/components/UserAvatar";
import ChatList from "@/components/ChatList";
import { cn, formatTime } from "@/lib/utils";

export default function Sidebar({ onOpenProfile, onSelectConversation }) {
  const {
    user,
    conversations,
    activeConversation,
    loadConversations,
    selectConversation,
    logout,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  // Load conversations on mount and poll every 5 seconds
  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      loadConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Search users
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const response = await userAPI.search(searchQuery);
          setSearchResults(response.users);
        } catch {
          setSearchResults([]);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Load all users
  const handleShowAllUsers = async () => {
    if (!showAllUsers && allUsers.length === 0) {
      try {
        const response = await userAPI.getAll();
        setAllUsers(response.users);
      } catch {
        // ignore
      }
    }
    setShowAllUsers(!showAllUsers);
  };

  const handleSelectUser = (selectedUser) => {
    selectConversation(selectedUser);
    setSearchQuery("");
    setSearchResults([]);
    setShowAllUsers(false);
    // Switch to chat view on mobile
    if (onSelectConversation) onSelectConversation();
  };

  const displayUsers = isSearching
    ? searchResults
    : showAllUsers
    ? allUsers
    : [];

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold">MernChat</h1>
        </div>
      </div>

      {/* Current User */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
          <UserAvatar user={user} size="default" showStatus />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.displayName || user?.username}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{user?.username}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onOpenProfile}
              title="Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations / Search Results */}
      <ScrollArea className="flex-1">
        {searchQuery || showAllUsers ? (
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {searchQuery
                  ? "Search Results"
                  : "All Users"}
              </p>
              {showAllUsers && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowAllUsers(false)}
                >
                  Back
                </Button>
              )}
            </div>
            {displayUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {isSearching ? "Searching..." : "No users found"}
              </div>
            ) : (
              displayUsers.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleSelectUser(u)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left",
                    activeConversation?._id === u._id && "bg-accent"
                  )}
                >
                  <UserAvatar user={u} size="default" showStatus />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {u.displayName || u.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{u.username}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="p-2">
            {/* New Chat Button */}
            <button
              onClick={handleShowAllUsers}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left mb-2"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New Chat</p>
                <p className="text-xs text-muted-foreground">
                  Start a conversation
                </p>
              </div>
            </button>

            <Separator className="my-2" />

            {/* Conversations List */}
            <ChatList
              conversations={conversations}
              activeConversation={activeConversation}
              onSelect={handleSelectUser}
            />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}