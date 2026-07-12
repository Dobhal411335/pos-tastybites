export const TEMPLATE_IDS = {
  OTP: 1,
  FORGOT_PASSWORD: 2,
  WELCOME_EMAIL: 3,
  ACCOUNT_CREATED: 4,
  EMPLOYEE_INVITATION: 5,
  PASSWORD_CHANGED: 6,
  EMAIL_VERIFICATION: 7,
};

export const DEFAULT_SENDER = {
  email: process.env.BREVO_SENDER_EMAIL || 'noreply@restaurant.com',
  name: process.env.BREVO_SENDER_NAME || 'Restaurant Management',
};
