import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { auth } from "./auth.js";

// Connect GitHub account with OAuth
export const connectGitHub = mutation({
  args: {
    accessToken: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { accessToken, username, email, avatarUrl }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if integration already exists
    const existing = await ctx.db
      .query("githubIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        accessToken, // In production, this should be encrypted
        username,
        email,
        avatarUrl,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("githubIntegrations", {
        userId,
        accessToken, // In production, this should be encrypted
        username,
        email,
        avatarUrl,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get user's GitHub integration
export const getGitHubIntegration = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("githubIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// Disconnect GitHub integration
export const disconnectGitHub = mutation({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Remove integration
    const integration = await ctx.db
      .query("githubIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (integration) {
      await ctx.db.delete(integration._id);
    }

    // Remove all repositories
    const repositories = await ctx.db
      .query("githubRepositories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const repo of repositories) {
      await ctx.db.delete(repo._id);
    }

    return { success: true };
  },
});

// Fetch repositories from GitHub and store them
export const fetchGitHubRepositories = action({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get GitHub integration
    const integration = await ctx.db
      .query("githubIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!integration) {
      throw new Error("GitHub integration not found");
    }

    try {
      // Fetch repositories from GitHub API
      const repositories = await fetchUserRepositories(integration.accessToken);

      const now = Date.now();

      // Store or update repositories
      for (const repo of repositories) {
        // Check if repository already exists
        const existing = await ctx.db
          .query("githubRepositories")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("repoId"), repo.id))
          .first();

        const repoData = {
          userId,
          repoId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          isPrivate: repo.private,
          description: repo.description,
          htmlUrl: repo.html_url,
          cloneUrl: repo.clone_url,
          defaultBranch: repo.default_branch,
          permissions: {
            admin: repo.permissions?.admin || false,
            maintain: repo.permissions?.maintain || false,
            push: repo.permissions?.push || false,
            triage: repo.permissions?.triage || false,
            pull: repo.permissions?.pull || false,
          },
          isEnabled: existing?.isEnabled || false, // Keep existing enabled status
          updatedAt: now,
        };

        if (existing) {
          await ctx.db.patch(existing._id, repoData);
        } else {
          await ctx.db.insert("githubRepositories", {
            ...repoData,
            createdAt: now,
          });
        }
      }

      return { success: true, count: repositories.length };
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  },
});

// Get user's GitHub repositories
export const getGitHubRepositories = query({
  args: { onlyEnabled: v.optional(v.boolean()) },
  handler: async (ctx, { onlyEnabled = false }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    if (onlyEnabled) {
      return await ctx.db
        .query("githubRepositories")
        .withIndex("by_user_enabled", (q) => 
          q.eq("userId", userId).eq("isEnabled", true)
        )
        .collect();
    }

    return await ctx.db
      .query("githubRepositories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Toggle repository enabled status
export const toggleRepository = mutation({
  args: { 
    repositoryId: v.id("githubRepositories"),
    isEnabled: v.boolean()
  },
  handler: async (ctx, { repositoryId, isEnabled }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.userId !== userId) {
      throw new Error("Repository not found or access denied");
    }

    return await ctx.db.patch(repositoryId, {
      isEnabled,
      updatedAt: Date.now(),
    });
  },
});

// Check repository permissions for sync
export const checkRepositoryPermissions = action({
  args: { repositoryId: v.id("githubRepositories") },
  handler: async (ctx, { repositoryId }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.userId !== userId) {
      throw new Error("Repository not found or access denied");
    }

    const integration = await ctx.db
      .query("githubIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!integration) {
      throw new Error("GitHub integration not found");
    }

    try {
      // Check current permissions with GitHub API
      const repoData = await checkRepositoryAccess(
        integration.accessToken,
        repository.owner,
        repository.name
      );

      // Update permissions in database
      await ctx.db.patch(repositoryId, {
        permissions: {
          admin: repoData.permissions?.admin || false,
          maintain: repoData.permissions?.maintain || false,
          push: repoData.permissions?.push || false,
          triage: repoData.permissions?.triage || false,
          pull: repoData.permissions?.pull || false,
        },
        updatedAt: Date.now(),
      });

      return {
        canSync: repoData.permissions?.push || repoData.permissions?.admin,
        permissions: repoData.permissions,
      };
    } catch (error) {
      console.error("Permission check failed:", error);
      throw new Error(`Permission check failed: ${error.message}`);
    }
  },
});

// Sync document to specific GitHub repository
export const syncDocumentToRepository = action({
  args: {
    documentId: v.id("documents"),
    repositoryId: v.id("githubRepositories"),
    commitMessage: v.optional(v.string()),
    filePath: v.optional(v.string()), // Custom file path
  },
  handler: async (ctx, { documentId, repositoryId, commitMessage, filePath }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get document
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    // Get repository
    const repository = await ctx.db.get(repositoryId);
    if (!repository || repository.userId !== userId) {
      throw new Error("Repository not found or access denied");
    }

    if (!repository.isEnabled) {
      throw new Error("Repository is not enabled for syncing");
    }

    // Get GitHub integration
    const integration = await ctx.db
      .query("githubIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!integration) {
      throw new Error("GitHub integration not found");
    }

    // Check permissions
    if (!repository.permissions.push && !repository.permissions.admin) {
      throw new Error("Insufficient permissions to push to this repository");
    }

    try {
      // Convert BlockNote content to Markdown
      const markdown = convertToMarkdown(document.content);
      
      // Prepare file content
      const fileName = filePath || `docs/${document.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()}.md`;
      const fileContent = `# ${document.title}\n\n${markdown}\n\n---\n*Last updated: ${new Date().toISOString()}*\n*Synced from ${document.author?.name || 'Notion Clone'}*`;

      // Sync to GitHub
      const response = await syncToGitHubAPI({
        token: integration.accessToken,
        owner: repository.owner,
        repo: repository.name,
        path: fileName,
        content: Buffer.from(fileContent).toString('base64'),
        message: commitMessage || `Update: ${document.title}`,
        branch: repository.defaultBranch,
      });

      // Update last sync time
      await ctx.db.patch(repositoryId, {
        lastSyncedAt: Date.now(),
        updatedAt: Date.now(),
      });

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

// Helper function to fetch user repositories from GitHub API
async function fetchUserRepositories(token) {
  const response = await fetch("https://api.github.com/user/repos?per_page=100&type=all", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Notion-Clone-App/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Helper function to check repository access
async function checkRepositoryAccess(token, owner, repo) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Notion-Clone-App/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Repository access check failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Helper function to sync to GitHub API
async function syncToGitHubAPI({ token, owner, repo, path, content, message, branch = "main" }) {
  // First, try to get the existing file to get its SHA
  let sha = null;
  try {
    const existingFileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Notion-Clone-App/1.0"
      }
    });

    if (existingFileResponse.ok) {
      const existingFile = await existingFileResponse.json();
      sha = existingFile.sha;
    }
  } catch (error) {
    // File doesn't exist, which is fine
  }

  // Create or update the file
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "Notion-Clone-App/1.0"
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
    throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
  }

  return await response.json();
}

// Convert BlockNote content to Markdown
function convertToMarkdown(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';
  
  return blocks.map(block => {
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
      case 'table':
        // Basic table conversion (simplified)
        return convertTableToMarkdown(block);
      default:
        return block.content?.map(c => c.text || '').join('') || '';
    }
  }).join('\n\n');
}

function convertTableToMarkdown(tableBlock) {
  // Simplified table conversion
  if (!tableBlock.content || !tableBlock.content.rows) return '';
  
  const rows = tableBlock.content.rows;
  if (rows.length === 0) return '';

  let markdown = '';
  
  // Header row
  if (rows[0]) {
    markdown += '| ' + rows[0].cells.map(cell => cell.text || '').join(' | ') + ' |\n';
    markdown += '|' + rows[0].cells.map(() => '---').join('|') + '|\n';
  }
  
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    markdown += '| ' + rows[i].cells.map(cell => cell.text || '').join(' | ') + ' |\n';
  }
  
  return markdown;
}