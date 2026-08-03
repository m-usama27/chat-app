import Message from "../models/Message.js";
import User from "../models/User.js";

/**
 * @desc    Send a message
 * @route   POST /api/messages
 * @access  Private
 */
export const sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        message: "Recipient ID and message content are required",
      });
    }

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      content,
    });

    await message.populate("sender", "username displayName avatar status");
    await message.populate("recipient", "username displayName avatar status");

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
};

/**
 * @desc    Get conversation between two users
 * @route   GET /api/messages/:userId
 * @access  Private
 */
export const getMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: otherUserId },
        { sender: otherUserId, recipient: req.user._id },
      ],
    })
      .populate("sender", "username displayName avatar status")
      .populate("recipient", "username displayName avatar status")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch messages",
    });
  }
};

/**
 * @desc    Get all conversations for the current user
 * @route   GET /api/messages/conversations
 * @access  Private
 */
export const getConversations = async (req, res) => {
  try {
    // Get all unique users the current user has exchanged messages with
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    })
      .populate("sender", "username displayName avatar status lastSeen")
      .populate("recipient", "username displayName avatar status lastSeen")
      .sort({ createdAt: -1 });

    // Build a map of unique conversations with last message
    const conversationsMap = new Map();

    // Helper: determine effective online status from lastSeen (within 60s = online)
    const getEffectiveStatus = (user) => {
      if (!user || !user.lastSeen) return "offline";
      const diff = Date.now() - new Date(user.lastSeen).getTime();
      return diff < 60000 ? "online" : "offline";
    };

    messages.forEach((msg) => {
      const otherUser =
        msg.sender._id.toString() === req.user._id.toString()
          ? msg.recipient
          : msg.sender;

      const otherUserId = otherUser._id.toString();

      if (!conversationsMap.has(otherUserId)) {
        // Convert to plain object and apply effective status
        const userObj =
          otherUser.toObject !== undefined
            ? otherUser.toObject()
            : { ...otherUser };
        userObj.status = getEffectiveStatus(userObj);

        conversationsMap.set(otherUserId, {
          user: userObj,
          lastMessage: msg,
        });
      }
    });

    const conversations = Array.from(conversationsMap.values());

    res.json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch conversations",
    });
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/messages/:userId/read
 * @access  Private
 */
export const markAsRead = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    await Message.updateMany(
      {
        sender: otherUserId,
        recipient: req.user._id,
        read: false,
      },
      { read: true }
    );

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark messages as read",
    });
  }
};