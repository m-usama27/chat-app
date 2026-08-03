import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "../models/User.js";
import Message from "../models/Message.js";

/**
 * Tracks online users and their socket connections.
 * A user may have multiple socket connections (multiple tabs/devices).
 * Map<userIdString, Set<socketId>>
 */
const onlineUsers = new Map();

/**
 * Generate a deterministic room ID for a 1-on-1 conversation.
 * The two participants always resolve to the same room name regardless
 * of who initiated the conversation.
 *
 * @param {string} userIdA
 * @param {string} userIdB
 * @returns {string} Room name like "conv:abc..._def..."
 */
function getConversationRoomId(userIdA, userIdB) {
  return `conv:${[String(userIdA), String(userIdB)].sort().join("_")}`;
}

/**
 * Personal room for a user — used for presence and message notifications
 * that should reach the user even when they don't have a specific
 * conversation open.
 *
 * @param {string} userId
 * @returns {string} Room name like "user:abc..."
 */
function getUserRoomId(userId) {
  return `user:${String(userId)}`;
}

/**
 * Mark a user as online (DB + in-memory map) and notify all clients.
 */
async function setUserOnline(userId, socketId, io) {
  // Add socket to the user's connection set
  if (!onlineUsers.has(String(userId))) {
    onlineUsers.set(String(userId), new Set());
  }
  onlineUsers.get(String(userId)).add(socketId);

  // Update DB status
  await User.findByIdAndUpdate(userId, {
    status: "online",
    lastSeen: new Date(),
  });

  // Notify all connected clients that this user is online
  io.emit("user_online", { userId: String(userId) });
}

/**
 * Mark a user as offline (DB + in-memory map) and notify all clients.
 * Only marks offline when the user has no remaining socket connections.
 */
async function setUserOffline(userId, socketId, io) {
  const connections = onlineUsers.get(String(userId));
  if (connections) {
    connections.delete(socketId);
    if (connections.size === 0) {
      onlineUsers.delete(String(userId));

      // Update DB status
      await User.findByIdAndUpdate(userId, {
        status: "offline",
        lastSeen: new Date(),
      });

      // Notify all connected clients that this user is offline
      io.emit("user_offline", {
        userId: String(userId),
        lastSeen: new Date().toISOString(),
      });
    }
  }
}

/**
 * Socket.IO authentication middleware.
 * Reuses the same JWT verification logic as the HTTP `protect` middleware
 * (see server/middleware/auth.js) so sockets and REST share one auth model.
 *
 * The client sends the JWT via the `auth` field of the connection handshake:
 *   io({ auth: { token: "Bearer <jwt>" } })
 */
function authenticateSocket(socket, next) {
  try {
    const auth = socket.handshake.auth || {};
    let token = auth.token;

    // Accept both "Bearer <token>" and raw "<token>" for convenience
    if (token && token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    if (!token) {
      return next(new Error("Not authorized, no token provided"));
    }

    // Verify token — same logic as protect middleware
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user id to socket for later use
    socket.userId = String(decoded.id);

    next();
  } catch (error) {
    next(new Error("Not authorized, token failed"));
  }
}

/**
 * Initialize and configure the Socket.IO server, attaching it to the
 * provided HTTP server (the same one Express uses).
 *
 * @param {import("http").Server} httpServer
 * @param {string[]} allowedOrigins
 * @returns {import("socket.io").Server} The configured Socket.IO server
 */
export function initSocketServer(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
        } else {
          // Allow anyway in dev to avoid blocking (matches HTTP CORS behavior)
          callback(null, true);
        }
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // Auth middleware — runs on every new connection
  io.use(authenticateSocket);

  // ====================
  // Connection handler
  // ====================
  io.on("connection", (socket) => {
    const userId = socket.userId;

    // Join the user's personal room (for presence + notifications)
    socket.join(getUserRoomId(userId));

    // Mark user as online and notify everyone
    setUserOnline(userId, socket.id, io);

    // --------------------
    // Join a conversation room
    // --------------------
    socket.on("join_room", async ({ recipientId } = {}) => {
      try {
        if (!recipientId) return;

        const roomId = getConversationRoomId(userId, recipientId);
        socket.join(roomId);

        // Notify the other participant that this user has joined the room
        socket.to(roomId).emit("user_joined_room", { userId });
      } catch (error) {
        console.error("join_room error:", error.message);
      }
    });

    // --------------------
    // Leave a conversation room
    // --------------------
    socket.on("leave_room", ({ recipientId } = {}) => {
      try {
        if (!recipientId) return;

        const roomId = getConversationRoomId(userId, recipientId);
        socket.leave(roomId);

        socket.to(roomId).emit("user_left_room", { userId });
      } catch (error) {
        console.error("leave_room error:", error.message);
      }
    });

    // --------------------
    // Send a message
    // --------------------
    socket.on(
      "send_message",
      async ({ recipientId, content, tempId } = {}, ack) => {
        try {
          if (!recipientId || !content) {
            if (typeof ack === "function") {
              ack({ success: false, message: "recipientId and content are required" });
            }
            return;
          }

          // 1. Save to DB first — never lose a message even if delivery fails
          const message = await Message.create({
            sender: userId,
            recipient: recipientId,
            content,
          });

          // Populate sender/recipient for the client
          await message.populate(
            "sender",
            "username displayName avatar status"
          );
          await message.populate(
            "recipient",
            "username displayName avatar status"
          );

          const messageObj = message.toObject();

          // 2. Emit to the conversation room (excludes sender) — live delivery
          const roomId = getConversationRoomId(userId, recipientId);
          socket.to(roomId).emit("receive_message", messageObj);

          // 3. Emit a notification to the recipient's personal room —
          //    this updates their conversation list even if they don't have
          //    this specific chat open.
          socket
            .to(getUserRoomId(recipientId))
            .emit("new_message", messageObj);

          // 4. Confirm back to the sender — used to reconcile the
          //    optimistic UI update (replace tempId with the real message)
          if (typeof ack === "function") {
            ack({ success: true, tempId, message: messageObj });
          }
        } catch (error) {
          console.error("send_message error:", error.message);
          if (typeof ack === "function") {
            ack({ success: false, message: error.message });
          }
        }
      }
    );

    // --------------------
    // Typing indicator
    // --------------------
    socket.on("typing", ({ recipientId } = {}) => {
      if (!recipientId) return;
      const roomId = getConversationRoomId(userId, recipientId);
      socket.to(roomId).emit("typing", { userId });
    });

    // --------------------
    // Stop typing indicator
    // --------------------
    socket.on("stop_typing", ({ recipientId } = {}) => {
      if (!recipientId) return;
      const roomId = getConversationRoomId(userId, recipientId);
      socket.to(roomId).emit("stop_typing", { userId });
    });

    // --------------------
    // Disconnect
    // --------------------
    socket.on("disconnect", () => {
      setUserOffline(userId, socket.id, io);
    });
  });

  return io;
}