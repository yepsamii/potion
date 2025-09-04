import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth.js";

// Get current user info
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user;
  },
});

// Get all users for dashboard
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // Get all users
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) return null;

    const user = await ctx.db.get(userId);
    return user;
  },
});