import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Protect routes - verifies JWT token from Authorization header
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    // Throttled update of online status and lastSeen (at most every 30s)
    // This keeps the user's status fresh while they're actively using the app
    const now = Date.now();
    const lastSeenMs = user.lastSeen ? new Date(user.lastSeen).getTime() : 0;
    if (now - lastSeenMs > 30000) {
      await User.findByIdAndUpdate(user._id, {
        status: "online",
        lastSeen: now,
      });
      user.status = "online";
      user.lastSeen = now;
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};