import { useApp } from "@/context/AppContext";
import AuthPage from "@/components/AuthPage";
import Home from "@/pages/Home";
import { Loader2 } from "lucide-react";

/**
 * Root App component - handles auth routing
 */
export default function App() {
  const { isAuthenticated, loading } = useApp();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading MernChat...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Show main app if authenticated
  return <Home />;
}