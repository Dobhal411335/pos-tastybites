import { BrevoClient } from '@getbrevo/brevo';

const apiInstance = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY || ''
});

export default apiInstance;
