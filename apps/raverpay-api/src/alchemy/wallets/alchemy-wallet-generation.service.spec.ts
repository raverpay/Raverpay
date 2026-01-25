import { Test, TestingModule } from '@nestjs/testing';
import { AlchemyWalletGenerationService } from './alchemy-wallet-generation.service';
import { AlchemyKeyEncryptionService } from '../encryption/alchemy-key-encryption.service';
import { AlchemyConfigService } from '../config/alchemy-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AlchemyAccountType, AlchemyWalletState } from '@prisma/client';

describe('AlchemyWalletGenerationService', () => {
  let service: AlchemyWalletGenerationService;
  let encryptionService: AlchemyKeyEncryptionService;
  let configService: AlchemyConfigService;
  let prismaService: PrismaService;

  // Mock data
  const mockUserId = 'user-123';
  const mockWalletId = 'wallet-456';
  const mockAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const mockPrivateKey =
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const mockEncryptedKey = 'iv:tag:encrypted';

  const mockWallet = {
    id: mockWalletId,
    userId: mockUserId,
    address: mockAddress,
    encryptedPrivateKey: mockEncryptedKey,
    blockchain: 'BASE',
    network: 'sepolia',
    accountType: AlchemyAccountType.EOA,
    state: AlchemyWalletState.ACTIVE,
    name: 'BASE sepolia Wallet',
    isGasSponsored: false,
    gasPolicyId: null,
    alchemyAppId: null,
    webhookId: null,
    lastKeyRotation: null,
    keyRotationCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlchemyWalletGenerationService,
        {
          provide: AlchemyKeyEncryptionService,
          useValue: {
            encryptPrivateKey: jest.fn().mockReturnValue(mockEncryptedKey),
            decryptPrivateKey: jest.fn().mockReturnValue(mockPrivateKey),
          },
        },
        {
          provide: AlchemyConfigService,
          useValue: {
            isValidNetwork: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            alchemyWallet: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AlchemyWalletGenerationService>(
      AlchemyWalletGenerationService,
    );
    encryptionService = module.get<AlchemyKeyEncryptionService>(
      AlchemyKeyEncryptionService,
    );
    configService = module.get<AlchemyConfigService>(AlchemyConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEOAWallet', () => {
    it('should generate a new EOA wallet successfully', async () => {
      // Mock: No existing wallet
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(null);

      // Mock: Wallet creation succeeds
      jest
        .spyOn(prismaService.alchemyWallet, 'create')
        .mockResolvedValue(mockWallet);

      const result = await service.generateEOAWallet({
        userId: mockUserId,
        blockchain: 'BASE',
        network: 'sepolia',
      });

      expect(result).toBeDefined();
      expect(result.address).toBeDefined();
      expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid Ethereum address
      expect(result.blockchain).toBe('BASE');
      expect(result.network).toBe('sepolia');
      expect(result.accountType).toBe(AlchemyAccountType.EOA);
      expect(result.isGasSponsored).toBe(false); // EOA doesn't get gas sponsorship

      // Should NOT include private key in response
      expect(result).not.toHaveProperty('privateKey');
      expect(result).not.toHaveProperty('encryptedPrivateKey');

      // Verify encryption was called
      expect(encryptionService.encryptPrivateKey).toHaveBeenCalledWith(
        expect.any(String), // private key
        mockUserId,
      );

      // Verify wallet was created in database
      expect(prismaService.alchemyWallet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          blockchain: 'BASE',
          network: 'sepolia',
          accountType: AlchemyAccountType.EOA,
          state: AlchemyWalletState.ACTIVE,
          isGasSponsored: false,
        }),
      });
    });

    it('should generate wallet with custom name', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(null);

      jest
        .spyOn(prismaService.alchemyWallet, 'create')
        .mockResolvedValue({
          ...mockWallet,
          name: 'My Custom Wallet',
        });

      const result = await service.generateEOAWallet({
        userId: mockUserId,
        blockchain: 'BASE',
        network: 'sepolia',
        name: 'My Custom Wallet',
      });

      expect(result.name).toBe('My Custom Wallet');

      expect(prismaService.alchemyWallet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'My Custom Wallet',
        }),
      });
    });

    it('should throw error if network is invalid', async () => {
      jest.spyOn(configService, 'isValidNetwork').mockReturnValue(false);

      await expect(
        service.generateEOAWallet({
          userId: mockUserId,
          blockchain: 'INVALID',
          network: 'invalid',
        }),
      ).rejects.toThrow(/Invalid network/);
    });

    it('should throw error if user already has wallet on this network', async () => {
      // Mock: Existing wallet found
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(mockWallet);

      await expect(
        service.generateEOAWallet({
          userId: mockUserId,
          blockchain: 'BASE',
          network: 'sepolia',
        }),
      ).rejects.toThrow(/already has a wallet/);
    });

    it('should normalize address to lowercase', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(null);

      jest
        .spyOn(prismaService.alchemyWallet, 'create')
        .mockImplementation(async (args: any) => ({
          ...mockWallet,
          address: args.data.address,
        }));

      await service.generateEOAWallet({
        userId: mockUserId,
        blockchain: 'BASE',
        network: 'sepolia',
      });

      const createCall = (prismaService.alchemyWallet.create as jest.Mock).mock
        .calls[0][0];
      const addressArg = createCall.data.address;

      // Address should be lowercase
      expect(addressArg).toBe(addressArg.toLowerCase());
    });
  });

  describe('getWallet', () => {
    it('should get wallet by ID', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(mockWallet);

      const result = await service.getWallet(mockWalletId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockWalletId);
      expect(result.address).toBe(mockAddress);

      // Should NOT include private key
      expect(result).not.toHaveProperty('encryptedPrivateKey');
    });

    it('should throw error if wallet not found', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.getWallet(mockWalletId, mockUserId)).rejects.toThrow(
        'Wallet not found',
      );
    });

    it('should throw error if user does not own wallet', async () => {
      jest.spyOn(prismaService.alchemyWallet, 'findUnique').mockResolvedValue({
        ...mockWallet,
        userId: 'different-user',
      });

      await expect(
        service.getWallet(mockWalletId, mockUserId),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getUserWallets', () => {
    it('should get all wallets for a user', async () => {
      const mockWallets = [
        mockWallet,
        { ...mockWallet, id: 'wallet-2', network: 'mainnet' },
      ];

      jest
        .spyOn(prismaService.alchemyWallet, 'findMany')
        .mockResolvedValue(mockWallets);

      const result = await service.getUserWallets(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockWallet.id);
      expect(result[1].id).toBe('wallet-2');

      // Should NOT include private keys
      result.forEach((wallet) => {
        expect(wallet).not.toHaveProperty('encryptedPrivateKey');
      });
    });

    it('should return empty array if user has no wallets', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findMany')
        .mockResolvedValue([]);

      const result = await service.getUserWallets(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getWalletByNetwork', () => {
    it('should get wallet by blockchain and network', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(mockWallet);

      const result = await service.getWalletByNetwork(
        mockUserId,
        'BASE',
        'sepolia',
      );

      expect(result).toBeDefined();
      expect(result?.blockchain).toBe('BASE');
      expect(result?.network).toBe('sepolia');
    });

    it('should return null if wallet not found', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(null);

      const result = await service.getWalletByNetwork(
        mockUserId,
        'BASE',
        'mainnet',
      );

      expect(result).toBeNull();
    });
  });

  describe('getDecryptedPrivateKey', () => {
    it('should decrypt private key for valid wallet owner', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(mockWallet);

      const result = await service.getDecryptedPrivateKey(
        mockWalletId,
        mockUserId,
      );

      expect(result).toBe(mockPrivateKey);

      // Verify decryption was called
      expect(encryptionService.decryptPrivateKey).toHaveBeenCalledWith(
        mockEncryptedKey,
        mockUserId,
      );
    });

    it('should throw error if wallet not found', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(null);

      await expect(
        service.getDecryptedPrivateKey(mockWalletId, mockUserId),
      ).rejects.toThrow('Wallet not found');
    });

    it('should throw error if user does not own wallet', async () => {
      jest.spyOn(prismaService.alchemyWallet, 'findUnique').mockResolvedValue({
        ...mockWallet,
        userId: 'different-user',
      });

      await expect(
        service.getDecryptedPrivateKey(mockWalletId, mockUserId),
      ).rejects.toThrow('Access denied');
    });

    it('should throw error if wallet is not ACTIVE', async () => {
      jest.spyOn(prismaService.alchemyWallet, 'findUnique').mockResolvedValue({
        ...mockWallet,
        state: AlchemyWalletState.LOCKED,
      });

      await expect(
        service.getDecryptedPrivateKey(mockWalletId, mockUserId),
      ).rejects.toThrow(/LOCKED/);
    });
  });

  describe('updateWalletName', () => {
    it('should update wallet name', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(mockWallet);

      jest.spyOn(prismaService.alchemyWallet, 'update').mockResolvedValue({
        ...mockWallet,
        name: 'New Name',
      });

      const result = await service.updateWalletName(
        mockWalletId,
        mockUserId,
        'New Name',
      );

      expect(result.name).toBe('New Name');

      expect(prismaService.alchemyWallet.update).toHaveBeenCalledWith({
        where: { id: mockWalletId },
        data: { name: 'New Name' },
      });
    });
  });

  describe('deactivateWallet', () => {
    it('should deactivate wallet', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(mockWallet);

      jest.spyOn(prismaService.alchemyWallet, 'update').mockResolvedValue({
        ...mockWallet,
        state: AlchemyWalletState.INACTIVE,
      });

      const result = await service.deactivateWallet(mockWalletId, mockUserId);

      expect(result.state).toBe(AlchemyWalletState.INACTIVE);

      expect(prismaService.alchemyWallet.update).toHaveBeenCalledWith({
        where: { id: mockWalletId },
        data: { state: AlchemyWalletState.INACTIVE },
      });
    });
  });

  describe('lockWallet', () => {
    it('should lock wallet', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(mockWallet);

      jest.spyOn(prismaService.alchemyWallet, 'update').mockResolvedValue({
        ...mockWallet,
        state: AlchemyWalletState.LOCKED,
      });

      const result = await service.lockWallet(mockWalletId, mockUserId);

      expect(result.state).toBe(AlchemyWalletState.LOCKED);
    });
  });

  describe('markWalletCompromised', () => {
    it('should mark wallet as compromised', async () => {
      jest
        .spyOn(prismaService.alchemyWallet, 'findUnique')
        .mockResolvedValue(mockWallet);

      jest.spyOn(prismaService.alchemyWallet, 'update').mockResolvedValue({
        ...mockWallet,
        state: AlchemyWalletState.COMPROMISED,
      });

      const result = await service.markWalletCompromised(
        mockWalletId,
        mockUserId,
      );

      expect(result.state).toBe(AlchemyWalletState.COMPROMISED);
    });
  });
});
