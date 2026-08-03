import express from "express";
import {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
} from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Get all conversations for current user
router.get("/conversations", getConversations);

// Send a message
router.post("/", sendMessage);

// Get messages between current user and another user
router.get("/:userId", getMessages);

// Mark messages from a specific user as read
router.put("/:userId/read", markAsRead);

export default router;