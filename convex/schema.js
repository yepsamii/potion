import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  workspaces: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    members: v.array(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  documents: defineTable({
    title: v.string(),
    content: v.optional(v.any()), // BlockNote JSON content
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.id("documents")), // For hierarchical structure
    authorId: v.id("users"),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    emoji: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_parent", ["parentId"])
    .index("by_author", ["authorId"])
    .index("by_workspace_not_deleted", ["workspaceId", "isDeleted"]),

  folders: defineTable({
    name: v.string(),
    workspaceId: v.id("workspaces"),
    parentId: v.optional(v.id("folders")), // For nested folders
    authorId: v.id("users"),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    emoji: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_parent", ["parentId"])
    .index("by_workspace_not_deleted", ["workspaceId", "isDeleted"]),

  permissions: defineTable({
    documentId: v.id("documents"),
    userId: v.id("users"),
    role: v.union(v.literal("view"), v.literal("edit"), v.literal("admin")),
    createdAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_user", ["userId"]),

  comments: defineTable({
    documentId: v.id("documents"),
    blockId: v.optional(v.string()), // BlockNote block ID
    authorId: v.id("users"),
    content: v.string(),
    resolved: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_block", ["blockId"]),

  templates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    content: v.any(), // BlockNote JSON content
    authorId: v.id("users"),
    isPublic: v.optional(v.boolean()),
    category: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_author", ["authorId"])
    .index("by_public", ["isPublic"]),

  githubIntegrations: defineTable({
    userId: v.id("users"),
    accessToken: v.string(), // Encrypted
    username: v.string(),
    repoName: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    lastSyncAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  documentVersions: defineTable({
    documentId: v.id("documents"),
    content: v.any(), // Historical content
    authorId: v.id("users"),
    versionNumber: v.number(),
    createdAt: v.number(),
  }).index("by_document", ["documentId"]),
});