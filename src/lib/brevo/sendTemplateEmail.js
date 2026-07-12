import apiInstance from './client';
import * as brevo from '@getbrevo/brevo';
import { DEFAULT_SENDER } from './templates/constants';

const MAX_RETRIES = 3;

/**
 * Reusable core function for sending Brevo emails using template IDs.
 */
export const sendTemplateEmail = async ({
  to,
  templateId,
  params = {},
  subject = undefined,
  replyTo = undefined,
  cc = undefined,
  bcc = undefined,
  attachment = undefined,
}) => {
  if (!to || !templateId) {
    throw new Error('Missing required fields: to, templateId');
  }

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  
  sendSmtpEmail.to = Array.isArray(to) ? to : [{ email: to }];
  sendSmtpEmail.templateId = templateId;
  sendSmtpEmail.params = params;
  sendSmtpEmail.sender = DEFAULT_SENDER;

  if (subject) sendSmtpEmail.subject = subject;
  if (replyTo) sendSmtpEmail.replyTo = { email: replyTo };
  if (cc) sendSmtpEmail.cc = Array.isArray(cc) ? cc : [{ email: cc }];
  if (bcc) sendSmtpEmail.bcc = Array.isArray(bcc) ? bcc : [{ email: bcc }];
  if (attachment) sendSmtpEmail.attachment = Array.isArray(attachment) ? attachment : [attachment];

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
      return result;
    } catch (error) {
      attempt++;
      console.error(`[Brevo Email Error] Attempt ${attempt}/${MAX_RETRIES} failed for template ${templateId} to ${JSON.stringify(to)}:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to send email after ${MAX_RETRIES} attempts.`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
};
