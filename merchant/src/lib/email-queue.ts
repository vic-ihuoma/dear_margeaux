/**
 * Email Queue Module
 *
 * Provides retry mechanism for failed emails with exponential backoff.
 * Emails are queued when sending fails, retried up to 3 times,
 * then moved to dead letter table for manual review.
 *
 * Exponential backoff delays:
 * - 1st retry: 1 minute
 * - 2nd retry: 5 minutes
 * - 3rd retry: 15 minutes
 */

import { getDb, type Database } from '../db';
import { uuid, now, type Env } from '../types';

// ============================================================
// TYPES
// ============================================================

export type EmailType =
  | 'order_confirmation'
  | 'shipping_update'
  | 'drop_launch'
  | 'newsletter_verification'
  | 'newsletter';

export interface QueuedEmail {
  id: string;
  store_id: string;
  email_type: EmailType;
  recipient: string;
  subject: string;
  html: string;
  metadata?: string; // JSON string
  retry_count: number;
  max_retries: number;
  last_error?: string;
  next_retry_at: string;
  created_at: string;
  updated_at: string;
}

export interface EmailQueueEntry {
  storeId: string;
  emailType: EmailType;
  recipient: string;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
  error: string;
}

export interface EmailQueueResult {
  queued: boolean;
  id?: string;
  error?: string;
}

export interface ProcessQueueResult {
  processed: number;
  succeeded: number;
  failed: number;
  movedToDeadLetter: number;
}

// ============================================================
// CONFIGURATION
// ============================================================

/**
 * Backoff delays in milliseconds for each retry attempt
 * Uses exponential backoff: 1min, 5min, 15min
 */
const RETRY_DELAYS_MS = [
  1 * 60 * 1000, // 1 minute
  5 * 60 * 1000, // 5 minutes
  15 * 60 * 1000, // 15 minutes
];

const DEFAULT_MAX_RETRIES = 3;

// ============================================================
// QUEUE FUNCTIONS
// ============================================================

/**
 * Calculate the next retry time based on retry count
 * Uses exponential backoff with predefined delays
 */
export function calculateNextRetryAt(retryCount: number): string {
  const delayMs = RETRY_DELAYS_MS[retryCount] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  return new Date(Date.now() + delayMs).toISOString();
}

/**
 * Calculate the backoff delay in milliseconds for a given retry count
 * Exported for testing
 */
export function getBackoffDelayMs(retryCount: number): number {
  return RETRY_DELAYS_MS[retryCount] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
}

/**
 * Add a failed email to the retry queue
 */
export async function queueFailedEmail(
  db: Database,
  entry: EmailQueueEntry
): Promise<EmailQueueResult> {
  const id = uuid();
  const currentTime = now();
  const nextRetryAt = calculateNextRetryAt(0);

  try {
    await db.run(
      `INSERT INTO email_queue
       (id, store_id, email_type, recipient, subject, html, metadata, retry_count, max_retries, last_error, next_retry_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.storeId,
        entry.emailType,
        entry.recipient,
        entry.subject,
        entry.html,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        DEFAULT_MAX_RETRIES,
        entry.error,
        nextRetryAt,
        currentTime,
        currentTime,
      ]
    );

    // eslint-disable-next-line no-console
    console.log(
      `[EMAIL_QUEUE] Queued failed email for ${entry.recipient} (type: ${entry.emailType})`
    );

    return { queued: true, id };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`[EMAIL_QUEUE] Failed to queue email: ${errorMsg}`);
    return { queued: false, error: errorMsg };
  }
}

/**
 * Get emails that are ready to retry
 */
export async function getEmailsReadyToRetry(db: Database, limit = 10): Promise<QueuedEmail[]> {
  const currentTime = now();
  return db.query<QueuedEmail>(
    `SELECT * FROM email_queue WHERE next_retry_at <= ? ORDER BY next_retry_at ASC LIMIT ?`,
    [currentTime, limit]
  );
}

/**
 * Update a queued email after a retry attempt
 * Increments retry count and sets next retry time
 */
export async function updateAfterRetry(
  db: Database,
  id: string,
  error: string
): Promise<{ shouldMoveToDeadLetter: boolean }> {
  const currentTime = now();

  // Get current retry count
  const [email] = await db.query<QueuedEmail>(
    `SELECT retry_count, max_retries FROM email_queue WHERE id = ?`,
    [id]
  );

  if (!email) {
    return { shouldMoveToDeadLetter: false };
  }

  const newRetryCount = email.retry_count + 1;

  if (newRetryCount >= email.max_retries) {
    // Max retries reached, should move to dead letter
    return { shouldMoveToDeadLetter: true };
  }

  // Update with new retry count and next retry time
  const nextRetryAt = calculateNextRetryAt(newRetryCount);

  await db.run(
    `UPDATE email_queue
     SET retry_count = ?, last_error = ?, next_retry_at = ?, updated_at = ?
     WHERE id = ?`,
    [newRetryCount, error, nextRetryAt, currentTime, id]
  );

  // eslint-disable-next-line no-console
  console.log(
    `[EMAIL_QUEUE] Retry ${newRetryCount}/${email.max_retries} for email ${id}, next retry at ${nextRetryAt}`
  );

  return { shouldMoveToDeadLetter: false };
}

/**
 * Move a queued email to dead letter table
 */
export async function moveToDeadLetter(db: Database, id: string): Promise<void> {
  const currentTime = now();

  // Get the email from queue
  const [email] = await db.query<QueuedEmail>(`SELECT * FROM email_queue WHERE id = ?`, [id]);

  if (!email) {
    return;
  }

  // Insert into dead letter
  await db.run(
    `INSERT INTO email_dead_letter
     (id, store_id, email_type, recipient, subject, html, metadata, retry_count, last_error, failed_at, original_created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid(),
      email.store_id,
      email.email_type,
      email.recipient,
      email.subject,
      email.html,
      email.metadata,
      email.retry_count + 1, // Include the final failed attempt
      email.last_error || 'Max retries exceeded',
      currentTime,
      email.created_at,
    ]
  );

  // Delete from queue
  await db.run(`DELETE FROM email_queue WHERE id = ?`, [id]);

  // eslint-disable-next-line no-console
  console.log(
    `[EMAIL_QUEUE] Moved email ${id} to dead letter after ${email.retry_count + 1} attempts`
  );
}

/**
 * Remove a successfully sent email from the queue
 */
export async function removeFromQueue(db: Database, id: string): Promise<void> {
  await db.run(`DELETE FROM email_queue WHERE id = ?`, [id]);
  // eslint-disable-next-line no-console
  console.log(`[EMAIL_QUEUE] Removed successfully sent email ${id} from queue`);
}

/**
 * Get queue statistics for monitoring
 */
export async function getQueueStats(
  db: Database,
  storeId?: string
): Promise<{
  pending: number;
  deadLetter: number;
}> {
  const whereClause = storeId ? 'WHERE store_id = ?' : '';
  const params = storeId ? [storeId] : [];

  const [pendingResult] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM email_queue ${whereClause}`,
    params
  );

  const [deadLetterResult] = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM email_dead_letter ${whereClause}`,
    params
  );

  return {
    pending: pendingResult?.count ?? 0,
    deadLetter: deadLetterResult?.count ?? 0,
  };
}

// ============================================================
// CRON PROCESSING
// ============================================================

/**
 * Email sender function type for dependency injection in testing
 */
export type EmailSender = (
  recipient: string,
  subject: string,
  html: string
) => Promise<{ success: boolean; error?: string }>;

/**
 * Process the email queue - called by cron job
 * Retries failed emails with exponential backoff
 */
export async function processEmailQueue(
  env: Env,
  sendEmail: EmailSender,
  batchSize = 10
): Promise<ProcessQueueResult> {
  const db = getDb(env);
  const result: ProcessQueueResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    movedToDeadLetter: 0,
  };

  const emails = await getEmailsReadyToRetry(db, batchSize);

  if (emails.length === 0) {
    return result;
  }

  // eslint-disable-next-line no-console
  console.log(`[EMAIL_QUEUE] Processing ${emails.length} queued emails`);

  for (const email of emails) {
    result.processed++;

    try {
      const sendResult = await sendEmail(email.recipient, email.subject, email.html);

      if (sendResult.success) {
        await removeFromQueue(db, email.id);
        result.succeeded++;
        // eslint-disable-next-line no-console
        console.log(`[EMAIL_QUEUE] Successfully resent email to ${email.recipient}`);
      } else {
        const error = sendResult.error || 'Unknown error';
        const { shouldMoveToDeadLetter } = await updateAfterRetry(db, email.id, error);

        if (shouldMoveToDeadLetter) {
          await moveToDeadLetter(db, email.id);
          result.movedToDeadLetter++;
        } else {
          result.failed++;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(`[EMAIL_QUEUE] Exception processing email ${email.id}: ${errorMsg}`);

      const { shouldMoveToDeadLetter } = await updateAfterRetry(db, email.id, errorMsg);

      if (shouldMoveToDeadLetter) {
        await moveToDeadLetter(db, email.id);
        result.movedToDeadLetter++;
      } else {
        result.failed++;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[EMAIL_QUEUE] Processed ${result.processed}: ${result.succeeded} succeeded, ${result.failed} will retry, ${result.movedToDeadLetter} moved to dead letter`
  );

  return result;
}
