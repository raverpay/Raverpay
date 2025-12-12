import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

describe('WalletController', () => {
  let controller: WalletController;

  // Mock WalletService
  const mockWalletService = {
    getWalletBalance: jest.fn(),
    getTransactionHistory: jest.fn(),
    getWalletLimits: jest.fn(),
    lockWallet: jest.fn(),
    unlockWallet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have WalletService injected', () => {
    expect(controller['walletService']).toBeDefined();
  });
});
