import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlchemyWebhookService } from './alchemy-webhook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AlchemyTransactionState } from '@prisma/client';
import * as crypto from 'crypto';

describe('AlchemyWebhookService', () => {
  let service: AlchemyWebhookService;
  let configService: ConfigService;
  let prismaService: PrismaService;

  const mockSigningSecret = 'test-signing-secret-key';
  const mockTransaction = {
    id: 'tx-123',
    reference: 'ALY-123-abc',
    userId: 'user-123',
    walletId: 'wallet-456',
    transactionHash: '0xabcdef123456',
    state: AlchemyTransactionState.SUBMITTED,
    confirmations: 0,
    gasUsed: '21000',
    sourceAddress: '0x1234567890abcdef1234567890abcdef12345678',
    blockchain: 'BASE',
    network: 'sepolia',
    completedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlchemyWebhookService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ALCHEMY_WEBHOOK_SIGNING_SECRET') {
                return mockSigningSecret;
              }
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            alchemyTransaction: {
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            alchemyGasSpending: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AlchemyWebhookService>(AlchemyWebhookService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifySignature', () => {
    it('should verify valid HMAC signature', () => {
      const body = JSON.stringify({ test: 'data' });

      // Generate valid signature
      const hmac = crypto.createHmac('sha256', mockSigningSecret);
      hmac.update(body);
      const signature = hmac.digest('hex');

      const result = service.verifySignature(signature, body);

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const body = JSON.stringify({ test: 'data' });
      const invalidSignature = 'invalid-signature-here';

      const result = service.verifySignature(invalidSignature, body);

      expect(result).toBe(false);
    });

    it('should return true if signing secret not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const result = service.verifySignature('any-signature', 'any-body');

      expect(result).toBe(true);
    });

    it('should handle errors gracefully', () => {
      // Signature with different length will cause timing comparison to fail
      const result = service.verifySignature('short', 'body');

      expect(result).toBe(false);
    });
  });

  describe('processAddressActivity', () => {
    const mockPayload = {
      id: 'webhook-123',
      type: 'ADDRESS_ACTIVITY',
      event: {
        network: 'BASE_SEPOLIA',
        activity: [
          {
            fromAddress: '0x1234567890abcdef1234567890abcdef12345678',
            toAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            blockNum: '12345',
            hash: '0xabcdef123456',
            category: 'token',
          },
        ],
      },
    };

    it('should process address activity webhook', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'findUnique')
        .mockResolvedValue(mockTransaction as any);

      jest.spyOn(prismaService.alchemyTransaction, 'update').mockResolvedValue({
        ...mockTransaction,
        confirmations: 1,
        state: AlchemyTransactionState.CONFIRMED,
      } as any);

      await service.processAddressActivity(mockPayload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.alchemyTransaction.findUnique).toHaveBeenCalledWith({
        where: { transactionHash: '0xabcdef123456' },
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.alchemyTransaction.update).toHaveBeenCalled();
    });

    it('should handle missing activity gracefully', async () => {
      const invalidPayload = { id: 'webhook-123', event: {} };

      await expect(
        service.processAddressActivity(invalidPayload),
      ).resolves.not.toThrow();
    });

    it('should handle transaction not found', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'findUnique')
        .mockResolvedValue(null as any);

      await expect(
        service.processAddressActivity(mockPayload),
      ).resolves.not.toThrow();
    });

    it('should update transaction state based on confirmations', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'findUnique')
        .mockResolvedValue(mockTransaction as any);

      jest.spyOn(prismaService.alchemyTransaction, 'update').mockResolvedValue({
        ...mockTransaction,
        confirmations: 1,
      } as any);

      await service.processAddressActivity(mockPayload);

      const updateCall = (prismaService.alchemyTransaction.update as jest.Mock)
        .mock.calls[0][0];

      expect(updateCall.data.confirmations).toBe(1);
      expect(updateCall.data.state).toBe(AlchemyTransactionState.CONFIRMED);
    });

    it('should mark as COMPLETED after 3 confirmations', async () => {
      const confirmedTx = {
        ...mockTransaction,
        confirmations: 2,
        state: AlchemyTransactionState.CONFIRMED,
      };

      jest
        .spyOn(prismaService.alchemyTransaction, 'findUnique')
        .mockResolvedValue(confirmedTx as any);

      jest.spyOn(prismaService.alchemyTransaction, 'update').mockResolvedValue({
        ...confirmedTx,
        confirmations: 3,
        state: AlchemyTransactionState.COMPLETED,
      } as any);

      await service.processAddressActivity(mockPayload);

      const updateCall = (prismaService.alchemyTransaction.update as jest.Mock)
        .mock.calls[0][0];

      expect(updateCall.data.confirmations).toBe(3);
      expect(updateCall.data.state).toBe(AlchemyTransactionState.COMPLETED);
      expect(updateCall.data.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('getWebhookStats', () => {
    it('should return webhook statistics', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'count')
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(85) // completed
        .mockResolvedValueOnce(5); // failed

      const stats = await service.getWebhookStats();

      expect(stats.totalTransactions).toBe(100);
      expect(stats.pending).toBe(10);
      expect(stats.completed).toBe(85);
      expect(stats.failed).toBe(5);
      expect(stats.successRate).toBe('85.00');
    });

    it('should handle zero transactions', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'count')
        .mockResolvedValue(0);

      const stats = await service.getWebhookStats();

      expect(stats.totalTransactions).toBe(0);
      expect(stats.successRate).toBe('0');
    });
  });
});
