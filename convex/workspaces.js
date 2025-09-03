import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth.js";

export const createWorkspace = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    
    return await ctx.db.insert("workspaces", {
      name,
      ownerId: userId,
      members: [userId],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getWorkspaces = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("members").includes(userId), true))
      .collect();
  },
});

export const getWorkspace = query({
  args: { id: v.id("workspaces") },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const workspace = await ctx.db.get(id);
    if (!workspace || !workspace.members.includes(userId)) return null;

    return workspace;
  },
});

export const updateWorkspace = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, { id, name }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(id);
    if (!workspace || workspace.ownerId !== userId) {
      throw new Error("Not authorized");
    }

    return await ctx.db.patch(id, {
      name,
      updatedAt: Date.now(),
    });
  },
});

export const addMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, { workspaceId, userId: newUserId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(workspaceId);
    if (!workspace || workspace.ownerId !== userId) {
      throw new Error("Not authorized");
    }

    if (!workspace.members.includes(newUserId)) {
      return await ctx.db.patch(workspaceId, {
        members: [...workspace.members, newUserId],
        updatedAt: Date.now(),
      });
    }
  },
});

export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  handler: async (ctx, { workspaceId, userId: memberUserId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const workspace = await ctx.db.get(workspaceId);
    if (!workspace || workspace.ownerId !== userId) {
      throw new Error("Not authorized");
    }

    if (memberUserId === workspace.ownerId) {
      throw new Error("Cannot remove workspace owner");
    }

    return await ctx.db.patch(workspaceId, {
      members: workspace.members.filter(id => id !== memberUserId),
      updatedAt: Date.now(),
    });
  },
});