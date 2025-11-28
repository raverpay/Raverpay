# Admin Dashboard - Venly Wallet Implementation Guide

## Overview

This guide explains the **NEW admin API endpoints** for the Venly wallet system and what needs to be implemented on the admin dashboard.

## ⚠️ CRITICAL: Two Separate Crypto Systems

Your application now has **TWO SEPARATE** crypto systems:

### 1. OLD System: CryptoOrder (Already Implemented)
**Location**: `src/admin/crypto/` (admin-crypto.controller.ts, admin-crypto.service.ts)

**Purpose**: Buy/sell crypto trading with manual admin approval

**Base Route**: `/admin/crypto`

**Key Features**:
- Users place BUY or SELL orders
- Admin manually approves/rejects each order
- Focuses on trading and exchanging crypto for Naira
- Manual payout process

**Endpoints**:
- `GET /admin/crypto/orders` - View all crypto orders
- `GET /admin/crypto/pending-review` - View pending sell orders
- `GET /admin/crypto/stats` - Trading statistics
- `POST /admin/crypto/:orderId/approve` - Approve sell order
- `POST /admin/crypto/:orderId/reject` - Reject order
- `PATCH /admin/crypto/:orderId/adjust-amount` - Adjust payout amount

**Dashboard Pages** (Already exist):
- Crypto Orders Management
- Pending Reviews
- Trading Analytics

---

### 2. NEW System: Venly Wallet (Just Implemented)
**Location**: `src/admin/venly-wallets/` (admin-venly-wallets.controller.ts, admin-venly-wallets.service.ts)

**Purpose**: Self-custody crypto wallets with automated blockchain transactions

**Base Route**: `/admin/venly-wallets`

**Key Features**:
- Users have their own crypto wallets on Polygon blockchain
- Automated send/receive/convert functionality
- Real blockchain transactions via Venly API
- Exchange rate management for conversions
- Transaction monitoring and fraud detection

**Endpoints**: (Details below)

**Dashboard Pages** (NEED TO BE CREATED):
- Wallet Overview Dashboard
- Exchange Rate Management
- Conversion Monitoring
- Transaction Monitoring
- Analytics Dashboard

---

## NEW Admin API Endpoints (Venly Wallet System)

All endpoints require JWT authentication and admin roles.

### 1. Wallet Management

#### GET /admin/venly-wallets
Get all users with crypto wallets

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by name, email, or phone
- `hasWallet` (boolean): Filter users with/without Venly wallets

**Response**:
```json
{
  "data": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+2348012345678",
      "hasVenlyWallet": true,
      "venlyUserId": "venly-user-id",
      "wallets": [
        {
          "id": "wallet-uuid",
          "venlyWalletId": "venly-wallet-id",
          "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          "chain": "POLYGON",
          "createdAt": "2024-01-15T10:00:00Z"
        }
      ],
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

**Dashboard Use**: Display paginated table of all users with wallet status

---

#### GET /admin/venly-wallets/stats
Get wallet statistics overview

**Response**:
```json
{
  "totalUsers": 1000,
  "usersWithWallets": 250,
  "totalWallets": 250,
  "adoptionRate": "25.00",
  "walletsByChain": [
    {
      "chain": "POLYGON",
      "count": 250
    }
  ],
  "transactions": {
    "byStatus": [
      { "status": "COMPLETED", "count": 450 },
      { "status": "PENDING", "count": 12 },
      { "status": "FAILED", "count": 8 }
    ]
  }
}
```

**Dashboard Use**: Display KPI cards showing adoption metrics

---

#### GET /admin/venly-wallets/user/:userId
Get specific user's crypto wallet details

**Response**:
```json
{
  "id": "venly-user-uuid",
  "userId": "user-uuid",
  "venlyUserId": "venly-user-id",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+2348012345678",
    "status": "ACTIVE",
    "kycTier": "TIER_2"
  },
  "venlyWallets": [
    {
      "id": "wallet-uuid",
      "venlyWalletId": "venly-wallet-id",
      "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "chain": "POLYGON",
      "balance": "100.50",
      "createdAt": "2024-01-15T10:00:00Z",
      "transactions": [
        {
          "id": "tx-uuid",
          "type": "SEND",
          "amount": "10.00",
          "currency": "USDT",
          "status": "COMPLETED",
          "createdAt": "2024-01-20T14:30:00Z"
        }
      ]
    }
  ]
}
```

**Dashboard Use**: User detail page showing wallet info and recent transactions

---

### 2. Transaction Management

#### GET /admin/venly-wallets/transactions
Get all crypto transactions with filters

**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Items per page
- `userId` (string): Filter by user ID
- `status` (enum): PENDING | COMPLETED | FAILED | CANCELLED
- `type` (string): Transaction type (SEND, RECEIVE, CRYPTO_TO_NAIRA)
- `startDate` (string): ISO date string
- `endDate` (string): ISO date string

**Response**:
```json
{
  "data": [
    {
      "id": "tx-uuid",
      "userId": "user-uuid",
      "venlyWalletId": "wallet-uuid",
      "type": "SEND",
      "amount": "10.50",
      "currency": "USDT",
      "status": "COMPLETED",
      "transactionHash": "0xabc123...",
      "fromAddress": "0x742d35Cc...",
      "toAddress": "0x123abc...",
      "metadata": {
        "narration": "Payment for services"
      },
      "createdAt": "2024-01-20T14:30:00Z",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "venlyWallet": {
        "id": "wallet-uuid",
        "walletAddress": "0x742d35Cc...",
        "chain": "POLYGON"
      }
    }
  ],
  "meta": {
    "total": 450,
    "page": 1,
    "limit": 20,
    "totalPages": 23
  }
}
```

**Dashboard Use**: Transaction monitoring table with filters

---

#### GET /admin/venly-wallets/transactions/:id
Get single transaction details

**Response**: Same as transaction object above, with full details

**Dashboard Use**: Transaction detail modal/page

---

#### POST /admin/venly-wallets/transactions/:id/flag
Flag a transaction as suspicious

**Request Body**:
```json
{
  "reason": "Suspected fraud - unusual amount pattern"
}
```

**Response**:
```json
{
  "id": "tx-uuid",
  "metadata": {
    "flagged": true,
    "flaggedAt": "2024-01-20T15:00:00Z",
    "flaggedBy": "admin-user-id",
    "flagReason": "Suspected fraud - unusual amount pattern"
  }
}
```

**Dashboard Use**: Flag button on transaction detail page

---

### 3. Conversion Management

#### GET /admin/venly-wallets/conversions
Get crypto to Naira conversions

**Query Parameters**:
- `page`, `limit`, `userId`, `status`, `startDate`, `endDate` (same as transactions)

**Response**:
```json
{
  "data": [
    {
      "id": "conversion-uuid",
      "userId": "user-uuid",
      "type": "CRYPTO_TO_NAIRA",
      "amount": "100.00",
      "currency": "USDT",
      "status": "COMPLETED",
      "metadata": {
        "usdAmount": "100.00",
        "nairaAmount": "148000.00",
        "exchangeRate": "1480.00"
      },
      "createdAt": "2024-01-20T16:00:00Z",
      "user": {
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "meta": {
    "total": 85,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "stats": {
    "totalVolumeUSD": "8500.00",
    "averageConversionUSD": "100.00"
  }
}
```

**Dashboard Use**: Conversion monitoring page showing all crypto→Naira conversions

---

### 4. Exchange Rate Management (CRITICAL)

#### GET /admin/venly-wallets/exchange-rates
Get current exchange rates

**Response**:
```json
[
  {
    "id": "rate-uuid",
    "fromCurrency": "USD",
    "toCurrency": "NGN",
    "rate": "1480.00",
    "updatedAt": "2024-01-20T10:00:00Z"
  },
  {
    "id": "rate-uuid-2",
    "fromCurrency": "USDT",
    "toCurrency": "NGN",
    "rate": "1475.00",
    "updatedAt": "2024-01-20T10:00:00Z"
  }
]
```

**Dashboard Use**: Exchange rate management page

---

#### PATCH /admin/venly-wallets/exchange-rates
Update exchange rate

**Request Body**:
```json
{
  "currency": "USD",
  "toNaira": 1500.50
}
```

**Response**:
```json
{
  "id": "rate-uuid",
  "fromCurrency": "USD",
  "toCurrency": "NGN",
  "rate": "1500.50",
  "updatedAt": "2024-01-20T17:00:00Z"
}
```

**Dashboard Use**: Edit button on exchange rate management page

**⚠️ CRITICAL**: This rate controls how much Naira users receive when converting crypto!

---

### 5. Analytics

#### GET /admin/venly-wallets/analytics
Get analytics data

**Query Parameters**:
- `startDate` (string): ISO date string
- `endDate` (string): ISO date string

**Response**:
```json
{
  "byType": [
    {
      "type": "SEND",
      "count": 250,
      "volumeUSD": "25000.00"
    },
    {
      "type": "RECEIVE",
      "count": 180,
      "volumeUSD": "18000.00"
    },
    {
      "type": "CRYPTO_TO_NAIRA",
      "count": 85,
      "volumeUSD": "8500.00"
    }
  ],
  "byStatus": [
    {
      "status": "COMPLETED",
      "count": 450
    },
    {
      "status": "PENDING",
      "count": 12
    },
    {
      "status": "FAILED",
      "count": 8
    }
  ],
  "conversions": {
    "totalCount": 85,
    "totalVolumeUSD": "8500.00",
    "averageAmountUSD": "100.00"
  },
  "dailyVolume": [
    {
      "date": "2024-01-20",
      "count": 45,
      "volume": "4500.00"
    }
  ]
}
```

**Dashboard Use**: Charts and graphs on analytics dashboard

---

## Dashboard Implementation Requirements

### 1. Exchange Rate Management Page (CRITICAL - MUST IMPLEMENT FIRST)

**Route**: `/admin/venly-wallets/exchange-rates`

**Features**:
- Display current exchange rates in a table
- Edit button for each rate
- Modal/form to update rate
- Shows last updated timestamp
- Audit log of rate changes

**Component Structure**:
```tsx
// ExchangeRateManagementPage.tsx
- Table showing all rates (USD→NGN, USDT→NGN, USDC→NGN)
- Each row has:
  - Currency pair
  - Current rate
  - Last updated
  - Edit button
- Edit modal:
  - Input for new rate
  - Confirmation message
  - Save button
```

**API Calls**:
- `GET /admin/venly-wallets/exchange-rates` - On page load
- `PATCH /admin/venly-wallets/exchange-rates` - On save

**Why Critical**: This directly controls how much Naira users receive when converting crypto. Without this, conversions cannot work!

---

### 2. Wallet Overview Dashboard

**Route**: `/admin/venly-wallets`

**Features**:
- KPI cards showing:
  - Total users
  - Users with wallets
  - Adoption rate
  - Total transactions
- Paginated table of users with wallets
- Search and filter functionality
- Click user row to view details

**Component Structure**:
```tsx
// WalletOverviewPage.tsx
- Stats cards (4 KPIs)
- Filter bar (search, hasWallet toggle)
- Users table:
  - Name
  - Email
  - Wallet Status (Yes/No)
  - Wallet Address (truncated)
  - Actions (View Details)
```

**API Calls**:
- `GET /admin/venly-wallets/stats` - For KPI cards
- `GET /admin/venly-wallets` - For users table

---

### 3. Conversion Monitoring Page

**Route**: `/admin/venly-wallets/conversions`

**Features**:
- Stats summary (total volume, average conversion)
- Paginated table of conversions
- Filters: date range, user, status
- Export functionality

**Component Structure**:
```tsx
// ConversionMonitoringPage.tsx
- Stats cards (total volume, avg conversion)
- Filter bar (date range, user search, status)
- Conversions table:
  - Date/Time
  - User
  - USD Amount
  - NGN Amount
  - Exchange Rate Used
  - Status
```

**API Calls**:
- `GET /admin/venly-wallets/conversions`

---

### 4. Transaction Monitoring Page

**Route**: `/admin/venly-wallets/transactions`

**Features**:
- Paginated table of all transactions
- Filters: type, status, date range, user
- Click transaction to view details
- Flag suspicious transactions
- Real-time status updates

**Component Structure**:
```tsx
// TransactionMonitoringPage.tsx
- Filter bar (type, status, date range, user)
- Transactions table:
  - Date/Time
  - User
  - Type (Send/Receive/Convert)
  - Amount
  - Currency
  - Status
  - Tx Hash (link to polygonscan)
  - Flag indicator
  - Actions (View, Flag)
- Transaction detail modal:
  - Full transaction details
  - Flag button
  - Link to blockchain explorer
```

**API Calls**:
- `GET /admin/venly-wallets/transactions` - For table
- `GET /admin/venly-wallets/transactions/:id` - For details
- `POST /admin/venly-wallets/transactions/:id/flag` - To flag

---

### 5. Analytics Dashboard

**Route**: `/admin/venly-wallets/analytics`

**Features**:
- Charts showing:
  - Transactions by type (pie chart)
  - Transactions by status (pie chart)
  - Daily volume (line chart)
  - Conversion trends (line chart)
- Date range filter
- Export reports

**Component Structure**:
```tsx
// AnalyticsDashboardPage.tsx
- Date range selector
- Grid of charts:
  - Transaction Types (Pie chart)
  - Transaction Status (Pie chart)
  - Daily Volume (Line chart)
  - Conversion Volume (Line chart)
- Summary stats below charts
```

**API Calls**:
- `GET /admin/venly-wallets/analytics`

**Suggested Charts Library**: recharts, chart.js, or react-chartjs-2

---

## Navigation Updates

Add new menu items to admin sidebar:

```tsx
{
  label: "Venly Wallets",
  icon: WalletIcon,
  children: [
    {
      label: "Overview",
      path: "/admin/venly-wallets"
    },
    {
      label: "Exchange Rates", // CRITICAL
      path: "/admin/venly-wallets/exchange-rates"
    },
    {
      label: "Conversions",
      path: "/admin/venly-wallets/conversions"
    },
    {
      label: "Transactions",
      path: "/admin/venly-wallets/transactions"
    },
    {
      label: "Analytics",
      path: "/admin/venly-wallets/analytics"
    }
  ]
},
{
  label: "Crypto Trading", // Existing system
  icon: CryptoIcon,
  children: [
    {
      label: "Orders",
      path: "/admin/crypto/orders"
    },
    {
      label: "Pending Review",
      path: "/admin/crypto/pending-review"
    },
    {
      label: "Stats",
      path: "/admin/crypto/stats"
    }
  ]
}
```

---

## Implementation Priority

Implement in this order:

1. **Exchange Rate Management** (CRITICAL) - Without this, conversions cannot work
2. **Wallet Overview** - Needed to monitor wallet creation
3. **Transaction Monitoring** - Needed to track user activity
4. **Conversion Monitoring** - Needed to track crypto→Naira conversions
5. **Analytics Dashboard** - Nice to have for insights

---

## Key Differences: OLD vs NEW System

| Feature | OLD (CryptoOrder) | NEW (Venly Wallet) |
|---------|------------------|-------------------|
| **Route** | `/admin/crypto` | `/admin/venly-wallets` |
| **Purpose** | Trading (buy/sell) | Self-custody wallet |
| **Approval** | Manual admin approval | Automated blockchain |
| **Database** | `CryptoOrder` table | `VenlyWallet`, `CryptoTransaction` tables |
| **Admin Actions** | Approve/reject orders | Monitor, flag, manage rates |
| **User Experience** | Place order → wait for approval | Send/receive instantly |
| **Critical Feature** | Approval workflow | Exchange rate management |

---

## Environment Variables (Reminder)

Make sure these are set in `.env`:

```env
VENLY_ENV=sandbox
VENLY_CLIENT_ID=your-client-id
VENLY_CLIENT_SECRET=your-secret
CRYPTO_ENCRYPTION_KEY=generate-with-openssl-rand-hex-32
POLYGON_USDT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
POLYGON_USDC_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
```

---

## Testing the Admin API

Use these curl commands to test:

```bash
# Get JWT token first
TOKEN="your-admin-jwt-token"

# Test wallet stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/venly-wallets/stats

# Test exchange rates
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/venly-wallets/exchange-rates

# Update exchange rate
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency":"USD","toNaira":1500}' \
  http://localhost:3000/admin/venly-wallets/exchange-rates

# Get transactions
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/admin/venly-wallets/transactions?page=1&limit=20"

# Get conversions
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/admin/venly-wallets/conversions?page=1&limit=20"
```

---

## Summary

**API Changes**: ✅ COMPLETED
- New controller: `admin-venly-wallets.controller.ts`
- New service: `admin-venly-wallets.service.ts`
- Registered in `admin.module.ts`
- 11 new endpoints ready to use

**Dashboard Changes**: ❌ NOT STARTED
- 5 new pages needed (listed above)
- Exchange rate management is CRITICAL priority
- Keep OLD crypto pages unchanged
- Add new navigation menu

**Next Steps**:
1. Start with Exchange Rate Management page
2. Test API endpoints with curl/Postman
3. Implement remaining pages in priority order
4. Add proper error handling and loading states
5. Test with real data from sandbox environment
