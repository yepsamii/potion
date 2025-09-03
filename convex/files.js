import { mutation, query } from "./_generated/server.js"
import { v } from "convex/values"

// Store file metadata
export const storeFile = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    documentId: v.optional(v.id("documents"))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    return await ctx.db.insert("files", {
      name: args.name,
      type: args.type,
      size: args.size,
      storageId: args.storageId,
      documentId: args.documentId,
      uploadedBy: identity.subject,
      uploadedAt: Date.now()
    })
  }
})

// Get file URL
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  }
})

// Get files for a document
export const getDocumentFiles = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const files = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("documentId"), args.documentId))
      .collect()

    return await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId)
      }))
    )
  }
})

// Delete a file
export const deleteFile = mutation({
  args: { id: v.id("files") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const file = await ctx.db.get(args.id)
    if (!file) {
      throw new Error("File not found")
    }

    if (file.uploadedBy !== identity.subject) {
      throw new Error("Not authorized to delete this file")
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId)
    
    // Delete metadata
    return await ctx.db.delete(args.id)
  }
})