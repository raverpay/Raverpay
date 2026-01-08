# Phase 1: Codebase Renaming & Branding

## Overview

This phase focuses on renaming the entire codebase from RaverPay to IngantaPay, including folder names, package names, email templates, and all branding references.

## Objectives

1. Rename app folders from `raverpay-*` to generic names
2. Update all brand references from "RaverPay" to "IngantaPay"
3. Update email templates with new branding
4. Update package.json files with new names
5. Update app configuration files

## Scope

### Mobile App (`raverpay-mobile` → `mobile`)
- Rename folder
- Update `app.json` and `app.config.js` (app name, bundle ID, scheme)
- Update package.json name
- Update any hardcoded "RaverPay" strings

### API (`raverpay-api` → `api`)
- Rename folder
- Update package.json name
- Update email templates (all `.hbs` files)
- Update Swagger documentation titles
- Update any hardcoded brand references

### Admin Dashboard (`raverpay-admin` → `admin`)
- Rename folder
- Update package.json name
- Update page titles and branding
- Update logo references

### Root Configuration
- Update `pnpm-workspace.yaml`
- Update `turbo.json`
- Update root `package.json` scripts
- Update any CI/CD references

## Timeline Estimate
- **Estimated Duration**: 4-6 hours
- **Risk Level**: Medium (requires careful git operations)

## Dependencies
- None (this is the first phase)

## Notes
- This phase should be done in a new git branch
- Test all apps after renaming to ensure nothing breaks
- Consider creating a migration script for automated renaming
