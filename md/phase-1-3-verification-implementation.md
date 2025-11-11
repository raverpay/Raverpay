# Phase 1.3: Email & SMS Verification Implementation

**MularPay - Real Verification Services Integration**

---

## 📋 Overview

Implementing production-ready email and SMS verification using:
- ✅ **Resend** for email (using audaciashippingholding.nl)
- ✅ **VTPass Messaging** for SMS (already have VTPass account)
- ⏸️ **BVN/NIN** verification (paused for later)

---

## 🎯 Implementation Steps

### **Part 1: Resend Email Setup** ✉️

#### Step 1: Domain Verification on Resend
1. Go to https://resend.com and sign up/login
2. Navigate to **Domains** section
3. Click **"Add Domain"**
4. Enter: `audaciashippingholding.nl`
5. Resend will provide DNS records to add

#### Step 2: Add DNS Records to Namecheap
You'll need to add these DNS records (Resend will give you exact values):

**Records to add in Namecheap DNS:**
```
Type: TXT
Host: @ (or audaciashippingholding.nl)
Value: [Resend verification code]
TTL: Automatic

Type: MX
Host: @
Value: feedback-smtp.eu-west-1.amazonses.com
Priority: 10
TTL: Automatic

Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rg=your-email@audaciashippingholding.nl
TTL: Automatic

Type: TXT (SPF)
Host: @
Value: v=spf1 include:amazonses.com ~all
TTL: Automatic

Type: CNAME (DKIM) - Resend gives 3 DKIM records
Host: [resend-provided-value]._domainkey
Value: [resend-provided-value].dkim.amazonses.com
TTL: Automatic
```

#### Step 3: Verify Domain
1. After adding DNS records, wait 5-15 minutes
2. Go back to Resend dashboard
3. Click **"Verify Domain"**
4. Status should change to ✅ **Verified**

#### Step 4: Get API Key
1. In Resend dashboard, go to **API Keys**
2. Click **"Create API Key"**
3. Name it: `MularPay Production`
4. Copy the key (starts with `re_`)
5. Save it securely!

#### Step 5: Configure Sending Email
- **From Email:** `noreply@audaciashippingholding.nl`
- **From Name:** `MularPay`
- **Reply-To:** `support@audaciashippingholding.nl` (optional)

---

### **Part 2: VTPass SMS Setup** 📱

#### Step 1: Get VTPass Messaging Credentials
1. Login to https://vtpass.com
2. Navigate to **Messaging Dashboard**
3. Find your **Public Key (X-Token)** and **Secret Key (X-Secret)**
4. Click the eye icon to reveal keys
5. Copy both keys

#### Step 2: Register Sender ID
1. In VTPass Messaging Dashboard
2. Go to **Sender IDs**
3. Register: `MularPay` (your app name)
4. Wait for approval (usually 24-48 hours)
5. Meanwhile, you can use `VTPass` as sender for testing

#### Step 3: Check SMS Balance
1. In VTPass Dashboard, check **SMS Units**
2. Top up if needed (recommended: start with ₦5,000)
3. 1 SMS page costs ~₦2-3

---

### **Part 3: Backend Implementation** 🔧

#### Step 1: Install Dependencies
```bash
cd apps/mularpay-api
pnpm add resend
```

#### Step 2: Update Environment Variables
```bash
# Add to .env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@audaciashippingholding.nl
RESEND_FROM_NAME=MularPay

# VTPass Messaging
VTPASS_MESSAGING_PUBLIC_KEY=VT_PK_xxxxxxxxxxxxx
VTPASS_MESSAGING_SECRET_KEY=VT_SK_xxxxxxxxxxxxx
VTPASS_SMS_SENDER=MularPay

# Verification Settings
VERIFICATION_CODE_EXPIRY_MINUTES=10
MAX_VERIFICATION_ATTEMPTS=3
```

#### Step 3: Create Services Structure
```
apps/mularpay-api/src/
├── services/
│   ├── email/
│   │   ├── email.module.ts
│   │   ├── email.service.ts
│   │   └── templates/
│   │       ├── verification-code.template.ts
│   │       └── welcome.template.ts
│   └── sms/
│       ├── sms.module.ts
│       ├── sms.service.ts
│       └── templates/
│           └── verification-code.template.ts
```

---

### **Part 4: Code Implementation** 💻

We'll create:
1. ✅ Email Service (Resend integration)
2. ✅ SMS Service (VTPass integration)
3. ✅ Email Templates
4. ✅ SMS Templates
5. ✅ Update Users Service to use real services
6. ✅ Add verification code expiration
7. ✅ Add rate limiting

---

## 📊 Cost Estimates

### Resend Email
- **Free Tier:** 3,000 emails/month
- **Paid:** $20/month for 50,000 emails
- **Cost per email:** ~$0.0004

### VTPass SMS
- **Normal Route:** ₦2-3 per SMS
- **DND Route:** ₦5-6 per SMS (for DND numbers)
- **Recommended:** Start with ₦5,000 (~2,000 SMS)

### Total Monthly (1,000 users)
- Email: Free (< 3,000 emails)
- SMS: ₦3,000 (~1,000 SMS × ₦3)
- **Total: ~₦3,000/month** (~$4)

---

## 🔄 Implementation Order

1. ✅ **Step 1:** Setup Resend (domain verification) - 30 mins
2. ✅ **Step 2:** Get VTPass Messaging keys - 5 mins
3. ✅ **Step 3:** Create email service - 20 mins
4. ✅ **Step 4:** Create SMS service - 20 mins
5. ✅ **Step 5:** Create templates - 15 mins
6. ✅ **Step 6:** Update users service - 15 mins
7. ✅ **Step 7:** Add verification expiration - 10 mins
8. ✅ **Step 8:** Test everything - 30 mins
9. ✅ **Step 9:** Deploy to Railway - 10 mins

**Total Time:** ~2.5 hours

---

## ✅ Testing Checklist

After implementation, test:
- [ ] Send email verification code
- [ ] Receive email in inbox (check spam!)
- [ ] Verify email code works
- [ ] Check code expiration (wait 10 mins)
- [ ] Send SMS verification code
- [ ] Receive SMS on Nigerian number
- [ ] Verify SMS code works
- [ ] Test rate limiting (3 attempts max)
- [ ] Test with invalid codes
- [ ] Test with expired codes

---

## 🎯 Next Steps After This

Once email/SMS verification works:
1. ✅ Start building mobile app
2. ✅ Users can register and verify
3. ✅ Fund wallet and use VTU services
4. ⏸️ BVN/NIN verification (later, when needed)

---

## 🚀 Why VTPass SMS vs Termii?

### **VTPass SMS (Recommended)**
- ✅ Already using VTPass for VTU
- ✅ Single vendor (simpler)
- ✅ Combined billing
- ✅ Similar pricing to Termii
- ✅ Good delivery rates
- ✅ No extra onboarding needed

### **Termii** (Alternative)
- ✅ Nigerian company
- ✅ Specialized in messaging
- ✅ Better analytics dashboard
- ❌ Additional vendor to manage
- ❌ Separate billing

**Decision: Use VTPass SMS** 🎖️

---

## 📝 Important Notes

1. **Domain Email:**
   - Don't use `storage@audaciashippingholding.nl` for sending
   - Use `noreply@audaciashippingholding.nl` instead
   - Keeps mailbox clean

2. **DNS Propagation:**
   - Takes 5-60 minutes usually
   - Can take up to 24 hours in rare cases
   - Use https://dnschecker.org to verify

3. **VTPass Sender ID:**
   - `MularPay` needs approval (24-48 hours)
   - Use `VTPass` for immediate testing
   - Once approved, switch to `MularPay`

4. **Rate Limiting:**
   - Prevent SMS/email bombing
   - Max 3 codes per hour per user
   - Protects your budget!

5. **Production vs Sandbox:**
   - VTPass uses same keys for both
   - Toggle in dashboard settings
   - Start with sandbox, move to live when ready

---

**Ready to implement?** Let me know and I'll start with the code! 🚀

