import { httpRouter } from "convex/server";
import { auth } from "./auth.js";
import { httpAction } from "./_generated/server.js";
import { api } from "./_generated/api.js";

const http = httpRouter();

auth.addHttpRoutes(http);

// File upload endpoint
http.route({
  path: "/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Generate upload URL for Convex storage
    return await ctx.storage.generateUploadUrl();
  }),
});

// File serving endpoint  
http.route({
  path: "/files/:storageId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const { storageId } = request.params;
    const url = await ctx.storage.getUrl(storageId);
    
    if (!url) {
      return new Response("File not found", { status: 404 });
    }
    
    // Redirect to the storage URL
    return Response.redirect(url, 302);
  }),
});

// Handle repository approval/rejection from email links
http.route({
  path: "/api/approve-repo",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action");

    if (!token || !action) {
      return new Response(createErrorPage("Missing token or action parameter"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!["approve", "reject"].includes(action)) {
      return new Response(createErrorPage("Invalid action. Must be 'approve' or 'reject'"), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    try {
      // Process the approval/rejection using the mutation
      const result = await ctx.runMutation(api.repositoryApproval.processRepositoryApproval, {
        token,
        action,
        adminEmail: "admin", // Could extract from headers if needed
      });

      // Return success page
      return new Response(createSuccessPage(action, result), {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });

    } catch (error) {
      console.error("Approval processing error:", error);
      
      return new Response(createErrorPage(error.message), {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }
  }),
});

function createSuccessPage(action, result) {
  const statusColor = action === 'approve' ? '#28a745' : '#dc3545';
  const statusIcon = action === 'approve' ? '✅' : '❌';
  const statusText = action === 'approve' ? 'APPROVED' : 'REJECTED';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Repository ${statusText}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f8f9fa;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 500px;
                width: 100%;
            }
            .status-icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            .status-text {
                color: ${statusColor};
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .repo-name {
                font-size: 18px;
                color: #333;
                margin-bottom: 20px;
                padding: 10px;
                background-color: #f1f3f4;
                border-radius: 6px;
                word-break: break-all;
            }
            .message {
                color: #666;
                line-height: 1.5;
            }
            .timestamp {
                font-size: 12px;
                color: #999;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="status-icon">${statusIcon}</div>
            <div class="status-text">REQUEST ${statusText}</div>
            <div class="repo-name">${result.repositoryUrl || 'Repository'}</div>
            <div class="message">
                ${result.message || `Repository has been ${action}d successfully.`}
                <br><br>
                The user will be automatically notified of your decision.
            </div>
            <div class="timestamp">
                Processed at ${new Date().toLocaleString()}
            </div>
        </div>
    </body>
    </html>
  `;
}

function createErrorPage(errorMessage) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Error Processing Request</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f8f9fa;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 500px;
                width: 100%;
            }
            .error-icon {
                font-size: 64px;
                margin-bottom: 20px;
                color: #dc3545;
            }
            .error-text {
                color: #dc3545;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .error-message {
                color: #666;
                line-height: 1.5;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">❌</div>
            <div class="error-text">ERROR</div>
            <div class="error-message">
                ${errorMessage}
                <br><br>
                Please contact support if this error persists.
            </div>
        </div>
    </body>
    </html>
  `;
}

export default http;