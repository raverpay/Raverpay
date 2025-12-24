# Sudo Cards Integration - User Features Guide

This document explains what administrators and end users will be able to do with the Sudo Cards integration in RaverPay.

---

## 🎯 Admin Dashboard Capabilities

### Fee Configuration Management

**What admins can do:**

- **View All Fee Configurations**: See all markup rates configured for different fee types
  - Filter by fee type (card creation, funding, authorization, ATM, dispute, maintenance)
  - Filter by card brand (Verve, Mastercard, Visa, AfriGo)
  - Filter by currency (NGN, USD)
  - See active/inactive status

- **Create Fee Configuration**: Set markup rates for specific fee types
  - Select fee type (card creation, funding, authorization, ATM withdrawal, dispute, quarterly maintenance)
  - Select card brand (Verve, Mastercard, Visa, AfriGo)
  - Select currency (NGN, USD)
  - Choose markup type (percentage or fixed amount)
  - Enter markup value (e.g., 100% markup, or ₦50 fixed markup)
  - Set active status

- **Edit Fee Configuration**: Update markup rates
  - Change markup type or value
  - Enable/disable configurations
  - Update affects all future fee calculations

- **View Fee Statistics**: Monitor fee revenue and costs
  - Total revenue from markups
  - Total costs paid to Sudo
  - Net profit from fees
  - Breakdown by fee type, card brand, currency
  - Historical trends

**How it works:**

- Admins configure markup rates in admin dashboard
- Markup rates stored in database (`SudoFeeConfig`)
- Mobile app fetches fee quotes from API before showing fees to users
- Fees calculated dynamically: Sudo cost (hardcoded) + RaverPay markup (from config)
- Changes to markup rates take effect immediately for new transactions

---

### Card Programs Setup (Manual via Sudo Dashboard)

**Note**: Card programs are created manually via the Sudo Dashboard. After creation, the program ID is stored in our database for use when creating cards via API.

**Information Required for Card Program Creation:**

Before creating card programs in the Sudo Dashboard, prepare the following information:

1. **Name**: A descriptive name (e.g., "RaverPay Virtual Cards", "Employee Expense Cards")

2. **Unique Reference**: A unique identifier (e.g., "RVRP-VIRTUAL-001" or timestamp-based)

3. **Description** (Optional): Additional details about the program

4. **Funding Source**: Choose one:
   - Default funding source (funds from customer wallet)
   - Account funding source (funds from your settlement account)
   - Gateway funding source (real-time approval via webhook - requires webhook URL)

5. **Card Brand**: Select from Verve, Visa (virtual only), MasterCard (virtual only), or AfriGo

6. **Card Type**: Virtual Card (online) or Physical Card (ATM/POS - requires card mapping)

7. **Issuer Country**: Nigeria (NGA)

8. **Currency**: NGN (or USD if applicable)

9. **Debit Account**: Your settlement account ID (must be created first in Sudo Dashboard)

10. **Spending Controls** (Optional but recommended):
    - **Channels**: Enable/disable ATM, POS, Web, Mobile
    - **Allowed Categories**: Specific merchant categories to allow (empty = all allowed)
    - **Blocked Categories**: Merchant categories to block
    - **Spending Limits**:
      - Amount (e.g., 100000 for NGN 100,000)
      - Interval: daily, weekly, monthly, yearly, per_authorization, all_time
      - Categories: Specific categories this limit applies to (empty = all categories)

**Steps:**

1. Log in to Sudo Dashboard: https://app.sandbox.sudo.cards (sandbox) or https://app.sudo.africa (production)
2. Navigate to Card Programs section
3. Click "Create Card Program"
4. Fill in all required fields
5. Configure spending controls as needed
6. Save the program
7. **Copy the Program ID** - This will be stored in our database for use when creating cards

**After Creation:**

- Program ID is stored in database
- Program can be selected when creating cards via our admin dashboard
- Program settings can be updated later in Sudo Dashboard if needed

---

### Cardholders Management

**Create Cardholders**

- Register individuals or businesses who can receive cards
- Enter personal/business information (name, address, phone, email)
- Add KYC details (BVN, NIN, identity documents)
- Set cardholder status (active, suspended, inactive)
- Link to RaverPay user account

**Manage Cardholders**

- Browse all registered cardholders with filters
- View full profile, billing address, KYC status, and all cards issued
- Edit details, update KYC information, change status
- View all transactions and authorizations for a specific cardholder

---

### Cards Management

**View All Cards**

- See every card issued across the platform
- Filter by status (active, frozen, terminated, canceled)
- Filter by type (virtual, physical)
- Filter by cardholder or card program
- Search by card number (masked)

**Card Details**

- Access comprehensive card information
- Card number (masked), expiry date, CVV (via secure display)
- Current balance and spending limits
- Spending controls (channels, categories, limits)
- Cardholder information
- Funding source details
- Card status and history

**Create Cards**

- Issue new cards to cardholders
- Select cardholder
- Choose card program (or create standalone card)
- Set initial spending controls
- Choose card type (virtual or physical)
- For physical cards: enter card number if mapping existing card

**Manage Card Status**

- **Freeze Card**: Temporarily block a card from being used (e.g., if lost or suspicious activity)
- **Unfreeze Card**: Reactivate a frozen card
- **Terminate Card**: Permanently cancel a card (cannot be reactivated)

**Update Spending Controls**

- Change daily/monthly/per-transaction limits
- Allow or block specific merchant categories
- Enable/disable channels (ATM, POS, Web, Mobile)
- Set category-specific limits (e.g., limit spending at restaurants to NGN 5,000/day)

**View Card Activity**

- See all transactions for a specific card
- View all authorization attempts (approved and declined)
- See decline reasons (insufficient funds, spending limit exceeded, blocked category, etc.)
- Monitor pending authorizations
- Review fraud detection flags

---

### Transactions & Authorizations Overview

**View All Card Transactions**

- Monitor all card transactions across the platform
- Filter by date range, card, cardholder, status, merchant category
- See transaction amounts, fees, and net amounts
- View refunds and reversals
- Export transaction data

**View All Authorizations**

- Monitor all authorization attempts
- See real-time authorization requests
- View approval/decline rates
- Monitor authorization response times
- Identify patterns (fraud, declined transactions, etc.)

**Transaction Details**

- Drill down into specific transactions
- Full transaction information
- Related authorization details
- Merchant and terminal information
- Verification data (CVV match, PIN match, 3D Secure, etc.)

---

### Real-Time Monitoring

- **Live Authorization Feed**: See authorization requests as they happen
- **Decline Alerts**: Get notified when transactions are declined (with reasons)
- **Fraud Detection**: View transactions flagged as suspicious by Sudo's fraud system
- **Balance Monitoring**: Check card balances and wallet balances
- **Webhook Status**: Monitor webhook delivery status and retry attempts

---

## 💰 Pricing & Fees

### Fee Structure

Following industry standards (similar to Chipper Cash and Raenest):

**What RaverPay Pays (No Charge to Users):**

- Monthly platform access fees (infrastructure costs)
- Quarterly maintenance fees (card maintenance costs)

**What Users Pay:**

- **Card Creation Fees**: One-time fee when creating a new card (RaverPay charges users, Sudo charges RaverPay from dashboard)
  - Verve NGN: ₦50.00 per card (plus RaverPay markup)
  - Verve USD: $0.10 per card (plus RaverPay markup)
  - Mastercard/Visa USD: $1.00 per card (plus RaverPay markup)
- **Card Funding Fees**: Fee when loading money onto cards (RaverPay charges users, Sudo charges RaverPay from dashboard)
  - Verve NGN: FREE from Sudo (RaverPay may charge markup)
  - Verve USD: FREE from Sudo (RaverPay may charge markup)
  - Mastercard/Visa USD: 1.5% of funding amount (plus RaverPay markup)
- **Authorization Fees**: Small fee per transaction (deducted automatically from wallet)
  - Verve NGN: ₦5.00 per transaction (plus RaverPay markup)
  - Verve USD: $0.01 per transaction (plus RaverPay markup)
  - Mastercard/Visa: FREE
- **ATM Withdrawal Fees**: Fee when withdrawing cash from ATMs
  - Verve NGN: ₦35.00 per withdrawal (plus RaverPay markup)
  - Verve USD: $0.07 per withdrawal (plus RaverPay markup)
- **Dispute Fees**: Only if user initiates a dispute
  - Verve NGN: ₦100.00 (plus RaverPay markup)
  - Verve USD: $0.20 (plus RaverPay markup)
  - Mastercard/Visa: $50.00 (plus RaverPay markup)

**Transparency:**

- All fees are shown clearly before transactions
- Users see exact fee amount (including breakdown: Sudo cost + RaverPay markup = total) before confirming
- Fee quotes fetched from API in real-time (always up-to-date with admin configurations)
- Fees are deducted from wallet balance automatically
- Transaction history shows fee breakdown (Sudo cost + RaverPay markup)

**Fee Display Examples:**

**Card Creation:**

- "Card Creation Fee: ₦100"
- Breakdown: "₦50 (Sudo) + ₦50 (RaverPay) = ₦100"

**Card Funding (Mastercard/Visa):**

- "Funding Fee: 2% of ₦10,000 = ₦200"
- Breakdown: "1.5% (Sudo) + 0.5% (RaverPay) = 2%"

**Transaction Authorization:**

- "Transaction Fee: ₦7"
- Breakdown: "₦5 (Sudo) + ₦2 (RaverPay) = ₦7"

### USD Wallet & Currency Conversion

**USD Wallet:**

- Users can have separate wallets: NGN, USD, and Crypto
- USD wallet is created automatically when you request a USD card
- USD wallet works the same way as NGN wallet (balance, transactions, etc.)

**Funding USD Cards:**

- USD cards require USD wallet balance
- If you don't have USD, you can convert NGN → USD
- Conversion uses current exchange rates (set by RaverPay)
- Small conversion fee applies (similar to crypto conversions)
- After conversion, you can fund your USD card from USD wallet

**Funding NGN Cards:**

- NGN cards use your NGN wallet directly
- No conversion needed
- Simply fund card from NGN wallet balance

---

## 📱 Mobile App User Capabilities

### Card Management

**View My Cards**

- See all their cards in one place
- Card display showing masked card number (e.g., 5063 21** \*\*** 3531)
- Card brand logo (Verve, Visa, MasterCard, AfriGo)
- Expiry date
- Current status (Active, Frozen, Terminated)
- Available balance (if using default funding source)
- Quick actions (Freeze, View Details, View Transactions)

**Create New Card**

- Request a new virtual or physical card
- Select card program (if multiple available)
- Choose card type (virtual or physical)
- Select currency (NGN or USD)
- **See card creation fee quote before confirming**:
  - Fee breakdown shown (Sudo cost + RaverPay markup = total)
  - Example: "Card Creation Fee: ₦100 (₦50 Sudo cost + ₦50 RaverPay fee)"
- Set initial spending limits (optional)
- Confirm creation (fee deducted from wallet)
- View card details immediately (for virtual cards)

**View Card Details**

- Full card number (displayed securely via Secure Proxy - PCI compliant)
- CVV (displayed securely)
- Expiry date
- Card PIN (default PIN, securely displayed)
- Current spending limits
- Spending controls settings
- Card status

**Card Actions**

- **Freeze Card**: Temporarily block card if lost or stolen
- **Unfreeze Card**: Reactivate a frozen card
- **Terminate Card**: Permanently cancel a card
- **Copy Card Details**: Copy card number, CVV, or PIN (for secure use)
- **Fund Card**: Add money to card from wallet
  - NGN cards: Fund directly from NGN wallet
  - USD cards: Fund from USD wallet (convert NGN → USD if needed)

**Fund Card Flow**

- **For NGN Cards:**
  1. Select card and tap "Fund Card"
  2. Enter amount to add
  3. **See funding fee quote** (fetched from API based on amount):
     - Fee breakdown shown (Sudo cost + RaverPay markup = total)
     - Example: "Funding Fee: ₦10 (FREE from Sudo + ₦10 RaverPay fee)"
  4. See total amount (funding amount + fee)
  5. Check NGN wallet balance (must cover amount + fee)
  6. Confirm funding (fee deducted along with funding amount)
  7. Card balance updated instantly

- **For USD Cards:**
  1. Select card and tap "Fund Card"
  2. Enter USD amount to add
  3. **See funding fee quote** (fetched from API based on amount):
     - For Mastercard/Visa: "Funding Fee: 2% (1.5% Sudo cost + 0.5% RaverPay fee)"
     - For Verve: "Funding Fee: $X (FREE from Sudo + $X RaverPay fee)"
  4. See total amount (funding amount + fee)
  5. Check USD wallet balance
  6. If insufficient USD:
     - Tap "Convert NGN to USD"
     - See conversion quote (NGN amount, exchange rate, fee, USD amount)
     - Confirm conversion
     - NGN deducted, USD credited to USD wallet
  7. After conversion (or if USD balance sufficient):
     - Confirm card funding (fee deducted along with funding amount)
     - Card balance updated instantly

---

### Spending Controls Management

**View Current Limits**

- Daily spending limit
- Monthly spending limit
- Per-transaction limit
- Category-specific limits
- Channel restrictions (ATM, POS, Web, Mobile)

**Update Spending Limits**

- Increase or decrease daily/monthly limits
- Set per-transaction maximum
- Adjust category-specific limits
- Enable/disable channels (e.g., disable ATM withdrawals)

**Block Merchant Categories**

- Prevent card from being used at specific merchant types
- Select categories to block (e.g., gambling, adult entertainment)
- View currently blocked categories
- Remove blocks

**Set Allowed Categories Only**

- Restrict card to specific merchant types
- Choose allowed categories (e.g., only groceries and restaurants)
- All other categories automatically blocked

---

### Transaction History

**View Card Transactions**

- See all transactions for a specific card
- Transaction list with dates and amounts
- Merchant names and locations
- Transaction status (approved, declined, pending)
- Transaction type (purchase, withdrawal, refund)
- Filter by date range, status, merchant category

**Transaction Details**

- Full transaction amount and fees
- Fee breakdown (authorization fee, ATM fee if applicable)
- Merchant information (name, category, location)
- Transaction reference number
- Authorization details
- Terminal information (for POS/ATM transactions)
- Transaction timestamp
- Currency (NGN or USD)

**View Declined Transactions**

- See why transactions were declined
- Decline reason (insufficient funds, limit exceeded, blocked category, etc.)
- Transaction attempt details
- Suggestions on how to resolve (e.g., "Increase your daily limit")

---

### Real-Time Notifications

**Transaction Alerts**

- Get notified when card is used
- Transaction amount and merchant
- Transaction location (if available)
- Approval or decline status

**Card Status Updates**

- Card created successfully
- Card frozen/unfrozen
- Card terminated
- Spending limits updated
- Low balance warnings

**Security Alerts**

- Suspicious transaction attempts
- Multiple declined transactions
- Card frozen due to fraud detection
- Unusual spending patterns

---

### Card Usage

**Use Virtual Cards Online**

- Copy card details (number, CVV, expiry) for online purchases
- Use card at any merchant that accepts the card brand
- View transaction immediately after purchase

**Use Physical Cards**

- Use at ATMs for cash withdrawals
- Use at POS terminals for in-store purchases
- Use online with card details

**Monitor Spending**

- Track spending against limits
- View spending by category
- See spending trends over time
- Get alerts when approaching limits

---

## ✨ Key Benefits

### For Admins:

1. **Centralized Management**: Control all cards, cardholders, and programs from one dashboard
2. **Real-Time Monitoring**: See transactions and authorizations as they happen
3. **Fraud Prevention**: Monitor suspicious activity and freeze cards instantly
4. **Flexible Controls**: Set granular spending limits and restrictions
5. **Comprehensive Analytics**: Track card usage, spending patterns, and program performance
6. **Quick Actions**: Freeze, unfreeze, or terminate cards with one click
7. **Audit Trail**: Complete history of all card actions and transactions

### For End Users:

1. **Affordable Card Creation**: Low one-time fee for creating cards (with RaverPay markup)
2. **Transparent Fees**: See all fees clearly before transactions (Sudo cost + RaverPay markup)
3. **Low Transaction Fees**: Small fees for transactions (authorization, ATM withdrawals)
4. **Instant Card Creation**: Get virtual cards immediately after request
5. **Full Control**: Manage spending limits and restrictions themselves
6. **Security**: Freeze cards instantly if lost or stolen
7. **Transparency**: See all fees and transactions in real-time with detailed information
8. **Multi-Currency Support**: Use NGN cards directly or convert to USD for international cards
9. **Convenience**: Use cards online and in-store (for physical cards)
10. **Notifications**: Stay informed about all card activity
11. **Easy Management**: Simple interface to manage multiple cards

---

## 🔄 User Flows

### Admin Flow: Creating and Issuing a Card

1. Admin selects card program (programs created manually in Sudo Dashboard, IDs stored in database)
2. Admin creates a cardholder (or selects existing one)
3. Admin creates a card linked to the cardholder and program (using stored program ID)
4. Card is immediately available to the user
5. Admin can monitor card usage and transactions
6. Admin can freeze/unfreeze or terminate card as needed

### User Flow: Creating and Using a Card

1. User opens mobile app and navigates to Cards section
2. User taps "Create New Card"
3. User selects card program and type (virtual/physical)
4. User selects currency (NGN or USD)
   - For USD: USD wallet created automatically if doesn't exist
5. User sets spending limits (optional)
6. Card is created instantly (for virtual cards) - **No charge to user**
7. User views card details (number, CVV, PIN)
8. User funds card:
   - **NGN Card**: Fund directly from NGN wallet
   - **USD Card**: Convert NGN → USD if needed, then fund from USD wallet
9. User uses card for online purchases or in-store (physical)
10. Transaction fees deducted automatically from wallet
11. User receives notifications for each transaction
12. User can view transaction history and manage spending controls

### User Flow: Managing Spending Controls

1. User opens card details
2. User navigates to "Spending Controls"
3. User views current limits
4. User updates daily/monthly limits or blocks categories
5. Changes take effect immediately
6. User receives confirmation notification

---

## 🔒 Security Features

- **PCI Compliance**: Sensitive card data (CVV, PIN, full card number) displayed securely via Secure Proxy
- **Real-Time Fraud Detection**: Sudo automatically flags suspicious transactions
- **Instant Card Freezing**: Users and admins can freeze cards immediately if compromised
- **Spending Controls**: Multiple layers of spending limits and restrictions
- **Transaction Verification**: CVV, PIN, 3D Secure verification for online transactions
- **Audit Trail**: Complete history of all card actions and transactions
- **Multi-Currency Security**: Separate wallets for NGN and USD ensure currency isolation
- **Transparent Fees**: All fees clearly displayed before transactions

---

## 📊 Example Use Cases

### Use Case 1: Employee Expense Cards

- Admin creates a card program in Sudo Dashboard with monthly spending limit of NGN 50,000
- Program ID is stored in database
- Admin issues cards to employees using the program
- Employees can only use cards at approved merchant categories (restaurants, fuel, groceries)
- Admin monitors all spending in real-time
- Cards automatically decline if limit exceeded

### Use Case 2: Personal Virtual Cards

- User creates a virtual NGN card for online shopping - **Pays ₦100 creation fee**
- User funds card from NGN wallet - **Pays small funding fee (if any)**
- User sets daily limit of NGN 10,000
- User blocks gambling and adult entertainment categories
- User uses card for online purchases
- Authorization fee (₦7.00) deducted per transaction
- User receives instant notifications for each transaction
- User can freeze card if suspicious activity detected

### Use Case 2b: USD Virtual Card

- User creates a virtual USD card for international purchases - **Pays $0.20 creation fee**
- User converts NGN 50,000 → USD (with exchange rate and small fee)
- USD credited to USD wallet
- User funds card from USD wallet - **Pays 2% funding fee (Mastercard/Visa) or small fee (Verve)**
- User uses card for international online purchases
- Authorization fee ($0.02 for Verve, FREE for Mastercard/Visa) deducted per transaction
- User receives instant notifications for each transaction

### Use Case 3: Business Travel Cards

- Admin creates card program in Sudo Dashboard for travel expenses
- Program ID is stored in database
- Admin issues physical cards to employees using the program
- Cards can only be used at hotels, airlines, and restaurants
- Monthly limit of NGN 200,000 per card
- Admin monitors spending and can freeze cards remotely
- Employees can view their transaction history

---

This integration will provide a complete card issuing and management solution for RaverPay, enabling both administrators and end users to have full control over card issuance, spending, and security.
