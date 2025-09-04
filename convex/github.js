import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api.js";
import { auth } from "./auth.js";

// STEP 1: Connect GitHub Profile
export const connectGitHubProfile = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if profile already exists
    const existing = await ctx.db
      .query("githubProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();
    const profileUrl = `https://github.com/${username}`;

    if (existing) {
      return await ctx.db.patch(existing._id, {
        username,
        profileUrl,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("githubProfiles", {
        userId,
        username,
        profileUrl,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get user's GitHub profile
export const getGitHubProfile = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("githubProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// STEP 2: Connect Git Repository
export const connectGitRepository = mutation({
  args: {
    repoUrl: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, { repoUrl, accessToken }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Parse repository URL to extract owner and repo name
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      throw new Error("Invalid GitHub repository URL. Please use format: https://github.com/owner/repo");
    }

    const owner = repoMatch[1];
    const repoName = repoMatch[2].replace('.git', ''); // Remove .git if present

    // Check if this repo connection already exists
    const existing = await ctx.db
      .query("githubRepoConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.and(
        q.eq(q.field("owner"), owner),
        q.eq(q.field("repoName"), repoName)
      ))
      .first();

    const now = Date.now();
    const connectionData = {
      userId,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      owner,
      repoName,
      accessToken, // In production, this should be encrypted
      hasAccess: undefined, // Will be checked in step 3
      accessLevel: undefined,
      lastChecked: undefined,
      isActive: true,
      updatedAt: now,
    };

    if (existing) {
      return await ctx.db.patch(existing._id, connectionData);
    } else {
      return await ctx.db.insert("githubRepoConnections", {
        ...connectionData,
        createdAt: now,
      });
    }
  },
});

// Get user's repository connections
export const getGitHubRepoConnections = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("githubRepoConnections")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .collect();
  },
});

// STEP 3: Check Repository Access
export const checkRepositoryAccess = action({
  args: {
    connectionId: v.id("githubRepoConnections"),
  },
  handler: async (ctx, { connectionId }) => {
    console.log(`🚀 Starting access check for connection: ${connectionId}`);
    
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the connection details
    const connection = await ctx.runQuery(api.github.getRepoConnection, { connectionId });
    if (!connection || connection.userId !== userId) {
      throw new Error("Repository connection not found");
    }

    console.log(`🔗 Checking access for repository: ${connection.owner}/${connection.repoName}`);

    try {
      // Check access with GitHub API
      const accessInfo = await verifyRepoAccess(
        connection.accessToken,
        connection.owner,
        connection.repoName
      );

      // Update connection with access information
      await ctx.runMutation(api.github.updateRepoAccess, {
        connectionId,
        hasAccess: true,
        accessLevel: accessInfo.accessLevel,
      });

      return {
        success: true,
        hasAccess: true,
        accessLevel: accessInfo.accessLevel,
        message: `Access verified! You have ${accessInfo.accessLevel} access to ${connection.owner}/${connection.repoName}`,
      };

    } catch (error) {
      // Update connection with failed access
      await ctx.runMutation(api.github.updateRepoAccess, {
        connectionId,
        hasAccess: false,
        accessLevel: "none",
      });

      return {
        success: false,
        hasAccess: false,
        accessLevel: "none",
        message: `Access denied: ${error.message}`,
      };
    }
  },
});

// Helper query to get single repo connection
export const getRepoConnection = query({
  args: { connectionId: v.id("githubRepoConnections") },
  handler: async (ctx, { connectionId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const connection = await ctx.db.get(connectionId);
    if (!connection || connection.userId !== userId) {
      return null;
    }

    return connection;
  },
});

// Helper mutation to update repo access
export const updateRepoAccess = mutation({
  args: {
    connectionId: v.id("githubRepoConnections"),
    hasAccess: v.boolean(),
    accessLevel: v.string(),
  },
  handler: async (ctx, { connectionId, hasAccess, accessLevel }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const connection = await ctx.db.get(connectionId);
    if (!connection || connection.userId !== userId) {
      throw new Error("Repository connection not found");
    }

    return await ctx.db.patch(connectionId, {
      hasAccess,
      accessLevel,
      lastChecked: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Remove a repository connection
export const removeRepoConnection = mutation({
  args: {
    connectionId: v.id("githubRepoConnections"),
  },
  handler: async (ctx, { connectionId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const connection = await ctx.db.get(connectionId);
    if (!connection || connection.userId !== userId) {
      throw new Error("Repository connection not found");
    }

    return await ctx.db.patch(connectionId, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// Disconnect GitHub profile entirely
export const disconnectGitHubProfile = mutation({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Remove profile
    const profile = await ctx.db
      .query("githubProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.delete(profile._id);
    }

    // Deactivate all repository connections
    const connections = await ctx.db
      .query("githubRepoConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const connection of connections) {
      await ctx.db.patch(connection._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Helper function to verify repository access
async function verifyRepoAccess(token, owner, repo) {
  console.log(`🔍 Checking access for ${owner}/${repo} with GitHub API...`);
  
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Potion-App/1.0"
    }
  });
  
  console.log(`📡 GitHub API Response Status: ${response.status}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found or you don't have access");
    } else if (response.status === 401) {
      throw new Error("Invalid access token");
    } else {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
  }

  const repoData = await response.json();
  
  // Determine access level based on permissions
  let accessLevel = "read";
  if (repoData.permissions?.admin) {
    accessLevel = "admin";
  } else if (repoData.permissions?.push) {
    accessLevel = "write";
  }

  console.log(`✅ Access verification complete:`, {
    repository: `${owner}/${repo}`,
    accessLevel,
    permissions: repoData.permissions,
    isPrivate: repoData.private
  });

  return {
    accessLevel,
    canPush: repoData.permissions?.push || repoData.permissions?.admin,
    isPrivate: repoData.private,
    fullName: repoData.full_name,
  };
}