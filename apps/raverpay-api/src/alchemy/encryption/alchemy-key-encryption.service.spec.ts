import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlchemyKeyEncryptionService } from './alchemy-key-encryption.service';

describe('AlchemyKeyEncryptionService', () => {
  let service: AlchemyKeyEncryptionService;
  let configService: ConfigService;

  // Test data
  const testMasterKey = 'a'.repeat(64); // 64-character master key
  const testUserId = 'user-123';
  const testPrivateKey =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlchemyKeyEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ALCHEMY_ENCRYPTION_MASTER_KEY') {
                return testMasterKey;
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AlchemyKeyEncryptionService>(
      AlchemyKeyEncryptionService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encryptPrivateKey', () => {
    it('should encrypt a private key successfully', () => {
      const encrypted = service.encryptPrivateKey(testPrivateKey, testUserId);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.split(':').length).toBe(3); // iv:tag:encrypted format
    });

    it('should produce different encrypted values for the same input (due to random IV)', () => {
      const encrypted1 = service.encryptPrivateKey(testPrivateKey, testUserId);
      const encrypted2 = service.encryptPrivateKey(testPrivateKey, testUserId);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });

    it('should produce different encrypted values for different users', () => {
      const encrypted1 = service.encryptPrivateKey(testPrivateKey, 'user-1');
      const encrypted2 = service.encryptPrivateKey(testPrivateKey, 'user-2');

      expect(encrypted1).not.toBe(encrypted2); // Different user-derived keys
    });

    it('should throw error if private key is empty', () => {
      expect(() => service.encryptPrivateKey('', testUserId)).toThrow(
        'Private key cannot be empty',
      );
    });

    it('should throw error if userId is empty', () => {
      expect(() => service.encryptPrivateKey(testPrivateKey, '')).toThrow(
        'User ID cannot be empty',
      );
    });
  });

  describe('decryptPrivateKey', () => {
    it('should decrypt an encrypted private key successfully', () => {
      const encrypted = service.encryptPrivateKey(testPrivateKey, testUserId);
      const decrypted = service.decryptPrivateKey(encrypted, testUserId);

      expect(decrypted).toBe(testPrivateKey);
    });

    it('should fail to decrypt with wrong userId', () => {
      const encrypted = service.encryptPrivateKey(testPrivateKey, 'user-1');

      expect(() => service.decryptPrivateKey(encrypted, 'user-2')).toThrow(
        'Failed to decrypt private key',
      );
    });

    it('should throw error if encrypted key format is invalid', () => {
      expect(() =>
        service.decryptPrivateKey('invalid-format', testUserId),
      ).toThrow('Invalid encrypted private key format');
    });

    it('should throw error if encrypted key is empty', () => {
      expect(() => service.decryptPrivateKey('', testUserId)).toThrow(
        'Encrypted private key cannot be empty',
      );
    });

    it('should throw error if userId is empty', () => {
      const encrypted = service.encryptPrivateKey(testPrivateKey, testUserId);

      expect(() => service.decryptPrivateKey(encrypted, '')).toThrow(
        'User ID cannot be empty',
      );
    });
  });

  describe('encryptPrivateKey and decryptPrivateKey together', () => {
    it('should correctly encrypt and decrypt multiple private keys', () => {
      const privateKeys = [
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      ];

      privateKeys.forEach((privateKey) => {
        const encrypted = service.encryptPrivateKey(privateKey, testUserId);
        const decrypted = service.decryptPrivateKey(encrypted, testUserId);

        expect(decrypted).toBe(privateKey);
      });
    });

    it('should handle different user IDs correctly', () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      userIds.forEach((userId) => {
        const encrypted = service.encryptPrivateKey(testPrivateKey, userId);
        const decrypted = service.decryptPrivateKey(encrypted, userId);

        expect(decrypted).toBe(testPrivateKey);
      });
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = service.encryptPrivateKey(testPrivateKey, testUserId);

      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(service.isEncrypted(testPrivateKey)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isEncrypted('')).toBe(false);
    });

    it('should return false for invalid format', () => {
      expect(service.isEncrypted('invalid:format')).toBe(false);
    });
  });

  describe('rotateEncryption', () => {
    it('should successfully rotate encryption with new master key', () => {
      const newMasterKey = 'b'.repeat(64);

      // Encrypt with current master key
      const encrypted = service.encryptPrivateKey(testPrivateKey, testUserId);

      // Rotate to new master key
      const rotated = service.rotateEncryption(
        encrypted,
        testUserId,
        newMasterKey,
      );

      // Should be different from original
      expect(rotated).not.toBe(encrypted);

      // Should have valid format
      expect(rotated.split(':').length).toBe(3);
    });
  });

  describe('Master key validation', () => {
    it('should throw error if master key is not configured', () => {
      // Mock ConfigService to return undefined
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      expect(() =>
        service.encryptPrivateKey(testPrivateKey, testUserId),
      ).toThrow(
        'ALCHEMY_ENCRYPTION_MASTER_KEY environment variable is required',
      );
    });

    it('should throw error if master key is too short', () => {
      // Mock ConfigService to return short key
      jest.spyOn(configService, 'get').mockReturnValue('short');

      expect(() =>
        service.encryptPrivateKey(testPrivateKey, testUserId),
      ).toThrow('ALCHEMY_ENCRYPTION_MASTER_KEY is too weak');
    });
  });

  describe('Security tests', () => {
    it('should use authentication tag (GCM mode)', () => {
      const encrypted = service.encryptPrivateKey(testPrivateKey, testUserId);
      const parts = encrypted.split(':');

      // Should have 3 parts: iv, tag, encrypted
      expect(parts.length).toBe(3);

      // Tag should be base64 encoded
      expect(() => Buffer.from(parts[1], 'base64')).not.toThrow();
    });

    it('should detect tampering (modified encrypted data)', () => {
      const encrypted = service.encryptPrivateKey(testPrivateKey, testUserId);
      const parts = encrypted.split(':');

      // Tamper with the encrypted data
      parts[2] = Buffer.from('tampered').toString('base64');
      const tampered = parts.join(':');

      expect(() => service.decryptPrivateKey(tampered, testUserId)).toThrow(
        'Failed to decrypt private key',
      );
    });

    it('should detect tampering (modified auth tag)', () => {
      const encrypted = service.encryptPrivateKey(testPrivateKey, testUserId);
      const parts = encrypted.split(':');

      // Tamper with the auth tag
      parts[1] = Buffer.from('tampered-tag-data').toString('base64');
      const tampered = parts.join(':');

      expect(() => service.decryptPrivateKey(tampered, testUserId)).toThrow(
        'Failed to decrypt private key',
      );
    });
  });
});
