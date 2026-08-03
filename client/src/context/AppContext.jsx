import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { authAPI, messageAPI } from "@/services/api";
import {
  connectSocket,
  disconnectSocket,
  onEvent,
  sendMessageSocket,
} from "@/services/socket";

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
  // ── Socket state ──
  socketConnected: false, // true when the socket is connected
  typingUsers: {}, // { [userId]: true } — who is currently typing to me
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
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };

    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    // ── Socket: reconcile optimistic message with server-confirmed version ──
    case "RECONCILE_MESSAGE": {
      const { tempId, message } = action.payload;
      const messages = state.messages.map((m) =>
        String(m._id) === String(tempId) ? message : m
      );
      return { ...state, messages };
    }

    // ── Socket: incoming message from another user ──
    case "RECEIVE_MESSAGE": {
      const message = action.payload;

      // 1. Add to messages list if for the active conversation (avoid duplicates)
      let messages = state.messages;
      const activeConvId = state.activeConversation?._id;
      const isForActiveConversation =
        String(message.sender._id) === String(activeConvId);

      if (isForActiveConversation) {
        const exists = state.messages.some(
          (m) => String(m._id) === String(message._id)
        );
        if (!exists) {
          messages = [...state.messages, message];
        }
      }

      // 2. Update conversation list with new last message
      const conversations = [...state.conversations];
      const index = conversations.findIndex(
        (c) => String(c.user._id) === String(message.sender._id)
      );

      if (index !== -1) {
        // Update existing conversation and move to top
        const updated = { ...conversations[index], lastMessage: message };
        conversations.splice(index, 1);
        conversations.unshift(updated);
      } else {
        // New conversation — add to top
        conversations.unshift({
          user: message.sender,
          lastMessage: message,
        });
      }

      return { ...state, messages, conversations };
    }

    // ── Socket: add missed messages (fetched on reconnect) ──
    case "ADD_MISSED_MESSAGES": {
      const newMessages = action.payload;
      const existingIds = new Set(
        state.messages.map((m) => String(m._id))
      );
      const filtered = newMessages.filter(
        (m) => !existingIds.has(String(m._id))
      );
      if (filtered.length === 0) return state;
      return { ...state, messages: [...state.messages, ...filtered] };
    }

    // ── Socket: connection state ──
    case "SET_SOCKET_CONNECTED":
      return { ...state, socketConnected: action.payload };

    // ── Socket: typing indicator ──
    case "SET_TYPING": {
      const { userId, isTyping } = action.payload;
      const typingUsers = { ...state.typingUsers };
      if (isTyping) {
        typingUsers[userId] = true;
      } else {
        delete typingUsers[userId];
      }
      return { ...state, typingUsers };
    }

    // ── Socket: presence (online/offline) ──
    case "UPDATE_USER_STATUS": {
      const { userId, status, lastSeen } = action.payload;

      // Update active conversation if it matches
      let activeConversation = state.activeConversation;
      if (
        activeConversation &&
        String(activeConversation._id) === String(userId)
      ) {
        activeConversation = { ...activeConversation, status, lastSeen };
      }

      // Update conversation list
      const conversations = state.conversations.map((c) => {
        if (String(c.user._id) === String(userId)) {
          return {
            ...c,
            user: { ...c.user, status, lastSeen },
          };
        }
        return c;
      });

      return { ...state, activeConversation, conversations };
    }

    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Refs to hold latest state for socket event handlers (which are
  // registered once and should not be re-registered on every state change)
  const activeConversationRef = useRef(null);
  const messagesRef = useRef([]);
  const userRef = useRef(state.user);

  useEffect(() => {
    activeConversationRef.current = state.activeConversation;
  }, [state.activeConversation]);

  useEffect(() => {
    messagesRef.current = state.messages;
  }, [state.messages]);

  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

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

  // ====================
  // Socket lifecycle
  // ====================
  // Connect the socket when the user is authenticated, and disconnect
  // when they log out or the token is removed.
  useEffect(() => {
    if (!state.token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(state.token);
    if (!socket) return;

    // ── Register socket event listeners ──

    // Connection state
    onEvent("connect", () => {
      dispatch({ type: "SET_SOCKET_CONNECTED", payload: true });

      // On reconnect, fetch any missed messages for the active conversation
      const activeConv = activeConversationRef.current;
      const msgs = messagesRef.current;
      if (activeConv?._id && msgs.length > 0) {
        const lastMessageId = msgs[msgs.length - 1]._id;
        messageAPI
          .getMessages(activeConv._id, lastMessageId)
          .then((response) => {
            if (response.messages && response.messages.length > 0) {
              dispatch({
                type: "ADD_MISSED_MESSAGES",
                payload: response.messages,
              });
              messageAPI.markAsRead(activeConv._id).catch(() => {});
            }
          })
          .catch(() => {});
      }

      // Also refresh the conversation list on reconnect
      loadConversations();
    });

    onEvent("disconnect", () => {
      dispatch({ type: "SET_SOCKET_CONNECTED", payload: false });
    });

    // Incoming message (live delivery via conversation room)
    onEvent("receive_message", (message) => {
      dispatch({ type: "RECEIVE_MESSAGE", payload: message });
    });

    // New message notification (via personal room — for conversation list)
    onEvent("new_message", (message) => {
      dispatch({ type: "RECEIVE_MESSAGE", payload: message });
    });

    // Typing indicators
    onEvent("typing", ({ userId }) => {
      dispatch({
        type: "SET_TYPING",
        payload: { userId, isTyping: true },
      });
      // Auto-clear after 3 seconds in case stop_typing is missed
      setTimeout(() => {
        dispatch({
          type: "SET_TYPING",
          payload: { userId, isTyping: false },
        });
      }, 3000);
    });

    onEvent("stop_typing", ({ userId }) => {
      dispatch({
        type: "SET_TYPING",
        payload: { userId, isTyping: false },
      });
    });

    // Presence
    onEvent("user_online", ({ userId }) => {
      dispatch({
        type: "UPDATE_USER_STATUS",
        payload: { userId, status: "online", lastSeen: new Date().toISOString() },
      });
    });

    onEvent("user_offline", ({ userId, lastSeen }) => {
      dispatch({
        type: "UPDATE_USER_STATUS",
        payload: { userId, status: "offline", lastSeen },
      });
    });

    // Cleanup on unmount or token change
    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.token]);

  // Set status to offline when the browser/tab is closing
  useEffect(() => {
    const handleBeforeUnload = () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const apiUrl = import.meta.env.VITE_API_URL || "/api";
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
    disconnectSocket();
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

  // Load conversations (initial REST call — no polling)
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

  // Load messages (initial REST call when opening a chat — no polling)
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

  // Load missed messages (used on socket reconnect)
  const loadMissedMessages = useCallback(async (userId, after) => {
    try {
      const response = await messageAPI.getMessages(userId, after);
      if (response.messages && response.messages.length > 0) {
        dispatch({ type: "ADD_MISSED_MESSAGES", payload: response.messages });
        await messageAPI.markAsRead(userId);
      }
    } catch (error) {
      console.error("Failed to load missed messages:", error.message);
    }
  }, []);

  // Send message — optimistic update + socket delivery
  const sendMessage = useCallback(async (recipientId, content) => {
    const user = userRef.current;
    const currentUserId = user?.id || user?._id;

    // Generate a temp ID for optimistic reconciliation
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Create optimistic message object
    const optimisticMessage = {
      _id: tempId,
      _temp: true,
      sender: {
        _id: currentUserId,
        username: user?.username,
        displayName: user?.displayName,
        avatar: user?.avatar,
        status: user?.status || "online",
      },
      recipient: {
        _id: recipientId,
      },
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // 1. Optimistically add to local UI state
    dispatch({ type: "ADD_MESSAGE", payload: optimisticMessage });

    // 2. Emit via socket — server saves to DB first, then broadcasts
    const result = await sendMessageSocket(recipientId, content, tempId);

    if (result.success) {
      // 3. Reconcile with server-confirmed version
      dispatch({
        type: "RECONCILE_MESSAGE",
        payload: { tempId, message: result.message },
      });
      return { success: true };
    } else {
      // Delivery failed — the optimistic message stays in the UI
      // (could add retry logic or mark as failed here)
      return { success: false, message: result.message };
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
    loadMissedMessages,
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