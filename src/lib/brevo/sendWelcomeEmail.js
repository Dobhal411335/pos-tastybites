import { sendTemplateEmail } from './sendTemplateEmail';
import { TEMPLATE_IDS } from './templates/constants';

export const sendWelcomeEmail = async (to, name) => {
  return await sendTemplateEmail({
    to,
    templateId: TEMPLATE_IDS.WELCOME_EMAIL,
    params: {
      first_name: name,
    },
  });
};
