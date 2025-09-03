import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Store GitHub integration settings
export const saveGitHubIntegration = mutation({
  args: {
    accessToken: v.string(),
    username: v.string(),
    repoName: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, { accessToken, username, repoName, repoUrl }) => {
    const userId = await getAuthUserId(ctx);
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
        repoName,
        repoUrl,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("githubIntegrations", {
        userId,
        accessToken, // In production, this should be encrypted
        username,
        repoName,
        repoUrl,
        createdAt: now,
      });
    }
  },
});

// Get user's GitHub integration
export const getGitHubIntegration = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("githubIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// Sync document to GitHub
export const syncToGitHub = action({
  args: {
    documentId: v.id("documents"),
    commitMessage: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, commitMessage }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get document
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    // Get GitHub integration
    const integration = await ctx.db
      .query("githubIntegrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!integration || !integration.repoName) {
      throw new Error("GitHub integration not configured");
    }

    try {
      // Convert BlockNote content to Markdown
      const markdown = convertToMarkdown(document.content);
      
      // Prepare file content
      const fileName = `${document.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
      const fileContent = `# ${document.title}\n\n${markdown}`;

      // GitHub API call would go here
      // For now, we'll simulate the sync
      const response = await syncToGitHubAPI({
        token: integration.accessToken,
        owner: integration.username,
        repo: integration.repoName,
        path: fileName,
        content: Buffer.from(fileContent).toString('base64'),
        message: commitMessage || `Update ${document.title}`,
      });

      // Update last sync time
      await ctx.db.patch(integration._id, {
        lastSyncAt: Date.now(),
      });

      return { success: true, url: response.html_url };
    } catch (error) {
      console.error("GitHub sync error:", error);
      throw new Error(`Failed to sync to GitHub: ${error.message}`);
    }
  },
});

// Convert BlockNote content to Markdown (simplified)
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
        const codeText = block.content?.map(c => c.text || '').join('') || '';
        return '```\n' + codeText + '\n```';
      default:
        return block.content?.map(c => c.text || '').join('') || '';
    }
  }).join('\n\n');
}

// Simulate GitHub API call (in production, use actual GitHub API)
async function syncToGitHubAPI({ token, owner, repo, path, content, message }) {
  // In production, you would use the GitHub API:
  // const { Octokit } = require("@octokit/rest");
  // const octokit = new Octokit({ auth: token });
  // 
  // return await octokit.repos.createOrUpdateFileContents({
  //   owner,
  //   repo,
  //   path,
  //   message,
  //   content,
  // });

  // For now, simulate success
  return {
    html_url: `https://github.com/${owner}/${repo}/blob/main/${path}`,
    content: { sha: 'fake-sha' }
  };
}