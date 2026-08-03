import { io } from "socket.io-client";

/**
 * Socket.IO client service (singleton).
 *
 * Manages the lifecycle of the WebSocket connection and provides a clean
 * API for connecting, disconnecting, emitting events, and registering
 * event listeners.
 *
 * The socket URL is derived from VITE_API_URL by stripping the "/api"
 * suffix. For example:
 *   VITE_API_URL = "https://example.com/api"  →  socket URL = "https://example.com"
 *   VITE_API_URL = "/api"                      →  socket URL = ""  (same origin)
 */

function getSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "/api";
  // Strip trailing "/api" to get the base server URL
  return apiUrl.replace(/\/api\/?$/, "");
}

let socket = null;

/**
 * Connect the socket to the server using the provided JWT token.
 * If a socket already exists it is disconnected first so we always
 * start from a clean state.
 *
 * @param {string} token - The raw JWT token (without "Bearer " prefix)
 * @returns {import("socket.io-client").Socket|null} The connected socket, or null
 */
export function connectSocket(token) {
  if (!token) return null;

  // Disconnect any existing socket before creating a new one
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(getSocketUrl(), {
    auth: { token: `Bearer ${token}` },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

/**
 * Disconnect the socket and clean up.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance (may be null if not connected).
 *
 * @returns {import("socket.io-client").Socket|null}
 */
export function getSocket() {
  return socket;
}

/**
 * Emit an event to the server.
 *
 * @param {string} event - Event name
 * @param {...any} args - Payload (and optional ack callback as last arg)
 */
export function emitEvent(event, ...args) {
  if (socket) {
    socket.emit(event, ...args);
  }
}

/**
 * Register a listener for a server→client event.
 * Returns an unsubscribe function.
 *
 * @param {string} event - Event name
 * @param {Function} handler - Callback
 * @returns {Function} Unsubscribe function
 */
export function onEvent(event, handler) {
  if (!socket) return () => {};

  socket.on(event, handler);
  return () => {
    socket.off(event, handler);
  };
}

/**
 * Register a one-time listener for a server→client event.
 *
 * @param {string} event - Event name
 * @param {Function} handler - Callback
 */
export function onceEvent(event, handler) {
  if (socket) {
    socket.once(event, handler);
  }
}

/**
 * Emit a "join_room" event for a specific conversation.
 *
 * @param {string} recipientId - The other participant's user ID
 */
export function joinRoom(recipientId) {
  emitEvent("join_room", { recipientId });
}

/**
 * Emit a "leave_room" event for a specific conversation.
 *
 * @param {string} recipientId - The other participant's user ID
 */
export function leaveRoom(recipientId) {
  emitEvent("leave_room", { recipientId });
}

/**
 * Emit a "send_message" event with an acknowledgement callback.
 *
 * @param {string} recipientId
 * @param {string} content
 * @param {string} tempId - Client-generated temp ID for optimistic reconciliation
 * @returns {Promise<{success: boolean, tempId?: string, message?: object, message?: string}>}
 */
export function sendMessageSocket(recipientId, content, tempId) {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false, message: "Socket not connected" });
      return;
    }

    socket.emit("send_message", { recipientId, content, tempId }, (ack) => {
      resolve(ack || { success: false, message: "No acknowledgement" });
    });
  });
}

/**
 * Emit a "typing" event.
 *
 * @param {string} recipientId
 */
export function emitTyping(recipientId) {
  emitEvent("typing", { recipientId });
}

/**
 * Emit a "stop_typing" event.
 *
 * @param {string} recipientId
 */
export function emitStopTyping(recipientId) {
  emitEvent("stop_typing", { recipientId });
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  emitEvent,
  onEvent,
  onceEvent,
  joinRoom,
  leaveRoom,
  sendMessageSocket,
  emitTyping,
  emitStopTyping,
};