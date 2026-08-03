import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import ProfileModal from "@/components/ProfileModal";
import { cn } from "@/lib/utils";

/**
 * Main chat page - displays sidebar and chat window
 */
export default function Home() {
  const { activeConversation } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileView, setMobileView] = useState("sidebar"); // "sidebar" | "chat"

  // Handle browser back button / mobile back gesture — navigate within the app
  // instead of leaving. When back is pressed, close the profile modal (if open)
  // and switch back to the sidebar view (if in chat view).
  useEffect(() => {
    const handlePopState = () => {
      setProfileOpen(false);
      setMobileView("sidebar");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Open profile modal and push a history state so back closes the modal
  const handleOpenProfile = useCallback(() => {
    setProfileOpen(true);
    window.history.pushState({ view: "profile" }, "");
  }, []);

  // In-app back button — use history.back() so the popstate handler fires
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  // Switch to chat view when conversation is selected (mobile) and push
  // a history state so the browser back button returns to the sidebar
  const handleSelectConversation = useCallback(() => {
    setMobileView("chat");
    window.history.pushState({ view: "chat" }, "");
  }, []);

  // Sync history when the profile modal is closed via the X button / overlay
  const handleProfileOpenChange = useCallback(
    (open) => {
      if (!open && profileOpen) {
        // Modal was open and is now closing via UI — go back in history
        // so the pushed state is popped and popstate fires
        window.history.back();
      }
      setProfileOpen(open);
    },
    [profileOpen]
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar - hidden on mobile when in chat view */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r shrink-0",
          mobileView === "sidebar" ? "block" : "hidden md:block"
        )}
      >
        <Sidebar
          onOpenProfile={handleOpenProfile}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat Window - hidden on mobile when in sidebar view */}
      <div
        className={cn(
          "flex-1",
          mobileView === "chat" ? "block" : "hidden md:block"
        )}
      >
        <ChatWindow onBack={handleBack} />
      </div>

      {/* Profile Modal */}
      <ProfileModal open={profileOpen} onOpenChange={handleProfileOpenChange} />
    </div>
  );
}