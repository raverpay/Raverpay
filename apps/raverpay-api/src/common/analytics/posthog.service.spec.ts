import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PostHogService } from './posthog.service';
import { PostHog } from 'posthog-node';

describe('PostHogService', () => {
  /* eslint-disable @typescript-eslint/unbound-method */
  let service: PostHogService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostHogService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'POSTHOG_API_KEY') return 'test-api-key';
              if (key === 'POSTHOG_HOST') return 'https://app.posthog.com';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PostHogService>(PostHogService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('capture', () => {
    it('should capture an event when enabled', () => {
      const mockPostHog = {
        capture: jest.fn(),
      } as unknown as PostHog;

      service['posthog'] = mockPostHog;
      service['enabled'] = true;

      service.capture({
        distinctId: 'user-123',
        event: 'test_event',
        properties: { test: 'data' },
      });

      expect(mockPostHog.capture).toHaveBeenCalledWith({
        distinctId: 'user-123',
        event: 'test_event',
        properties: expect.objectContaining({
          test: 'data',
          timestamp: expect.any(String),
        }),
      });
    });

    it('should not capture when disabled', () => {
      const mockPostHog = {
        capture: jest.fn(),
      } as unknown as PostHog;

      service['posthog'] = mockPostHog;
      service['enabled'] = false;

      service.capture({
        distinctId: 'user-123',
        event: 'test_event',
      });

      expect(mockPostHog.capture).not.toHaveBeenCalled();
    });
  });

  describe('identify', () => {
    it('should identify a user when enabled', () => {
      const mockPostHog = {
        identify: jest.fn(),
      } as unknown as PostHog;

      service['posthog'] = mockPostHog;
      service['enabled'] = true;

      service.identify('user-123', { email: 'test@example.com' });

      expect(mockPostHog.identify).toHaveBeenCalledWith({
        distinctId: 'user-123',
        properties: { email: 'test@example.com' },
      });
    });
  });
});
