import { sendTemplateEmail } from './sendTemplateEmail';

/**
 * Generic wrapper that redirects to the core sendTemplateEmail function.
 * Use this when you have a dynamic templateId not explicitly wrapped.
 */
export const sendEmail = async (options) => {
  return await sendTemplateEmail(options);
};
