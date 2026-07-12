import { sendTemplateEmail } from './sendTemplateEmail';
import { TEMPLATE_IDS } from './templates/constants';

export const sendOTP = async (to, otpCode) => {
  return await sendTemplateEmail({
    to,
    templateId: TEMPLATE_IDS.OTP,
    params: {
      otp: otpCode,
    },
  });
};
