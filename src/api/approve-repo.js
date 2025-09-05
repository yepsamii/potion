// API endpoint for handling repository approval/rejection links
// This would typically be a Next.js API route or Express.js endpoint

import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, action } = req.query;

  if (!token || !action) {
    return res.status(400).json({ error: 'Missing token or action parameter' });
  }

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
  }

  try {
    // Process the approval/rejection
    const result = await convex.mutation(api.repositoryApproval.processRepositoryApproval, {
      token,
      action,
      adminEmail: req.headers['x-forwarded-for'] || req.connection.remoteAddress, // Basic tracking
    });

    // Return a success page
    const statusColor = action === 'approve' ? '#28a745' : '#dc3545';
    const statusIcon = action === 'approve' ? '✅' : '❌';
    const statusText = action === 'approve' ? 'APPROVED' : 'REJECTED';
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
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
              <div class="repo-name">${result.repositoryUrl}</div>
              <div class="message">
                  ${result.message}
                  <br><br>
                  The user will be automatically notified of your decision.
              </div>
              <div class="timestamp">
                  Processed at ${new Date().toLocaleString()}
              </div>
          </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Approval processing error:', error);
    
    // Return error page
    res.setHeader('Content-Type', 'text/html');
    res.status(400).send(`
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
                  ${error.message}
                  <br><br>
                  Please contact support if this error persists.
              </div>
          </div>
      </body>
      </html>
    `);
  }
}