---
name: vitest
description: Comprehensive testing with Vitest for lead qualification, deduplication algorithms, business scoring rules, and error handling. Use when creating or maintaining unit tests, integration tests, mock data fixtures, and coverage validation in TypeScript and Node.js projects.
---

# Vitest Testing Guide for Lead Generation & Data Pipelines

This skill guides testing lead ingestion, data normalization, deduplication, qualification scoring, and error handling using Vitest.

## 1. Fast Test Execution & Setup

- Configured with `vitest.config.ts`.
- Commands:
  - `npm test` -> Run tests once (ideal for CI)
  - `npm run test:watch` -> Interactive watch mode during feature development
  - `npm run test:coverage` -> Produce coverage metrics

## 2. Key Testing Targets for B2B Leads

### A. Lead Deduplication Tests
Deduplication is critical to prevent contacting the same company multiple times:
- Match by normalized phone (stripping punctuation and country code).
- Match by normalized CNPJ / Tax ID.
- Match by normalized domain name (stripping `www.`, protocol, and trailing slash).
- Fuzzy name matching + geographic proximity within a radius threshold (e.g. < 100 meters).

### B. Lead Scoring & Qualification Rules
- Unit test scoring formulas: weights for having a valid phone, WhatsApp compatibility, operational website, Google ratings, review counts, and recent activity.
- Edge cases: businesses with zero reviews, missing addresses, non-standard operating hours, or inactive status.

### C. Error Handling & Provider Fault Tolerance
- Mock network disconnects, HTTP 429 (rate limits), and malformed JSON payloads.
- Verify that downstream pipeline continues gracefully when an individual lead fails validation.
- Assert that error events are logged without exposing sensitive API tokens.

## 3. Best Practices

- Prefer pure helper functions for scoring, normalization, and deduplication so they can be tested without database dependencies.
- Use `describe()` blocks to group rules and `it()` / `test()` with explicit assertions (`expect(result).toBe(...)`, `expect(leads).toHaveLength(...)`).
- Maintain mock fixtures under `tests/fixtures/` for reliable regression testing.
