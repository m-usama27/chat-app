import { useState } from "react";
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

  const handleOpenProfile = () => setProfileOpen(true);
  const handleBack = () => setMobileView("sidebar");

  // Switch to chat view when conversation is selected (mobile)
  const handleSelectConversation = () => {
    setMobileView("chat");
  };

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
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}