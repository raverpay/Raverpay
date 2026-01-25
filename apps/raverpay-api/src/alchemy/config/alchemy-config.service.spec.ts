import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlchemyConfigService } from './alchemy-config.service';

describe('AlchemyConfigService', () => {
  let service: AlchemyConfigService;
  let configService: ConfigService;

  // Mock environment variables
  const mockEnvVars = {
    ALCHEMY_DEV_API_KEY: 'test-api-key',
    ALCHEMY_DEV_BASE_SEPOLIA_RPC: 'https://base-sepolia.g.alchemy.com/v2/test',
    ALCHEMY_DEV_POLYGON_AMOY_RPC: 'https://polygon-amoy.g.alchemy.com/v2/test',
    ALCHEMY_DEV_ARBITRUM_SEPOLIA_RPC:
      'https://arb-sepolia.g.alchemy.com/v2/test',
    ALCHEMY_DEV_GAS_POLICY_ID: 'test-policy-id',
    ALCHEMY_WEBHOOK_SIGNING_SECRET: 'test-webhook-secret',
    NODE_ENV: 'development',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlchemyConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockEnvVars[key]),
          },
        },
      ],
    }).compile();

    service = module.get<AlchemyConfigService>(AlchemyConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRpcUrl', () => {
    it('should return RPC URL for Base Sepolia', () => {
      const rpcUrl = service.getRpcUrl('BASE', 'sepolia');
      expect(rpcUrl).toBe('https://base-sepolia.g.alchemy.com/v2/test');
    });

    it('should return RPC URL for Polygon Amoy', () => {
      const rpcUrl = service.getRpcUrl('POLYGON', 'amoy');
      expect(rpcUrl).toBe('https://polygon-amoy.g.alchemy.com/v2/test');
    });

    it('should return RPC URL for Arbitrum Sepolia', () => {
      const rpcUrl = service.getRpcUrl('ARBITRUM', 'sepolia');
      expect(rpcUrl).toBe('https://arb-sepolia.g.alchemy.com/v2/test');
    });

    it('should throw error if RPC URL is not configured', () => {
      expect(() => service.getRpcUrl('BASE', 'mainnet')).toThrow(
        /RPC URL not configured/,
      );
    });
  });

  describe('getApiKey', () => {
    it('should return dev API key by default', () => {
      const apiKey = service.getApiKey();
      expect(apiKey).toBe('test-api-key');
    });

    it('should return dev API key explicitly', () => {
      const apiKey = service.getApiKey('dev');
      expect(apiKey).toBe('test-api-key');
    });

    it('should throw error if API key is not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      expect(() => service.getApiKey()).toThrow(
        /Alchemy API key not configured/,
      );
    });
  });

  describe('getGasPolicyId', () => {
    it('should return dev gas policy ID by default', () => {
      const policyId = service.getGasPolicyId();
      expect(policyId).toBe('test-policy-id');
    });

    it('should return dev gas policy ID explicitly', () => {
      const policyId = service.getGasPolicyId('dev');
      expect(policyId).toBe('test-policy-id');
    });

    it('should throw error if gas policy ID is not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      expect(() => service.getGasPolicyId()).toThrow(
        /Gas Manager policy ID not configured/,
      );
    });
  });

  describe('getWebhookSigningSecret', () => {
    it('should return webhook signing secret', () => {
      const secret = service.getWebhookSigningSecret();
      expect(secret).toBe('test-webhook-secret');
    });

    it('should return empty string if not configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const secret = service.getWebhookSigningSecret();
      expect(secret).toBe('');
    });
  });

  describe('getNetworkConfig', () => {
    it('should return config for Base Sepolia', () => {
      const config = service.getNetworkConfig('BASE', 'sepolia');

      expect(config).toEqual({
        rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/test',
        blockchain: 'BASE',
        network: 'sepolia',
        chainId: 84532,
        nativeToken: 'ETH',
        usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        isTestnet: true,
        blockExplorerUrl: 'https://sepolia.basescan.org',
      });
    });

    it('should return config for Polygon Amoy', () => {
      const config = service.getNetworkConfig('POLYGON', 'amoy');

      expect(config).toEqual({
        rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/test',
        blockchain: 'POLYGON',
        network: 'amoy',
        chainId: 80002,
        nativeToken: 'POL',
        usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
        isTestnet: true,
        blockExplorerUrl: 'https://amoy.polygonscan.com',
      });
    });

    it('should return config for Arbitrum Sepolia', () => {
      const config = service.getNetworkConfig('ARBITRUM', 'sepolia');

      expect(config).toEqual({
        rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/test',
        blockchain: 'ARBITRUM',
        network: 'sepolia',
        chainId: 421614,
        nativeToken: 'ETH',
        usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
        isTestnet: true,
        blockExplorerUrl: 'https://sepolia.arbiscan.io',
      });
    });

    it('should throw error for unsupported network', () => {
      expect(() => service.getNetworkConfig('BASE', 'mumbai')).toThrow(
        /Network configuration not found/,
      );
    });

    it('should throw error for unsupported blockchain', () => {
      expect(() => service.getNetworkConfig('ETHEREUM', 'mainnet')).toThrow(
        /RPC URL not configured/,
      );
    });
  });

  describe('getSupportedBlockchains', () => {
    it('should return list of supported blockchains', () => {
      const blockchains = service.getSupportedBlockchains();
      expect(blockchains).toEqual(['POLYGON', 'ARBITRUM', 'BASE']);
    });
  });

  describe('getSupportedNetworks', () => {
    it('should return networks for Polygon', () => {
      const networks = service.getSupportedNetworks('POLYGON');
      expect(networks).toEqual(['mainnet', 'amoy']);
    });

    it('should return networks for Arbitrum', () => {
      const networks = service.getSupportedNetworks('ARBITRUM');
      expect(networks).toEqual(['mainnet', 'sepolia']);
    });

    it('should return networks for Base', () => {
      const networks = service.getSupportedNetworks('BASE');
      expect(networks).toEqual(['mainnet', 'sepolia']);
    });

    it('should throw error for unsupported blockchain', () => {
      expect(() => service.getSupportedNetworks('ETHEREUM')).toThrow(
        /not supported/,
      );
    });
  });

  describe('isValidNetwork', () => {
    it('should return true for valid network combinations', () => {
      expect(service.isValidNetwork('BASE', 'sepolia')).toBe(true);
      expect(service.isValidNetwork('POLYGON', 'amoy')).toBe(true);
      expect(service.isValidNetwork('ARBITRUM', 'sepolia')).toBe(true);
    });

    it('should return false for invalid network combinations', () => {
      expect(service.isValidNetwork('BASE', 'mumbai')).toBe(false);
      expect(service.isValidNetwork('POLYGON', 'sepolia')).toBe(false);
      expect(service.isValidNetwork('ETHEREUM', 'mainnet')).toBe(false);
    });
  });

  describe('getDefaultNetwork', () => {
    it('should return default networks for each blockchain', () => {
      expect(service.getDefaultNetwork('POLYGON')).toBe('amoy');
      expect(service.getDefaultNetwork('ARBITRUM')).toBe('sepolia');
      expect(service.getDefaultNetwork('BASE')).toBe('sepolia');
    });

    it('should return sepolia for unknown blockchain', () => {
      expect(service.getDefaultNetwork('UNKNOWN')).toBe('sepolia');
    });
  });

  describe('getEnvironment', () => {
    it('should return dev for development', () => {
      const env = service.getEnvironment();
      expect(env).toBe('dev');
    });

    it('should return prod for production', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string) =>
          key === 'NODE_ENV' ? 'production' : mockEnvVars[key],
        );

      const env = service.getEnvironment();
      expect(env).toBe('prod');
    });
  });

  describe('areWebhooksConfigured', () => {
    it('should return true if webhook secret is configured', () => {
      expect(service.areWebhooksConfigured()).toBe(true);
    });

    it('should return false if webhook secret is not configured', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string) =>
          key === 'ALCHEMY_WEBHOOK_SIGNING_SECRET' ? '' : mockEnvVars[key],
        );

      expect(service.areWebhooksConfigured()).toBe(false);
    });
  });

  describe('logConfiguration', () => {
    it('should log configuration without errors', () => {
      expect(() => service.logConfiguration()).not.toThrow();
    });
  });
});
