import { sendSuccess } from '@/utils/apiResponse';
// In a real implementation, this would generate a reset token and use sendResetPassword from brevo logic
export async function POST(request) {
  const { email } = await request.json();
  // Simulate forgot password flow
  return sendSuccess(null, `If an account with ${email} exists, a password reset email has been sent.`);
}
