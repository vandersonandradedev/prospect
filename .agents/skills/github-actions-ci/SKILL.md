---
name: github-actions-ci
description: CI/CD automation with GitHub Actions. Use when setting up or modifying automated pull request workflows, running linting, typecheck, Vitest unit test suites, security audits, build verification, and deployment pipelines.
---

# GitHub Actions & CI Pipeline

This skill guides configuring and maintaining automated quality gates and continuous integration using GitHub Actions.

## 1. Quality Gates Pipeline (`.github/workflows/ci.yml`)

Every pull request and push to main branches must pass the following phases:

1. **Dependency Installation:** `npm ci` ensures reproducible dependency trees based on `package-lock.json`.
2. **Type Checking:** `npm run typecheck` (`tsc --noEmit`) validates TypeScript contracts across all files without compilation overhead.
3. **Automated Testing:** `npm test` executes Vitest test suites verifying lead deduplication, business logic, scoring, and data contracts.
4. **Security Audits:** Automated checks for package vulnerabilities (`npm audit`) and secrets scanning.

## 2. CI Optimization & Best Practices

- **Caching:** Enable Node.js package caching via `actions/setup-node@v4` with `cache: 'npm'`.
- **Fast Feedback:** Keep unit test execution under 60 seconds by mocking external network calls.
- **Branch Protection:** Enforce that CI checks must pass green before merging PRs.
- **Secret Management:** Store external API keys (Google Maps, PostgreSQL/Neon credentials, Supabase keys) securely in GitHub Actions Secrets, never hardcoding them in workflow YAMLs.
