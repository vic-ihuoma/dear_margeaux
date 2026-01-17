/**
 * @dear-margeaux/email
 * Email utilities and templates for Dear Margeaux
 */

// SES Client
export {
  createSESClient,
  getSESClient,
  resetSESClient,
  getDefaultFromEmail,
  sendEmail,
  sendBatchEmails,
  validateSESConfig,
  type SESConfig,
  type SendEmailOptions,
  type SendEmailResult,
} from './ses-client.js';
