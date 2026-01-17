/**
 * AWS SES Client Configuration
 *
 * This module provides a configured SES client for sending emails.
 * It supports both environment-based configuration and explicit configuration.
 *
 * Required environment variables:
 * - AWS_ACCESS_KEY_ID: IAM access key with SES permissions
 * - AWS_SECRET_ACCESS_KEY: IAM secret key
 * - AWS_REGION: AWS region where SES is configured (e.g., 'us-east-1')
 * - SES_FROM_EMAIL: Verified sender email address
 */

import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
  type SendEmailCommandOutput,
} from '@aws-sdk/client-ses';

/**
 * SES client configuration options
 */
export interface SESConfig {
  /** AWS region (e.g., 'us-east-1') */
  region: string;
  /** IAM access key ID */
  accessKeyId: string;
  /** IAM secret access key */
  secretAccessKey: string;
}

/**
 * Email sending options
 */
export interface SendEmailOptions {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** Plain text body */
  text?: string;
  /** HTML body */
  html?: string;
  /** Optional sender email (defaults to SES_FROM_EMAIL env var) */
  from?: string;
  /** Reply-to email address */
  replyTo?: string;
  /** CC recipients */
  cc?: string | string[];
  /** BCC recipients */
  bcc?: string | string[];
}

/**
 * Email send result
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: Error;
}

/**
 * Creates a configured SES client
 *
 * @param config - Optional explicit configuration. If not provided, uses environment variables.
 * @returns Configured SESClient instance
 *
 * @example
 * // Using environment variables
 * const client = createSESClient();
 *
 * @example
 * // Using explicit configuration
 * const client = createSESClient({
 *   region: 'us-east-1',
 *   accessKeyId: 'AKIA...',
 *   secretAccessKey: '...'
 * });
 */
export function createSESClient(config?: SESConfig): SESClient {
  const region = config?.region || process.env.AWS_REGION;
  const accessKeyId = config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;

  if (!region) {
    throw new Error(
      'AWS region is required. Set AWS_REGION environment variable or provide config.region'
    );
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS credentials are required. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables or provide config'
    );
  }

  return new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Default SES client instance (singleton)
 * Lazily initialized on first use
 */
let defaultClient: SESClient | null = null;

/**
 * Gets the default SES client instance
 * Creates the client on first call and reuses it for subsequent calls
 *
 * @returns The default SESClient instance
 */
export function getSESClient(): SESClient {
  if (!defaultClient) {
    defaultClient = createSESClient();
  }
  return defaultClient;
}

/**
 * Resets the default SES client (useful for testing)
 */
export function resetSESClient(): void {
  defaultClient = null;
}

/**
 * Gets the default sender email from environment
 *
 * @returns The configured sender email address
 * @throws If SES_FROM_EMAIL is not set
 */
export function getDefaultFromEmail(): string {
  const fromEmail = process.env.SES_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('SES_FROM_EMAIL environment variable is required');
  }
  return fromEmail;
}

/**
 * Sends an email using AWS SES
 *
 * @param options - Email sending options
 * @param client - Optional SES client (uses default if not provided)
 * @returns Promise resolving to send result
 *
 * @example
 * const result = await sendEmail({
 *   to: 'customer@example.com',
 *   subject: 'Your Order Confirmation',
 *   html: '<h1>Thank you for your order!</h1>',
 *   text: 'Thank you for your order!'
 * });
 *
 * if (result.success) {
 *   console.log('Email sent:', result.messageId);
 * } else {
 *   console.error('Failed to send email:', result.error);
 * }
 */
export async function sendEmail(
  options: SendEmailOptions,
  client?: SESClient
): Promise<SendEmailResult> {
  const sesClient = client || getSESClient();
  const fromEmail = options.from || getDefaultFromEmail();

  // Normalize recipients to arrays
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
  const ccAddresses = options.cc
    ? Array.isArray(options.cc)
      ? options.cc
      : [options.cc]
    : undefined;
  const bccAddresses = options.bcc
    ? Array.isArray(options.bcc)
      ? options.bcc
      : [options.bcc]
    : undefined;

  // Build email body
  const body: NonNullable<
    NonNullable<SendEmailCommandInput['Message']>['Body']
  > = {};
  if (options.html) {
    body.Html = {
      Charset: 'UTF-8',
      Data: options.html,
    };
  }
  if (options.text) {
    body.Text = {
      Charset: 'UTF-8',
      Data: options.text,
    };
  }

  // At least one of text or html is required
  if (!options.text && !options.html) {
    return {
      success: false,
      error: new Error('Either text or html body is required'),
    };
  }

  const input: SendEmailCommandInput = {
    Source: fromEmail,
    Destination: {
      ToAddresses: toAddresses,
      CcAddresses: ccAddresses,
      BccAddresses: bccAddresses,
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: options.subject,
      },
      Body: body,
    },
    ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
  };

  try {
    const command = new SendEmailCommand(input);
    const response: SendEmailCommandOutput = await sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Sends a batch of emails
 * Useful for sending notifications to multiple recipients with different content
 *
 * @param emails - Array of email options
 * @param client - Optional SES client
 * @returns Promise resolving to array of send results
 */
export async function sendBatchEmails(
  emails: SendEmailOptions[],
  client?: SESClient
): Promise<SendEmailResult[]> {
  const sesClient = client || getSESClient();
  const results = await Promise.all(
    emails.map((email) => sendEmail(email, sesClient))
  );
  return results;
}

/**
 * Validates that all required SES configuration is present
 * Useful for health checks and startup validation
 *
 * @returns Object with validation result and any missing config
 */
export function validateSESConfig(): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!process.env.AWS_REGION) {
    missing.push('AWS_REGION');
  }
  if (!process.env.AWS_ACCESS_KEY_ID) {
    missing.push('AWS_ACCESS_KEY_ID');
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY) {
    missing.push('AWS_SECRET_ACCESS_KEY');
  }
  if (!process.env.SES_FROM_EMAIL) {
    missing.push('SES_FROM_EMAIL');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
