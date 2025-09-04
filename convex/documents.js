import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth.js";

export const createDocument = mutation({
  args: {
    title: v.string(),
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.id("documents")),
    folderId: v.optional(v.id("folders")),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, { title, workspaceId, parentId, folderId, emoji }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    
    return await ctx.db.insert("documents", {
      title,
      workspaceId,
      parentId,
      folderId,
      authorId: userId,
      emoji,
      isDeleted: false,
      isPublic: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getDocuments = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_workspace_not_deleted", (q) => 
        q.eq("workspaceId", workspaceId).eq("isDeleted", false)
      )
      .collect();
  },
});

export const getDocument = query({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const document = await ctx.db.get(id);
    if (!document || document.isDeleted) return null;

    return document;
  },
});

export const updateDocument = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.any()),
    emoji: v.optional(v.string()),
    coverImage: v.optional(v.string()),
  },
  handler: async (ctx, { id, title, content, emoji, coverImage }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const document = await ctx.db.get(id);
    if (!document || document.isDeleted) throw new Error("Document not found");

    const updates = { updatedAt: Date.now() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (emoji !== undefined) updates.emoji = emoji;
    if (coverImage !== undefined) updates.coverImage = coverImage;

    return await ctx.db.patch(id, updates);
  },
});

export const moveDocument = mutation({
  args: {
    documentId: v.id("documents"),
    folderId: v.optional(v.union(v.id("folders"), v.null())),
  },
  handler: async (ctx, { documentId, folderId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const document = await ctx.db.get(documentId);
    if (!document || document.isDeleted) throw new Error("Document not found");

    // If folderId is provided, verify the folder exists
    if (folderId) {
      const folder = await ctx.db.get(folderId);
      if (!folder || folder.isDeleted) throw new Error("Folder not found");
      
      // Verify folder belongs to same workspace
      if (folder.workspaceId !== document.workspaceId) {
        throw new Error("Cannot move document to a folder in a different workspace");
      }
    }

    // Update the document's folder
    return await ctx.db.patch(documentId, {
      folderId: folderId || undefined,
      updatedAt: Date.now(),
    });
  },
});

export const deleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const document = await ctx.db.get(id);
    if (!document) throw new Error("Document not found");

    return await ctx.db.patch(id, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const restoreDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.patch(id, {
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const permanentDeleteDocument = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.delete(id);
  },
});

export const getDeletedDocuments = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .filter((q) => q.eq(q.field("isDeleted"), true))
      .collect();
  },
});

export const getChildDocuments = query({
  args: { parentId: v.id("documents") },
  handler: async (ctx, { parentId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_parent", (q) => q.eq("parentId", parentId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
  },
});

export const getRootDocuments = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_workspace_not_deleted", (q) => 
        q.eq("workspaceId", workspaceId).eq("isDeleted", false)
      )
      .filter((q) => q.eq(q.field("folderId"), undefined))
      .collect();
  },
});

export const getDocumentsByFolder = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, { folderId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_folder", (q) => q.eq("folderId", folderId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .collect();
  },
});

export const searchDocuments = query({
  args: { 
    workspaceId: v.id("workspaces"),
    searchQuery: v.string() 
  },
  handler: async (ctx, { workspaceId, searchQuery }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    if (!searchQuery.trim()) return [];

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_workspace_not_deleted", (q) => 
        q.eq("workspaceId", workspaceId).eq("isDeleted", false)
      )
      .collect();

    // Filter documents by title match (case insensitive)
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  },
});