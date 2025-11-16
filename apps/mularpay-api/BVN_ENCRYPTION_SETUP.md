# BVN Encryption Setup Guide

## Overview

BVN (Bank Verification Number) encryption has been implemented to secure sensitive PII data at rest. All BVN values are now encrypted using AES-256-GCM before being stored in the database.

## Environment Variables Required

Add the following environment variables to your `.env` file:

```env
# BVN Encryption Key (REQUIRED)
# Generate a strong random key (32+ characters recommended)
BVN_ENCRYPTION_KEY=your-super-secret-encryption-key-here-minimum-32-characters

# BVN Encryption Salt (OPTIONAL)
# If not provided, uses BVN_ENCRYPTION_KEY as salt
BVN_ENCRYPTION_SALT=your-optional-salt-for-key-derivation
```

### Generating Encryption Key

**Option 1: Using Node.js**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**

```bash
openssl rand -hex 32
```

**Option 3: Online Generator**
Use a secure random string generator (32+ characters, mix of letters, numbers, and symbols)

## Migration Steps

### 1. Deploy Code Changes

Ensure all code changes are deployed to your environment.

### 2. Set Environment Variables

Add `BVN_ENCRYPTION_KEY` (and optionally `BVN_ENCRYPTION_SALT`) to your environment variables.

**Important:**

- Use different keys for dev/staging/production
- Store keys securely (use secrets management service)
- Never commit keys to version control

### 3. Run Migration Script

Encrypt existing plain text BVN values in the database:

```bash
pnpm run migrate:encrypt-bvns
```

Or directly:

```bash
ts-node scripts/encrypt-existing-bvns.ts
```

### 4. Verify Migration

Check the migration output for:

- Number of BVN values encrypted
- Number skipped (already encrypted)
- Any errors

### 5. Test Application

After migration:

1. Test BVN verification flow
2. Test virtual account creation with BVN
3. Verify BVN is encrypted in database
4. Verify BVN can be decrypted when needed for Paystack

## Security Best Practices

### Key Management

1. **Separate Keys Per Environment**
   - Use different `BVN_ENCRYPTION_KEY` for dev/staging/production
   - Never reuse keys across environments

2. **Key Rotation**
   - If you need to rotate keys, you'll need to:
     - Re-encrypt all BVN values with new key
     - Update environment variable
     - Re-run migration script (with decryption + re-encryption logic)

3. **Backup Keys Securely**
   - Store encryption keys in secure secrets management (e.g., AWS Secrets Manager, HashiCorp Vault)
   - Have backup keys stored securely offline
   - Document key location for authorized personnel only

### Logging

- All BVN values are automatically masked in logs (shows only last 4 digits: `*******1234`)
- Never log plain BVN values
- Review logs to ensure no plain BVN values are exposed

### Database

- BVN values are encrypted at rest
- Database backups will contain encrypted BVN values
- Ensure database backups are also encrypted and secured

## Troubleshooting

### Error: "BVN_ENCRYPTION_KEY environment variable is required"

**Solution:** Add `BVN_ENCRYPTION_KEY` to your `.env` file or environment variables.

### Error: "Failed to decrypt BVN"

**Possible Causes:**

- Wrong encryption key in environment
- BVN value corrupted
- BVN was encrypted with different key

**Solution:**

- Verify `BVN_ENCRYPTION_KEY` matches the key used for encryption
- Check database for corrupted values
- Re-run migration if key was changed incorrectly

### Migration Script Shows Errors

**Solution:**

- Review error messages in migration output
- Check individual user records that failed
- Verify encryption service is working correctly
- Re-run migration for failed records manually

## Testing

### Test BVN Encryption

1. Create a new user
2. Verify BVN (via `/users/verify-bvn` endpoint)
3. Check database - BVN should be encrypted (format: `iv:tag:encrypted`)
4. Check logs - BVN should be masked (e.g., `*******1234`)

### Test BVN Decryption

1. Create virtual account with BVN
2. Verify BVN is decrypted correctly for Paystack API call
3. Check webhook handler receives and encrypts BVN correctly

### Test Migration

1. Create test users with plain text BVN
2. Run migration script
3. Verify all BVN values are encrypted
4. Test application still works correctly

## Rollback Plan

If you need to rollback (not recommended):

1. **Warning:** Rollback requires decrypting all BVN values
2. Create a rollback script that decrypts all encrypted BVN values
3. Update code to not use encryption
4. Re-run rollback script
5. Update environment variables

**Note:** Only rollback if absolutely necessary and ensure you have proper backups.

## Support

For issues or questions:

1. Check logs for encryption/decryption errors
2. Verify environment variables are set correctly
3. Review migration script output
4. Test with a single user first before full migration

## Implementation Checklist

- [x] BVNEncryptionService created with encrypt/decrypt methods
- [x] UtilsModule created and registered globally
- [x] Virtual Accounts Service updated to encrypt/decrypt BVN
- [x] Users Service updated to encrypt BVN
- [x] Webhook Service updated to encrypt BVN from webhook
- [x] Migration script created for existing BVN values
- [x] Logging updated to mask BVN values
- [ ] Environment variables added to all environments
- [ ] Migration script run in staging
- [ ] Migration script run in production
- [ ] Application tested after migration
- [ ] Database backups verified to contain encrypted BVN values
