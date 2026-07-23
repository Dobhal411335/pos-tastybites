import { sendEmail } from './sendEmail';
import { employeeCredentialsTemplate } from './templates/employeeCredentialsTemplate';
import CompanyBasicInfo from '@/models/Web/CompanyBasicInfo';

/**
 * Sends the generated credentials to the employee via email.
 */
export const sendEmployeeCredentials = async ({
  employeeName,
  employeeId,
  username,
  password,
  role,
  restaurantName,
  floor,
  device,
  loginUrl,
  email
}) => {
  if (!email) {
    throw new Error("Missing recipient email address");
  }

  // Fetch company info for standard header/footer
  let companyInfo = null;
  try {
    companyInfo = await CompanyBasicInfo.findOne();
  } catch (err) {
    console.warn("Failed to fetch CompanyBasicInfo for email template", err);
  }

  // Generate the premium HTML email content
  const htmlContent = employeeCredentialsTemplate({
    employeeName,
    employeeId,
    username,
    password,
    role,
    restaurantName,
    floor,
    device,
    loginUrl,
    companyInfo
  });

  // Call the existing Brevo wrapper
  return await sendEmail({
    to: email,
    subject: "Your Restaurant Login Credentials",
    htmlContent: htmlContent, // Passed cleanly thanks to our update in sendTemplateEmail.js
  });
};
