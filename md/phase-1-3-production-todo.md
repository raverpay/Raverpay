# Phase 1.3: Production Implementation TODO

**MularPay - User Management & KYC Production Readiness**

---

## 📋 Overview

Phase 1.3 is currently functional with mock implementations. Before deploying to production, we need to integrate actual third-party services for email, SMS, and identity verification.

---

## 🔴 Critical: Third-Party Integrations

### 1. Email Verification Service ✉️

**Current State:** Console logging verification codes

**Production Implementation:**

**Option A: Resend (Recommended for Nigeria)**

- ✅ Modern API, great DX
- ✅ Good deliverability
- ✅ Generous free tier: 3,000 emails/month
- ✅ Simple API
- **Cost:** $20/month for 50K emails

```bash
npm install resend
```

**Option B: SendGrid**

- ✅ Established service
- ✅ Good for high volume
- ✅ Free tier: 100 emails/day
- **Cost:** $19.95/month for 50K emails

**Option C: AWS SES**

- ✅ Very cheap ($.10 per 1000 emails)
- ✅ Highly scalable
- ❌ Requires AWS setup
- ❌ More complex

**Implementation Tasks:**

- [ ] Choose email provider
- [ ] Sign up and get API keys
- [ ] Add API keys to environment variables
- [ ] Create email templates (HTML + plain text)
- [ ] Implement email service wrapper
- [ ] Add retry logic for failed sends
- [ ] Add email delivery tracking
- [ ] Test email deliverability to major providers (Gmail, Yahoo, Outlook)
- [ ] Implement email verification links (alternative to codes)
- [ ] Add unsubscribe functionality (legal requirement)

**Recommendation:** **Resend** - Best for Nigerian startups, modern API

---

### 2. SMS/Phone Verification Service 📱

**Current State:** Console logging verification codes

**Production Implementation:**

**Option A: Termii (Recommended - Nigerian)**

- ✅ Nigerian company, local support
- ✅ Great for Nigerian phone numbers
- ✅ Competitive pricing
- ✅ WhatsApp integration available
- **Cost:** ~₦2.50 per SMS

```bash
npm install axios # For API calls
```

**Option B: Africa's Talking**

- ✅ Pan-African coverage
- ✅ Reliable delivery
- ✅ Multiple channels (SMS, Voice, USSD)
- **Cost:** ~$0.01 per SMS

**Option C: Twilio**

- ✅ Global coverage
- ✅ Most reliable
- ❌ More expensive for Nigeria
- **Cost:** $0.0079 per SMS + markup

**Implementation Tasks:**

- [ ] Choose SMS provider
- [ ] Sign up and get API keys
- [ ] Add API keys to environment variables
- [ ] Implement SMS service wrapper
- [ ] Add rate limiting (prevent SMS bombing)
- [ ] Add retry logic for failed sends
- [ ] Track delivery status via webhooks
- [ ] Implement fallback to voice call if SMS fails
- [ ] Add cost tracking per SMS
- [ ] Handle invalid/unreachable phone numbers
- [ ] Implement phone number normalization (08012345678 → +2348012345678)

**Recommendation:** **Termii** - Best for Nigerian market, cost-effective

---

### 3. BVN Verification Service 🏦

**Current State:** Mock simulation (always returns valid)

**Production Implementation:**

**Option A: Mono (Recommended)**

- ✅ Nigerian company
- ✅ Fast verification (< 2 seconds)
- ✅ Instant BVN lookup
- ✅ Also does account verification, direct debit
- ✅ Great documentation
- **Cost:** ₦100-150 per lookup

```bash
npm install @mono.co/connect-node
```

**Option B: Okra**

- ✅ Nigerian company
- ✅ Multiple verification types
- ✅ Open banking features
- **Cost:** Similar to Mono

**Option C: Dojah**

- ✅ Multiple African countries
- ✅ BVN, NIN, driver's license, etc.
- ✅ KYC as a service
- **Cost:** ₦150-200 per lookup

**Option D: Flutterwave Identity**

- ✅ Part of Flutterwave ecosystem
- ✅ BVN and other verifications
- **Cost:** ₦100 per lookup

**Implementation Tasks:**

- [ ] Choose BVN verification provider
- [ ] Sign up for sandbox/test environment
- [ ] Get API keys (test + production)
- [ ] Add API keys to environment variables
- [ ] Implement BVN service wrapper
- [ ] Handle BVN verification responses
- [ ] Store BVN verification metadata (name, DOB, phone match)
- [ ] Implement consent flow (users must consent to BVN check)
- [ ] Add rate limiting (prevent abuse)
- [ ] Handle failed verifications gracefully
- [ ] Implement retry logic for network failures
- [ ] Add cost tracking per verification
- [ ] Store verification attempts for audit
- [ ] Handle edge cases (invalid BVN, mismatch, etc.)
- [ ] Implement webhook handling for async verifications
- [ ] Add BVN data validation (name matching, DOB matching)

**Recommendation:** **Mono** - Most popular for Nigerian fintech, reliable

---

### 4. NIN Verification Service 🆔

**Current State:** Mock simulation (always returns valid)

**Production Implementation:**

**Option A: Mono**

- ✅ Also supports NIN verification
- ✅ Same API as BVN
- ✅ Bundle pricing available
- **Cost:** ₦200-250 per lookup

**Option B: Dojah (Recommended for NIN)**

- ✅ Specializes in identity verification
- ✅ Fast NIN lookups
- ✅ Returns photo and other details
- ✅ Virtual NIN support
- **Cost:** ₦200 per lookup

**Option C: Youverify**

- ✅ Enterprise-grade verification
- ✅ Multiple ID types
- ✅ Fraud detection
- **Cost:** Custom pricing

**Implementation Tasks:**

- [ ] Choose NIN verification provider
- [ ] Sign up for sandbox/test environment
- [ ] Get API keys (test + production)
- [ ] Add API keys to environment variables
- [ ] Implement NIN service wrapper
- [ ] Handle NIN verification responses
- [ ] Store NIN verification metadata (name, DOB, address, photo)
- [ ] Implement consent flow (NDPR compliance)
- [ ] Add rate limiting
- [ ] Handle failed verifications
- [ ] Implement retry logic
- [ ] Add cost tracking
- [ ] Store verification attempts
- [ ] Handle edge cases (invalid NIN, virtual NIN, etc.)
- [ ] Implement webhook handling
- [ ] Add NIN data validation (name/DOB matching with BVN)
- [ ] Store user photo securely (if returned)

**Recommendation:** **Dojah** or **Mono** - Both excellent for NIN

---

## 🟡 Important: Security & Compliance

### 5. Data Protection & NDPR Compliance 🔒

**Implementation Tasks:**

- [ ] Add user consent checkboxes for data collection
- [ ] Create privacy policy
- [ ] Create terms of service
- [ ] Implement data retention policies
- [ ] Add data encryption at rest (BVN, NIN)
- [ ] Implement data deletion (right to be forgotten)
- [ ] Add audit logging for all PII access
- [ ] Implement data export functionality
- [ ] Add consent withdrawal mechanism
- [ ] Create data processing agreement (DPA)

### 6. Rate Limiting & Abuse Prevention 🛡️

**Implementation Tasks:**

- [ ] Add rate limiting for verification endpoints
  - Email: Max 3 per hour
  - SMS: Max 3 per hour
  - BVN: Max 3 per day
  - NIN: Max 3 per day
- [ ] Implement IP-based rate limiting
- [ ] Add CAPTCHA for verification requests
- [ ] Block disposable email addresses
- [ ] Implement phone number validation
- [ ] Add device fingerprinting
- [ ] Create abuse detection system
- [ ] Implement account suspension for suspicious activity

### 7. Verification Code Security 🔐

**Implementation Tasks:**

- [ ] Implement code expiration (currently not checked!)
  - Email codes: 10 minutes
  - SMS codes: 10 minutes
- [ ] Add maximum retry attempts (3-5 attempts)
- [ ] Implement exponential backoff for failed attempts
- [ ] Hash verification codes before storing
- [ ] Add code length variation (6-8 digits)
- [ ] Implement brute force protection
- [ ] Add account lockout after failed attempts
- [ ] Send alerts for suspicious verification attempts

---

## 🟢 Nice to Have: Enhancements

### 8. Email Improvements ✉️

**Implementation Tasks:**

- [ ] Create branded email templates
- [ ] Add company logo and branding
- [ ] Implement "magic link" as alternative to code
- [ ] Add "verify later" option
- [ ] Send welcome email after registration
- [ ] Send notification email after verification
- [ ] Add email change flow with re-verification
- [ ] Implement email forwarding detection

### 9. SMS Improvements 📱

**Implementation Tasks:**

- [ ] Implement SMS templates with branding
- [ ] Add fallback to WhatsApp messages
- [ ] Implement voice call verification as fallback
- [ ] Send SMS in multiple languages (English, Yoruba, Hausa, Igbo)
- [ ] Add phone number change flow with re-verification
- [ ] Implement SIM swap detection
- [ ] Add delivery receipts tracking

### 10. KYC Improvements 🎯

**Implementation Tasks:**

- [ ] Add document upload (driver's license, passport)
- [ ] Implement facial recognition (selfie verification)
- [ ] Add liveness detection (blink, turn head)
- [ ] Implement address verification (utility bill)
- [ ] Add automated document extraction (OCR)
- [ ] Create KYC verification dashboard for admins
- [ ] Implement manual review workflow for edge cases
- [ ] Add KYC expiration (re-verify annually)
- [ ] Implement risk scoring
- [ ] Add sanctions screening

### 11. Monitoring & Analytics 📊

**Implementation Tasks:**

- [ ] Add verification success/failure metrics
- [ ] Track verification costs
- [ ] Monitor API response times
- [ ] Track conversion rates (registration → verification)
- [ ] Add alerts for verification service downtime
- [ ] Implement dashboard for admin monitoring
- [ ] Track verification attempt patterns
- [ ] Add fraud detection metrics

---

## 💰 Cost Estimates (Monthly)

### Low Volume (1,000 users/month)

| Service   | Provider | Cost                        |
| --------- | -------- | --------------------------- |
| Email     | Resend   | Free (< 3K emails)          |
| SMS       | Termii   | ₦2,500 (~1K SMS × ₦2.50)    |
| BVN       | Mono     | ₦125,000 (1K × ₦125)        |
| NIN       | Dojah    | ₦200,000 (1K × ₦200)        |
| **Total** |          | **~₦327,500/month** (~$400) |

### Medium Volume (10,000 users/month)

| Service   | Provider | Cost                            |
| --------- | -------- | ------------------------------- |
| Email     | Resend   | $20/month                       |
| SMS       | Termii   | ₦25,000 (~10K SMS)              |
| BVN       | Mono     | ₦1,250,000 (10K × ₦125)         |
| NIN       | Dojah    | ₦2,000,000 (10K × ₦200)         |
| **Total** |          | **~₦3,300,000/month** (~$4,000) |

**Note:** Negotiate bulk pricing with providers for high volume!

---

## 🚀 Implementation Priority

### Phase 1: MVP (Week 1-2)

1. ✅ **Termii Integration** - SMS verification (most critical)
2. ✅ **Resend Integration** - Email verification
3. ✅ **Mono Integration** - BVN verification
4. ✅ **Code Expiration** - Security fix (CRITICAL!)
5. ✅ **Rate Limiting** - Prevent abuse

### Phase 2: Security (Week 3)

1. ✅ **Verification Code Hashing**
2. ✅ **Data Encryption**
3. ✅ **NDPR Compliance**
4. ✅ **Audit Logging**

### Phase 3: Enhancement (Week 4)

1. ⚪ NIN Integration (Dojah)
2. ⚪ Email Templates
3. ⚪ SMS Templates
4. ⚪ Monitoring Dashboard

### Phase 4: Advanced (Later)

1. ⚪ Document Upload
2. ⚪ Facial Recognition
3. ⚪ Risk Scoring
4. ⚪ Fraud Detection

---

## 📝 Environment Variables Needed

Add to `.env`:

```bash
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# SMS Service (Termii)
TERMII_API_KEY=TL_xxxxxxxxxxxxx
TERMII_SENDER_ID=MularPay

# BVN Verification (Mono)
MONO_SECRET_KEY=sk_test_xxxxxxxxxxxxx
MONO_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx

# NIN Verification (Dojah)
DOJAH_APP_ID=xxxxxxxxxxxxx
DOJAH_SECRET_KEY=xxxxxxxxxxxxx
DOJAH_PUBLIC_KEY=xxxxxxxxxxxxx

# Feature Flags
ENABLE_EMAIL_VERIFICATION=true
ENABLE_SMS_VERIFICATION=true
ENABLE_BVN_VERIFICATION=true
ENABLE_NIN_VERIFICATION=true

# Rate Limits
EMAIL_VERIFICATION_RATE_LIMIT=3 # per hour
SMS_VERIFICATION_RATE_LIMIT=3 # per hour
BVN_VERIFICATION_RATE_LIMIT=3 # per day
NIN_VERIFICATION_RATE_LIMIT=3 # per day

# Verification Settings
VERIFICATION_CODE_EXPIRY_MINUTES=10
MAX_VERIFICATION_ATTEMPTS=5
```

---

## 🔧 Code Structure Recommendation

Create service wrappers:

```
apps/mularpay-api/src/
├── services/
│   ├── email/
│   │   ├── email.service.ts          # Abstract interface
│   │   ├── resend.service.ts         # Resend implementation
│   │   └── email.templates.ts        # Email templates
│   ├── sms/
│   │   ├── sms.service.ts            # Abstract interface
│   │   ├── termii.service.ts         # Termii implementation
│   │   └── sms.templates.ts          # SMS templates
│   ├── identity/
│   │   ├── identity.service.ts       # Abstract interface
│   │   ├── mono.service.ts           # Mono implementation
│   │   ├── dojah.service.ts          # Dojah implementation
│   │   └── identity.types.ts         # Shared types
│   └── verification/
│       ├── verification.service.ts   # Main verification logic
│       └── verification.helpers.ts   # Helpers (expiry, hashing)
```

---

## 📚 Documentation Links

### Email Services

- **Resend:** https://resend.com/docs
- **SendGrid:** https://docs.sendgrid.com

### SMS Services

- **Termii:** https://developers.termii.com
- **Africa's Talking:** https://developers.africastalking.com
- **Twilio:** https://www.twilio.com/docs

### Identity Verification

- **Mono:** https://docs.mono.co
- **Dojah:** https://docs.dojah.io
- **Okra:** https://docs.okra.ng
- **Youverify:** https://docs.youverify.co

### Compliance

- **NDPR:** https://ndpr.nitda.gov.ng
- **CBN Guidelines:** https://www.cbn.gov.ng

---

## ✅ Testing Checklist (Before Production)

- [ ] Test email delivery to all major providers
- [ ] Test SMS delivery to all Nigerian networks (MTN, Glo, Airtel, 9mobile)
- [ ] Test BVN verification with real BVNs (sandbox)
- [ ] Test NIN verification with real NINs (sandbox)
- [ ] Load test verification endpoints
- [ ] Test rate limiting
- [ ] Test verification code expiration
- [ ] Test failed verification handling
- [ ] Test webhook handling
- [ ] Security audit (pen testing)
- [ ] NDPR compliance review
- [ ] Cost monitoring setup
- [ ] Error tracking setup (Sentry)
- [ ] Monitoring setup (DataDog, New Relic)

---

## 🎯 Success Metrics

Track these metrics post-implementation:

- **Email Verification Rate:** > 80%
- **SMS Delivery Rate:** > 95%
- **BVN Verification Success Rate:** > 90%
- **NIN Verification Success Rate:** > 85%
- **Time to Complete Verification:** < 5 minutes
- **Cost per User Verification:** < ₦500
- **False Positive Rate:** < 5%
- **Support Tickets (Verification Issues):** < 10%

---

**Last Updated:** November 9, 2025  
**Phase:** 1.3 Production Readiness  
**Status:** Planning 📋
