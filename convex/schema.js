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
    folderId: v.optional(v.id("folders")), // For folder organization
    authorId: v.id("users"), // Creator
    lastEditedBy: v.optional(v.id("users")), // Last person who edited
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
    .index("by_folder", ["folderId"])
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
    .index("by_parent", ["parentId"]),

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

  githubProfiles: defineTable({
    userId: v.id("users"),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    profileUrl: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  githubRepoConnections: defineTable({
    userId: v.id("users"),
    repoUrl: v.string(), // Full GitHub repo URL (e.g., https://github.com/owner/repo)
    owner: v.string(), // Repository owner
    repoName: v.string(), // Repository name
    accessToken: v.string(), // User's personal access token for this repo
    hasAccess: v.optional(v.boolean()), // Whether user has verified access
    accessLevel: v.optional(v.string()), // read, write, admin
    lastChecked: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
    isActive: v.boolean(), // Whether this connection is active
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  documentVersions: defineTable({
    documentId: v.id("documents"),
    content: v.any(), // Historical content
    authorId: v.id("users"),
    versionNumber: v.number(),
    createdAt: v.number(),
  }).index("by_document", ["documentId"]),

  files: defineTable({
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    documentId: v.optional(v.id("documents")),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_uploader", ["uploadedBy"]),
});