import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createFolder = mutation({
  args: {
    name: v.string(),
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.id("folders")),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, { name, workspaceId, parentId, emoji }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    
    return await ctx.db.insert("folders", {
      name,
      workspaceId,
      parentId,
      authorId: userId,
      emoji: emoji || "📁",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getFolders = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("folders")
      .withIndex("by_workspace_not_deleted", (q) => 
        q.eq("workspaceId", workspaceId).eq("isDeleted", false)
      )
      .collect();
  },
});

export const getRootFolders = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("folders")
      .withIndex("by_workspace_not_deleted", (q) => 
        q.eq("workspaceId", workspaceId).eq("isDeleted", false)
      )
      .filter((q) => q.eq(q.field("parentId"), undefined))
      .collect();
  },
});

export const getChildFolders = query({
  args: { parentId: v.id("folders") },
  handler: async (ctx, { parentId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("folders")
      .withIndex("by_parent", (q) => q.eq("parentId", parentId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
  },
});

export const updateFolder = mutation({
  args: {
    id: v.id("folders"),
    name: v.optional(v.string()),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, emoji }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(id);
    if (!folder || folder.isDeleted) throw new Error("Folder not found");

    const updates = { updatedAt: Date.now() };
    if (name !== undefined) updates.name = name;
    if (emoji !== undefined) updates.emoji = emoji;

    return await ctx.db.patch(id, updates);
  },
});

export const deleteFolder = mutation({
  args: { id: v.id("folders") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folder = await ctx.db.get(id);
    if (!folder) throw new Error("Folder not found");

    return await ctx.db.patch(id, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const restoreFolder = mutation({
  args: { id: v.id("folders") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.patch(id, {
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const permanentDeleteFolder = mutation({
  args: { id: v.id("folders") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.delete(id);
  },
});