import { sendTemplateEmail } from './sendTemplateEmail';
import { TEMPLATE_IDS } from './templates/constants';

export const sendResetPassword = async (to, resetLink) => {
  return await sendTemplateEmail({
    to,
    templateId: TEMPLATE_IDS.FORGOT_PASSWORD,
    params: {
      reset_link: resetLink,
    },
  });
};
