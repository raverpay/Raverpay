# MularPay Admin Dashboard - Next.js Implementation Plan

## Overview
This document outlines the complete web admin dashboard to be built with Next.js, mapping each page/feature to the admin endpoints defined in the backend.

---

## Tech Stack Recommendations

### Core Framework
- **Next.js 14+** (App Router)
- **TypeScript**
- **React 18+**

### UI/Styling
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide Icons** - Icon library

### State Management & Data Fetching
- **TanStack Query (React Query)** - Server state management
- **Zustand** - Client state management (auth, UI state)
- **SWR** - Alternative to React Query (choose one)

### Forms & Validation
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Charts & Analytics
- **Recharts** - Chart library
- **Tremor** - Dashboard-specific charts
- **Date-fns** or **Day.js** - Date manipulation

### Tables & Data Display
- **TanStack Table (React Table)** - Headless table library
- **react-virtualized** or **react-window** - Virtual scrolling for large lists

### Authentication
- **NextAuth.js** - Authentication (with custom JWT provider)
- **HTTP-only cookies** - Secure token storage

### Additional Tools
- **Axios** - HTTP client
- **React Hot Toast** or **Sonner** - Toast notifications
- **React Dropzone** - File uploads
- **React PDF** or **jsPDF** - PDF export
- **XLSX** - Excel export

---

## Application Structure

```
admin-dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── forgot-password/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx (Dashboard home)
│   │   ├── users/
│   │   ├── wallets/
│   │   ├── transactions/
│   │   ├── kyc/
│   │   ├── vtu/
│   │   ├── giftcards/
│   │   ├── crypto/
│   │   ├── virtual-accounts/
│   │   ├── deletions/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   ├── audit/
│   │   ├── settings/
│   │   └── admins/
│   └── api/ (Next.js API routes if needed)
├── components/
│   ├── ui/ (shadcn components)
│   ├── layouts/
│   ├── charts/
│   ├── tables/
│   └── forms/
├── lib/
│   ├── api/ (API client)
│   ├── hooks/
│   ├── utils/
│   └── validations/
└── types/
```

---

## Dashboard Pages & Features

## 1. AUTHENTICATION

### Login Page
**Route:** `/login`

**Features:**
- Email/password login form
- "Remember me" option
- Forgot password link
- Admin-specific branding
- 2FA input (if enabled)

**API Endpoints Used:**
- `POST /api/auth/login`
- `POST /api/auth/refresh`

**Components:**
- Login form with validation
- Error handling & display
- Loading states
- Redirect to dashboard on success

---

### Forgot Password Page
**Route:** `/forgot-password`

**Features:**
- Email input form
- Password reset code verification
- New password setup
- Success confirmation

**API Endpoints Used:**
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-reset-code`
- `POST /api/auth/reset-password`

---

## 2. DASHBOARD HOME

### Overview Dashboard
**Route:** `/dashboard`

**Features:**
- Key metrics cards (total users, active users, total balance, transactions today, revenue today)
- User growth chart (last 30 days)
- Transaction volume chart (last 7 days)
- Revenue chart (last 30 days)
- Recent transactions table (last 10)
- Pending KYC count badge
- Failed transactions alert
- Account deletion requests pending
- Quick action buttons (view all users, view all transactions, etc.)

**API Endpoints Used:**
- `GET /api/admin/analytics/dashboard`
- `GET /api/admin/transactions?limit=10&sortBy=createdAt&sortOrder=DESC`
- `GET /api/admin/kyc/pending`
- `GET /api/admin/account-deletions/pending`
- `GET /api/admin/transactions/failed`

**Components:**
- Stat cards with trend indicators
- Line/bar charts
- Quick stats table
- Alert badges
- Action buttons

---

## 3. USER MANAGEMENT

### Users List Page
**Route:** `/dashboard/users`

**Features:**
- Searchable, filterable, sortable user table
- Filters: role, status, KYC tier, date range
- Search: by email, phone, name, user ID
- Pagination
- User count badge
- Bulk actions (export to CSV)
- Quick actions per user (view, edit, suspend, ban)
- Visual badges for status, role, KYC tier
- User avatar display

**API Endpoints Used:**
- `GET /api/admin/users`
- `GET /api/admin/users/stats`
- `GET /api/admin/users/search`

**Components:**
- Data table with sorting & filtering
- Search input with debounce
- Filter dropdowns
- Pagination controls
- Action buttons/dropdowns
- Status badges

---

### User Detail Page
**Route:** `/dashboard/users/[userId]`

**Features:**
- User profile overview (personal info, avatar, contact)
- Wallet information (balance, limits, locked status)
- KYC status & documents
- Transaction history table
- VTU order history
- Login history
- Audit logs for this user
- Action buttons:
  - Edit role
  - Change status (suspend, ban, activate)
  - Change KYC tier
  - Reset password
  - Reset PIN
  - Lock/unlock wallet
  - View full wallet details
  - Delete account

**API Endpoints Used:**
- `GET /api/admin/users/:userId`
- `GET /api/admin/wallets/:userId`
- `GET /api/admin/transactions?userId=:userId`
- `GET /api/admin/users/:userId/audit-logs`
- `GET /api/admin/users/:userId/login-history`
- `PATCH /api/admin/users/:userId/role`
- `PATCH /api/admin/users/:userId/status`
- `PATCH /api/admin/users/:userId/kyc-tier`
- `POST /api/admin/users/:userId/reset-password`
- `POST /api/admin/users/:userId/reset-pin`

**Components:**
- Profile card
- Info sections (collapsible)
- Data tables
- Action modals with confirmations
- Form modals for updates

---

### User Statistics Page
**Route:** `/dashboard/users/statistics`

**Features:**
- Total users count
- Users by role (pie chart)
- Users by status (pie chart)
- Users by KYC tier (bar chart)
- New users trend (line chart - last 90 days)
- User growth rate
- Active vs inactive users
- Geographic distribution (if state/city data available)
- Export functionality

**API Endpoints Used:**
- `GET /api/admin/users/stats`
- `GET /api/admin/analytics/users`
- `GET /api/admin/analytics/user-growth`

**Components:**
- Stat cards
- Pie/donut charts
- Bar charts
- Line charts
- Export button

---

## 4. WALLET MANAGEMENT

### Wallets List Page
**Route:** `/dashboard/wallets`

**Features:**
- Wallet list table
- Filters: balance range, locked status, KYC tier
- Search by user email/phone/ID
- Sorting by balance, created date
- Total platform balance display
- Locked wallets count alert
- Quick actions: view, lock, unlock

**API Endpoints Used:**
- `GET /api/admin/wallets`
- `GET /api/admin/wallets/stats`

**Components:**
- Data table
- Filter controls
- Balance display with formatting
- Lock/unlock buttons
- Status badges

---

### Wallet Detail Page
**Route:** `/dashboard/wallets/[userId]`

**Features:**
- Wallet overview (balance, ledger balance, currency)
- Spending limits (daily, monthly with progress bars)
- Lock status & reason
- Transaction history for this wallet
- Action buttons:
  - Lock wallet (with reason modal)
  - Unlock wallet (with reason modal)
  - Adjust balance (credit/debit with reason)
  - Reset limits
  - View user profile

**API Endpoints Used:**
- `GET /api/admin/wallets/:userId`
- `POST /api/admin/wallets/:userId/lock`
- `POST /api/admin/wallets/:userId/unlock`
- `POST /api/admin/wallets/:userId/adjust`
- `POST /api/admin/wallets/:userId/reset-limits`

**Components:**
- Wallet info cards
- Progress bars for limits
- Transaction table
- Action modals with forms
- Confirmation dialogs

---

## 5. TRANSACTION MANAGEMENT

### Transactions List Page
**Route:** `/dashboard/transactions`

**Features:**
- Comprehensive transaction table
- Filters: type, status, date range, amount range, provider, user
- Search by reference, user ID
- Sorting by date, amount, status
- Export to CSV/Excel
- Transaction stats cards (total volume, count, success rate)
- Quick filters (pending, failed, today, this week)
- Action buttons per transaction: view details, reverse, retry

**API Endpoints Used:**
- `GET /api/admin/transactions`
- `GET /api/admin/transactions/stats`
- `GET /api/admin/transactions/pending`
- `GET /api/admin/transactions/failed`

**Components:**
- Advanced data table
- Multi-filter sidebar
- Stat cards
- Export dropdown
- Quick filter chips
- Action buttons

---

### Transaction Detail Page
**Route:** `/dashboard/transactions/[transactionId]`

**Features:**
- Transaction summary (reference, type, status, amount, fees)
- User information (name, email, link to profile)
- Balance changes (before, after)
- Provider information (provider, provider ref, channel)
- Metadata display (formatted JSON)
- Timeline of status changes
- Related entities (if linked to VTU order, etc.)
- Action buttons:
  - Reverse transaction (with reason)
  - Retry failed transaction
  - Update status (manual override)
  - View user profile
  - View related order (if applicable)

**API Endpoints Used:**
- `GET /api/admin/transactions/:transactionId`
- `POST /api/admin/transactions/:transactionId/reverse`
- `POST /api/admin/transactions/:transactionId/retry`
- `PATCH /api/admin/transactions/:transactionId/status`

**Components:**
- Transaction detail cards
- Info grid layout
- JSON viewer for metadata
- Timeline component
- Action modals
- Confirmation dialogs

---

### Transaction Analytics Page
**Route:** `/dashboard/transactions/analytics`

**Features:**
- Transaction volume chart (by day/week/month)
- Transaction count by type (pie chart)
- Success rate trend
- Average transaction value
- Revenue from fees chart
- Peak transaction times (heatmap)
- Export reports

**API Endpoints Used:**
- `GET /api/admin/analytics/transactions`
- `GET /api/admin/analytics/transaction-trends`
- `GET /api/admin/analytics/revenue`

**Components:**
- Multiple chart types
- Date range selector
- Group by selector (hour, day, week, month)
- Export functionality

---

## 6. KYC VERIFICATION

### KYC Pending Review Page
**Route:** `/dashboard/kyc/pending`

**Features:**
- List of users pending KYC verification
- Group by verification type (BVN pending, NIN pending)
- User info display (name, email, tier)
- Days pending indicator
- Quick approve/reject actions
- View details button

**API Endpoints Used:**
- `GET /api/admin/kyc/pending`

**Components:**
- Segmented list (BVN, NIN tabs)
- User cards
- Quick action buttons
- Status badges

---

### KYC Detail/Review Page
**Route:** `/dashboard/kyc/[userId]`

**Features:**
- User profile summary
- Current KYC tier
- BVN verification status & data
- NIN verification status & data
- Uploaded documents/images (if any)
- Verification history
- Action buttons:
  - Approve BVN
  - Reject BVN (with reason)
  - Approve NIN
  - Reject NIN (with reason)
  - Manually set tier (with notes)
  - View user profile

**API Endpoints Used:**
- `GET /api/admin/kyc/:userId`
- `POST /api/admin/kyc/:userId/approve-bvn`
- `POST /api/admin/kyc/:userId/reject-bvn`
- `POST /api/admin/kyc/:userId/approve-nin`
- `POST /api/admin/kyc/:userId/reject-nin`
- `POST /api/admin/kyc/:userId/verify-tier`

**Components:**
- Document viewer
- Verification status cards
- Action buttons with modals
- Reason input forms
- Confirmation dialogs

---

### KYC Statistics Page
**Route:** `/dashboard/kyc/statistics`

**Features:**
- KYC stats overview (by tier, pending count)
- Approval rate chart
- Average verification time
- Rejected applications list
- Tier distribution (pie chart)

**API Endpoints Used:**
- `GET /api/admin/kyc/stats`
- `GET /api/admin/kyc/rejected`

**Components:**
- Stat cards
- Charts
- Data table for rejected

---

## 7. VTU ORDER MANAGEMENT

### VTU Orders List Page
**Route:** `/dashboard/vtu`

**Features:**
- VTU orders table
- Filters: service type, status, provider, date range
- Search by reference, user, recipient
- VTU stats (volume, count, by service type)
- Failed orders alert
- Quick actions: view, refund, retry

**API Endpoints Used:**
- `GET /api/admin/vtu/orders`
- `GET /api/admin/vtu/orders/stats`
- `GET /api/admin/vtu/orders/failed`

**Components:**
- Data table
- Filter controls
- Stat cards
- Action buttons

---

### VTU Order Detail Page
**Route:** `/dashboard/vtu/[orderId]`

**Features:**
- Order summary (service type, provider, recipient, amount)
- User information
- Product details
- Provider response (formatted)
- Status & timestamps
- Related transaction link
- Action buttons:
  - Refund order (with reason)
  - Retry failed order
  - Mark as completed (manual)

**API Endpoints Used:**
- `GET /api/admin/vtu/orders/:orderId`
- `POST /api/admin/vtu/orders/:orderId/refund`
- `POST /api/admin/vtu/orders/:orderId/retry`
- `POST /api/admin/vtu/orders/:orderId/mark-completed`

**Components:**
- Order detail cards
- JSON viewer for provider response
- Action modals
- Status timeline

---

### VTU Analytics Page
**Route:** `/dashboard/vtu/analytics`

**Features:**
- VTU volume by service type (bar chart)
- VTU count by provider
- Success rate by service type
- Revenue/profit margins
- Popular products

**API Endpoints Used:**
- `GET /api/admin/analytics/vtu`

**Components:**
- Multiple charts
- Stat cards
- Top products table

---

## 8. GIFT CARD MANAGEMENT

### Gift Card Orders List Page
**Route:** `/dashboard/giftcards`

**Features:**
- Gift card orders table
- Filters: type (buy/sell), status, brand, date range
- Pending review badge/filter
- Stats (buy/sell volume, approval rate)
- Quick actions: view, approve, reject

**API Endpoints Used:**
- `GET /api/admin/giftcards/orders`
- `GET /api/admin/giftcards/pending-review`
- `GET /api/admin/giftcards/stats`

**Components:**
- Data table
- Filter controls
- Stat cards
- Quick action buttons

---

### Gift Card Order Detail/Review Page
**Route:** `/dashboard/giftcards/[orderId]`

**Features:**
- Order summary (type, brand, country, face value, rate, amount)
- User information
- Card details (for sell orders - number, PIN, images)
- Image gallery viewer (for uploaded card images)
- Status & review history
- Action buttons:
  - Approve order (for sell)
  - Reject order (with reason)
  - Adjust payout amount (with reason)

**API Endpoints Used:**
- `GET /api/admin/giftcards/:orderId`
- `POST /api/admin/giftcards/:orderId/approve`
- `POST /api/admin/giftcards/:orderId/reject`
- `PATCH /api/admin/giftcards/:orderId/adjust-amount`

**Components:**
- Order detail cards
- Image gallery/lightbox
- Masked card details display
- Action modals with forms
- Reason textarea

---

## 9. CRYPTO ORDER MANAGEMENT

### Crypto Orders List Page
**Route:** `/dashboard/crypto`

**Features:**
- Crypto orders table
- Filters: type (buy/sell), asset, network, status, date range
- Pending verification badge
- Stats (volume by asset, by type)
- Quick actions: view, verify, approve, reject

**API Endpoints Used:**
- `GET /api/admin/crypto/orders`
- `GET /api/admin/crypto/pending`
- `GET /api/admin/crypto/stats`

**Components:**
- Data table
- Filter controls
- Stat cards
- Action buttons

---

### Crypto Order Detail Page
**Route:** `/dashboard/crypto/[orderId]`

**Features:**
- Order summary (type, asset, network, amounts, rate)
- User information
- Wallet address (for sell orders)
- Transaction hash (blockchain link)
- Blockchain verification tool/link
- Provider information
- Status & timestamps
- Action buttons:
  - Verify transaction (with tx hash & confirmation)
  - Approve order
  - Reject order (with reason)

**API Endpoints Used:**
- `GET /api/admin/crypto/:orderId`
- `POST /api/admin/crypto/:orderId/verify-transaction`
- `POST /api/admin/crypto/:orderId/approve`
- `POST /api/admin/crypto/:orderId/reject`

**Components:**
- Order detail cards
- Blockchain explorer link
- TX hash input/display
- Action modals
- Confirmation dialogs

---

## 10. VIRTUAL ACCOUNTS

### Virtual Accounts List Page
**Route:** `/dashboard/virtual-accounts`

**Features:**
- Virtual accounts table
- Filters: provider, active status, user search
- Stats (total accounts, by provider, active/inactive)
- Unassigned users count alert
- Quick actions: view, deactivate, reactivate

**API Endpoints Used:**
- `GET /api/admin/virtual-accounts`
- `GET /api/admin/virtual-accounts/stats`
- `GET /api/admin/virtual-accounts/unassigned-users`

**Components:**
- Data table
- Filter controls
- Stat cards
- Action buttons

---

### Virtual Account Detail Page
**Route:** `/dashboard/virtual-accounts/[userId]`

**Features:**
- Account details (bank name, account number, provider)
- User information & link to profile
- Account status
- Creation date
- Transaction history for this account
- Action buttons:
  - Deactivate account (with reason)
  - Reactivate account
  - View user profile

**API Endpoints Used:**
- `GET /api/admin/virtual-accounts/:userId`
- `PATCH /api/admin/virtual-accounts/:accountId/deactivate`
- `PATCH /api/admin/virtual-accounts/:accountId/reactivate`

**Components:**
- Account info cards
- Transaction table
- Action buttons with modals

---

### Unassigned Users Page
**Route:** `/dashboard/virtual-accounts/unassigned`

**Features:**
- List of users without virtual accounts
- User information display
- Create account button
- Bulk creation option

**API Endpoints Used:**
- `GET /api/admin/virtual-accounts/unassigned-users`
- `POST /api/admin/virtual-accounts/:userId/create`

**Components:**
- User list/table
- Create account button
- Bulk action selector

---

## 11. ACCOUNT DELETION REQUESTS

### Deletion Requests List Page
**Route:** `/dashboard/deletions`

**Features:**
- Deletion requests table
- Filters: status, date range
- Pending requests alert badge
- User information display
- Days pending indicator
- Quick actions: view, approve, reject

**API Endpoints Used:**
- `GET /api/admin/account-deletions`
- `GET /api/admin/account-deletions/pending`

**Components:**
- Data table
- Filter controls
- Status badges
- Action buttons

---

### Deletion Request Detail Page
**Route:** `/dashboard/deletions/[requestId]`

**Features:**
- Request details (reason, custom reason, date)
- User profile summary
- User wallet balance (warning if balance > 0)
- User pending orders/transactions
- Review history
- Action buttons:
  - Approve (with optional scheduled date)
  - Reject (with reason)
  - Execute deletion (if approved & scheduled)

**API Endpoints Used:**
- `GET /api/admin/account-deletions/:requestId`
- `POST /api/admin/account-deletions/:requestId/approve`
- `POST /api/admin/account-deletions/:requestId/reject`
- `POST /api/admin/account-deletions/:requestId/execute`

**Components:**
- Request detail cards
- User summary
- Warning alerts (balance, pending items)
- Action modals with forms
- Date picker for scheduling

---

## 12. NOTIFICATION MANAGEMENT

### Send Notification Page
**Route:** `/dashboard/notifications/send`

**Features:**
- Notification composer form
- Recipient selection:
  - All users
  - Filtered users (by role, status, KYC tier)
  - Specific user (by ID/email)
- Notification details:
  - Title
  - Message
  - Category
  - Channels (email, SMS, push, in-app)
- Schedule option (send now or scheduled)
- Preview functionality
- Send button

**API Endpoints Used:**
- `POST /api/admin/notifications/broadcast`
- `POST /api/admin/notifications/send-to-user`

**Components:**
- Form with rich text editor
- User filter/selector
- Channel checkboxes
- Date/time picker for scheduling
- Preview modal
- Confirmation dialog

---

### Notification Queue Page
**Route:** `/dashboard/notifications/queue`

**Features:**
- Queued notifications table
- Filters: status, channel
- Retry failed notifications
- Cancel queued notifications
- View notification details

**API Endpoints Used:**
- `GET /api/admin/notifications/queue`
- `POST /api/admin/notifications/queue/:queueId/retry`
- `DELETE /api/admin/notifications/queue/:queueId`

**Components:**
- Data table
- Action buttons
- Status badges

---

### Notification Analytics Page
**Route:** `/dashboard/notifications/analytics`

**Features:**
- Notification stats (sent, delivered, opened, clicked)
- Delivery rate by channel (chart)
- Failed notifications list
- Click-through rate
- Popular notification types

**API Endpoints Used:**
- `GET /api/admin/notifications/stats`
- `GET /api/admin/notifications/failed`

**Components:**
- Stat cards
- Charts
- Failed notifications table

---

## 13. ANALYTICS & REPORTS

### Revenue Analytics Page
**Route:** `/dashboard/analytics/revenue`

**Features:**
- Total revenue display
- Revenue by service type (pie chart)
- Revenue trend (line chart)
- Fees collected breakdown
- Average revenue per user
- Export revenue report (CSV, Excel, PDF)
- Date range selector
- Group by selector (day, week, month)

**API Endpoints Used:**
- `GET /api/admin/analytics/revenue`
- `GET /api/admin/analytics/revenue/export`

**Components:**
- Revenue charts
- Export dropdown
- Date range picker
- Stat cards

---

### User Analytics Page
**Route:** `/dashboard/analytics/users`

**Features:**
- User growth chart
- New vs returning users
- User retention analysis
- Users by KYC tier trend
- Churn rate
- Active users (daily, weekly, monthly)
- Export functionality

**API Endpoints Used:**
- `GET /api/admin/analytics/users`
- `GET /api/admin/analytics/user-growth`

**Components:**
- Multiple charts
- Stat cards
- Date range selector
- Export button

---

### Service Analytics Page
**Route:** `/dashboard/analytics/services`

**Features:**
- Tabs for each service (VTU, Gift Cards, Crypto)
- Service-specific metrics
- Volume trends
- Popular products/services
- Success rates

**API Endpoints Used:**
- `GET /api/admin/analytics/vtu`
- `GET /api/admin/analytics/giftcards`
- `GET /api/admin/analytics/crypto`

**Components:**
- Tab navigation
- Service-specific charts
- Comparison charts

---

## 14. AUDIT LOGS

### Audit Logs Page
**Route:** `/dashboard/audit`

**Features:**
- Comprehensive audit log table
- Filters: user, action, resource, date range
- Search by user ID, resource ID
- Admin actions highlight
- Export audit logs (CSV, Excel)
- Real-time updates (optional)

**API Endpoints Used:**
- `GET /api/admin/audit/logs`
- `GET /api/admin/audit/admin-actions`
- `GET /api/admin/audit/export`

**Components:**
- Advanced data table
- Multi-filter controls
- Search input
- Export functionality
- Real-time indicator (if implemented)

---

### Audit Log Detail Page
**Route:** `/dashboard/audit/[logId]`

**Features:**
- Log entry details (action, resource, timestamp)
- User information
- IP address & user agent
- Metadata display (formatted JSON)
- Before/after comparison (if applicable)

**API Endpoints Used:**
- `GET /api/admin/audit/logs/:logId`

**Components:**
- Detail cards
- JSON viewer
- Diff viewer (for changes)

---

## 15. SYSTEM SETTINGS

### Platform Settings Page
**Route:** `/dashboard/settings/platform`

**Features:**
- Maintenance mode toggle (with message input)
- Feature flags management
- Platform limits configuration
- System announcements
- Edit & save functionality
- Change history

**API Endpoints Used:**
- `GET /api/admin/settings/platform`
- `PATCH /api/admin/settings/maintenance-mode`
- `PUT /api/admin/settings/:key`

**Components:**
- Toggle switches
- Form inputs
- Save button with confirmation
- Change history table

---

### Fee Configuration Page
**Route:** `/dashboard/settings/fees`

**Features:**
- Current fee structure display
- Fee types:
  - Transaction fees
  - Withdrawal fees
  - VTU margins
  - Gift card rates
  - Crypto trading fees
- Edit fee amounts (with reason)
- Fee change history
- Save & apply changes

**API Endpoints Used:**
- `GET /api/admin/settings/fees`
- `PUT /api/admin/settings/fees/:feeType`

**Components:**
- Fee list/table
- Edit forms with reason input
- Confirmation dialogs
- History table

---

### KYC Limits Configuration Page
**Route:** `/dashboard/settings/kyc-limits`

**Features:**
- KYC tier limits display
- Editable limits for each tier:
  - Daily limit
  - Monthly limit
- Update limits (with reason)
- Change history
- Visual representation (chart showing tier limits)

**API Endpoints Used:**
- `GET /api/admin/settings/kyc-limits`
- `PUT /api/admin/settings/kyc-limits/:tier`

**Components:**
- Tier cards with edit functionality
- Bar chart comparing limits
- Form inputs
- History table

---

### Provider Settings Page
**Route:** `/dashboard/settings/providers`

**Features:**
- Tabs for provider categories:
  - Banks
  - VTU providers
  - Payment gateways
- Enable/disable providers
- Provider configuration (API keys, etc.)
- Test connection functionality

**API Endpoints Used:**
- `GET /api/admin/providers/banks`
- `PATCH /api/admin/providers/banks/:bankCode/toggle`
- `GET /api/admin/providers/vtu`
- `PATCH /api/admin/providers/vtu/:provider/toggle`
- `GET /api/admin/providers/payment-gateways`
- `PATCH /api/admin/providers/payment-gateways/:provider/config`

**Components:**
- Tab navigation
- Provider cards with toggle
- Configuration forms
- Test connection buttons

---

## 16. ADMIN USER MANAGEMENT

### Admin Users List Page
**Route:** `/dashboard/admins`

**Features:**
- Admin/support users table
- User information (name, email, role)
- Last login tracking
- Permission badges
- Actions: edit permissions, remove admin access

**API Endpoints Used:**
- `GET /api/admin/admins`

**Components:**
- Data table
- Role badges
- Action buttons

---

### Create Admin Page
**Route:** `/dashboard/admins/create`

**Features:**
- Create admin form:
  - Email
  - First name
  - Last name
  - Role (ADMIN or SUPPORT)
  - Permissions (checkboxes)
- Send invitation
- Success confirmation

**API Endpoints Used:**
- `POST /api/admin/admins/create`

**Components:**
- Form with validation
- Role selector
- Permission checkboxes
- Submit button

---

### Edit Admin Permissions Page
**Route:** `/dashboard/admins/[userId]/permissions`

**Features:**
- Current permissions display
- Permission checkboxes (grouped by category)
- Save changes
- Change history

**API Endpoints Used:**
- `PATCH /api/admin/admins/:userId/permissions`

**Components:**
- Permission form
- Grouped checkboxes
- Save button
- History table

---

## Common Components & Features

### Layout Components

#### Sidebar Navigation
- Logo
- Navigation menu with icons
- Active state highlighting
- Collapsible sections
- User profile section (current admin)
- Logout button
- Notification badge (pending items)

#### Top Navigation Bar
- Page title/breadcrumbs
- Search bar (global search)
- Notifications dropdown
- Admin profile dropdown
- Settings link

#### Dashboard Cards
- Stat card component (value, label, trend, icon)
- Reusable across all dashboard pages

---

### Data Display Components

#### Data Tables
- Sortable columns
- Filterable columns
- Pagination
- Row selection (for bulk actions)
- Action column (view, edit, delete)
- Empty state
- Loading state
- Error state
- Export functionality

#### Charts
- Line chart (trends over time)
- Bar chart (comparisons)
- Pie/Donut chart (distributions)
- Area chart (cumulative data)
- Heatmap (activity patterns)
- Responsive & interactive
- Export as image

---

### Form Components

#### Input Fields
- Text input
- Number input
- Email input
- Phone input
- Textarea
- Rich text editor
- Date picker
- Date range picker
- Time picker
- Dropdown/Select
- Multi-select
- Checkbox
- Radio buttons
- Toggle switch
- File upload/dropzone

#### Form Validation
- Real-time validation with Zod
- Error message display
- Required field indicators
- Form submission handling
- Loading states on submit

---

### Modal Components

#### Confirmation Modal
- Title
- Message
- Confirm/Cancel buttons
- Loading state
- Error handling

#### Form Modal
- Form within modal
- Validation
- Submit & cancel
- Success/error feedback

#### Detail Modal
- View-only information
- Close button
- Scrollable content

---

### Notification Components

#### Toast Notifications
- Success toast
- Error toast
- Info toast
- Warning toast
- Auto-dismiss
- Action button (undo, view details)

#### Alert Banners
- System-wide alerts
- Dismissible
- Multiple severity levels

---

### Utility Components

#### Loading States
- Skeleton loaders for tables
- Spinner for buttons
- Full-page loader
- Inline loaders

#### Empty States
- Illustration
- Message
- Call-to-action button

#### Error States
- Error message
- Retry button
- Support link

#### Badge/Tag
- Status badges (active, suspended, pending, etc.)
- Count badges
- Color variants

#### Avatar
- User avatar with fallback initials
- Customizable sizes

---

## Advanced Features

### Real-time Updates
- WebSocket connection for live data
- Real-time transaction updates
- Live user count
- Notification alerts
- Auto-refresh for critical sections

### Search
- Global search (users, transactions, orders)
- Search suggestions/autocomplete
- Recent searches
- Advanced search filters

### Exports
- CSV export
- Excel export
- PDF reports
- Scheduled reports (email delivery)

### Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management
- Color contrast compliance

### Responsive Design
- Mobile-friendly dashboard
- Tablet optimization
- Desktop layouts
- Adaptive components

### Performance Optimization
- Code splitting
- Lazy loading
- Image optimization
- Caching strategies
- Virtual scrolling for large lists
- Debounced search
- Optimistic UI updates

---

## Security Features

### Authentication & Authorization
- Protected routes (redirect to login if not authenticated)
- Role-based access control (show/hide features based on role)
- Session management
- Auto-logout on inactivity
- Secure token storage (HTTP-only cookies)

### Data Security
- Sensitive data masking (BVN, NIN, card numbers, PINs)
- Input sanitization
- XSS prevention
- CSRF protection

### Audit Trail
- Log all admin actions
- Track changes to settings
- Record user actions on data

---

## User Experience Enhancements

### Dark Mode
- System preference detection
- Manual toggle
- Persistent preference

### Keyboard Shortcuts
- Quick navigation (Cmd+K for search)
- Common actions
- Shortcut help modal

### Onboarding
- Admin user guide
- Feature tooltips
- Help documentation links

### Customization
- Dashboard widget arrangement
- Custom date ranges
- Saved filters
- Personal preferences

---

## Integration Points

### Email Notifications
- Admin action confirmations
- Daily/weekly reports
- Alert notifications (failed transactions, pending KYC)

### Webhooks Monitoring
- View webhook delivery status
- Retry failed webhooks
- Webhook logs

### Third-party Integrations
- Paystack dashboard link
- VTPass dashboard link
- Bank verification services

---

## Deployment Considerations

### Environment Configuration
- Development environment
- Staging environment
- Production environment
- Environment variables for API URLs
- Feature flags for gradual rollouts

### Monitoring & Analytics
- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- User behavior analytics (PostHog, Mixpanel)
- Uptime monitoring

### CI/CD
- Automated builds
- Testing pipeline
- Deployment automation
- Version control

---

## Summary

**Total Pages: 50+**

**Main Sections:**
1. Authentication (2 pages)
2. Dashboard Home (1 page)
3. User Management (3 pages)
4. Wallet Management (2 pages)
5. Transactions (3 pages)
6. KYC (3 pages)
7. VTU (3 pages)
8. Gift Cards (2 pages)
9. Crypto (2 pages)
10. Virtual Accounts (3 pages)
11. Account Deletions (2 pages)
12. Notifications (3 pages)
13. Analytics (3 pages)
14. Audit Logs (2 pages)
15. Settings (4 pages)
16. Admin Management (3 pages)

**Key Features:**
- Comprehensive data management
- Real-time analytics
- Advanced filtering & search
- Bulk actions & exports
- Responsive design
- Role-based access control
- Audit logging
- Notification system
- Multi-service support (VTU, Gift Cards, Crypto)
- KYC verification workflow
- Financial transaction oversight
- System configuration
- Admin user management

This admin dashboard will provide complete control and visibility over the MularPay fintech platform with a modern, user-friendly interface built on Next.js.
