import User from "../models/User.js";

// Helper: determine effective online status from lastSeen (within 60s = online)
const getEffectiveStatus = (user) => {
  if (!user || !user.lastSeen) return "offline";
  const diff = Date.now() - new Date(user.lastSeen).getTime();
  return diff < 60000 ? "online" : "offline";
};

/**
 * @desc    Get all users (for starting new conversations)
 * @route   GET /api/users
 * @access  Private
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("-password")
      .sort({ username: 1 });

    // Apply effective status based on lastSeen
    const usersWithStatus = users.map((u) => {
      const userObj = u.toObject();
      userObj.status = getEffectiveStatus(userObj);
      return userObj;
    });

    res.json({
      success: true,
      count: usersWithStatus.length,
      users: usersWithStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user",
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const { displayName, bio, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields if provided
    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

/**
 * @desc    Search users by username or display name
 * @route   GET /api/users/search
 * @access  Private
 */
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json({
        success: true,
        users: [],
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: q, $options: "i" } },
        { displayName: { $regex: q, $options: "i" } },
      ],
    })
      .select("-password")
      .limit(20);

    // Apply effective status based on lastSeen
    const usersWithStatus = users.map((u) => {
      const userObj = u.toObject();
      userObj.status = getEffectiveStatus(userObj);
      return userObj;
    });

    res.json({
      success: true,
      count: usersWithStatus.length,
      users: usersWithStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Search failed",
    });
  }
};