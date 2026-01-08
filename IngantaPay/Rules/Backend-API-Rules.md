# IngantaPay Backend API Rules

These rules MUST be followed by any AI agent working on the IngantaPay backend API codebase.

---

## 1. Project Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Prisma migrations
│   ├── seed.ts               # Database seeding
│   └── *.sql                 # Manual SQL migrations
├── src/
│   ├── modules/              # Feature modules
│   │   ├── auth/            # Authentication
│   │   ├── users/           # User management
│   │   ├── wallet/          # Wallet operations
│   │   ├── transactions/    # Transactions
│   │   └── [others]/        # Other feature modules
│   ├── common/              # Shared code
│   │   ├── decorators/      # Custom decorators
│   │   ├── guards/          # Auth guards
│   │   ├── interceptors/    # Transform interceptors
│   │   ├── filters/         # Exception filters
│   │   └── pipes/           # Validation pipes
│   ├── config/              # Configuration
│   ├── lib/                 # Utilities
│   └── main.ts              # Application entry
├── test/                     # Test files
└── docs/                     # API documentation
```

---

## 2. NestJS Module Pattern

### Standard Module Structure
Each feature module should follow this structure:

```
src/modules/[feature]/
├── [feature].module.ts       # Module definition
├── [feature].controller.ts   # HTTP endpoints
├── [feature].service.ts      # Business logic
├── [feature].repository.ts   # Database operations (optional)
├── dto/
│   ├── create-[feature].dto.ts
│   ├── update-[feature].dto.ts
│   └── [feature]-response.dto.ts
├── entities/
│   └── [feature].entity.ts   # Prisma types or custom
└── [feature].spec.ts         # Tests
```

### Module Registration
```typescript
// [feature].module.ts
@Module({
  imports: [PrismaModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

---

## 3. Database Rules (Prisma)

### Schema Location
- Main schema: `prisma/schema.prisma`
- DO NOT split into multiple files

### Migration Pattern (Prisma Workaround)
For complex changes, use manual SQL migrations:

1. Create SQL file in `prisma/` folder:
   ```sql
   -- prisma/add_kyc_tables.sql
   ALTER TABLE users ADD COLUMN kyc_status VARCHAR(50);
   CREATE TABLE kyc_documents (...);
   ```

2. Apply using `prisma/apply-migration.js` or manually

### Naming Conventions
- Tables: snake_case plural (`users`, `transactions`)
- Columns: snake_case (`created_at`, `user_id`)
- Foreign keys: `[related_table]_id`
- Indexes: `idx_[table]_[column]`

### Required Fields
Every table should have:
- `id` - UUID primary key
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### Index Strategy
Always add indexes for:
- Foreign keys
- Frequently queried columns
- Composite indexes for common queries

---

## 4. API Design Rules

### RESTful Conventions
```
GET    /api/[resource]          # List
GET    /api/[resource]/:id      # Get one
POST   /api/[resource]          # Create
PUT    /api/[resource]/:id      # Update (full)
PATCH  /api/[resource]/:id      # Update (partial)
DELETE /api/[resource]/:id      # Delete
```

### Response Format
```typescript
// Success response
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}

// Error response
{
  "success": false,
  "error": "Error type",
  "message": "Human readable message",
  "statusCode": 400
}

// Paginated response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Versioning
- API version in path: `/api/v1/[resource]`
- Current version: v1 (or unversioned)

---

## 5. DTO & Validation Rules

### Use class-validator
```typescript
// dto/create-feature.dto.ts
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

### Swagger Documentation
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureDto {
  @ApiProperty({ description: 'Feature name', example: 'My Feature' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;
}
```

### Transform Pipes
Use class-transformer for data transformation:
```typescript
import { Transform } from 'class-transformer';

@Transform(({ value }) => value.toLowerCase())
@IsEmail()
email: string;
```

---

## 6. Authentication & Authorization

### Auth Guards
- `JwtGuard` - Requires valid JWT
- `AdminGuard` - Requires admin role
- `OptionalAuthGuard` - Auth optional

### Using Guards
```typescript
@UseGuards(JwtGuard)
@Controller('protected')
export class ProtectedController {
  
  @UseGuards(AdminGuard)
  @Get('admin-only')
  adminRoute() { ... }
}
```

### Getting User in Controllers
```typescript
@Get('me')
getMe(@CurrentUser() user: User) {
  return user;
}
```

---

## 7. Service Layer Rules

### Business Logic Location
- ALL business logic goes in services
- Controllers ONLY handle HTTP concerns
- Services are reusable across modules

### Error Handling
```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Injectable()
export class FeatureService {
  async getById(id: string) {
    const item = await this.prisma.feature.findUnique({ where: { id } });
    
    if (!item) {
      throw new NotFoundException('Feature not found');
    }
    
    return item;
  }
  
  async create(dto: CreateFeatureDto) {
    const exists = await this.prisma.feature.findFirst({ where: { ... } });
    
    if (exists) {
      throw new BadRequestException('Feature already exists');
    }
    
    return this.prisma.feature.create({ data: dto });
  }
}
```

### Transaction Handling
```typescript
async transferFunds(fromId: string, toId: string, amount: number) {
  return this.prisma.$transaction(async (tx) => {
    // Debit sender
    await tx.wallet.update({
      where: { userId: fromId },
      data: { balance: { decrement: amount } },
    });
    
    // Credit receiver
    await tx.wallet.update({
      where: { userId: toId },
      data: { balance: { increment: amount } },
    });
    
    // Create transaction records
    // ...
  });
}
```

---

## 8. Email & Notification Rules

### Email Templates
- Location: `src/modules/email/templates/`
- Format: Handlebars (`.hbs`)
- Always include: subject, HTML body, text fallback

### Sending Emails
```typescript
await this.emailService.send({
  to: user.email,
  template: 'welcome',
  subject: 'Welcome to Inganta Pay',
  context: { name: user.fullName },
});
```

### Brand Name in Emails
- Always use "Inganta Pay" (with space)
- Update all email templates when rebranding

---

## 9. Background Jobs (BullMQ)

### Queue Naming
- Queues: `[feature]-queue` (e.g., `email-queue`)
- Jobs: descriptive names (e.g., `send-welcome-email`)

### Job Processing
```typescript
@Processor('email-queue')
export class EmailProcessor {
  @Process('send-welcome-email')
  async handleWelcomeEmail(job: Job<{ userId: string }>) {
    // Process job
  }
}
```

---

## 10. Logging & Monitoring

### Logger Usage
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);
  
  async doSomething() {
    this.logger.log('Starting operation');
    this.logger.debug('Debug info', { data: ... });
    this.logger.error('Error occurred', error.stack);
  }
}
```

### Sensitive Data
NEVER log:
- Passwords
- API keys
- Full credit card numbers
- Personal identifiable information (PII) in plain text

---

## 11. Code Style Rules

### File Naming
- Controllers: `[feature].controller.ts`
- Services: `[feature].service.ts`
- Modules: `[feature].module.ts`
- DTOs: `[action]-[feature].dto.ts`

### Import Order
1. NestJS imports
2. Third-party imports
3. Local imports (sorted alphabetically)

### Dependency Injection
Always use constructor injection:
```typescript
@Injectable()
export class FeatureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}
}
```

---

## 12. Testing Rules

### Test File Location
- Unit tests: Same folder as source (`[file].spec.ts`)
- E2E tests: `test/` folder

### Test Structure
```typescript
describe('FeatureService', () => {
  let service: FeatureService;
  
  beforeEach(async () => {
    // Setup
  });
  
  describe('methodName', () => {
    it('should do expected behavior', async () => {
      // Test
    });
    
    it('should throw error when invalid', async () => {
      // Test error case
    });
  });
});
```

---

## 13. Environment Variables

### Required Variables
```env
# Database
DATABASE_URL=
DIRECT_URL=

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=

# Email
RESEND_API_KEY=

# Payment
PAYSTACK_SECRET_KEY=
FLUTTERWAVE_SECRET_KEY=

# Circle
CIRCLE_API_KEY=
```

### Accessing Config
Use ConfigService, never `process.env`:
```typescript
constructor(private readonly config: ConfigService) {
  this.apiKey = this.config.get('PAYSTACK_SECRET_KEY');
}
```

---

## 14. API Documentation

### Swagger Tags
Every controller should have tags:
```typescript
@ApiTags('Users')
@Controller('users')
export class UsersController {}
```

### Operation Documentation
```typescript
@ApiOperation({ summary: 'Create a new user' })
@ApiResponse({ status: 201, description: 'User created successfully' })
@ApiResponse({ status: 400, description: 'Invalid input' })
@Post()
create(@Body() dto: CreateUserDto) {}
```

---

## 15. IngantaPay Specific

### Brand Name
- In code comments: "Inganta Pay" or "IngantaPay"
- In user-facing strings: "Inganta Pay"
- In technical identifiers: "ingantapay" (lowercase)

### Email Subject Lines
All emails should include "Inganta Pay":
- "Welcome to Inganta Pay"
- "Your Inganta Pay Transaction"
- "Inganta Pay Password Reset"

### Webhook Handling
For payment webhooks (Paystack, Circle, etc.):
- Verify signatures
- Log all incoming webhooks
- Use idempotency checks
- Process in background jobs
