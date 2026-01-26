import { Test, TestingModule } from '@nestjs/testing';
import { AlchemyTransactionService } from './alchemy-transaction.service';
import { AlchemyWalletGenerationService } from '../wallets/alchemy-wallet-generation.service';
import { AlchemyConfigService } from '../config/alchemy-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AlchemyTransactionState,
  AlchemyTransactionType,
} from '@prisma/client';

// Mock viem functions
jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    readContract: jest.fn(),
    waitForTransactionReceipt: jest.fn().mockResolvedValue({
      status: 'success',
      blockNumber: BigInt(12345),
      transactionHash: '0xmockhash',
    }),
  })),
  createWalletClient: jest.fn(() => ({
    writeContract: jest.fn(),
  })),
  http: jest.fn(),
  parseUnits: jest.fn((amount: string) => BigInt(amount) * BigInt(1000000)),
  formatUnits: jest.fn((amount: bigint) =>
    (Number(amount) / 1000000).toString(),
  ),
}));

jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn(() => ({
    address: '0x1234567890abcdef1234567890abcdef12345678',
  })),
}));

describe('AlchemyTransactionService', () => {
  let service: AlchemyTransactionService;
  let walletService: AlchemyWalletGenerationService;
  let configService: AlchemyConfigService;
  let prismaService: PrismaService;

  const mockUserId = 'user-123';
  const mockWalletId = 'wallet-456';
  const mockWallet = {
    id: mockWalletId,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    blockchain: 'BASE',
    network: 'sepolia',
  };

  const mockNetworkConfig = {
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/test',
    blockchain: 'BASE',
    network: 'sepolia',
    chainId: 84532,
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdtAddress: null,
    blockExplorerUrl: 'https://sepolia.basescan.org',
  };

  const mockTransaction = {
    id: 'tx-789',
    reference: 'ALY-12345-abc',
    userId: mockUserId,
    walletId: mockWalletId,
    type: AlchemyTransactionType.SEND,
    state: AlchemyTransactionState.PENDING,
    sourceAddress: mockWallet.address,
    destinationAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    tokenAddress: mockNetworkConfig.usdcAddress,
    blockchain: 'BASE',
    network: 'sepolia',
    amount: '10000000', // 10 USDC in smallest unit
    amountFormatted: '10 USDC',
    transactionHash: null,
    blockNumber: null,
    blockHash: null,
    gasUsed: null,
    errorMessage: null,
    confirmations: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    failedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlchemyTransactionService,
        {
          provide: AlchemyWalletGenerationService,
          useValue: {
            getWallet: jest.fn().mockResolvedValue(mockWallet),
            getDecryptedPrivateKey: jest
              .fn()
              .mockResolvedValue(
                '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              ),
          },
        },
        {
          provide: AlchemyConfigService,
          useValue: {
            getNetworkConfig: jest.fn().mockReturnValue(mockNetworkConfig),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            alchemyTransaction: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AlchemyTransactionService>(AlchemyTransactionService);
    walletService = module.get<AlchemyWalletGenerationService>(
      AlchemyWalletGenerationService,
    );
    configService = module.get<AlchemyConfigService>(AlchemyConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendToken', () => {
    it('should validate destination address format', async () => {
      await expect(
        service.sendToken({
          userId: mockUserId,
          walletId: mockWalletId,
          destinationAddress: 'invalid-address',
          amount: '10',
          tokenType: 'USDC',
        }),
      ).rejects.toThrow('Invalid destination address format');
    });

    it('should throw error if token not supported on network', async () => {
      await expect(
        service.sendToken({
          userId: mockUserId,
          walletId: mockWalletId,
          destinationAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          amount: '10',
          tokenType: 'USDT', // Not supported on mock network
        }),
      ).rejects.toThrow('USDT not supported');
    });

    it('should verify wallet ownership', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'create')
        .mockResolvedValue(mockTransaction as any);

      await service
        .sendToken({
          userId: mockUserId,
          walletId: mockWalletId,
          destinationAddress: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
          amount: '10',
          tokenType: 'USDC',
        })
        .catch(() => {
          // Expected to fail in test due to mocked viem
        });

      // Verify getWallet was called with correct parameters
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletService.getWallet).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
      );
    });

    it('should decrypt private key for signing', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'create')
        .mockResolvedValue(mockTransaction as any);

      await service
        .sendToken({
          userId: mockUserId,
          walletId: mockWalletId,
          destinationAddress: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
          amount: '10',
          tokenType: 'USDC',
        })
        .catch(() => {
          // Expected to fail in test due to mocked viem
        });

      // Verify private key was decrypted
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletService.getDecryptedPrivateKey).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
      );
    });

    it('should create transaction record with PENDING state', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'create')
        .mockResolvedValue(mockTransaction as any);

      await service
        .sendToken({
          userId: mockUserId,
          walletId: mockWalletId,
          destinationAddress: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
          amount: '10',
          tokenType: 'USDC',
        })
        .catch(() => {
          // Expected to fail in test due to mocked viem
        });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.alchemyTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          walletId: mockWalletId,
          type: AlchemyTransactionType.SEND,
          state: AlchemyTransactionState.PENDING,
          tokenAddress: mockNetworkConfig.usdcAddress.toLowerCase(),
        }),
      });
    });

    it('should normalize destination address to lowercase', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'create')
        .mockResolvedValue(mockTransaction as any);

      await service
        .sendToken({
          userId: mockUserId,
          walletId: mockWalletId,
          destinationAddress: '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD', // Uppercase
          amount: '10',
          tokenType: 'USDC',
        })
        .catch(() => {
          // Expected to fail
        });

      const createCall = (prismaService.alchemyTransaction.create as jest.Mock)
        .mock.calls[0][0];

      expect(createCall.data.destinationAddress).toBe(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // Lowercase
      );
    });
  });

  describe('getTokenBalance', () => {
    it('should get USDC balance for a wallet', async () => {
      const mockBalance = BigInt('10000000'); // 10 USDC

      const mockPublicClient = {
        readContract: jest.fn().mockResolvedValue(mockBalance),
      };

      const { createPublicClient } = require('viem');
      (createPublicClient as jest.Mock).mockReturnValue(mockPublicClient);

      const result = await service.getTokenBalance({
        userId: mockUserId,
        walletId: mockWalletId,
        tokenType: 'USDC',
      });

      expect(result).toBeDefined();
      expect(result.walletId).toBe(mockWalletId);
      expect(result.tokenType).toBe('USDC');
      expect(result.tokenAddress).toBe(mockNetworkConfig.usdcAddress);

      // Verify wallet ownership was checked
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletService.getWallet).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
      );

      // Verify contract read was called
      expect(mockPublicClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: mockNetworkConfig.usdcAddress,
          functionName: 'balanceOf',
        }),
      );
    });

    it('should throw error if token not supported', async () => {
      await expect(
        service.getTokenBalance({
          userId: mockUserId,
          walletId: mockWalletId,
          tokenType: 'USDT', // Not supported on mock network
        }),
      ).rejects.toThrow('USDT not supported');
    });
  });

  describe('getTransactionHistory', () => {
    it('should get transaction history for a wallet', async () => {
      const mockTxs = [mockTransaction];

      jest
        .spyOn(prismaService.alchemyTransaction, 'findMany')
        .mockResolvedValue(mockTxs as any);

      const result = await service.getTransactionHistory({
        userId: mockUserId,
        walletId: mockWalletId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockTransaction.id);
      expect(result[0].reference).toBe(mockTransaction.reference);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.alchemyTransaction.findMany).toHaveBeenCalledWith({
        where: { walletId: mockWalletId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'findMany')
        .mockResolvedValue([]);

      await service.getTransactionHistory({
        userId: mockUserId,
        walletId: mockWalletId,
        limit: 10,
        offset: 20,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(prismaService.alchemyTransaction.findMany).toHaveBeenCalledWith({
        where: { walletId: mockWalletId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });

    it('should verify wallet ownership', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'findMany')
        .mockResolvedValue([]);

      await service.getTransactionHistory({
        userId: mockUserId,
        walletId: mockWalletId,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletService.getWallet).toHaveBeenCalledWith(
        mockWalletId,
        mockUserId,
      );
    });
  });

  describe('getTransactionByReference', () => {
    it('should get transaction by reference', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'findUnique')
        .mockResolvedValue(mockTransaction as any);

      const result = await service.getTransactionByReference(
        mockUserId,
        'ALY-12345-abc',
      );

      expect(result).toBeDefined();
      expect(result.reference).toBe('ALY-12345-abc');
    });

    it('should throw error if transaction not found', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.getTransactionByReference(mockUserId, 'invalid-ref'),
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw error if user does not own transaction', async () => {
      jest
        .spyOn(prismaService.alchemyTransaction, 'findUnique')
        .mockResolvedValue({
          ...mockTransaction,
          userId: 'different-user',
        } as any);

      await expect(
        service.getTransactionByReference(mockUserId, 'ALY-12345-abc'),
      ).rejects.toThrow('Access denied');
    });
  });
});
