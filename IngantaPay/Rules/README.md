# IngantaPay Development Rules Summary

This document provides a quick reference for all codebase rules. For detailed rules, see:

- [Mobile App Rules](./Mobile-App-Rules.md)
- [Backend API Rules](./Backend-API-Rules.md)

---

## Quick Reference

### Brand Identity

| Item              | Value              |
| ----------------- | ------------------ |
| App Name          | Inganta Pay        |
| Primary Color     | #C41E3A (Red)      |
| Background (Dark) | #0A0A0A            |
| Card Background   | #2A2A2A            |
| Accent Color      | #F59E0B (Yellow)   |
| Package ID        | com.ingantapay.app |

---

### Before Making Changes

1. ✅ Read the relevant phase documentation
2. ✅ Check existing patterns in the codebase
3. ✅ Use existing components where possible
4. ✅ Update centralized constants (colors, typography)
5. ✅ Test in both light and dark mode
6. ✅ Comment out removed code with `// OLD_RAVERPAY:` prefix

---

### Code Removal Pattern

When removing code, ALWAYS comment it out:

```typescript
// OLD_RAVERPAY: [Description of what this was and why it's removed]
// <OldComponent prop={value} />
```

---

### File Locations

#### Mobile App

| Purpose       | Location                                  |
| ------------- | ----------------------------------------- |
| Colors        | `apps/mobile/src/constants/colors.ts`     |
| Typography    | `apps/mobile/src/constants/typography.ts` |
| UI Components | `apps/mobile/src/components/ui/`          |
| Hooks         | `apps/mobile/src/hooks/`                  |
| Stores        | `apps/mobile/src/store/`                  |
| Services      | `apps/mobile/src/services/`               |

#### Backend API

| Purpose         | Location                                |
| --------------- | --------------------------------------- |
| Prisma Schema   | `apps/api/prisma/schema.prisma`         |
| SQL Migrations  | `apps/api/prisma/*.sql`                 |
| Feature Modules | `apps/api/src/modules/`                 |
| Email Templates | `apps/api/src/modules/email/templates/` |
| Common Utils    | `apps/api/src/common/`                  |

---

### Pull Request Checklist

Before submitting changes:

- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] No linting warnings
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)
- [ ] Phase progress tracker updated
- [ ] Changes reviewed manually

---

### Command Reference

```bash
# Mobile App
cd apps/mobile
pnpm start           # Start Expo dev server
pnpm ios             # Run on iOS simulator
pnpm android         # Run on Android emulator

# Backend API
cd apps/api
pnpm dev             # Start dev server
pnpm build           # Build for production
pnpm test            # Run tests
pnpm prisma studio   # Open Prisma Studio

# Admin Dashboard
cd apps/admin
pnpm dev             # Start dev server
pnpm build           # Build for production

# Root (all apps)
pnpm check:all       # Run all checks
pnpm format          # Format code
pnpm lint            # Run linter
```

---

### Key Technologies

| Area              | Technology                |
| ----------------- | ------------------------- |
| Mobile Framework  | React Native / Expo       |
| Mobile Navigation | Expo Router               |
| Mobile Styling    | NativeWind (Tailwind CSS) |
| State Management  | Zustand                   |
| Form Handling     | React Hook Form + Zod     |
| Backend Framework | NestJS                    |
| Database          | PostgreSQL + Prisma       |
| Queue             | BullMQ + Redis            |
| Auth              | JWT + Passport            |
| Email             | Resend (or AWS SES)       |

---

### Contact / Escalation

If an AI agent encounters issues:

1. Document the issue clearly
2. Show relevant error messages
3. Explain what was attempted
4. Ask the user for guidance

**DO NOT** make assumptions about removing functionality without user confirmation.
