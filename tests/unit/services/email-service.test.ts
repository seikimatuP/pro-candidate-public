import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { EmailService } from '../../../pro-candidate-aws/lambda/email-service';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { log } from '../../../pro-candidate-aws/lambda/logger';

// Mock logger
vi.mock('../../../pro-candidate-aws/lambda/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EmailService', () => {
  let emailService: EmailService;
  const originalEnv = process.env;

  // Simple fake client
  const mockSend = vi.fn();
  const mockSESClient = {
    send: mockSend,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.SENDER_EMAIL = 'sender@example.com';
    process.env.EMAIL_TO = 'recipient@example.com';

    // Mock successful email send
    mockSend.mockResolvedValue({ MessageId: 'test-message-id' });

    // Inject fake client
    emailService = new EmailService(mockSESClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sendScrapingCompletionEmailWithNewPlayers', () => {
    const mockResults = {
      type: 'highschool',
      year: 2024,
      count: 10,
      success: true,
      environment: 'dev',
      timestamp: '2024-10-01T10:00:00Z',
      results: [],
    };

    it('should send email with correct parameters on success', async () => {
      const result = await emailService.sendScrapingCompletionEmailWithNewPlayers(mockResults, []);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockSend).toHaveBeenCalledTimes(1);

      const command = mockSend.mock.calls[0][0] as SendEmailCommand;
      // AWS SDK v3 commands have input property
      const input = command.input;

      expect(input.Source).toBe('sender@example.com');
      expect(input.Destination?.ToAddresses).toContain('recipient@example.com');
      expect(input.Message?.Subject?.Data).toContain('プロ野球志望届スクレイピング完了');
    });

    it('should include new players info in subject and body', async () => {
      const newPlayers = [
        { name: 'Player 1', school: 'School A', type: 'highschool' },
        { name: 'Player 2', school: 'University B', type: 'university' },
      ];

      await emailService.sendScrapingCompletionEmailWithNewPlayers(mockResults, newPlayers);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0] as SendEmailCommand;
      const input = command.input;

      expect(input.Message?.Subject?.Data).toContain('【新規選手あり】');
      expect(input.Message?.Body?.Html?.Data).toContain('新規提出者: 2名');
      expect(input.Message?.Body?.Text?.Data).toContain('新規選手（前日比）: 2名');
    });

    it('should handle no new players correctly', async () => {
      await emailService.sendScrapingCompletionEmailWithNewPlayers(mockResults, []);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0] as SendEmailCommand;
      const input = command.input;

      expect(input.Message?.Subject?.Data).not.toContain('【新規選手あり】');
      expect(input.Message?.Body?.Html?.Data).toContain('新規提出者はありません');
      expect(input.Message?.Body?.Text?.Data).toContain('新規選手: なし');
    });

    it('should handle SES errors gracefully', async () => {
      mockSend.mockRejectedValue(new Error('SES Error'));

      const result = await emailService.sendScrapingCompletionEmailWithNewPlayers(mockResults, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SES Error');
    });

    it('should use correct dashboard URL for prod environment', async () => {
      const prodResults = { ...mockResults, environment: 'prod' };

      await emailService.sendScrapingCompletionEmailWithNewPlayers(prodResults, []);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0] as SendEmailCommand;
      const input = command.input;

      expect(input.Message?.Body?.Html?.Data).toContain('https://dh2yk8y9mj9wl.cloudfront.net/');
    });

    it('should use correct dashboard URL for dev environment', async () => {
      const devResults = { ...mockResults, environment: 'dev' };

      await emailService.sendScrapingCompletionEmailWithNewPlayers(devResults, []);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0] as SendEmailCommand;
      const input = command.input;

      expect(input.Message?.Body?.Html?.Data).toContain('https://d3brmn978dqs63.cloudfront.net/');
    });
  });
});
