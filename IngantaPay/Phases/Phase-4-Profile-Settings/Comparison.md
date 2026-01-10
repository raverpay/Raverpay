# Phase 4: Current vs. Target Comparison

## Profile Screen (Main)

| Element         | Current                 | Target                    |
| --------------- | ----------------------- | ------------------------- |
| Background      | Light gray              | Black (#0A0A0A)           |
| Header          | White bar with border   | No header, just title     |
| Title           | "Profile" in header     | "Profile" top-left, white |
| Profile picture | Left-aligned or in card | Centered, 112x112px       |
| Picture border  | None or subtle          | 2px white/20%             |
| User name       | Left-aligned            | Centered, white           |
| Email           | Left-aligned            | Centered, gray            |
| Tier badge      | Prominent display       | **REMOVE**                |
| P2P Username    | Displayed               | **REMOVE**                |
| Menu layout     | Sections with cards     | Simple card list          |
| Icon containers | Colored backgrounds     | Gray (#3A3A3A) circles    |
| Logout          | Text link or secondary  | Red button, full width    |

### New Elements in Profile

| Element          | Current | Target                            |
| ---------------- | ------- | --------------------------------- |
| KYC Badge        | N/A     | "KYC Verified" pill (if approved) |
| Mosaic Code Card | N/A     | Yellow code with "View" button    |

### Menu Items

| Current             | Target                        |
| ------------------- | ----------------------------- |
| Account section     | **REMOVE**                    |
| Edit Profile        | ✓ Keep, restyle               |
| Security            | ✓ Keep, restyle               |
| P2P Username        | **REMOVE**                    |
| Theme Settings      | **REPLACE** with App Settings |
| Support section     | ✓ Keep, restyle               |
| Help Center         | **RENAME** to Help & Support  |
| Terms of Service    | Move to About                 |
| Privacy Policy      | Move to About                 |
| Danger Zone section | **REMOVE**                    |
| Delete Account      | Move to Settings or remove    |

---

## Edit Profile Screen

| Element         | Current       | Target                          |
| --------------- | ------------- | ------------------------------- |
| Background      | Light         | Black                           |
| Header          | Standard      | Simple with back button         |
| Profile picture | Editable      | Editable with red camera button |
| Camera button   | Default style | Red (#C41E3A), 36x36px          |

### Form Fields

| Current Field       | Target Status                        |
| ------------------- | ------------------------------------ |
| First Name          | **REMOVE** (show combined Full Name) |
| Last Name           | **REMOVE** (show combined Full Name) |
| Full Name (display) | **ADD** - readonly display           |
| Email               | Keep - readonly                      |
| Phone               | Keep - readonly                      |
| Date of Birth       | **REMOVE**                           |
| Gender              | **REMOVE**                           |
| Nationality         | **REMOVE**                           |
| City                | **REMOVE**                           |
| State               | **REMOVE**                           |
| Address             | **ADD** - editable, multiline        |

### Readonly Field Styling

| Aspect     | Current | Target                |
| ---------- | ------- | --------------------- |
| Background | White   | Darker gray (#1A1A1A) |
| Text color | Black   | Gray (#6B7280)        |
| Hint text  | None    | "Cannot be changed"   |
| Lock icon  | None    | Add (optional)        |

---

## Security Settings Screen

| Element        | Current       | Target                        |
| -------------- | ------------- | ----------------------------- |
| Background     | Light         | Black                         |
| Security Score | N/A           | **NEW** - Green gradient card |
| Score display  | N/A           | Shield icon + rating text     |
| Toggle styling | Purple/system | Red (#C41E3A) when ON         |

### Security Score Card (New)

| Element           | Value                                  |
| ----------------- | -------------------------------------- |
| Background        | Green gradient (#059669 → #047857)     |
| Icon              | Shield with double circles             |
| Label             | "Security Score"                       |
| Rating            | "Excellent" / "Good" / "Fair" / "Weak" |
| Score calculation | See Tasks.md for logic                 |

### Authentication Section

| Current             | Target                      |
| ------------------- | --------------------------- |
| Biometric toggle    | ✓ Keep, restyle             |
| Face ID/Fingerprint | Rename to "Biometric Login" |
| Palm Payments       | **ADD** (new toggle)        |
| Two-Factor Auth     | **ADD** (new toggle)        |

### Password & PIN Section

| Current         | Target          |
| --------------- | --------------- |
| Change Password | ✓ Keep, restyle |
| Change PIN      | ✓ Keep, restyle |
| Login History   | **REMOVE**      |
| Debug buttons   | **REMOVE**      |

### Toggle Styling

| Aspect         | Current       | Target         |
| -------------- | ------------- | -------------- |
| Active track   | Purple/system | Red (#C41E3A)  |
| Inactive track | Gray/system   | Gray (#4B5563) |
| Thumb          | White         | White          |

---

## App Settings Screen (New)

| Section       | Elements                       |
| ------------- | ------------------------------ |
| Notifications | Push, Email, SMS toggles       |
| Appearance    | Dark Mode toggle               |
| About         | "About Inganta Pay" navigation |

### Notification Toggles

| Toggle              | Icon Color       | Default |
| ------------------- | ---------------- | ------- |
| Push Notifications  | Blue (#3B82F6)   | ON      |
| Email Notifications | Green (#10B981)  | ON      |
| SMS Notifications   | Purple (#A855F7) | OFF     |

### Replaces

| Current Screen                       | Status                                   |
| ------------------------------------ | ---------------------------------------- |
| Theme Settings                       | **REPLACE** with simple Dark Mode toggle |
| Notification Preferences (if exists) | Consolidate here                         |

---

## Menu Item Card Styling

| Aspect              | Current    | Target              |
| ------------------- | ---------- | ------------------- |
| Background          | White/card | Dark gray (#2A2A2A) |
| Border radius       | Various    | 16px                |
| Padding             | Various    | 16px                |
| Margin bottom       | Various    | 12px                |
| Icon container size | Various    | 48x48px             |
| Icon container bg   | Colored    | Gray (#3A3A3A)      |
| Icon color          | Colored    | White               |
| Text color          | Dark       | White               |
| Chevron color       | Gray       | Dark gray (#666)    |

---

## Color Changes Summary

| Element              | Current           | Target           |
| -------------------- | ----------------- | ---------------- |
| Background           | #F9FAFB / #0F172A | #0A0A0A          |
| Card background      | #FFFFFF / #1E293B | #2A2A2A          |
| Icon container       | Various colors    | #3A3A3A          |
| Primary text         | #111827 / #F1F5F9 | #FFFFFF          |
| Secondary text       | #6B7280 / #CBD5E1 | #9CA3AF          |
| Primary action       | #5B55F6           | #C41E3A          |
| Toggle active        | Purple            | #C41E3A          |
| Accent (Mosaic Code) | N/A               | #F59E0B (yellow) |
| Success              | #22C55E           | #10B981          |

---

## Backend Changes

| Endpoint                            | Current            | Target              |
| ----------------------------------- | ------------------ | ------------------- |
| PUT /users/profile                  | Accepts all fields | Only accept address |
| GET /users/security-score           | N/A                | **NEW** (optional)  |
| PUT /users/notification-preferences | May not exist      | **UPDATE/CREATE**   |
| GET /users/mosaic-code              | N/A                | **NEW** (optional)  |
