import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { ClientMetadata } from '../../transactions/transactions.types';

export const GetClientMetadata = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClientMetadata => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const headers = request.headers;

    return {
      platform: (headers['x-platform'] as string) || 'unknown',
      appVersion: (headers['x-app-version'] as string) || 'unknown',
      deviceId: (headers['x-device-id'] as string) || 'unknown',
      deviceName: (headers['x-device-name'] as string) || 'unknown',
      ip: request.ip || request.socket.remoteAddress || 'unknown',
    };
  },
);
