ADMIN DASHBOARD PROMPT (for apps/admin):

Create a comprehensive KYC Management system in the admin dashboard to review and approve/reject user KYC submissions.

DASHBOARD PAGES TO CREATE:

1. KYC Overview Dashboard (Main Page):
   Route: /admin/kyc

   Components:
   - Statistics Cards (Top row):
     - Total Submissions (count)
     - Pending Review (count, highlighted)
     - Approved Today (count)
     - Rejected Today (count)
     - Average Review Time (in hours)
     * Filters Section:
     - Status filter: All | Pending | In Progress | Approved | Rejected
     - Date range filter: Last 7 days | Last 30 days | Custom range
     - Search by: Name, Email, Phone, Reference ID
   - KYC Submissions Table:
     Columns:
     - Reference ID (e.g., KYC-2025-1007-3039)
     - User Name (full name)
     - Email
     - Phone
     - Submitted Date
     - Status (badge with color: yellow=pending, blue=in_progress, green=approved, red=rejected)
     - Assigned To (admin reviewer name)
     - Actions (View Details button)
   - Pagination: 20 items per page
   - Sorting: By submission date (newest first by default)

2. KYC Detail Review Page:
   Route: /admin/kyc/review/{kycId}

   Layout (Split screen or tabs):

   LEFT PANEL - User Information:

   Section 1: Basic Information
   - User ID
   - Full Name (from registration)
   - Email
   - Phone
   - Registration Date
   - Address (from registration)
   - Referral Code Used (if any)

   Section 2: Personal Information (Step 1)
   - First Name
   - Last Name
   - Date of Birth (show age calculated)
   - Gender
   - Nationality
   - Submission Date/Time

   Section 3: Address Details (Step 2)
   - Street Address
   - City / Town
   - District / State
   - Country
   - Postal Code
   - Submission Date/Time

   Section 4: ID Verification (Step 3)
   - ID Type: National ID / Passport / Driver's License
   - Document Viewer:
     - Display uploaded document image/PDF
     - Zoom controls
     - Download button
     - Full-screen view option
   - Document Metadata:
     - File name
     - Upload date/time
     - File size
     - File type

   Section 5: Selfie Verification (Step 4)
   - Selfie Image Viewer:
     - Display captured selfie
     - Zoom controls
     - Download button
     - Full-screen view
   - Face Match Score (if implementing face recognition):
     - Show percentage match between ID photo and selfie
     - Use AWS Rekognition or similar service
   - Image Metadata:
     - Capture date/time
     - Image quality indicators

   RIGHT PANEL - Review Actions:

   Status Section:
   - Current Status: Dropdown (Pending | In Progress | Need More Info | Approved | Rejected)
   - Reference ID: KYC-2025-1007-3039 (copyable)
   - Submitted At: Date/time
   - Assigned To: Dropdown (assign to admin reviewer)

   Document Verification Checklist:
   - [ ] ID document is clear and readable
   - [ ] Photo matches the selfie
   - [ ] All personal details are consistent
   - [ ] Address is complete and valid
   - [ ] User appears to be 18+ years old
   - [ ] No signs of document tampering
   - [ ] Selfie quality is acceptable

   Review Notes (Internal):
   - Text area for admin to add notes
   - Note history (show previous notes with timestamp and admin name)

   Action Buttons:
   1. Request More Information:
      - Opens modal to specify what info is needed
      - Sends notification to user
      - Updates status to "need_more_info"
   2. Reject KYC:
      - Opens modal with rejection reason dropdown:
        - Document not clear
        - Photo doesn't match
        - Underage user
        - Suspected fraud
        - Incomplete information
        - Other (text field)
      - Confirmation dialog
      - Updates status to "rejected"
      - Sends rejection email to user with reason
      - Sets kycRejectedAt timestamp
   3. Approve KYC:
      - Confirmation dialog: "Are you sure you want to approve this KYC?"
      - Updates status to "approved"
      - Sends approval email to user
      - Sets kycApprovedAt timestamp
      - Enables full app features for user
      - Trigger any approval bonuses/rewards

   Activity Timeline:
   - Show all actions taken on this KYC:
     - Submission date
     - Status changes
     - Admin notes added
     - Approval/rejection
     - Each entry shows: timestamp, action, admin who performed it

3. KYC Settings Page:
   Route: /admin/kyc/settings

   Configuration Options:
   - Auto-assign new KYC submissions to reviewers (round-robin or manual)
   - Set SLA (Service Level Agreement) for review time
   - Configure notification settings
   - Manage rejection reason templates
   - Set document upload limits (file size, types)
   - Configure face match threshold (if using face recognition)
   - Enable/disable automatic approval for low-risk users
   - Manage enrollment center locations (for palm biometric)

4. KYC Analytics Page:
   Route: /admin/kyc/analytics

   Metrics & Charts:
   - Submission trends (line chart over time)
   - Approval vs Rejection rates (pie chart)
   - Average review time by reviewer
   - Most common rejection reasons (bar chart)
   - KYC completion funnel:
     - Started KYC
     - Completed Personal Info
     - Completed Address Info
     - Uploaded ID
     - Completed Selfie
     - Submitted for review
     - Approved
   - Peak submission times (heatmap)
   - Reviewer performance metrics

API ENDPOINTS FOR ADMIN:

1. GET /api/admin/kyc/submissions
   Query params: status, page, limit, sortBy, search, dateFrom, dateTo
   Response: Paginated list of KYC submissions

2. GET /api/admin/kyc/submission/{id}
   Response: Complete KYC details including all documents

3. PATCH /api/admin/kyc/submission/{id}/status
   Body: { status: 'approved' | 'rejected' | 'need_more_info', reason?: string, notes?: string }
   Logic:
   - Update kycStatus
   - Set appropriate timestamp (kycApprovedAt or kycRejectedAt)
   - Send email notification to user
   - Log action in audit trail
   - If approved: Enable full app access

4. POST /api/admin/kyc/submission/{id}/assign
   Body: { adminId: string }
   Logic: Assign KYC to specific admin reviewer

5. POST /api/admin/kyc/submission/{id}/note
   Body: { note: string }
   Logic: Add internal note to KYC submission

6. GET /api/admin/kyc/statistics
   Response: Dashboard statistics (total, pending, approved, rejected, avg time)

7. GET /api/admin/kyc/analytics
   Query params: dateFrom, dateTo
   Response: Analytics data for charts

8. GET /api/admin/kyc/document/{documentId}/download
   Response: Signed URL for document download

NOTIFICATION SYSTEM:

Email Templates to Create:

1. KYC Submitted Confirmation (to user):
   Subject: KYC Verification Submitted Successfully
   Content:
   - Thank you message
   - Reference ID
   - Estimated review time (1-2 business days)
   - What happens next
   - Limited features available during review

2. KYC Approved (to user):
   Subject: Your Inganta Pay Account is Now Verified! 🎉
   Content:
   - Congratulations message
   - All features now unlocked
   - Next steps: Fund wallet, explore features
   - Optional: Palm enrollment CTA

3. KYC Rejected (to user):
   Subject: KYC Verification - Additional Review Required
   Content:
   - Rejection reason (be professional and helpful)
   - What they need to do to fix it
   - How to resubmit
   - Support contact information

4. KYC Need More Info (to user):
   Subject: Additional Information Required for KYC Verification
   Content:
   - Specific information/documents needed
   - Instructions on how to provide it
   - Deadline (if applicable)

5. New KYC Submission (to admin):
   Subject: New KYC Submission - {User Name}
   Content:
   - User details
   - Reference ID
   - Link to review page
   - Current queue size

SECURITY & PERMISSIONS:

Role-Based Access Control:

- Super Admin: Full access to all KYC functions
- KYC Reviewer: Can view and approve/reject KYC
- Support Agent: Read-only access to KYC details
- Regular Admin: No access to KYC

Audit Logging:

- Log all KYC-related actions:
  - Who reviewed
  - When reviewed
  - What action was taken
  - IP address
  - Browser/device info
- Maintain immutable audit trail

Data Privacy:

- Mask sensitive data in logs
- Encrypt documents at rest (S3 encryption)
- Use signed URLs for document access
- Automatic expiry on download links (1 hour)
- Comply with GDPR/data protection regulations

FRONTEND TECH STACK (Admin Dashboard):

- Next.js 14+ with App Router
- TypeScript
- TailwindCSS for styling
- shadcn/ui component library
- React Hook Form + Zod for forms
- Tanstack Query for data fetching
- Recharts or Chart.js for analytics
- React Image Gallery for document viewing
- Zustand or Redux for state management

TESTING REQUIREMENTS:

- Unit tests for validation logic
- Integration tests for API endpoints
- E2E tests for approval/rejection flows
- Test with various document types and formats
- Test error handling and edge cases

PERFORMANCE CONSIDERATIONS:

- Lazy load document images
- Implement infinite scroll for submissions table
- Cache frequently accessed KYC submissions
- Optimize database queries with proper indexes
- Use CDN for document storage (CloudFront + S3)

MONITORING & ALERTS:

- Alert when pending KYC count exceeds threshold
- Monitor average review time
- Track API error rates
- Alert on suspicious activity (multiple rejections, fraud patterns)
