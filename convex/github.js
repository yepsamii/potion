import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api.js";
import { auth } from "./auth.js";
import { encrypt, decrypt } from "./lib/encryption.js";

// SECURITY: Audit logging helper function
async function logSecurityEvent(ctx, action, resource, success, details = {}) {
  try {
    const userId = await auth.getUserId(ctx);
    if (!userId) return; // Can't log without user context
    
    await ctx.db.insert("securityAuditLog", {
      userId,
      action,
      resource,
      resourceId: details.resourceId || null,
      details: {
        ...details,
        timestamp_iso: new Date().toISOString(),
      },
      success,
      timestamp: Date.now(),
    });
    
    console.log(`🔒 Security audit: ${userId} ${action} on ${resource} - ${success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

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

// STEP 2: Add Repository to Global Registry (with admin approval)
export const addGlobalRepository = mutation({
  args: {
    repoUrl: v.string(),
    accessToken: v.optional(v.string()), // Optional token for verification
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

    // Check if this repo already exists in global registry
    const existing = await ctx.db
      .query("githubRepositories")
      .withIndex("by_owner_repo", (q) => 
        q.eq("owner", owner).eq("repoName", repoName)
      )
      .first();

    if (existing) {
      // AUDIT: Log repository already exists
      await logSecurityEvent(ctx, "repo_add_existing", "github_repository", true, {
        repositoryId: existing._id,
        repositoryUrl: `https://github.com/${owner}/${repoName}`,
        owner,
        repoName,
      });
      
      // Repository already exists, just return it
      return existing;
    }

    // SECURITY ENHANCEMENT: Check if admin approval is required
    const requiresApproval = process.env.REQUIRE_REPO_APPROVAL !== 'false'; // Default to true
    
    if (requiresApproval) {
      // Check if there's an approved request for this repository
      const approvedRequest = await ctx.db
        .query("repositoryApprovalRequests")
        .withIndex("by_repo", (q) => q.eq("owner", owner).eq("repoName", repoName))
        .filter((q) => q.eq(q.field("status"), "approved"))
        .first();

      if (!approvedRequest) {
        // AUDIT: Log attempt to add repository without approval
        await logSecurityEvent(ctx, "repo_add_blocked", "github_repository", false, {
          repositoryUrl: `https://github.com/${owner}/${repoName}`,
          owner,
          repoName,
          reason: "Admin approval required",
        });

        throw new Error("This repository requires admin approval before it can be added. Please request approval first.");
      }

      // Verify the approved request is for the current user
      if (approvedRequest.requesterId !== userId) {
        // AUDIT: Log unauthorized attempt to use someone else's approval
        await logSecurityEvent(ctx, "repo_add_unauthorized", "github_repository", false, {
          repositoryUrl: `https://github.com/${owner}/${repoName}`,
          owner,
          repoName,
          reason: "Approval belongs to different user",
          approvalRequesterId: approvedRequest.requesterId,
        });

        throw new Error("This repository was approved for a different user. Please request your own approval.");
      }
    }

    // SECURITY: If access token is provided, verify repository exists and is accessible
    if (accessToken) {
      console.log(`🔐 Verifying repository exists: ${owner}/${repoName}`);
      try {
        await verifyRepoAccess(accessToken, owner, repoName);
        console.log(`✅ Repository verified: ${owner}/${repoName}`);
        
        // AUDIT: Log successful repository verification
        await logSecurityEvent(ctx, "repo_verification", "github_repository", true, {
          repositoryUrl: `https://github.com/${owner}/${repoName}`,
          owner,
          repoName,
        });
      } catch (error) {
        console.log(`❌ Repository verification failed: ${owner}/${repoName}:`, error.message);
        
        // AUDIT: Log failed repository verification
        await logSecurityEvent(ctx, "repo_verification", "github_repository", false, {
          repositoryUrl: `https://github.com/${owner}/${repoName}`,
          owner,
          repoName,
          error: error.message,
        });
        
        throw new Error(`Repository verification failed: ${error.message}. Make sure the repository exists and you have access to it.`);
      }
    }

    // Add new repository to global registry
    const now = Date.now();
    const newRepo = await ctx.db.insert("githubRepositories", {
      repoUrl: `https://github.com/${owner}/${repoName}`,
      owner,
      repoName,
      addedBy: userId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    
    // AUDIT: Log new repository addition
    await logSecurityEvent(ctx, "repo_added", "github_repository", true, {
      repositoryId: newRepo,
      repositoryUrl: `https://github.com/${owner}/${repoName}`,
      owner,
      repoName,
      approvalRequired: requiresApproval,
    });
    
    return newRepo;
  },
});

// Helper function to check if user can add repositories without approval
export const canAddRepositoryDirectly = query({
  args: {
    repoUrl: v.string(),
  },
  handler: async (ctx, { repoUrl }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { canAdd: false, reason: "Not authenticated" };

    const requiresApproval = process.env.REQUIRE_REPO_APPROVAL !== 'false';
    
    if (!requiresApproval) {
      return { canAdd: true, reason: "Approval not required" };
    }

    // Parse repository URL
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      return { canAdd: false, reason: "Invalid repository URL" };
    }

    const owner = repoMatch[1];
    const repoName = repoMatch[2].replace('.git', '');

    // Check for existing repository
    const existing = await ctx.db
      .query("githubRepositories")
      .withIndex("by_owner_repo", (q) => 
        q.eq("owner", owner).eq("repoName", repoName)
      )
      .first();

    if (existing) {
      return { canAdd: true, reason: "Repository already exists" };
    }

    // Check for approved request
    const approvedRequest = await ctx.db
      .query("repositoryApprovalRequests")
      .withIndex("by_repo", (q) => q.eq("owner", owner).eq("repoName", repoName))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .filter((q) => q.eq(q.field("requesterId"), userId))
      .first();

    if (approvedRequest) {
      return { canAdd: true, reason: "Admin approval granted" };
    }

    // Check for pending request
    const pendingRequest = await ctx.db
      .query("repositoryApprovalRequests")
      .withIndex("by_repo", (q) => q.eq("owner", owner).eq("repoName", repoName))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .filter((q) => q.eq(q.field("requesterId"), userId))
      .first();

    if (pendingRequest) {
      return { 
        canAdd: false, 
        reason: "Approval request pending",
        pendingRequest: {
          id: pendingRequest._id,
          createdAt: pendingRequest.createdAt,
          expiresAt: pendingRequest.expiresAt,
        }
      };
    }

    return { 
      canAdd: false, 
      reason: "Admin approval required",
      needsApproval: true 
    };
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

// STEP 3: Add User Access Token for a Repository (with verification)
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

    // SECURITY: Verify the user actually has access to this repository
    console.log(`🔐 Verifying access to ${repository.owner}/${repository.repoName} before storing token`);
    
    try {
      const accessInfo = await verifyRepoAccess(accessToken, repository.owner, repository.repoName);
      console.log(`✅ Access verified for ${repository.owner}/${repository.repoName}:`, accessInfo);
      
      // AUDIT: Log successful token verification
      await logSecurityEvent(ctx, "token_verification", "access_token", true, {
        repositoryId: repositoryId,
        repositoryUrl: repository.repoUrl,
        accessLevel: accessInfo.accessLevel,
        isPrivate: accessInfo.isPrivate,
      });
    } catch (error) {
      console.log(`❌ Access verification failed for ${repository.owner}/${repository.repoName}:`, error.message);
      
      // AUDIT: Log failed token verification
      await logSecurityEvent(ctx, "token_verification", "access_token", false, {
        repositoryId: repositoryId,
        repositoryUrl: repository.repoUrl,
        error: error.message,
      });
      
      throw new Error(`Access verification failed: ${error.message}`);
    }

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
      accessToken: encrypt(accessToken), // Encrypt the token before storing
      hasAccess: undefined, // Will be checked in next step
      accessLevel: undefined,
      lastChecked: undefined,
      updatedAt: now,
    };

    if (existing) {
      const result = await ctx.db.patch(existing._id, accessData);
      
      // AUDIT: Log token update
      await logSecurityEvent(ctx, "token_updated", "access_token", true, {
        repositoryId: repositoryId,
        repositoryUrl: repository.repoUrl,
        accessId: existing._id,
      });
      
      return result;
    } else {
      const result = await ctx.db.insert("githubUserAccess", {
        ...accessData,
        createdAt: now,
      });
      
      // AUDIT: Log new token addition
      await logSecurityEvent(ctx, "token_added", "access_token", true, {
        repositoryId: repositoryId,
        repositoryUrl: repository.repoUrl,
        accessId: result,
      });
      
      return result;
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
    const record = await ctx.db
      .query("githubUserAccess")
      .withIndex("by_user_repository", (q) => 
        q.eq("userId", userId).eq("repositoryId", repositoryId)
      )
      .first();
    
    if (record && record.accessToken) {
      // Decrypt the token before returning
      return {
        ...record,
        accessToken: decrypt(record.accessToken)
      };
    }
    
    return record;
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

// Helper function to validate token scopes
async function validateTokenScopes(token) {
  console.log(`🔍 Validating token scopes...`);
  
  const response = await fetch(`https://api.github.com/user`, {
    method: 'HEAD', // Use HEAD to get headers only
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Potion-App/1.0"
    }
  });

  if (!response.ok) {
    throw new Error("Invalid token or token validation failed");
  }

  // Get OAuth scopes from response headers
  const scopes = response.headers.get('X-OAuth-Scopes') || '';
  const scopeList = scopes.split(',').map(s => s.trim()).filter(s => s);
  
  console.log(`📋 Token scopes:`, scopeList);

  // Define allowed scopes
  const allowedScopes = [
    'repo', 'public_repo', 'repo:status', 'repo_deployment',
    'user', 'user:email', 'user:follow', 'read:user'
  ];

  // Define dangerous scopes that should be rejected
  const dangerousScopes = [
    'delete_repo', 'admin:org', 'admin:public_key', 'admin:repo_hook',
    'admin:org_hook', 'gist', 'notifications', 'admin:gpg_key'
  ];

  // Check for dangerous scopes
  const foundDangerousScopes = scopeList.filter(scope => 
    dangerousScopes.some(dangerous => scope.includes(dangerous))
  );

  if (foundDangerousScopes.length > 0) {
    throw new Error(`Token has excessive permissions: ${foundDangerousScopes.join(', ')}. Please use a token with minimal required scopes (repo or public_repo).`);
  }

  // Check for required scopes
  const hasRepoAccess = scopeList.some(scope => 
    scope === 'repo' || scope === 'public_repo'
  );

  if (!hasRepoAccess) {
    throw new Error("Token must have 'repo' scope for private repositories or 'public_repo' scope for public repositories.");
  }

  return {
    scopes: scopeList,
    hasRepoAccess,
    isMinimal: scopeList.length <= 3, // Consider minimal if 3 or fewer scopes
  };
}

// Helper function to verify repository access
async function verifyRepoAccess(token, owner, repo) {
  console.log(`🔍 Checking access for ${owner}/${repo} with GitHub API...`);
  
  // SECURITY: First validate token scopes
  try {
    const scopeValidation = await validateTokenScopes(token);
    console.log(`✅ Token scope validation passed:`, scopeValidation);
  } catch (error) {
    console.log(`❌ Token scope validation failed:`, error.message);
    throw error; // Re-throw scope validation errors
  }
  
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

    // Check if this document has been synced to this repository before
    const existingSync = await ctx.runQuery(api.github.getDocumentSync, {
      documentId,
      repositoryId,
    });

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
      
      // Determine file path - use existing sync path if available, otherwise use provided or default
      let fileName;
      if (existingSync && !filePath) {
        // Use existing file path if no new path is provided
        fileName = existingSync.filePath;
        console.log(`📄 Updating existing file at: ${fileName}`);
      } else {
        // Use provided path or generate default
        fileName = filePath || `docs/${document.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()}.md`;
        console.log(`📄 ${existingSync ? 'Changing file path to' : 'Creating new file at'}: ${fileName}`);
      }
      
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

      // Save or update the document sync tracking
      if (existingSync) {
        await ctx.runMutation(api.github.updateDocumentSync, {
          syncId: existingSync._id,
          filePath: fileName,
          lastCommitSha: response.commit.sha,
        });
      } else {
        await ctx.runMutation(api.github.createDocumentSync, {
          documentId,
          repositoryId,
          filePath: fileName,
          lastCommitSha: response.commit.sha,
        });
      }

      console.log(`✅ Document synced successfully to ${repository.owner}/${repository.repoName}`);

      // AUDIT: Log successful document sync
      await logSecurityEvent(ctx, existingSync ? "document_updated" : "document_synced", "document_sync", true, {
        documentId,
        repositoryId,
        repositoryUrl: repository.repoUrl,
        filePath: fileName,
        commitSha: response.commit.sha,
        isUpdate: !!existingSync,
      });

      return { 
        success: true, 
        url: response.content.html_url,
        filePath: fileName,
        commitSha: response.commit.sha,
        isUpdate: !!existingSync,
      };
    } catch (error) {
      console.error("GitHub sync error:", error);
      
      // AUDIT: Log failed document sync
      await logSecurityEvent(ctx, "document_sync_failed", "document_sync", false, {
        documentId,
        repositoryId,
        repositoryUrl: repository.repoUrl,
        error: error.message,
      });
      
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

// Query to get existing document sync
export const getDocumentSync = query({
  args: {
    documentId: v.id("documents"),
    repositoryId: v.id("githubRepositories"),
  },
  handler: async (ctx, { documentId, repositoryId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("githubDocumentSync")
      .withIndex("by_document_repository", (q) =>
        q.eq("documentId", documentId).eq("repositoryId", repositoryId)
      )
      .first();
  },
});

// Create new document sync tracking
export const createDocumentSync = mutation({
  args: {
    documentId: v.id("documents"),
    repositoryId: v.id("githubRepositories"),
    filePath: v.string(),
    lastCommitSha: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, repositoryId, filePath, lastCommitSha }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    return await ctx.db.insert("githubDocumentSync", {
      documentId,
      repositoryId,
      userId,
      filePath,
      lastCommitSha,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update existing document sync
export const updateDocumentSync = mutation({
  args: {
    syncId: v.id("githubDocumentSync"),
    filePath: v.string(),
    lastCommitSha: v.optional(v.string()),
  },
  handler: async (ctx, { syncId, filePath, lastCommitSha }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sync = await ctx.db.get(syncId);
    if (!sync || sync.userId !== userId) {
      throw new Error("Sync record not found or unauthorized");
    }

    return await ctx.db.patch(syncId, {
      filePath,
      lastCommitSha,
      lastSyncedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get all synced documents for a repository
export const getRepositorySyncedDocuments = query({
  args: {
    repositoryId: v.id("githubRepositories"),
  },
  handler: async (ctx, { repositoryId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const syncs = await ctx.db
      .query("githubDocumentSync")
      .withIndex("by_repository", (q) => q.eq("repositoryId", repositoryId))
      .collect();

    // Get document details for each sync
    const syncedDocsWithDetails = await Promise.all(
      syncs.map(async (sync) => {
        const document = await ctx.db.get(sync.documentId);
        return {
          ...sync,
          documentTitle: document?.title || "Untitled",
          documentDeleted: document?.isDeleted || false,
        };
      })
    );

    return syncedDocsWithDetails;
  },
});

// Get all repositories a document has been synced to
export const getDocumentSyncedRepositories = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, { documentId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const syncs = await ctx.db
      .query("githubDocumentSync")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .collect();

    // Get repository details for each sync
    const syncsWithRepoDetails = await Promise.all(
      syncs.map(async (sync) => {
        const repository = await ctx.db.get(sync.repositoryId);
        return {
          ...sync,
          repository: repository ? {
            owner: repository.owner,
            repoName: repository.repoName,
            repoUrl: repository.repoUrl,
          } : null,
        };
      })
    );

    return syncsWithRepoDetails.filter(sync => sync.repository !== null);
  },
});

// Get security audit logs (for user's own actions)
export const getUserSecurityAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit = 50 }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const logs = await ctx.db
      .query("securityAuditLog")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(limit, 100)); // Cap at 100 for performance

    return logs;
  },
});

// Get recent security events across all users (admin function - would need admin check)
export const getRecentSecurityEvents = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 20, action }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    // TODO: Add admin check here in production
    // For now, return only user's own events for security
    let query = ctx.db
      .query("securityAuditLog")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc");

    if (action) {
      // If filtering by action, use different index
      query = ctx.db
        .query("securityAuditLog")
        .withIndex("by_action", (q) => q.eq("action", action))
        .filter((q) => q.eq(q.field("userId"), userId))
        .order("desc");
    }

    return await query.take(Math.min(limit, 50));
  },
});

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