# RaverPay API - Swagger/OpenAPI Documentation

## 📚 Overview

This document describes the Swagger/OpenAPI documentation implementation for the RaverPay API. The API documentation provides interactive, comprehensive documentation for all endpoints, making it easier for developers to integrate with the platform.

## 🚀 Accessing the Documentation

### Local Development

```
http://localhost:3001/api/docs
```

### Staging

```
https://api-staging.raverpay.com/api/docs
```

### Production

```
https://api.raverpay.com/api/docs
```

**Note:** Swagger is enabled by default in development and staging environments. In production, it's disabled by default for security. To enable in production, set the environment variable:

```bash
ENABLE_SWAGGER=true
```

To disable in development:

```bash
DISABLE_SWAGGER=true
```

## 📖 What's Documented

### ✅ Fully Documented Modules

#### Authentication (`/api/auth`)

- **POST /auth/register** - Register new user
- **POST /auth/login** - User login with device fingerprinting
- **POST /auth/refresh** - Refresh access token
- **GET /auth/me** - Get current user profile
- **POST /auth/forgot-password** - Request password reset
- **POST /auth/verify-reset-code** - Verify reset code
- **POST /auth/reset-password** - Reset password
- **POST /auth/verify-device** - Verify new device
- **POST /auth/logout** - Logout user

#### Wallet (`/api/wallet`)

- **GET /api/wallet** - Get wallet balance
- **GET /api/wallet/limits** - Get transaction limits
- **POST /api/wallet/lock** - Lock wallet
- **POST /api/wallet/unlock** - Unlock wallet
- **GET /api/wallet/transactions** - Get transaction history
- **GET /api/wallet/transactions/:id** - Get transaction details

### 🔄 Partially Documented

- Circle endpoints
- VTU endpoints
- Admin endpoints
- Webhook handlers

### ⏳ To Be Documented

The following modules still need comprehensive documentation:

- Payments
- Transactions
- Crypto
- Virtual Accounts
- Cashback
- Notifications
- Support
- Devices

## 🛠️ Implementation Details

### Architecture

```
apps/raverpay-api/
├── src/
│   ├── config/
│   │   └── swagger.config.ts          # Swagger configuration
│   ├── common/
│   │   └── decorators/
│   │       └── api-responses.decorator.ts  # Reusable response decorators
│   ├── auth/
│   │   ├── dto/                       # ✅ All DTOs documented
│   │   └── auth.controller.ts         # ✅ All endpoints documented
│   ├── wallet/
│   │   └── wallet.controller.ts       # ✅ Key endpoints documented
│   └── main.ts                        # Swagger integration
├── scripts/
│   └── export-swagger.ts              # OpenAPI spec export script
└── openapi.json                       # Exported OpenAPI specification
```

### Key Features

1. **JWT Authentication**
   - All protected endpoints are marked with `@ApiBearerAuth('JWT-auth')`
   - Try it out feature allows testing with real JWT tokens
   - Token persists across page refreshes

2. **Organized by Tags**
   - 40+ tags organizing endpoints by domain
   - User endpoints (Auth, Wallet, Payments, etc.)
   - Admin endpoints (Admin - Users, Admin - Wallets, etc.)
   - Webhook endpoints (Webhooks - Paystack, Webhooks - Circle, etc.)

3. **Comprehensive Examples**
   - All DTOs have example values
   - Response schemas include realistic examples
   - Error responses documented

4. **Rate Limiting Documentation**
   - Rate limits documented in endpoint descriptions
   - Response headers documented
   - 429 responses included

5. **Device Fingerprinting**
   - Login flow includes device verification
   - 202 response for device verification required
   - OTP verification documented

## 📝 Usage Guide

### For Frontend Developers

1. **Browse Endpoints**
   - Navigate to `/api/docs`
   - Expand tags to see available endpoints
   - Click on an endpoint to see details

2. **Authenticate**
   - Click "Authorize" button at top right
   - Enter your JWT token (get from login endpoint)
   - Click "Authorize" to save
   - All subsequent requests will include the token

3. **Try It Out**
   - Click "Try it out" on any endpoint
   - Fill in required parameters
   - Click "Execute"
   - View response below

4. **Copy Request**
   - Click "Copy" icon to copy curl command
   - Use in terminal or Postman
   - Includes authentication headers

### For Backend Developers

#### Adding Documentation to a New DTO

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'User phone number (optional)',
    example: '+2348012345678',
  })
  @IsString()
  @IsOptional()
  phone?: string;
}
```

#### Adding Documentation to a Controller

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a list of all users with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      example: {
        users: [
          { id: '1', email: 'user1@example.com', name: 'User 1' },
          { id: '2', email: 'user2@example.com', name: 'User 2' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    // Implementation
  }

  @Post()
  @ApiOperation({
    summary: 'Create new user',
    description: 'Create a new user account',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  async create(@Body() createUserDto: CreateUserDto) {
    // Implementation
  }
}
```

#### Using Reusable Response Decorators

```typescript
import {
  ApiStandardResponses,
  ApiRateLimitResponse,
} from '../common/decorators/api-responses.decorator';

@Controller('payments')
export class PaymentsController {
  @Post('fund')
  @ApiOperation({ summary: 'Fund wallet' })
  @ApiResponse({ status: 200, description: 'Wallet funded successfully' })
  @ApiStandardResponses() // Adds 401, 500 responses
  @ApiRateLimitResponse() // Adds 429 response with headers
  async fundWallet() {
    // Implementation
  }
}
```

## 🔧 Scripts

### Export OpenAPI Specification

Export the current API specification to `openapi.json`:

```bash
pnpm swagger:export
```

This generates a JSON file that can be:

- Version controlled
- Used for frontend type generation
- Imported into Postman/Insomnia
- Used for API testing tools
- Shared with partners

### Generate TypeScript Types (Future)

Once you have `openapi.json`, you can generate TypeScript types for your frontend:

```bash
# Install openapi-typescript
pnpm add -D openapi-typescript

# Generate types
npx openapi-typescript ./openapi.json -o ./types/api.ts
```

Then use in your frontend:

```typescript
import type { paths } from './types/api';

type LoginRequest =
  paths['/api/auth/login']['post']['requestBody']['content']['application/json'];
type LoginResponse =
  paths['/api/auth/login']['post']['responses']['200']['content']['application/json'];
```

## 📊 Statistics

Current documentation coverage:

- **Total Endpoints**: 100+ (across all modules)
- **Documented Endpoints**: 15+ (Auth + Wallet)
- **Total DTOs**: 100+
- **Documented DTOs**: 10+ (Auth DTOs)
- **Coverage**: ~15% (Auth and Wallet modules complete)

## 🎯 Next Steps

### Priority 1: Core User Features

- [ ] Document Payments module
- [ ] Document Transactions module
- [ ] Document Circle module (USDC operations)
- [ ] Document VTU module

### Priority 2: Admin Features

- [ ] Document Admin Users module
- [ ] Document Admin Wallets module
- [ ] Document Admin Transactions module
- [ ] Document Admin Analytics module

### Priority 3: Advanced Features

- [ ] Document Webhook handlers
- [ ] Document Crypto module
- [ ] Document Virtual Accounts module
- [ ] Document Notifications module

### Priority 4: Polish

- [ ] Add more response examples
- [ ] Add request examples for complex operations
- [ ] Document error codes
- [ ] Add API versioning strategy

## 🔐 Security Considerations

1. **Production Deployment**
   - Swagger is disabled by default in production
   - Enable only if needed (e.g., for partner integrations)
   - Consider IP whitelisting if enabled in production

2. **Sensitive Data**
   - Never include real API keys in examples
   - Don't expose internal implementation details
   - Sanitize error messages

3. **Authentication**
   - All protected endpoints require JWT
   - Document token expiration times
   - Include refresh token flow

## 📚 Resources

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI TypeScript Generator](https://github.com/drwpow/openapi-typescript)

## 🤝 Contributing

When adding new endpoints:

1. **Always document DTOs** with `@ApiProperty()`
2. **Add operation summaries** with `@ApiOperation()`
3. **Document all responses** (200, 400, 401, 500, etc.)
4. **Include examples** for complex types
5. **Use reusable decorators** from `api-responses.decorator.ts`
6. **Test in Swagger UI** before committing

## 📞 Support

For questions about API documentation:

- **Slack**: #api-documentation
- **Email**: dev@raverpay.com
- **Documentation**: This file

---

**Last Updated**: December 31, 2024
**Version**: 1.0.0
**Maintained by**: Backend Team
