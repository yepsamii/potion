import { action } from "./_generated/server";
import { sendRepositoryApprovalEmail } from "./lib/email.js";

// Test email function to verify Resend integration
export const testEmailSend = action({
  args: {},
  handler: async (ctx) => {
    try {
      console.log('🧪 Testing email send with Resend...');
      
      const result = await sendRepositoryApprovalEmail(
        'abrahmansw@gmail.com', // Your admin email
        {
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          repoUrl: 'https://github.com/facebook/react',
          owner: 'facebook',
          repoName: 'react',
          justification: 'This is a test email to verify Resend integration is working correctly.',
        },
        'http://localhost:3000/api/approve-repo?token=TEST123&action=approve',
        'http://localhost:3000/api/approve-repo?token=TEST123&action=reject'
      );

      console.log('✅ Test email result:', result);
      return {
        success: true,
        message: 'Test email sent successfully!',
        provider: result.provider,
        emailId: result.id,
      };

    } catch (error) {
      console.error('❌ Test email failed:', error);
      return {
        success: false,
        message: `Test email failed: ${error.message}`,
        error: error.message,
      };
    }
  },
});