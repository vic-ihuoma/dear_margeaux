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

// Template Rendering
export {
  renderEmailTemplate,
  renderToHtml,
  renderToText,
  type RenderResult,
} from './render-template.js';

// Email Templates
export {
  DropLaunchEmail,
  type DropLaunchEmailProps,
} from './templates/drop-launch.js';

export {
  OrderConfirmationEmail,
  type OrderConfirmationEmailProps,
  type OrderItem,
} from './templates/order-confirmation.js';

export {
  ShippingUpdateEmail,
  type ShippingUpdateEmailProps,
  type ShippingItem,
} from './templates/shipping-update.js';

export {
  OrderStatusUpdateEmail,
  type OrderStatusUpdateEmailProps,
  type OrderStatusItem,
  type OrderStatus,
} from './templates/order-status-update.js';
