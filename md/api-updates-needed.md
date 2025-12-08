# RaverPay API - Required Updates for Mobile App

**Version:** 1.0
**Last Updated:** 2025-11-11
**Priority:** Critical for mobile app launch

---

## Table of Contents
1. [Critical Updates (Required Before Launch)](#critical-updates)
2. [Important Updates (Required Soon)](#important-updates)
3. [Nice-to-Have Updates (Phase 2)](#nice-to-have-updates)
4. [Database Schema Changes](#database-schema-changes)
5. [Implementation Guidelines](#implementation-guidelines)

---

## Critical Updates (Required Before Launch)

### 1. Transaction PIN System

**Current Status:** Database field exists (`user.pin`), but no endpoints

**Required Endpoints:**

#### A. Set PIN (First Time)
```typescript
POST /api/users/set-pin

Headers:
  Authorization: Bearer <access_token>

Body:
{
  "pin": "1234",
  "confirmPin": "1234"
}

Validations:
- PIN must be exactly 4 digits
- PIN and confirmPin must match
- User must not already have a PIN set

Response (Success):
{
  "success": true,
  "message": "Transaction PIN set successfully",
  "pinSetAt": "2025-11-11T10:30:00Z"
}

Response (Error):
{
  "statusCode": 400,
  "message": "PIN already set. Use change-pin endpoint instead",
  "error": "Bad Request"
}
```

**Implementation Notes:**
```typescript
// services/users/users.service.ts

async setPin(userId: string, dto: SetPinDto) {
  // Check if PIN already exists
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { pin: true }
  });

  if (user?.pin) {
    throw new BadRequestException('PIN already set. Use change-pin endpoint');
  }

  // Validate PIN format (4 digits)
  if (!/^\d{4}$/.test(dto.pin)) {
    throw new BadRequestException('PIN must be exactly 4 digits');
  }

  // Encrypt PIN (use same method as password - Argon2)
  const hashedPin = await argon.hash(dto.pin);

  // Save PIN
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      pin: hashedPin,
      pinSetAt: new Date(),
    },
  });

  // Audit log
  await this.prisma.auditLog.create({
    data: {
      userId,
      action: 'PIN_SET',
      resource: 'USER',
      resourceId: userId,
    },
  });

  return { success: true, message: 'Transaction PIN set successfully' };
}
```

---

#### B. Verify PIN
```typescript
POST /api/users/verify-pin

Headers:
  Authorization: Bearer <access_token>

Body:
{
  "pin": "1234"
}

Response (Success):
{
  "valid": true
}

Response (Invalid):
{
  "statusCode": 400,
  "message": "Invalid PIN",
  "error": "Bad Request"
}

Response (Locked):
{
  "statusCode": 429,
  "message": "Too many failed attempts. Try again in 30 minutes",
  "error": "Too Many Requests"
}
```

**Implementation Notes:**
```typescript
async verifyPin(userId: string, pin: string): Promise<boolean> {
  // Get user's PIN
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, pin: true }
  });

  if (!user?.pin) {
    throw new BadRequestException('PIN not set. Please set a PIN first');
  }

  // Check rate limiting (prevent brute force)
  const attemptKey = `pin_attempts_${userId}`;
  const attempts = await this.cacheManager.get<number>(attemptKey) || 0;

  if (attempts >= 5) {
    throw new TooManyRequestsException('Too many failed attempts. Try again in 30 minutes');
  }

  // Verify PIN
  const isValid = await argon.verify(user.pin, pin);

  if (!isValid) {
    // Increment failed attempts
    await this.cacheManager.set(attemptKey, attempts + 1, 1800); // 30 min TTL

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PIN_VERIFICATION_FAILED',
        resource: 'USER',
        resourceId: userId,
      },
    });

    throw new BadRequestException('Invalid PIN');
  }

  // Reset attempts on success
  await this.cacheManager.del(attemptKey);

  return true;
}
```

---

#### C. Change PIN
```typescript
POST /api/users/change-pin

Headers:
  Authorization: Bearer <access_token>

Body:
{
  "currentPin": "1234",
  "newPin": "5678",
  "confirmNewPin": "5678"
}

Response (Success):
{
  "success": true,
  "message": "PIN changed successfully"
}
```

**Implementation:**
```typescript
async changePin(userId: string, dto: ChangePinDto) {
  // Verify current PIN
  await this.verifyPin(userId, dto.currentPin);

  // Validate new PIN
  if (dto.newPin !== dto.confirmNewPin) {
    throw new BadRequestException('New PIN and confirmation do not match');
  }

  if (!/^\d{4}$/.test(dto.newPin)) {
    throw new BadRequestException('PIN must be exactly 4 digits');
  }

  // Hash new PIN
  const hashedPin = await argon.hash(dto.newPin);

  // Update PIN
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      pin: hashedPin,
      pinSetAt: new Date(),
    },
  });

  // Audit log
  await this.prisma.auditLog.create({
    data: {
      userId,
      action: 'PIN_CHANGED',
      resource: 'USER',
      resourceId: userId,
    },
  });

  return { success: true, message: 'PIN changed successfully' };
}
```

---

#### D. Update Transaction Endpoints to Require PIN

**Endpoints to Update:**
- `POST /api/transactions/withdraw`
- `POST /api/vtu/airtime/purchase`
- `POST /api/vtu/data/purchase`
- `POST /api/vtu/cable-tv/pay`
- `POST /api/vtu/electricity/pay`
- `POST /api/wallet/transfer` (future)

**Example (Withdraw):**
```typescript
// Before:
class WithdrawDto {
  @IsString()
  bankCode: string;

  @IsString()
  accountNumber: string;

  @IsNumber()
  amount: number;
}

// After:
class WithdrawDto {
  @IsString()
  bankCode: string;

  @IsString()
  accountNumber: string;

  @IsNumber()
  amount: number;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin: string; // NEW FIELD
}

// In service:
async withdraw(userId: string, dto: WithdrawDto) {
  // 1. Verify PIN FIRST
  await this.usersService.verifyPin(userId, dto.pin);

  // 2. Continue with withdrawal logic
  // ...
}
```

---

### 2. Password Reset Flow

**Current Status:** NOT IMPLEMENTED

**Required Endpoints:**

#### A. Request Password Reset
```typescript
POST /api/auth/forgot-password

Body:
{
  "email": "user@example.com"
}

Response (Success):
{
  "success": true,
  "message": "If an account exists with this email, a reset code has been sent"
}

Note: Always return success even if email doesn't exist (security best practice)
```

**Implementation:**
```typescript
// auth/auth.service.ts

async forgotPassword(email: string) {
  // Find user by email
  const user = await this.prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  // Don't reveal if user exists (security)
  if (!user) {
    return { success: true, message: 'If an account exists with this email, a reset code has been sent' };
  }

  // Generate 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in SystemConfig (same pattern as email verification)
  await this.prisma.systemConfig.upsert({
    where: { key: `password_reset_${user.id}` },
    create: {
      key: `password_reset_${user.id}`,
      value: {
        code: resetCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
      },
    },
    update: {
      value: {
        code: resetCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
      },
    },
  });

  // Send email
  await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetCode);

  // Audit log
  await this.prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'USER',
      resourceId: user.id,
    },
  });

  return { success: true, message: 'If an account exists with this email, a reset code has been sent' };
}
```

---

#### B. Verify Reset Code
```typescript
POST /api/auth/verify-reset-code

Body:
{
  "email": "user@example.com",
  "code": "123456"
}

Response (Success):
{
  "success": true,
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Valid for 15 minutes
}

Response (Invalid):
{
  "statusCode": 400,
  "message": "Invalid or expired reset code",
  "error": "Bad Request"
}
```

**Implementation:**
```typescript
async verifyResetCode(email: string, code: string) {
  // Find user
  const user = await this.prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    throw new BadRequestException('Invalid or expired reset code');
  }

  // Get stored code
  const config = await this.prisma.systemConfig.findUnique({
    where: { key: `password_reset_${user.id}` }
  });

  if (!config) {
    throw new BadRequestException('No reset request found');
  }

  const storedData = config.value as any;

  // Check expiry
  if (new Date(storedData.expiresAt) < new Date()) {
    await this.prisma.systemConfig.delete({
      where: { key: `password_reset_${user.id}` }
    });
    throw new BadRequestException('Reset code expired');
  }

  // Check attempts
  if (storedData.attempts >= 5) {
    throw new BadRequestException('Too many failed attempts');
  }

  // Verify code
  if (storedData.code !== code) {
    // Increment attempts
    await this.prisma.systemConfig.update({
      where: { key: `password_reset_${user.id}` },
      data: {
        value: {
          ...storedData,
          attempts: storedData.attempts + 1,
        },
      },
    });
    throw new BadRequestException('Invalid reset code');
  }

  // Generate reset token (short-lived JWT)
  const resetToken = this.jwtService.sign(
    { sub: user.id, type: 'password_reset' },
    { secret: this.configService.get('JWT_SECRET'), expiresIn: '15m' }
  );

  // Delete code (single use)
  await this.prisma.systemConfig.delete({
    where: { key: `password_reset_${user.id}` }
  });

  return { success: true, resetToken };
}
```

---

#### C. Reset Password
```typescript
POST /api/auth/reset-password

Body:
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePassword123!"
}

Response (Success):
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Implementation:**
```typescript
async resetPassword(resetToken: string, newPassword: string) {
  // Verify reset token
  let payload: any;
  try {
    payload = this.jwtService.verify(resetToken, {
      secret: this.configService.get('JWT_SECRET'),
    });
  } catch (error) {
    throw new UnauthorizedException('Invalid or expired reset token');
  }

  // Check token type
  if (payload.type !== 'password_reset') {
    throw new UnauthorizedException('Invalid token type');
  }

  // Validate new password (same rules as registration)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new BadRequestException(
      'Password must be at least 8 characters with uppercase, lowercase, and number/special character'
    );
  }

  // Hash new password
  const hashedPassword = await argon.hash(newPassword);

  // Update password
  await this.prisma.user.update({
    where: { id: payload.sub },
    data: { password: hashedPassword },
  });

  // Audit log
  await this.prisma.auditLog.create({
    data: {
      userId: payload.sub,
      action: 'PASSWORD_RESET',
      resource: 'USER',
      resourceId: payload.sub,
    },
  });

  // Send email notification
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    select: { email: true, firstName: true },
  });

  await this.emailService.sendPasswordChangedNotification(user.email, user.firstName);

  return { success: true, message: 'Password reset successfully' };
}
```

---

### 3. Profile Picture Upload

**Current Status:** Database field exists (`user.avatar`), no upload endpoint

**Required:** Image storage service (Cloudinary recommended)

#### A. Setup Cloudinary

```bash
npm install cloudinary @types/cloudinary
```

```typescript
// services/cloudinary/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
```

---

#### B. Upload Avatar Endpoint
```typescript
POST /api/users/upload-avatar

Headers:
  Authorization: Bearer <access_token>
  Content-Type: multipart/form-data

Body:
  file: <image file>

Validations:
- File must be image (jpg, jpeg, png, webp)
- Max size: 5MB

Response (Success):
{
  "success": true,
  "avatarUrl": "https://res.cloudinary.com/.../user-avatar.jpg"
}
```

**Implementation:**
```typescript
// users/users.controller.ts
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';

@Post('upload-avatar')
@UseGuards(JwtAuthGuard)
@UseInterceptors(FileInterceptor('file'))
async uploadAvatar(
  @GetUser('id') userId: string,
  @UploadedFile() file: Express.Multer.File,
) {
  return this.usersService.uploadAvatar(userId, file);
}

// users/users.service.ts
async uploadAvatar(userId: string, file: Express.Multer.File) {
  // Validate file
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    throw new BadRequestException('Only image files are allowed');
  }

  if (file.size > 5 * 1024 * 1024) { // 5MB
    throw new BadRequestException('File size must not exceed 5MB');
  }

  // Get current user
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });

  // Delete old avatar if exists
  if (user?.avatar) {
    // Extract public_id from Cloudinary URL
    const publicId = this.extractPublicId(user.avatar);
    if (publicId) {
      await this.cloudinaryService.deleteImage(publicId);
    }
  }

  // Upload new avatar
  const avatarUrl = await this.cloudinaryService.uploadImage(file, 'avatars');

  // Update user
  await this.prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
  });

  return { success: true, avatarUrl };
}

private extractPublicId(cloudinaryUrl: string): string | null {
  const regex = /\/v\d+\/(.*)\./;
  const match = cloudinaryUrl.match(regex);
  return match ? match[1] : null;
}
```

---

#### C. Delete Avatar Endpoint
```typescript
DELETE /api/users/avatar

Headers:
  Authorization: Bearer <access_token>

Response (Success):
{
  "success": true,
  "message": "Avatar deleted successfully"
}
```

**Implementation:**
```typescript
async deleteAvatar(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });

  if (!user?.avatar) {
    throw new BadRequestException('No avatar to delete');
  }

  // Delete from Cloudinary
  const publicId = this.extractPublicId(user.avatar);
  if (publicId) {
    await this.cloudinaryService.deleteImage(publicId);
  }

  // Remove from database
  await this.prisma.user.update({
    where: { id: userId },
    data: { avatar: null },
  });

  return { success: true, message: 'Avatar deleted successfully' };
}
```

---

### 4. Notifications System

**Current Status:** Database table exists, no endpoints

#### A. Create Notification
```typescript
// This is called internally when events happen
// notifications/notifications.service.ts

async createNotification(dto: CreateNotificationDto) {
  const notification = await this.prisma.notification.create({
    data: {
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
    },
  });

  // Send push notification
  await this.pushNotificationService.send(dto.userId, {
    title: dto.title,
    message: dto.message,
    data: { notificationId: notification.id, ...dto.data },
  });

  return notification;
}
```

---

#### B. Get Notifications
```typescript
GET /api/notifications?page=1&limit=20&type=TRANSACTION&unreadOnly=false

Headers:
  Authorization: Bearer <access_token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 20, max: 50)
- type: TRANSACTION | KYC | SECURITY | PROMOTIONAL | SYSTEM (optional)
- unreadOnly: boolean (default: false)

Response (Success):
{
  "notifications": [
    {
      "id": "uuid",
      "type": "TRANSACTION",
      "title": "Wallet Credited",
      "message": "Your wallet has been credited with ₦10,000",
      "data": {
        "transactionId": "uuid",
        "amount": 10000
      },
      "isRead": false,
      "createdAt": "2025-11-11T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasMore": true
  },
  "unreadCount": 12
}
```

**Implementation:**
```typescript
// notifications/notifications.controller.ts
@Get()
@UseGuards(JwtAuthGuard)
async getNotifications(
  @GetUser('id') userId: string,
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '20',
  @Query('type') type?: NotificationType,
  @Query('unreadOnly') unreadOnly: string = 'false',
) {
  return this.notificationsService.findAll(userId, {
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 50),
    type,
    unreadOnly: unreadOnly === 'true',
  });
}

// notifications/notifications.service.ts
async findAll(userId: string, options: FindNotificationsDto) {
  const { page, limit, type, unreadOnly } = options;

  const where: any = { userId };
  if (type) where.type = type;
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    this.prisma.notification.count({ where }),
    this.prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
    unreadCount,
  };
}
```

---

#### C. Mark as Read
```typescript
PUT /api/notifications/:id/read

Headers:
  Authorization: Bearer <access_token>

Response (Success):
{
  "success": true
}
```

**Implementation:**
```typescript
async markAsRead(userId: string, notificationId: string) {
  // Verify ownership
  const notification = await this.prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new NotFoundException('Notification not found');
  }

  if (notification.isRead) {
    return { success: true };
  }

  await this.prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true };
}
```

---

#### D. Mark All as Read
```typescript
PUT /api/notifications/read-all

Headers:
  Authorization: Bearer <access_token>

Response (Success):
{
  "success": true,
  "count": 12 // Number of notifications marked as read
}
```

**Implementation:**
```typescript
async markAllAsRead(userId: string) {
  const result = await this.prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true, count: result.count };
}
```

---

#### E. Delete Notification
```typescript
DELETE /api/notifications/:id

Headers:
  Authorization: Bearer <access_token>

Response (Success):
{
  "success": true
}
```

---

#### F. Trigger Notifications on Events

**Example: Wallet Funded**
```typescript
// payments/payments.service.ts

async handleChargeSuccess(event: PaystackWebhookEvent) {
  // ... existing wallet funding logic ...

  // Create notification
  await this.notificationsService.createNotification({
    userId: transaction.userId,
    type: NotificationType.TRANSACTION,
    title: 'Wallet Credited',
    message: `Your wallet has been credited with ${formatCurrency(amount)}`,
    data: {
      transactionId: transaction.id,
      amount,
      type: 'DEPOSIT',
    },
  });
}
```

**Example: VTU Purchase Success**
```typescript
// vtu/vtu.service.ts

async handleVTPassWebhook(payload: VTPassWebhookPayload) {
  // ... existing order update logic ...

  if (payload.status === 'delivered') {
    await this.notificationsService.createNotification({
      userId: order.userId,
      type: NotificationType.TRANSACTION,
      title: 'Purchase Successful',
      message: `${order.productName} has been delivered to ${order.recipient}`,
      data: {
        orderId: order.id,
        serviceType: order.serviceType,
      },
    });
  }
}
```

---

## Important Updates (Required Soon)

### 5. Enhanced User Status Check on Login

**Current Issue:** Users can login even if email is not verified

**Fix Required:**
```typescript
// auth/auth.service.ts

async login(dto: LoginDto) {
  // ... existing validation ...

  // NEW: Check email verification
  if (!user.emailVerified) {
    // Send verification email
    await this.usersService.sendEmailVerification(user.id);

    throw new UnauthorizedException({
      message: 'Email not verified. A verification code has been sent to your email.',
      code: 'EMAIL_NOT_VERIFIED',
      userId: user.id,
      email: user.email,
    });
  }

  // NEW: Check phone verification
  if (!user.phoneVerified) {
    // Send SMS verification
    await this.usersService.sendPhoneVerification(user.id);

    throw new UnauthorizedException({
      message: 'Phone not verified. A verification code has been sent via SMS.',
      code: 'PHONE_NOT_VERIFIED',
      userId: user.id,
      phone: user.phone,
    });
  }

  // Continue with login...
}
```

**Mobile App Handling:**
```typescript
// Mobile app will catch these errors and navigate to verification screens
try {
  await login(email, password);
} catch (error) {
  if (error.code === 'EMAIL_NOT_VERIFIED') {
    navigate('/verify-email', { userId: error.userId, email: error.email });
  } else if (error.code === 'PHONE_NOT_VERIFIED') {
    navigate('/verify-phone', { userId: error.userId, phone: error.phone });
  }
}
```

---

### 6. Bank Account Management

**Current Status:** Database table exists, no CRUD endpoints

#### A. Add Bank Account
```typescript
POST /api/bank-accounts

Headers:
  Authorization: Bearer <access_token>

Body:
{
  "bankCode": "058",
  "accountNumber": "0123456789"
}

Flow:
1. Resolve account name
2. Save to database
3. Return saved account

Response (Success):
{
  "id": "uuid",
  "bankName": "GTBank",
  "bankCode": "058",
  "accountNumber": "0123456789",
  "accountName": "John Doe",
  "isVerified": true,
  "isPrimary": false
}
```

---

#### B. Get Bank Accounts
```typescript
GET /api/bank-accounts

Headers:
  Authorization: Bearer <access_token>

Response (Success):
{
  "accounts": [
    {
      "id": "uuid",
      "bankName": "GTBank",
      "accountNumber": "0123456789",
      "accountName": "John Doe",
      "isPrimary": true
    }
  ]
}
```

---

#### C. Set Primary Account
```typescript
PUT /api/bank-accounts/:id/set-primary

Response (Success):
{
  "success": true
}
```

---

#### D. Delete Bank Account
```typescript
DELETE /api/bank-accounts/:id

Response (Success):
{
  "success": true
}
```

---

### 7. Transaction Receipts

**Add receipt generation endpoint:**

```typescript
GET /api/wallet/transactions/:id/receipt

Headers:
  Authorization: Bearer <access_token>

Response (Success):
{
  "receipt": {
    "transactionId": "uuid",
    "reference": "TXN_DEP_123456",
    "type": "DEPOSIT",
    "amount": "₦10,000.00",
    "fee": "₦50.00",
    "total": "₦10,050.00",
    "status": "COMPLETED",
    "date": "Nov 11, 2025 - 10:30 AM",
    "balanceAfter": "₦125,450.00",
    "merchant": "RaverPay",
    "receiptUrl": "https://api.raverpay.com/receipts/pdf/uuid"
  }
}
```

**Bonus: Generate PDF**
```typescript
GET /api/wallet/transactions/:id/receipt/pdf

Response: PDF file download
```

---

## Nice-to-Have Updates (Phase 2)

### 8. Wallet-to-Wallet Transfer

```typescript
POST /api/wallet/transfer

Headers:
  Authorization: Bearer <access_token>

Body:
{
  "recipientIdentifier": "john@example.com", // or phone number
  "amount": 5000,
  "pin": "1234",
  "narration": "Payment for lunch"
}

Response (Success):
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "reference": "TXN_TRF_123456",
    "amount": 5000,
    "fee": 0,
    "total": 5000,
    "recipient": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

### 9. Beneficiary Management

```typescript
// Save favorite recipients
POST /api/beneficiaries
GET /api/beneficiaries?serviceType=AIRTIME
PUT /api/beneficiaries/:id
DELETE /api/beneficiaries/:id
```

---

### 10. Transaction Export

```typescript
GET /api/wallet/transactions/export?format=csv&from=2025-01-01&to=2025-12-31

Response: CSV/Excel file download
```

---

### 11. Account Statement

```typescript
GET /api/wallet/statement?from=2025-01-01&to=2025-12-31

Response: PDF file with all transactions
```

---

### 12. Scheduled Transactions (Recurring Payments)

```typescript
POST /api/scheduled-transactions

Body:
{
  "serviceType": "CABLE_TV",
  "frequency": "MONTHLY", // WEEKLY, MONTHLY
  "nextRunDate": "2025-12-01",
  "payload": { /* VTU payment details */ }
}
```

---

## Database Schema Changes

### Required Tables (Already Exist)
✅ User
✅ Wallet
✅ Transaction
✅ VTUOrder
✅ VirtualAccount
✅ BankAccount
✅ Notification
✅ AuditLog
✅ SystemConfig

### Add Missing Fields

#### User Table Updates
```prisma
model User {
  // Existing fields...

  // Add these:
  pinSetAt            DateTime?     // NEW: When PIN was set
  passwordResetAt     DateTime?     // NEW: Track password resets
  lastPasswordChange  DateTime?     // NEW: For security
}
```

---

## Implementation Guidelines

### Priority Order

**Week 1: Transaction PIN**
- [ ] Implement PIN encryption/hashing
- [ ] Create set-pin endpoint
- [ ] Create verify-pin endpoint
- [ ] Create change-pin endpoint
- [ ] Add rate limiting (prevent brute force)
- [ ] Update all transaction endpoints to require PIN
- [ ] Write tests

**Week 2: Password Reset**
- [ ] Implement forgot-password endpoint
- [ ] Implement verify-reset-code endpoint
- [ ] Implement reset-password endpoint
- [ ] Create email templates
- [ ] Add rate limiting
- [ ] Write tests

**Week 3: Profile Picture + Notifications**
- [ ] Setup Cloudinary
- [ ] Implement upload-avatar endpoint
- [ ] Implement delete-avatar endpoint
- [ ] Implement get-notifications endpoint
- [ ] Implement mark-as-read endpoints
- [ ] Add notification triggers to existing services
- [ ] Write tests

**Week 4: Bank Accounts + Polish**
- [ ] Implement bank account CRUD endpoints
- [ ] Fix login email verification check
- [ ] Add transaction receipts
- [ ] Testing & bug fixes
- [ ] Documentation

---

### Environment Variables to Add

```bash
# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OneSignal (for push notifications)
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key
```

---

### Testing Checklist

For each new endpoint:
- [ ] Unit tests (service methods)
- [ ] E2E tests (API endpoints)
- [ ] Error handling tests
- [ ] Rate limiting tests
- [ ] Security tests (auth, ownership)
- [ ] Input validation tests
- [ ] Edge case tests

---

## Summary

### Critical (Must Have)
1. ✅ Transaction PIN system
2. ✅ Password reset flow
3. ✅ Profile picture upload
4. ✅ Notifications endpoints

### Important (Should Have)
5. ✅ Enhanced login verification check
6. ✅ Bank account management
7. ✅ Transaction receipts

### Nice to Have (Could Have)
8. ⏳ Wallet transfers
9. ⏳ Beneficiary management
10. ⏳ Transaction export
11. ⏳ Recurring payments

**Estimated Development Time:**
- Critical updates: 3-4 weeks
- Important updates: 1-2 weeks
- Nice-to-have: 2-3 weeks

**Total:** ~8 weeks for complete feature set

---

## Next Steps

1. ✅ Review this document
2. ✅ Prioritize features
3. ✅ Create implementation tasks
4. ✅ Start with Transaction PIN (highest priority)
5. ✅ Test each feature thoroughly
6. ✅ Update mobile app as endpoints are ready

Once these updates are complete, the RaverPay platform will be fully production-ready! 🚀
