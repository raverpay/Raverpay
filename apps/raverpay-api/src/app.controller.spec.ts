import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  // Mock PrismaService
  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return welcome message', () => {
      expect(appController.getHello()).toBe('Welcome to RaverPay API.');
    });
  });

  describe('health', () => {
    it('should return health status with database connected', async () => {
      const result = await appController.getHealth();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('database', 'connected');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      const result = await appController.getHealth();

      expect(result).toHaveProperty('status', 'error');
      expect(result).toHaveProperty('database', 'disconnected');
      expect(result).toHaveProperty('error');
    });
  });
});
