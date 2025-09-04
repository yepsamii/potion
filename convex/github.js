import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api.js";
import { auth } from "./auth.js";

// STEP 1: Connect GitHub Profile (unchanged)
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

// STEP 2: Add Repository to Global Registry
export const addGlobalRepository = mutation({
  args: {
    repoUrl: v.string(),
  },
  handler: async (ctx, { repoUrl }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Parse repository URL to extract owner and repo name
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      throw new Error("Invalid GitHub repository URL. Please use format: https://github.com/owner/repo");
    }

    const owner = repoMatch[1];
    const repoName = repoMatch[2].replace('.git', ''); // Remove .git if present

    // Check if this repo already exists in global registry
    const existing = await ctx.db
      .query("githubRepositories")
      .withIndex("by_owner_repo", (q) => 
        q.eq("owner", owner).eq("repoName", repoName)
      )
      .first();

    const now = Date.now();

    if (existing) {
      // Repository already exists, just return it
      return existing;
    } else {
      // Add new repository to global registry
      return await ctx.db.insert("githubRepositories", {
        repoUrl: `https://github.com/${owner}/${repoName}`,
        owner,
        repoName,
        addedBy: userId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get all global repositories
export const getGlobalRepositories = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("githubRepositories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// STEP 3: Add User Access Token for a Repository
export const addUserAccessToken = mutation({
  args: {
    repositoryId: v.id("githubRepositories"),
    accessToken: v.string(),
  },
  handler: async (ctx, { repositoryId, accessToken }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if repository exists
    const repository = await ctx.db.get(repositoryId);
    if (!repository) throw new Error("Repository not found");

    // Check if user already has access record for this repo
    const existing = await ctx.db
      .query("githubUserAccess")
      .withIndex("by_user_repository", (q) => 
        q.eq("userId", userId).eq("repositoryId", repositoryId)
      )
      .first();

    const now = Date.now();
    const accessData = {
      userId,
      repositoryId,
      accessToken, // In production, this should be encrypted
      hasAccess: undefined, // Will be checked in next step
      accessLevel: undefined,
      lastChecked: undefined,
      updatedAt: now,
    };

    if (existing) {
      return await ctx.db.patch(existing._id, accessData);
    } else {
      return await ctx.db.insert("githubUserAccess", {
        ...accessData,
        createdAt: now,
      });
    }
  },
});

// Get user's access records with repository details
export const getUserRepositoryAccess = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // Get all repositories
    const repositories = await ctx.db
      .query("githubRepositories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get user's access records
    const userAccess = await ctx.db
      .query("githubUserAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Combine repository info with user's access info
    return repositories.map(repo => {
      const access = userAccess.find(a => a.repositoryId === repo._id);
      
      // Get who added the repository
      const addedByUser = ctx.db.get(repo.addedBy);
      
      return {
        ...repo,
        userAccess: access ? {
          hasToken: true,
          hasAccess: access.hasAccess,
          accessLevel: access.accessLevel || "unknown",
          lastChecked: access.lastChecked,
          lastSyncedAt: access.lastSyncedAt,
          accessId: access._id,
        } : {
          hasToken: false,
          hasAccess: false,
          accessLevel: "no-token",
          lastChecked: null,
          lastSyncedAt: null,
          accessId: null,
        }
      };
    });
  },
});

// STEP 4: Check Repository Access for Current User
export const checkUserRepositoryAccess = action({
  args: {
    repositoryId: v.id("githubRepositories"),
  },
  handler: async (ctx, { repositoryId }) => {
    console.log(`🚀 Starting access check for repository: ${repositoryId}`);
    
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get repository details
    const repository = await ctx.runQuery(api.github.getRepository, { repositoryId });
    if (!repository) throw new Error("Repository not found");

    // Get user's access record
    const userAccess = await ctx.runQuery(api.github.getUserAccessRecord, { 
      userId, 
      repositoryId 
    });

    if (!userAccess) {
      throw new Error("No access token configured. Please add your personal access token first.");
    }

    console.log(`🔗 Checking access for ${repository.owner}/${repository.repoName}`);

    try {
      // Check access with GitHub API using user's token
      const accessInfo = await verifyRepoAccess(
        userAccess.accessToken,
        repository.owner,
        repository.repoName
      );

      // Update user's access record with results
      await ctx.runMutation(api.github.updateUserAccess, {
        accessId: userAccess._id,
        hasAccess: true,
        accessLevel: accessInfo.accessLevel,
      });

      return {
        success: true,
        hasAccess: true,
        accessLevel: accessInfo.accessLevel,
        message: `Access verified! You have ${accessInfo.accessLevel} access to ${repository.owner}/${repository.repoName}`,
      };

    } catch (error) {
      // Update user's access record with failed access
      await ctx.runMutation(api.github.updateUserAccess, {
        accessId: userAccess._id,
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

// Helper query to get a single repository
export const getRepository = query({
  args: { repositoryId: v.id("githubRepositories") },
  handler: async (ctx, { repositoryId }) => {
    return await ctx.db.get(repositoryId);
  },
});

// Helper query to get user's access record for a repository
export const getUserAccessRecord = query({
  args: { 
    userId: v.id("users"),
    repositoryId: v.id("githubRepositories") 
  },
  handler: async (ctx, { userId, repositoryId }) => {
    return await ctx.db
      .query("githubUserAccess")
      .withIndex("by_user_repository", (q) => 
        q.eq("userId", userId).eq("repositoryId", repositoryId)
      )
      .first();
  },
});

// Helper mutation to update user's access status
export const updateUserAccess = mutation({
  args: {
    accessId: v.id("githubUserAccess"),
    hasAccess: v.boolean(),
    accessLevel: v.string(),
  },
  handler: async (ctx, { accessId, hasAccess, accessLevel }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const access = await ctx.db.get(accessId);
    if (!access || access.userId !== userId) {
      throw new Error("Access record not found");
    }

    return await ctx.db.patch(accessId, {
      hasAccess,
      accessLevel,
      lastChecked: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Remove a repository from global registry (admin only)
export const removeGlobalRepository = mutation({
  args: {
    repositoryId: v.id("githubRepositories"),
  },
  handler: async (ctx, { repositoryId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const repository = await ctx.db.get(repositoryId);
    if (!repository) throw new Error("Repository not found");

    // Only the user who added it can remove it (or implement admin check)
    if (repository.addedBy !== userId) {
      throw new Error("Only the user who added this repository can remove it");
    }

    return await ctx.db.patch(repositoryId, {
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

    // Remove all user's access records
    const userAccess = await ctx.db
      .query("githubUserAccess")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const access of userAccess) {
      await ctx.db.delete(access._id);
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

// Sync document to a repository (requires user access)
export const syncDocumentToRepository = action({
  args: {
    documentId: v.id("documents"),
    repositoryId: v.id("githubRepositories"),
    commitMessage: v.optional(v.string()),
    filePath: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, repositoryId, commitMessage, filePath }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get document
    const document = await ctx.runQuery(api.documents.getDocument, { id: documentId });
    if (!document) throw new Error("Document not found");

    // Get repository
    const repository = await ctx.runQuery(api.github.getRepository, { repositoryId });
    if (!repository) throw new Error("Repository not found");

    // Get user's access record for this repository
    console.log(`🔍 Looking up user access for userId: ${userId}, repositoryId: ${repositoryId}`);
    const userAccess = await ctx.runQuery(api.github.getUserAccessRecord, { 
      userId, 
      repositoryId 
    });

    if (!userAccess) {
      console.log(`❌ No user access record found for repository ${repositoryId}`);
      throw new Error("You haven't configured access to this repository. Please add your access token first.");
    }

    console.log(`✅ Found user access record:`, {
      hasAccess: userAccess.hasAccess,
      accessLevel: userAccess.accessLevel,
      lastChecked: userAccess.lastChecked,
      tokenLength: userAccess.accessToken ? userAccess.accessToken.length : 0
    });

    // Allow sync even if access hasn't been verified yet, but log a warning
    if (userAccess.hasAccess === false) {
      throw new Error("Repository access was previously denied. Please check your token permissions in Settings and re-verify access.");
    }

    if (userAccess.hasAccess === undefined) {
      console.log(`⚠️ Access not yet verified for ${repository.owner}/${repository.repoName}. Attempting sync anyway...`);
    }

    if (userAccess.accessLevel === "read" || userAccess.accessLevel === "none") {
      throw new Error("Insufficient permissions. You need write or admin access to sync documents. Please verify your token has the 'repo' scope.");
    }

    try {
      console.log(`📤 Starting document sync to ${repository.owner}/${repository.repoName}`);
      console.log(`🔐 User access level: ${userAccess.accessLevel}, Last checked: ${userAccess.lastChecked ? new Date(userAccess.lastChecked).toISOString() : 'never'}`);
      console.log(`📍 Repository URL: ${repository.repoUrl}`);
      
      // Convert document content to Markdown (simplified for now)
      const markdown = convertToMarkdown(document.content);
      
      // Prepare file content
      const fileName = filePath || `docs/${document.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()}.md`;
      const fileContent = `# ${document.title}\n\n${markdown}\n\n---\n*Last updated: ${new Date().toISOString()}*\n*Synced from Potion*`;

      // Sync to GitHub using user's token
      const response = await syncToGitHubAPI({
        token: userAccess.accessToken,
        owner: repository.owner,
        repo: repository.repoName,
        path: fileName,
        content: btoa(fileContent), // Use btoa for base64 encoding instead of Buffer
        message: commitMessage || `Update: ${document.title}`,
        branch: "main", // Default to main branch
      });

      // Update user's last sync time
      await ctx.runMutation(api.github.updateUserLastSync, { 
        accessId: userAccess._id 
      });

      console.log(`✅ Document synced successfully to ${repository.owner}/${repository.repoName}`);

      return { 
        success: true, 
        url: response.content.html_url,
        filePath: fileName,
        commitSha: response.commit.sha,
      };
    } catch (error) {
      console.error("GitHub sync error:", error);
      throw new Error(`Failed to sync to GitHub: ${error.message}`);
    }
  },
});

// Helper mutation to update last sync time
export const updateUserLastSync = mutation({
  args: { accessId: v.id("githubUserAccess") },
  handler: async (ctx, { accessId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const access = await ctx.db.get(accessId);
    if (!access || access.userId !== userId) {
      throw new Error("Access record not found");
    }

    return await ctx.db.patch(accessId, {
      lastSyncedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Helper function to sync to GitHub API
async function syncToGitHubAPI({ token, owner, repo, path, content, message, branch = "main" }) {
  console.log(`🔄 Syncing file ${path} to ${owner}/${repo}:${branch}`);
  console.log(`🔑 Token format: ${token.substring(0, 8)}... (${token.length} chars)`);
  console.log(`📄 File size: ${content.length} base64 chars`);
  
  // First, try to get the existing file to get its SHA
  let sha = null;
  try {
    const existingFileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Potion-App/1.0"
      }
    });

    if (existingFileResponse.ok) {
      const existingFile = await existingFileResponse.json();
      sha = existingFile.sha;
      console.log(`📄 Found existing file, SHA: ${sha.substring(0, 7)}...`);
    }
  } catch (error) {
    console.log(`📝 File doesn't exist yet, creating new file`);
  }

  // Create or update the file
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "Potion-App/1.0"
    },
    body: JSON.stringify({
      message,
      content,
      branch,
      ...(sha && { sha })
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`GitHub API Error Details:`, {
      status: response.status,
      statusText: response.statusText,
      message: errorData.message,
      documentation_url: errorData.documentation_url,
      errors: errorData.errors
    });
    
    // Provide more helpful error messages based on status code
    let helpfulMessage = errorData.message;
    if (response.status === 403) {
      helpfulMessage = `Access denied. Please check that your GitHub token has the required permissions:
      • For private repositories: 'repo' scope is required
      • For public repositories: 'public_repo' scope is sufficient
      • Verify the repository exists and you have write access
      Original error: ${errorData.message}`;
    } else if (response.status === 404) {
      helpfulMessage = `Repository not found. Please verify:
      • The repository URL is correct
      • The repository exists and hasn't been deleted
      • Your token has access to this repository (if private)
      Original error: ${errorData.message}`;
    } else if (response.status === 401) {
      helpfulMessage = `Authentication failed. Please check that:
      • Your GitHub token is valid and hasn't expired
      • The token format is correct (should start with 'ghp_')
      Original error: ${errorData.message}`;
    }
    
    throw new Error(`GitHub API error (${response.status}): ${helpfulMessage}`);
  }

  const result = await response.json();
  console.log(`🎉 File synced successfully: ${result.content.html_url}`);
  
  return result;
}

// Convert document content to Markdown (simplified)
function convertToMarkdown(content) {
  if (!content || !Array.isArray(content)) return '';
  
  return content.map(block => {
    switch (block.type) {
      case 'paragraph':
        return block.content?.map(c => c.text || '').join('') || '';
      case 'heading':
        const level = block.props?.level || 1;
        const headingText = block.content?.map(c => c.text || '').join('') || '';
        return '#'.repeat(level) + ' ' + headingText;
      case 'bulletListItem':
        const bulletText = block.content?.map(c => c.text || '').join('') || '';
        return '- ' + bulletText;
      case 'numberedListItem':
        const numberedText = block.content?.map(c => c.text || '').join('') || '';
        return '1. ' + numberedText;
      case 'codeBlock':
        const language = block.props?.language || '';
        const codeText = block.content?.map(c => c.text || '').join('') || '';
        return '```' + language + '\n' + codeText + '\n```';
      default:
        return block.content?.map(c => c.text || '').join('') || '';
    }
  }).join('\n\n');
}

// Remove user's access to a repository
export const removeUserAccess = mutation({
  args: {
    repositoryId: v.id("githubRepositories"),
  },
  handler: async (ctx, { repositoryId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userAccess = await ctx.db
      .query("githubUserAccess")
      .withIndex("by_user_repository", (q) => 
        q.eq("userId", userId).eq("repositoryId", repositoryId)
      )
      .first();

    if (!userAccess) {
      throw new Error("Access record not found");
    }

    await ctx.db.delete(userAccess._id);
    
    return { success: true };
  },
});