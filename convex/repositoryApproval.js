import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api.js";
import { auth } from "./auth.js";
import { sendRepositoryApprovalEmail, generateApprovalToken } from "./lib/email.js";

// Request repository approval from admin
export const requestRepositoryApproval = action({
  args: {
    repoUrl: v.string(),
    justification: v.optional(v.string()),
    accessToken: v.string(), // To verify access before sending request
  },
  handler: async (ctx, { repoUrl, justification, accessToken }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get admin email from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      throw new Error("Admin email not configured. Please contact support.");
    }

    // Parse repository URL
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      throw new Error("Invalid GitHub repository URL. Please use format: https://github.com/owner/repo");
    }

    const owner = repoMatch[1];
    const repoName = repoMatch[2].replace('.git', '');

    // Get user information
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Verify user has access to the repository before sending approval request
    console.log(`🔐 Verifying user access before sending approval request...`);
    
    try {
      // Import the verification function from github.js
      const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Potion-App/1.0"
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Repository not found or you don't have access");
        } else if (response.status === 401) {
          throw new Error("Invalid access token");
        } else {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
      }

      console.log(`✅ User access verified for ${owner}/${repoName}`);
    } catch (error) {
      throw new Error(`Repository access verification failed: ${error.message}`);
    }

    // Check if there's already a pending request for this repository
    const existingRequest = await ctx.db
      .query("repositoryApprovalRequests")
      .withIndex("by_repo", (q) => q.eq("owner", owner).eq("repoName", repoName))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new Error("There is already a pending approval request for this repository.");
    }

    // Generate approval token and create request
    const approvalToken = generateApprovalToken();
    const now = Date.now();
    const expiresAt = now + (48 * 60 * 60 * 1000); // 48 hours from now

    const requestId = await ctx.db.insert("repositoryApprovalRequests", {
      requesterId: userId,
      repoUrl: `https://github.com/${owner}/${repoName}`,
      owner,
      repoName,
      justification: justification?.trim() || null,
      status: "pending",
      adminEmail,
      approvalToken,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Generate approval URLs
    const baseUrl = process.env.CONVEX_SITE_URL || "http://localhost:3000";
    const approvalUrl = `${baseUrl}/api/approve-repo?token=${approvalToken}&action=approve`;
    const rejectionUrl = `${baseUrl}/api/approve-repo?token=${approvalToken}&action=reject`;

    // Send email to admin
    try {
      const emailResult = await sendRepositoryApprovalEmail(
        adminEmail,
        {
          requesterName: user.name || "Unknown User",
          requesterEmail: user.email || "unknown@example.com",
          repoUrl: `https://github.com/${owner}/${repoName}`,
          owner,
          repoName,
          justification: justification?.trim(),
        },
        approvalUrl,
        rejectionUrl
      );

      console.log(`📧 Approval email sent:`, emailResult);

      // Log the security event
      await ctx.db.insert("securityAuditLog", {
        userId,
        action: "approval_requested",
        resource: "repository_approval",
        resourceId: requestId,
        details: {
          repositoryUrl: `https://github.com/${owner}/${repoName}`,
          adminEmail,
          emailProvider: emailResult.provider,
        },
        success: true,
        timestamp: now,
      });

      return {
        success: true,
        message: `Approval request sent to admin (${adminEmail}). You'll be notified when approved.`,
        requestId,
      };

    } catch (error) {
      console.error("Failed to send approval email:", error);
      
      // Clean up the request since email failed
      await ctx.db.delete(requestId);
      
      throw new Error(`Failed to send approval email: ${error.message}`);
    }
  },
});

// Process approval/rejection (called via webhook/API endpoint)
export const processRepositoryApproval = mutation({
  args: {
    token: v.string(),
    action: v.string(), // "approve" or "reject"
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, { token, action, adminEmail }) => {
    // Find the approval request
    const request = await ctx.db
      .query("repositoryApprovalRequests")
      .withIndex("by_approval_token", (q) => q.eq("approvalToken", token))
      .first();

    if (!request) {
      throw new Error("Invalid approval token");
    }

    if (request.status !== "pending") {
      throw new Error(`Request has already been ${request.status}`);
    }

    if (Date.now() > request.expiresAt) {
      throw new Error("Approval request has expired");
    }

    const now = Date.now();
    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update the request
    await ctx.db.patch(request._id, {
      status: newStatus,
      approvedBy: adminEmail || request.adminEmail,
      approvedAt: now,
      updatedAt: now,
    });

    // If approved, automatically add the repository to the global registry
    if (action === "approve") {
      try {
        const existingRepo = await ctx.db
          .query("githubRepositories")
          .withIndex("by_owner_repo", (q) => 
            q.eq("owner", request.owner).eq("repoName", request.repoName)
          )
          .first();

        if (!existingRepo) {
          await ctx.db.insert("githubRepositories", {
            repoUrl: request.repoUrl,
            owner: request.owner,
            repoName: request.repoName,
            addedBy: request.requesterId,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (error) {
        console.error("Failed to add approved repository:", error);
        // Don't fail the approval, but log the issue
      }
    }

    // Log the security event
    await ctx.db.insert("securityAuditLog", {
      userId: request.requesterId,
      action: `approval_${newStatus}`,
      resource: "repository_approval",
      resourceId: request._id,
      details: {
        repositoryUrl: request.repoUrl,
        approvedBy: adminEmail || request.adminEmail,
        adminAction: action,
      },
      success: true,
      timestamp: now,
    });

    return {
      success: true,
      status: newStatus,
      message: `Repository ${request.owner}/${request.repoName} has been ${newStatus}`,
      repositoryUrl: request.repoUrl,
    };
  },
});

// Get user's approval requests
export const getUserApprovalRequests = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, { status }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    let query = ctx.db
      .query("repositoryApprovalRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId));

    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    const requests = await query
      .order("desc")
      .collect();

    // Don't return sensitive tokens in the response
    return requests.map(request => ({
      ...request,
      approvalToken: undefined, // Remove sensitive token
    }));
  },
});

// Get all pending approval requests (admin function)
export const getPendingApprovalRequests = query({
  handler: async (ctx) => {
    // TODO: Add admin authentication check here
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("repositoryApprovalRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("expiresAt"), Date.now() + (24 * 60 * 60 * 1000))) // Not expired
      .order("desc")
      .collect();

    // Get requester information for each request
    const requestsWithUsers = await Promise.all(
      requests.map(async (request) => {
        const requester = await ctx.db.get(request.requesterId);
        return {
          ...request,
          requester: requester ? {
            id: requester._id,
            name: requester.name,
            email: requester.email,
          } : null,
          approvalToken: undefined, // Remove sensitive token
        };
      })
    );

    return requestsWithUsers;
  },
});

// Clean up expired requests (to be called periodically)
export const cleanupExpiredRequests = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    const expiredRequests = await ctx.db
      .query("repositoryApprovalRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const request of expiredRequests) {
      await ctx.db.patch(request._id, {
        status: "expired",
        updatedAt: now,
      });
    }

    console.log(`🧹 Cleaned up ${expiredRequests.length} expired approval requests`);
    return { cleaned: expiredRequests.length };
  },
});