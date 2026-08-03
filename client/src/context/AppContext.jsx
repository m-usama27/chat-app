import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { authAPI, messageAPI } from "@/services/api";

const AppContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  conversations: [],
  activeConversation: null,
  messages: [],
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case "AUTH_FAIL":
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };
    case "LOGOUT":
      return {
        ...initialState,
        loading: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    case "SET_CONVERSATIONS": {
      // Refresh activeConversation with updated data (e.g., online status) if it exists
      const activeConv = state.activeConversation
        ? action.payload.find(
            (c) => String(c.user?._id) === String(state.activeConversation._id)
          )
        : null;
      return {
        ...state,
        conversations: action.payload,
        activeConversation: activeConv
          ? activeConv.user
          : state.activeConversation,
      };
    }
    case "SET_ACTIVE_CONVERSATION":
      return {
        ...state,
        activeConversation: action.payload,
      };
    case "SET_MESSAGES": {
      // Avoid unnecessary re-renders when polling returns the same messages
      const prev = state.messages;
      const next = action.payload;
      const sameLength = prev.length === next.length;
      const sameLastId =
        prev.length > 0 &&
        next.length > 0 &&
        String(prev[prev.length - 1]?._id) ===
          String(next[next.length - 1]?._id);
      if (sameLength && (prev.length === 0 || sameLastId)) {
        return state;
      }
      return { ...state, messages: action.payload };
    }
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Check for stored token on mount and fetch fresh user data
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // Immediately set the user from storage to avoid loading flash
        dispatch({
          type: "AUTH_SUCCESS",
          payload: { user, token },
        });

        // Fetch fresh user data from server to update status
        authAPI
          .getMe()
          .then((response) => {
            const freshUser = response.user;
            localStorage.setItem("user", JSON.stringify(freshUser));
            dispatch({
              type: "AUTH_SUCCESS",
              payload: { user: freshUser, token },
            });
          })
          .catch(() => {
            // If getMe fails, keep the stored user
          });
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch({ type: "AUTH_FAIL", payload: null });
      }
    } else {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Set status to offline when the browser/tab is closing
  useEffect(() => {
    const handleBeforeUnload = () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const apiUrl =
        import.meta.env.VITE_API_URL || "/api";
      // Use fetch with keepalive to ensure the request outlives the page
      fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await authAPI.register(userData);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      dispatch({ type: "AUTH_SUCCESS", payload: response });
      return { success: true };
    } catch (error) {
      dispatch({ type: "AUTH_FAIL", payload: error.message });
      return { success: false, message: error.message };
    }
  }, []);

  // Login
  const login = useCallback(async (credentials) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await authAPI.login(credentials);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      dispatch({ type: "AUTH_SUCCESS", payload: response });
      return { success: true };
    } catch (error) {
      dispatch({ type: "AUTH_FAIL", payload: error.message });
      return { success: false, message: error.message };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch({ type: "LOGOUT" });
  }, []);

  // Update profile
  const updateProfile = useCallback((userData) => {
    dispatch({ type: "UPDATE_USER", payload: userData });
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = { ...JSON.parse(storedUser), ...userData };
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const response = await messageAPI.getConversations();
      dispatch({ type: "SET_CONVERSATIONS", payload: response.conversations });
    } catch (error) {
      console.error("Failed to load conversations:", error.message);
    }
  }, []);

  // Select conversation
  const selectConversation = useCallback((user) => {
    dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: user });
    dispatch({ type: "SET_MESSAGES", payload: [] });
  }, []);

  // Load messages
  const loadMessages = useCallback(async (userId) => {
    try {
      const response = await messageAPI.getMessages(userId);
      dispatch({ type: "SET_MESSAGES", payload: response.messages });
      // Mark as read
      await messageAPI.markAsRead(userId);
    } catch (error) {
      console.error("Failed to load messages:", error.message);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (recipientId, content) => {
    try {
      const response = await messageAPI.send(recipientId, content);
      dispatch({ type: "ADD_MESSAGE", payload: response.message });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const value = {
    ...state,
    register,
    login,
    logout,
    updateProfile,
    loadConversations,
    selectConversation,
    loadMessages,
    sendMessage,
    clearError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}