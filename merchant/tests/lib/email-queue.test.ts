import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock uuid and now before importing module
vi.mock('../../src/types', async () => {
  const actual = await vi.importActual('../../src/types');
  return {
    ...actual,
    uuid: vi.fn(() => 'test-uuid-123'),
    now: vi.fn(() => '2026-01-18T12:00:00.000Z'),
  };
});

// Mock db module
const mockDbQuery = vi.fn();
const mockDbRun = vi.fn().mockResolvedValue({ changes: 1 });

const mockDb = {
  query: mockDbQuery,
  run: mockDbRun,
  runWithChanges: mockDbRun,
};

vi.mock('../../src/db', () => ({
  getDb: vi.fn(() => mockDb),
}));

import {
  queueFailedEmail,
  getEmailsReadyToRetry,
  updateAfterRetry,
  moveToDeadLetter,
  removeFromQueue,
  getQueueStats,
  processEmailQueue,
  calculateNextRetryAt,
  getBackoffDelayMs,
  type QueuedEmail,
  type EmailQueueEntry,
} from '../../src/lib/email-queue';

describe('Email Queue Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbQuery.mockReset();
    mockDbRun.mockReset().mockResolvedValue({ changes: 1 });
  });

  // ============================================================
  // calculateNextRetryAt tests
  // ============================================================

  describe('calculateNextRetryAt', () => {
    it('should return time 1 minute in future for retry 0', () => {
      const before = Date.now();
      const result = calculateNextRetryAt(0);
      const after = Date.now();

      const resultTime = new Date(result).getTime();
      const expectedMin = before + 1 * 60 * 1000;
      const expectedMax = after + 1 * 60 * 1000;

      expect(resultTime).toBeGreaterThanOrEqual(expectedMin);
      expect(resultTime).toBeLessThanOrEqual(expectedMax);
    });

    it('should return time 5 minutes in future for retry 1', () => {
      const before = Date.now();
      const result = calculateNextRetryAt(1);
      const after = Date.now();

      const resultTime = new Date(result).getTime();
      const expectedMin = before + 5 * 60 * 1000;
      const expectedMax = after + 5 * 60 * 1000;

      expect(resultTime).toBeGreaterThanOrEqual(expectedMin);
      expect(resultTime).toBeLessThanOrEqual(expectedMax);
    });

    it('should return time 15 minutes in future for retry 2', () => {
      const before = Date.now();
      const result = calculateNextRetryAt(2);
      const after = Date.now();

      const resultTime = new Date(result).getTime();
      const expectedMin = before + 15 * 60 * 1000;
      const expectedMax = after + 15 * 60 * 1000;

      expect(resultTime).toBeGreaterThanOrEqual(expectedMin);
      expect(resultTime).toBeLessThanOrEqual(expectedMax);
    });

    it('should use max delay for retry counts beyond array length', () => {
      const before = Date.now();
      const result = calculateNextRetryAt(10);
      const after = Date.now();

      const resultTime = new Date(result).getTime();
      // Should use last delay (15 minutes)
      const expectedMin = before + 15 * 60 * 1000;
      const expectedMax = after + 15 * 60 * 1000;

      expect(resultTime).toBeGreaterThanOrEqual(expectedMin);
      expect(resultTime).toBeLessThanOrEqual(expectedMax);
    });
  });

  // ============================================================
  // getBackoffDelayMs tests
  // ============================================================

  describe('getBackoffDelayMs', () => {
    it('should return 1 minute for retry 0', () => {
      expect(getBackoffDelayMs(0)).toBe(1 * 60 * 1000);
    });

    it('should return 5 minutes for retry 1', () => {
      expect(getBackoffDelayMs(1)).toBe(5 * 60 * 1000);
    });

    it('should return 15 minutes for retry 2', () => {
      expect(getBackoffDelayMs(2)).toBe(15 * 60 * 1000);
    });

    it('should return max delay for large retry counts', () => {
      expect(getBackoffDelayMs(100)).toBe(15 * 60 * 1000);
    });
  });

  // ============================================================
  // queueFailedEmail tests
  // ============================================================

  describe('queueFailedEmail', () => {
    it('should add failed email to queue', async () => {
      const entry: EmailQueueEntry = {
        storeId: 'store-1',
        emailType: 'order_confirmation',
        recipient: 'customer@example.com',
        subject: 'Order Confirmed - #ORD-123',
        html: '<h1>Order Confirmed</h1>',
        error: 'Network timeout',
      };

      const result = await queueFailedEmail(mockDb, entry);

      expect(result.queued).toBe(true);
      expect(result.id).toBe('test-uuid-123');
      expect(mockDbRun).toHaveBeenCalledTimes(1);
      expect(mockDbRun.mock.calls[0][0]).toContain('INSERT INTO email_queue');
    });

    it('should include retry count of 0 (hardcoded in SQL)', async () => {
      const entry: EmailQueueEntry = {
        storeId: 'store-1',
        emailType: 'shipping_update',
        recipient: 'customer@example.com',
        subject: 'Order Shipped',
        html: '<h1>Shipped</h1>',
        error: 'API error',
      };

      await queueFailedEmail(mockDb, entry);

      const insertCall = mockDbRun.mock.calls[0];
      // retry_count is hardcoded as 0 in the SQL VALUES clause, so we verify the SQL contains it
      expect(insertCall[0]).toContain(', 0, ?');
    });

    it('should include max_retries of 3 by default', async () => {
      const entry: EmailQueueEntry = {
        storeId: 'store-1',
        emailType: 'drop_launch',
        recipient: 'subscriber@example.com',
        subject: 'Drop Launch',
        html: '<h1>New Drop!</h1>',
        error: 'Connection refused',
      };

      await queueFailedEmail(mockDb, entry);

      const insertCall = mockDbRun.mock.calls[0];
      // params[7] is max_retries (after id, store_id, email_type, recipient, subject, html, metadata)
      // retry_count is hardcoded as 0 in SQL, so max_retries is at index 7
      expect(insertCall[1][7]).toBe(3);
    });

    it('should store metadata as JSON string', async () => {
      const entry: EmailQueueEntry = {
        storeId: 'store-1',
        emailType: 'order_confirmation',
        recipient: 'customer@example.com',
        subject: 'Order Confirmed',
        html: '<h1>Confirmed</h1>',
        metadata: { orderId: 'order-123', orderNumber: 'ORD-240118-ABCD' },
        error: 'Timeout',
      };

      await queueFailedEmail(mockDb, entry);

      const insertCall = mockDbRun.mock.calls[0];
      // params[6] is metadata
      expect(insertCall[1][6]).toBe(JSON.stringify(entry.metadata));
    });

    it('should store null for missing metadata', async () => {
      const entry: EmailQueueEntry = {
        storeId: 'store-1',
        emailType: 'shipping_update',
        recipient: 'customer@example.com',
        subject: 'Shipped',
        html: '<h1>Shipped</h1>',
        error: 'Error',
      };

      await queueFailedEmail(mockDb, entry);

      const insertCall = mockDbRun.mock.calls[0];
      expect(insertCall[1][6]).toBeNull();
    });

    it('should return error on database failure', async () => {
      mockDbRun.mockRejectedValueOnce(new Error('Database connection failed'));

      const entry: EmailQueueEntry = {
        storeId: 'store-1',
        emailType: 'order_confirmation',
        recipient: 'customer@example.com',
        subject: 'Order',
        html: '<h1>Order</h1>',
        error: 'Send failed',
      };

      const result = await queueFailedEmail(mockDb, entry);

      expect(result.queued).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should log queue event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const entry: EmailQueueEntry = {
        storeId: 'store-1',
        emailType: 'drop_launch',
        recipient: 'subscriber@test.com',
        subject: 'New Drop',
        html: '<h1>Drop</h1>',
        error: 'Error',
      };

      await queueFailedEmail(mockDb, entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL_QUEUE] Queued failed email for subscriber@test.com')
      );

      consoleSpy.mockRestore();
    });
  });

  // ============================================================
  // getEmailsReadyToRetry tests
  // ============================================================

  describe('getEmailsReadyToRetry', () => {
    it('should return emails ready for retry', async () => {
      const mockEmails: QueuedEmail[] = [
        {
          id: 'email-1',
          store_id: 'store-1',
          email_type: 'order_confirmation',
          recipient: 'test@example.com',
          subject: 'Test',
          html: '<h1>Test</h1>',
          retry_count: 0,
          max_retries: 3,
          next_retry_at: '2026-01-18T11:00:00.000Z',
          created_at: '2026-01-18T10:00:00.000Z',
          updated_at: '2026-01-18T10:00:00.000Z',
        },
      ];

      mockDbQuery.mockResolvedValueOnce(mockEmails);

      const result = await getEmailsReadyToRetry(mockDb);

      expect(result).toEqual(mockEmails);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM email_queue'),
        expect.any(Array)
      );
    });

    it('should respect batch limit', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      await getEmailsReadyToRetry(mockDb, 5);

      const queryCall = mockDbQuery.mock.calls[0];
      expect(queryCall[1][1]).toBe(5); // limit parameter
    });

    it('should use default limit of 10', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      await getEmailsReadyToRetry(mockDb);

      const queryCall = mockDbQuery.mock.calls[0];
      expect(queryCall[1][1]).toBe(10);
    });
  });

  // ============================================================
  // updateAfterRetry tests
  // ============================================================

  describe('updateAfterRetry', () => {
    it('should increment retry count', async () => {
      mockDbQuery.mockResolvedValueOnce([{ retry_count: 0, max_retries: 3 }]);

      await updateAfterRetry(mockDb, 'email-1', 'Network error');

      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE email_queue'),
        expect.arrayContaining([1]) // new retry_count = 0 + 1
      );
    });

    it('should return shouldMoveToDeadLetter=false when under max retries', async () => {
      mockDbQuery.mockResolvedValueOnce([{ retry_count: 1, max_retries: 3 }]);

      const result = await updateAfterRetry(mockDb, 'email-1', 'Error');

      expect(result.shouldMoveToDeadLetter).toBe(false);
    });

    it('should return shouldMoveToDeadLetter=true when max retries reached', async () => {
      mockDbQuery.mockResolvedValueOnce([{ retry_count: 2, max_retries: 3 }]);

      const result = await updateAfterRetry(mockDb, 'email-1', 'Error');

      expect(result.shouldMoveToDeadLetter).toBe(true);
    });

    it('should not update database when max retries reached', async () => {
      mockDbQuery.mockResolvedValueOnce([{ retry_count: 2, max_retries: 3 }]);

      await updateAfterRetry(mockDb, 'email-1', 'Error');

      // Should only call query (to get retry count), not run (to update)
      expect(mockDbQuery).toHaveBeenCalledTimes(1);
      expect(mockDbRun).not.toHaveBeenCalled();
    });

    it('should handle non-existent email gracefully', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      const result = await updateAfterRetry(mockDb, 'non-existent', 'Error');

      expect(result.shouldMoveToDeadLetter).toBe(false);
      expect(mockDbRun).not.toHaveBeenCalled();
    });

    it('should log retry attempt', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockDbQuery.mockResolvedValueOnce([{ retry_count: 0, max_retries: 3 }]);

      await updateAfterRetry(mockDb, 'email-1', 'Network timeout');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL_QUEUE] Retry 1/3 for email email-1')
      );

      consoleSpy.mockRestore();
    });
  });

  // ============================================================
  // moveToDeadLetter tests
  // ============================================================

  describe('moveToDeadLetter', () => {
    it('should move email to dead letter table', async () => {
      const mockEmail: QueuedEmail = {
        id: 'email-1',
        store_id: 'store-1',
        email_type: 'order_confirmation',
        recipient: 'test@example.com',
        subject: 'Order Confirmed',
        html: '<h1>Confirmed</h1>',
        metadata: '{"orderId": "order-1"}',
        retry_count: 2,
        max_retries: 3,
        last_error: 'API error',
        next_retry_at: '2026-01-18T12:00:00.000Z',
        created_at: '2026-01-18T10:00:00.000Z',
        updated_at: '2026-01-18T11:30:00.000Z',
      };

      mockDbQuery.mockResolvedValueOnce([mockEmail]);

      await moveToDeadLetter(mockDb, 'email-1');

      // Should insert into dead_letter
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_dead_letter'),
        expect.any(Array)
      );
      // Should delete from queue
      expect(mockDbRun).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM email_queue'), [
        'email-1',
      ]);
    });

    it('should include final retry count (original + 1)', async () => {
      const mockEmail: QueuedEmail = {
        id: 'email-1',
        store_id: 'store-1',
        email_type: 'shipping_update',
        recipient: 'test@example.com',
        subject: 'Shipped',
        html: '<h1>Shipped</h1>',
        retry_count: 2,
        max_retries: 3,
        last_error: 'Error',
        next_retry_at: '2026-01-18T12:00:00.000Z',
        created_at: '2026-01-18T10:00:00.000Z',
        updated_at: '2026-01-18T11:30:00.000Z',
      };

      mockDbQuery.mockResolvedValueOnce([mockEmail]);

      await moveToDeadLetter(mockDb, 'email-1');

      const insertCall = mockDbRun.mock.calls.find((call) =>
        call[0].includes('INSERT INTO email_dead_letter')
      );
      // retry_count should be 3 (2 + 1 for the final failed attempt)
      expect(insertCall[1][7]).toBe(3);
    });

    it('should handle non-existent email gracefully', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      await moveToDeadLetter(mockDb, 'non-existent');

      // Should not try to insert or delete
      expect(mockDbRun).not.toHaveBeenCalled();
    });

    it('should log dead letter event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockDbQuery.mockResolvedValueOnce([
        {
          id: 'email-1',
          store_id: 'store-1',
          email_type: 'drop_launch',
          recipient: 'test@example.com',
          subject: 'Drop',
          html: '<h1>Drop</h1>',
          retry_count: 2,
          max_retries: 3,
          last_error: 'Error',
          next_retry_at: '2026-01-18T12:00:00.000Z',
          created_at: '2026-01-18T10:00:00.000Z',
          updated_at: '2026-01-18T11:30:00.000Z',
        },
      ]);

      await moveToDeadLetter(mockDb, 'email-1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL_QUEUE] Moved email email-1 to dead letter after 3 attempts')
      );

      consoleSpy.mockRestore();
    });
  });

  // ============================================================
  // removeFromQueue tests
  // ============================================================

  describe('removeFromQueue', () => {
    it('should delete email from queue', async () => {
      await removeFromQueue(mockDb, 'email-1');

      expect(mockDbRun).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM email_queue'), [
        'email-1',
      ]);
    });

    it('should log removal event', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await removeFromQueue(mockDb, 'email-1');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL_QUEUE] Removed successfully sent email email-1')
      );

      consoleSpy.mockRestore();
    });
  });

  // ============================================================
  // getQueueStats tests
  // ============================================================

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockDbQuery
        .mockResolvedValueOnce([{ count: 5 }]) // pending
        .mockResolvedValueOnce([{ count: 2 }]); // dead letter

      const stats = await getQueueStats(mockDb);

      expect(stats.pending).toBe(5);
      expect(stats.deadLetter).toBe(2);
    });

    it('should filter by storeId if provided', async () => {
      mockDbQuery.mockResolvedValueOnce([{ count: 3 }]).mockResolvedValueOnce([{ count: 1 }]);

      await getQueueStats(mockDb, 'store-1');

      expect(mockDbQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE store_id = ?'), [
        'store-1',
      ]);
    });

    it('should return 0 for empty results', async () => {
      mockDbQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const stats = await getQueueStats(mockDb);

      expect(stats.pending).toBe(0);
      expect(stats.deadLetter).toBe(0);
    });
  });

  // ============================================================
  // processEmailQueue tests
  // ============================================================

  describe('processEmailQueue', () => {
    const mockEnv = { DB: {} } as any;

    it('should process queued emails', async () => {
      const mockEmails: QueuedEmail[] = [
        {
          id: 'email-1',
          store_id: 'store-1',
          email_type: 'order_confirmation',
          recipient: 'test@example.com',
          subject: 'Order Confirmed',
          html: '<h1>Confirmed</h1>',
          retry_count: 0,
          max_retries: 3,
          next_retry_at: '2026-01-18T11:00:00.000Z',
          created_at: '2026-01-18T10:00:00.000Z',
          updated_at: '2026-01-18T10:00:00.000Z',
        },
      ];

      mockDbQuery.mockResolvedValue(mockEmails);

      const mockSender = vi.fn().mockResolvedValue({ success: true });

      const result = await processEmailQueue(mockEnv, mockSender, 10);

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(mockSender).toHaveBeenCalledWith(
        'test@example.com',
        'Order Confirmed',
        '<h1>Confirmed</h1>'
      );
    });

    it('should remove email from queue on success', async () => {
      const mockEmails: QueuedEmail[] = [
        {
          id: 'email-success',
          store_id: 'store-1',
          email_type: 'shipping_update',
          recipient: 'test@example.com',
          subject: 'Shipped',
          html: '<h1>Shipped</h1>',
          retry_count: 0,
          max_retries: 3,
          next_retry_at: '2026-01-18T11:00:00.000Z',
          created_at: '2026-01-18T10:00:00.000Z',
          updated_at: '2026-01-18T10:00:00.000Z',
        },
      ];

      mockDbQuery.mockResolvedValue(mockEmails);

      const mockSender = vi.fn().mockResolvedValue({ success: true });

      await processEmailQueue(mockEnv, mockSender);

      expect(mockDbRun).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM email_queue'), [
        'email-success',
      ]);
    });

    it('should update retry on failure', async () => {
      const mockEmails: QueuedEmail[] = [
        {
          id: 'email-fail',
          store_id: 'store-1',
          email_type: 'drop_launch',
          recipient: 'test@example.com',
          subject: 'New Drop',
          html: '<h1>Drop</h1>',
          retry_count: 0,
          max_retries: 3,
          next_retry_at: '2026-01-18T11:00:00.000Z',
          created_at: '2026-01-18T10:00:00.000Z',
          updated_at: '2026-01-18T10:00:00.000Z',
        },
      ];

      // First call is getEmailsReadyToRetry, second is updateAfterRetry query
      mockDbQuery
        .mockResolvedValueOnce(mockEmails)
        .mockResolvedValueOnce([{ retry_count: 0, max_retries: 3 }]);

      const mockSender = vi.fn().mockResolvedValue({ success: false, error: 'API error' });

      const result = await processEmailQueue(mockEnv, mockSender);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.succeeded).toBe(0);
    });

    it('should move to dead letter after max retries', async () => {
      const mockEmails: QueuedEmail[] = [
        {
          id: 'email-dead',
          store_id: 'store-1',
          email_type: 'order_confirmation',
          recipient: 'test@example.com',
          subject: 'Order',
          html: '<h1>Order</h1>',
          retry_count: 2,
          max_retries: 3,
          last_error: 'Previous error',
          next_retry_at: '2026-01-18T11:00:00.000Z',
          created_at: '2026-01-18T10:00:00.000Z',
          updated_at: '2026-01-18T11:30:00.000Z',
        },
      ];

      // getEmailsReadyToRetry returns email
      mockDbQuery.mockResolvedValueOnce(mockEmails);
      // updateAfterRetry gets current retry_count
      mockDbQuery.mockResolvedValueOnce([{ retry_count: 2, max_retries: 3 }]);
      // moveToDeadLetter gets full email
      mockDbQuery.mockResolvedValueOnce(mockEmails);

      const mockSender = vi.fn().mockResolvedValue({ success: false, error: 'Final error' });

      const result = await processEmailQueue(mockEnv, mockSender);

      expect(result.movedToDeadLetter).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should return early if no emails to process', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      const mockSender = vi.fn();

      const result = await processEmailQueue(mockEnv, mockSender);

      expect(result.processed).toBe(0);
      expect(mockSender).not.toHaveBeenCalled();
    });

    it('should respect batch size limit', async () => {
      mockDbQuery.mockResolvedValueOnce([]);

      const mockSender = vi.fn();

      await processEmailQueue(mockEnv, mockSender, 5);

      expect(mockDbQuery).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([5]));
    });

    it('should handle sender exceptions', async () => {
      const mockEmails: QueuedEmail[] = [
        {
          id: 'email-exception',
          store_id: 'store-1',
          email_type: 'shipping_update',
          recipient: 'test@example.com',
          subject: 'Shipped',
          html: '<h1>Shipped</h1>',
          retry_count: 0,
          max_retries: 3,
          next_retry_at: '2026-01-18T11:00:00.000Z',
          created_at: '2026-01-18T10:00:00.000Z',
          updated_at: '2026-01-18T10:00:00.000Z',
        },
      ];

      mockDbQuery
        .mockResolvedValueOnce(mockEmails)
        .mockResolvedValueOnce([{ retry_count: 0, max_retries: 3 }]);

      const mockSender = vi.fn().mockRejectedValue(new Error('Network timeout'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await processEmailQueue(mockEnv, mockSender);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log processing summary', async () => {
      const mockEmails: QueuedEmail[] = [
        {
          id: 'email-1',
          store_id: 'store-1',
          email_type: 'order_confirmation',
          recipient: 'a@example.com',
          subject: 'Order 1',
          html: '<h1>Order 1</h1>',
          retry_count: 0,
          max_retries: 3,
          next_retry_at: '2026-01-18T11:00:00.000Z',
          created_at: '2026-01-18T10:00:00.000Z',
          updated_at: '2026-01-18T10:00:00.000Z',
        },
      ];

      mockDbQuery.mockResolvedValue(mockEmails);

      const mockSender = vi.fn().mockResolvedValue({ success: true });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await processEmailQueue(mockEnv, mockSender);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL_QUEUE] Processing 1 queued emails')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EMAIL_QUEUE] Processed 1:')
      );

      consoleSpy.mockRestore();
    });
  });
});
