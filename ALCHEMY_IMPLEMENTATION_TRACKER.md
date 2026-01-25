# Alchemy Integration - Implementation Tracker

**Branch**: `feature/alchemy-integration`  
**Started**: January 25, 2026  
**Status**: 🟡 In Progress

---

## Implementation Phases

### Phase 1: Database Schema & Infrastructure ✅ COMPLETE
**Goal**: Set up database models and core infrastructure  
**Duration**: Day 1  
**Completed**: 2026-01-25

#### Tasks:
- [x] 1.1 Add Alchemy models to Prisma schema
- [x] 1.2 Run database migration (manual SQL)
- [x] 1.3 Verify tables created
- [x] 1.4 Generate Prisma client
- [x] 1.5 Verify TypeScript compilation

**Files Created/Modified**:
- ✅ `apps/raverpay-api/prisma/schema.prisma` (added 4 models + 4 enums + User relations)
- ✅ `apps/raverpay-api/prisma/migrations/add_alchemy_models.sql` (manual migration)

**Verification**:
```bash
# All 4 tables created successfully
✅ alchemy_wallets
✅ alchemy_transactions  
✅ alchemy_user_operations
✅ alchemy_gas_spending

# Prisma client generated: ✅
# TypeScript compilation: ✅ No errors
```

---

### Phase 0.5: Configure Shadow Database (OPTIONAL) ⏸️ BACKLOG
**Goal**: Fix Prisma migrate issues by configuring shadow database  
**Duration**: 30 minutes  
**Priority**: Medium (Quality of Life improvement)  
**Recommendation**: Do this later, after Phase 10

#### Why This Matters:
Currently using manual SQL migrations as a workaround because Supabase doesn't allow Prisma to auto-create shadow databases. Configuring a permanent shadow database enables:
- ✅ Proper `prisma migrate dev` workflow
- ✅ Automatic schema drift detection
- ✅ Data loss warnings before applying migrations
- ✅ Better team collaboration

#### Tasks:
- [ ] 0.5.1 Create shadow database/schema in Supabase
- [ ] 0.5.2 Add `SHADOW_DATABASE_URL` to .env
- [ ] 0.5.3 Add `shadowDatabaseUrl` to datasource in schema.prisma
- [ ] 0.5.4 Test with `prisma migrate dev --create-only --name test`
- [ ] 0.5.5 Update team documentation

**Files to Modify**:
- `apps/raverpay-api/.env` (add `SHADOW_DATABASE_URL`)
- `apps/raverpay-api/prisma/schema.prisma` (add `shadowDatabaseUrl` field)

**Reference**: See `PRISMA_SHADOW_DATABASE_SETUP.md` for detailed guide

**Decision**: ⏸️ **Defer to later** - Current manual SQL approach works fine. This is a nice-to-have improvement, not critical for Alchemy integration.

---

### Phase 2: Core Services - Encryption & Configuration ⏸️ PENDING
**Goal**: Set up encryption and configuration services  
**Duration**: Day 1-2

#### Tasks:
- [ ] 2.1 Create AlchemyKeyEncryptionService
- [ ] 2.2 Create AlchemyConfigService
- [ ] 2.3 Add unit tests for encryption
- [ ] 2.4 Verify encryption/decryption works
- [ ] 2.5 Test network configuration retrieval

**Files to Create**:
- `apps/raverpay-api/src/alchemy/encryption/alchemy-key-encryption.service.ts`
- `apps/raverpay-api/src/alchemy/encryption/alchemy-key-encryption.service.spec.ts`
- `apps/raverpay-api/src/alchemy/config/alchemy-config.service.ts`
- `apps/raverpay-api/src/alchemy/config/alchemy-config.service.spec.ts`

---

### Phase 3: Wallet Services - EOA Generation ⏸️ PENDING
**Goal**: Implement basic EOA wallet generation for testing  
**Duration**: Day 2

#### Tasks:
- [ ] 3.1 Create AlchemyWalletGenerationService
- [ ] 3.2 Implement generateEOAWallet method
- [ ] 3.3 Implement getDecryptedPrivateKey method (internal use only)
- [ ] 3.4 Add unit tests
- [ ] 3.5 Test wallet generation on testnet

**Files to Create**:
- `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts`
- `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.spec.ts`

---

### Phase 4: Transaction Services - Basic Transfers ⏸️ PENDING
**Goal**: Implement USDC/USDT transfers using EOA  
**Duration**: Day 2-3

#### Tasks:
- [ ] 4.1 Create AlchemyTransactionService
- [ ] 4.2 Implement sendToken method (EOA-based)
- [ ] 4.3 Implement getTokenBalance method
- [ ] 4.4 Implement getTransactionHistory method
- [ ] 4.5 Add unit tests
- [ ] 4.6 Test on testnet (Base Sepolia)

**Files to Create**:
- `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.ts`
- `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.spec.ts`

---

### Phase 5: Webhook Integration ⏸️ PENDING
**Goal**: Set up webhook handlers for transaction updates  
**Duration**: Day 3

#### Tasks:
- [ ] 5.1 Create AlchemyWebhookService
- [ ] 5.2 Create AlchemyWebhookController
- [ ] 5.3 Implement signature verification
- [ ] 5.4 Implement address activity handler
- [ ] 5.5 Test webhook locally (using ngrok or similar)
- [ ] 5.6 Register webhook on Alchemy dashboard

**Files to Create**:
- `apps/raverpay-api/src/alchemy/webhooks/alchemy-webhook.service.ts`
- `apps/raverpay-api/src/alchemy/webhooks/alchemy-webhook.controller.ts`
- `apps/raverpay-api/src/alchemy/webhooks/dto/webhook.dto.ts`

---

### Phase 6: Module Setup & Controller ⏸️ PENDING
**Goal**: Wire everything together in a module with API endpoints  
**Duration**: Day 3-4

#### Tasks:
- [ ] 6.1 Create AlchemyModule
- [ ] 6.2 Create AlchemyController (main endpoints)
- [ ] 6.3 Add Swagger documentation
- [ ] 6.4 Test all endpoints with Postman/Swagger
- [ ] 6.5 Add rate limiting
- [ ] 6.6 Add authentication guards

**Files to Create**:
- `apps/raverpay-api/src/alchemy/alchemy.module.ts`
- `apps/raverpay-api/src/alchemy/alchemy.controller.ts`
- `apps/raverpay-api/src/alchemy/dto/*.dto.ts` (various DTOs)

---

### Phase 7: Smart Account Integration (Production-Ready) ⏸️ PENDING
**Goal**: Implement gas-sponsored Smart Accounts  
**Duration**: Day 4-5

#### Tasks:
- [ ] 7.1 Install Alchemy SDK (`@alchemy/aa-sdk`)
- [ ] 7.2 Implement generateSmartAccount method
- [ ] 7.3 Implement sendUSDCWithSmartAccount method
- [ ] 7.4 Test on testnet with Gas Manager
- [ ] 7.5 Verify gas is sponsored (check Gas Manager dashboard)
- [ ] 7.6 Add fallback to EOA if Smart Account fails

**Files to Modify**:
- `apps/raverpay-api/package.json` (add SDK)
- `apps/raverpay-api/src/alchemy/wallets/alchemy-wallet-generation.service.ts`
- `apps/raverpay-api/src/alchemy/transactions/alchemy-transaction.service.ts`

---

### Phase 8: Admin Dashboard Integration ⏸️ PENDING
**Goal**: Add admin endpoints and UI for monitoring  
**Duration**: Day 5-6

#### Tasks:
- [ ] 8.1 Create AdminAlchemyController (API)
- [ ] 8.2 Implement wallet listing endpoint
- [ ] 8.3 Implement transaction monitoring endpoint
- [ ] 8.4 Implement gas spending analytics endpoint
- [ ] 8.5 Create admin UI pages (Next.js)
- [ ] 8.6 Test admin dashboard

**Files to Create**:
- `apps/raverpay-api/src/admin/alchemy/admin-alchemy.controller.ts`
- `apps/raverpay-admin/app/alchemy/wallets/page.tsx`
- `apps/raverpay-admin/app/alchemy/transactions/page.tsx`
- `apps/raverpay-admin/app/alchemy/gas-spending/page.tsx`

---

### Phase 9: Testing & Validation ⏸️ PENDING
**Goal**: Comprehensive testing on testnet  
**Duration**: Day 6-7

#### Tasks:
- [ ] 9.1 Create 5 test wallets
- [ ] 9.2 Send 10 test transactions
- [ ] 9.3 Verify webhooks received
- [ ] 9.4 Test gas sponsorship working
- [ ] 9.5 Test internal transfers
- [ ] 9.6 Load testing (50+ concurrent transactions)
- [ ] 9.7 Security audit (internal)

---

### Phase 10: Documentation & Deployment Prep ⏸️ PENDING
**Goal**: Prepare for production deployment  
**Duration**: Day 7

#### Tasks:
- [ ] 10.1 Update API documentation
- [ ] 10.2 Create deployment runbook
- [ ] 10.3 Set up monitoring and alerts
- [ ] 10.4 Create rollback plan
- [ ] 10.5 Team training/walkthrough
- [ ] 10.6 Get security sign-off

---

## Current Phase Details

### Phase 1: Database Schema & Infrastructure

**What we're doing now**:
1. Adding Alchemy models to Prisma schema
2. Running database migration
3. Verifying everything compiles

**Dependencies**:
- ✅ Environment variables added (encryption key, gas policy)
- ✅ Branch created (`feature/alchemy-integration`)
- ⏳ Prisma schema changes

**Next Steps**:
1. Add models to `schema.prisma`
2. Run migration
3. Generate Prisma client
4. Move to Phase 2

---

## Environment Variables Checklist

**Development (.env)**:
- [x] `ALCHEMY_DEV_API_KEY` - Set
- [x] `ALCHEMY_DEV_BASE_SEPOLIA_RPC` - Set
- [x] `ALCHEMY_DEV_POLYGON_AMOY_RPC` - Set
- [x] `ALCHEMY_DEV_ARBITRUM_SEPOLIA_RPC` - Set
- [x] `ALCHEMY_DEV_GAS_POLICY_ID` - Set
- [x] `ALCHEMY_ENCRYPTION_MASTER_KEY` - Set
- [ ] `ALCHEMY_WEBHOOK_SIGNING_SECRET` - Get from dashboard after webhook creation

---

## Dependencies to Install (Later Phases)

**Phase 7 (Smart Accounts)**:
```bash
pnpm install @alchemy/aa-sdk @alchemy/aa-core @alchemy/aa-accounts
```

**Already Installed**:
- ✅ `viem` (v2.21.27) - In raverpay-admin
- ✅ `ethers` (need to verify version in raverpay-api)

---

## Testing Checklist (Per Phase)

**After Phase 1**:
- [ ] Tables exist in database
- [ ] Prisma client generates without errors
- [ ] TypeScript compiles with no errors

**After Phase 2**:
- [ ] Can encrypt a private key
- [ ] Can decrypt it back
- [ ] Can get network config for Base Sepolia

**After Phase 3**:
- [ ] Can generate EOA wallet
- [ ] Wallet saved to database
- [ ] Can retrieve wallet from database

**After Phase 4**:
- [ ] Can check USDC balance
- [ ] Can send USDC (testnet)
- [ ] Transaction saved to database

**After Phase 5**:
- [ ] Webhook endpoint responds
- [ ] Signature verification works
- [ ] Transaction status updates on webhook

**After Phase 6**:
- [ ] All API endpoints documented
- [ ] Swagger UI works
- [ ] Can create wallet via API
- [ ] Can send transaction via API

**After Phase 7**:
- [ ] Smart Account wallet created
- [ ] Gas is sponsored (check dashboard)
- [ ] User doesn't need POL/ETH
- [ ] Transaction succeeds

---

## Risk Tracking

| Risk | Mitigation | Status |
|------|------------|--------|
| Private key encryption fails | Use tested MfaEncryptionUtil pattern | ✅ Mitigated |
| Prisma migration fails | Use manual SQL workaround | ✅ Plan ready |
| Gas Manager not working | Keep EOA fallback | ⏸️ Pending Phase 7 |
| Smart Account SDK issues | Test early, have support contact | ⏸️ Pending Phase 7 |
| Webhook signature mismatch | Test with Alchemy examples | ⏸️ Pending Phase 5 |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-25 | Use pnpm not npm | Project standard |
| 2026-01-25 | Start with EOA, then Smart Accounts | Learn basics first, production later |
| 2026-01-25 | Use Polygon Amoy testnet | Mumbai deprecated |
| 2026-01-25 | Phased implementation | Systematic, trackable progress |

---

## Progress Summary

**Overall Progress**: 1/10 phases complete (10%)

**Phase 1**: 5/5 tasks complete (100%) ✅  
**Phase 2**: 0/5 tasks complete (0%)  
**Phase 3**: 0/5 tasks complete (0%)  
**Phase 4**: 0/6 tasks complete (0%)  
**Phase 5**: 0/6 tasks complete (0%)  
**Phase 6**: 0/6 tasks complete (0%)  
**Phase 7**: 0/6 tasks complete (0%)  
**Phase 8**: 0/6 tasks complete (0%)  
**Phase 9**: 0/7 tasks complete (0%)  
**Phase 10**: 0/6 tasks complete (0%)

---

## Notes & Issues

### 2026-01-25 - 12:05 PM
- ✅ **Phase 1 COMPLETE**: Database schema & infrastructure
- ✅ Created 4 Alchemy tables successfully using manual SQL migration
- ✅ Prisma client regenerated - all types available
- ✅ TypeScript compilation successful - 0 errors
- ✅ Committed to `feature/alchemy-integration` branch
- 📝 Note: Used manual SQL migration due to Prisma shadow database issues (expected per PRISMA_MIGRATION_WORKAROUND.md)
- ⏭️ **Next**: Starting Phase 2 - Core Services (Encryption & Configuration)

### 2026-01-25 - 11:59 AM
- ✅ Created branch `feature/alchemy-integration`
- ✅ Added encryption master key to .env
- ✅ Added gas policy ID to .env
- ⏳ Starting Phase 1: Database schema

---

## Quick Commands Reference

```bash
# Check current branch
git branch

# Generate Prisma client
cd apps/raverpay-api && pnpm prisma generate

# Run migration
cd apps/raverpay-api && pnpm prisma migrate dev --name add_alchemy_models

# Manual SQL migration (if needed)
cd apps/raverpay-api && psql "$DIRECT_URL" -f prisma/migrations/add_alchemy_models.sql

# TypeScript check
cd apps/raverpay-api && pnpm exec tsc --noEmit

# Run API
cd apps/raverpay-api && pnpm dev

# Run tests
cd apps/raverpay-api && pnpm test
```

---

**Last Updated**: 2026-01-25 11:59:51  
**Next Review**: After each phase completion
