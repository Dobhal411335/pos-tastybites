import { sendEmail } from './sendEmail';
import { superAdminVerificationTemplate } from './templates/superAdminVerificationTemplate';
import CompanyBasicInfo from '@/models/Web/CompanyBasicInfo';

export const sendAdminVerificationEmail = async ({
  to,
  superAdminName,
  adminName,
  adminEmail,
  adminRole,
  verificationCode,
  adminDashboardUrl,
}) => {
  if (!to) {
    throw new Error('Missing recipient email address');
  }

  let companyInfo = null;
  try {
    companyInfo = await CompanyBasicInfo.findOne();
  } catch (error) {
    console.warn('Failed to load CompanyBasicInfo for admin verification email', error);
  }

  const htmlContent = superAdminVerificationTemplate({
    superAdminName,
    adminName,
    adminEmail,
    adminRole,
    verificationCode,
    adminDashboardUrl,
    companyInfo,
  });

  return await sendEmail({
    to,
    subject: 'New Admin Requires Verification',
    htmlContent,
  });
};