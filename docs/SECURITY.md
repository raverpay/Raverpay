# MularPay Security Guide

Critical security measures implemented and best practices for MularPay.

## 🔐 Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal permissions by default
3. **Zero Trust**: Verify everything
4. **Fail Secure**: Errors should deny access, not grant it

## ✅ Implemented Security Measures

### 1. Authentication & Authorization

#### Password Security
- **Argon2** hashing (stronger than bcrypt)
- Minimum 8 characters with complexity requirements
- Password reset with time-limited tokens
- Account lockout after failed attempts

```typescript
// Example: Password hashing
import * as argon2 from 'argon2';

async hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64MB
    timeCost: 3,
    parallelism: 1,
  });
}
```

#### JWT Authentication
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (7 days)
- Token rotation on refresh
- Secure HTTP-only cookies for web

#### Two-Factor Authentication (2FA)
- TOTP-based (Google Authenticator, Authy)
- Backup codes for recovery
- Required for high-value transactions

### 2. Transaction Security

#### PIN Protection
- 4-digit transaction PIN
- Encrypted at rest using AES-256
- Rate-limited attempts (3 tries, then lockout)
- Separate from login password

```typescript
// Transaction PIN flow
1. User sets PIN → Encrypted → Stored
2. Transaction initiated → PIN requested
3. PIN verified → Transaction processed
4. Failed attempts → Account locked
```

#### Idempotency
- Unique reference for each transaction
- Duplicate prevention via idempotency keys
- Database constraints on reference fields

```typescript
// Example: Idempotency check
if (await this.transactionExists(reference)) {
  throw new DuplicateTransactionError();
}
```

#### Double-Entry Bookkeeping
- Every transaction has debit and credit entries
- Atomic database operations (all or nothing)
- Balance verification before debit

```typescript
// Example: Atomic transaction
await prisma.$transaction([
  prisma.wallet.update({ where: { userId }, data: { balance: { decrement: amount } } }),
  prisma.transaction.create({ data: { userId, amount, type: 'WITHDRAWAL' } }),
]);
```

### 3. Data Protection

#### Encryption at Rest
- Database encryption (Supabase built-in)
- Sensitive fields encrypted (PIN, card details)
- Encryption key management (never in code)

```typescript
// Example: Field-level encryption
import crypto from 'crypto';

encryptPIN(pin: string): string {
  const key = process.env.ENCRYPTION_KEY; // 32 chars
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(pin, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}
```

#### Encryption in Transit
- HTTPS only (enforced via Helmet)
- TLS 1.2+ required
- HSTS headers enabled

### 4. Input Validation

#### Backend Validation
```typescript
// Example: DTO validation with class-validator
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  password: string;

  @Matches(/^0[789][01]\d{8}$/)
  phone: string;
}
```

#### SQL Injection Prevention
- Prisma ORM (parameterized queries)
- No raw SQL with user input
- Input sanitization

#### XSS Prevention
- Input sanitization
- Output encoding
- Content Security Policy headers

### 5. Rate Limiting

```typescript
// Global rate limiting
ThrottlerModule.forRoot([{
  ttl: 60000, // 1 minute
  limit: 100, // 100 requests
}])

// Per-endpoint rate limiting
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login() { }
```

### 6. CORS Configuration

```typescript
// Strict CORS (production)
app.enableCors({
  origin: ['https://mularpay.com', 'https://admin.mularpay.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});
```

### 7. Webhook Security

#### Signature Verification
```typescript
// Example: Paystack webhook verification
const hash = crypto
  .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (hash !== req.headers['x-paystack-signature']) {
  throw new UnauthorizedException('Invalid signature');
}
```

### 8. Logging & Monitoring

```typescript
// Audit logging
auditLog.create({
  userId,
  action: 'WITHDRAWAL',
  resourceId: transactionId,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  metadata: { amount, recipient },
});
```

**What to Log:**
- Authentication attempts (success & failure)
- Authorization failures
- Sensitive operations (withdrawals, transfers)
- Configuration changes
- Security events

**What NOT to Log:**
- Passwords (plain or hashed)
- PINs
- Credit card numbers
- JWT tokens

### 9. KYC & AML

#### KYC Tiers
```
Tier 0: Email only → ₦50k/day limit
Tier 1: Email + Phone + BVN → ₦300k/day limit
Tier 2: Full verification → ₦5M/day limit
Tier 3: Business verification → Unlimited
```

#### AML Monitoring
- Transaction pattern analysis
- Velocity checks (rapid transactions)
- Large transaction alerts
- Suspicious activity flagging

### 10. Secrets Management

**DO:**
- Use environment variables
- Use secret management services (GitHub Secrets)
- Rotate secrets regularly
- Different secrets per environment

**DON'T:**
- Commit secrets to Git
- Share secrets in Slack/email
- Use same secrets in staging/production
- Hardcode secrets in code

```bash
# Generate secure secrets
openssl rand -base64 32  # JWT secret
openssl rand -hex 16     # Encryption key
```

## 🚨 Security Checklist

### Development
- [ ] All environment variables in `.env` (not committed)
- [ ] Secrets use strong randomness
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't expose secrets

### Pre-Production
- [ ] Security audit completed
- [ ] Dependency vulnerabilities checked (`pnpm audit`)
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Helmet middleware enabled
- [ ] Database backups configured

### Production
- [ ] Different secrets from staging
- [ ] Monitoring/alerting configured (Sentry)
- [ ] Webhook signatures verified
- [ ] Regular security updates
- [ ] Incident response plan documented

## 🔍 Security Testing

### Automated Tests
```bash
# Dependency vulnerabilities
pnpm audit

# Known security issues
pnpm dlx snyk test

# TypeScript strict mode
tsc --strict --noEmit
```

### Manual Testing
- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] CSRF attempts
- [ ] Authentication bypass attempts
- [ ] Authorization bypass attempts
- [ ] Rate limit bypass attempts

## 🚑 Incident Response

### If a Security Breach Occurs:

1. **Contain**: Disable affected accounts/services
2. **Investigate**: Review logs, determine scope
3. **Notify**: Inform affected users (if PII exposed)
4. **Fix**: Patch vulnerability
5. **Monitor**: Watch for further attempts
6. **Document**: Post-mortem analysis

### Contact

Security issues: security@mularpay.com

## 📚 References

- OWASP Top 10: https://owasp.org/Top10/
- OWASP API Security: https://owasp.org/API-Security/
- NDPR (Nigeria): https://ndpr.nitda.gov.ng/
- PCI DSS (if handling cards): https://pcisecuritystandards.org/

## Regular Security Tasks

**Weekly:**
- Review failed login attempts
- Check for unusual transaction patterns
- Monitor error logs

**Monthly:**
- Update dependencies (`pnpm update`)
- Run security audit (`pnpm audit`)
- Review access logs
- Test backup restoration

**Quarterly:**
- Rotate secrets/API keys
- Security training for team
- Penetration testing
- Update incident response plan
