import apiInstance from './client';
import { DEFAULT_SENDER } from './templates/constants';

const MAX_RETRIES = 3;

/**
 * Reusable core function for sending Brevo emails.
 */
export const sendTemplateEmail = async ({
  to,
  templateId,
  htmlContent = undefined,
  params = {},
  subject = undefined,
  replyTo = undefined,
  cc = undefined,
  bcc = undefined,
  attachment = undefined,
}) => {
  if (!to || (!templateId && !htmlContent)) {
    throw new Error('Missing required fields: to, and either templateId or htmlContent');
  }

  const payload = {
    to: Array.isArray(to) ? to : [{ email: to }],
    sender: DEFAULT_SENDER,
  };
  
  if (params && Object.keys(params).length > 0) payload.params = params;
  
  if (templateId) payload.templateId = templateId;
  if (htmlContent) payload.htmlContent = htmlContent;
  if (subject) payload.subject = subject;
  if (replyTo) payload.replyTo = { email: replyTo };
  if (cc) payload.cc = Array.isArray(cc) ? cc : [{ email: cc }];
  if (bcc) payload.bcc = Array.isArray(bcc) ? bcc : [{ email: bcc }];
  if (attachment) payload.attachment = Array.isArray(attachment) ? attachment : [attachment];

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      // In Brevo SDK v6+, sendTransacEmail is exposed under transactionalEmails and accepts a plain object payload
      const result = await apiInstance.transactionalEmails.sendTransacEmail(payload);
      return result;
    } catch (error) {
      attempt++;
      console.error(`[Brevo Email Error] Attempt ${attempt}/${MAX_RETRIES} failed for email to ${JSON.stringify(to)}:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to send email after ${MAX_RETRIES} attempts.`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};
