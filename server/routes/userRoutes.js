import express from "express";
import {
  getAllUsers,
  getUserById,
  updateProfile,
  searchUsers,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Search users (must be before /:id route)
router.get("/search", searchUsers);

// Get all users
router.get("/", getAllUsers);

// Get user by ID
router.get("/:id", getUserById);

// Update profile
router.put("/profile", updateProfile);

export default router;