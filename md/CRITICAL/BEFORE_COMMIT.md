## 🚀 Before you commit in the future, always run:

### Quick Command (Recommended):

```bash
pnpm check:all
```

This runs all checks automatically:

- ✅ Format code
- ✅ Verify formatting
- ✅ Run linter
- ✅ Type check
- ✅ Run tests
- ✅ Run local smoke tests (if API is running)

### Individual Commands:

If you need to run checks individually:

```bash
pnpm precommit        # Run all pre-commit checks (format, lint, typecheck, test)
pnpm test:smoke:local # Run smoke tests against localhost:3001
pnpm format          # Auto-format everything
pnpm format:check    # Verify it's formatted
pnpm lint            # Check for errors
pnpm typecheck       # Check TypeScript
pnpm test            # Run tests
```
