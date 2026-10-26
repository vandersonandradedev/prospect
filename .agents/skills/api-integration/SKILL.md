---
name: api-integration
description: Guides integration with licensed commercial directories, validation APIs (CNPJ, Receita Federal, CEP, geocoding), and third-party data providers. Use when connecting external APIs, handling rate limits, caching responses, token authorization, validating schemas with Zod, and building fallback adapters.
---

# API Integration for Lead Generation & Validation

This skill governs the integration of third-party business directories, government registry lookups, and validation APIs for B2B lead generation.

## 1. Provider Adapter Architecture (BusinessProvider Pattern)

Decouple external API specifics from application business logic by adopting an adapter pattern:

```typescript
export interface BusinessProvider {
  name: string;
  searchBusinesses(params: SearchParams): Promise<LeadBusiness[]>;
  getBusinessDetails?(id: string): Promise<LeadBusiness | null>;
}
```

- **Pluggable Providers:** Support multiple upstream services (e.g., Google Places API, OpenStreetMap/Overpass, licensed commercial directories, BrasilAPI / CNPJ services).
- **Graceful Fallbacks:** If the primary provider exceeds quota or rate limits, seamlessly fall back to secondary providers or cached records.

## 2. Validation & Enrichment APIs

1. **CNPJ & Company Validation:**
   - Query authorized data providers (e.g. BrasilAPI, ReceitaWS, official government open data) to enrich company names with registration status, CNAE codes, share capital, and partner details.
   - Always validate Brazilian CNPJ checksums locally before hitting external endpoints.
2. **Postal & Geocoding APIs:**
   - Normalize addresses with CEP APIs (ViaCEP, BrasilAPI) and geocode coordinates with Nominatim or Google Geocoding.
3. **Contact Validation:**
   - Validate phone formats, verify WhatsApp readiness, and perform MX / DNS checks on contact domain names.

## 3. Resilience, Caching & Quota Management

- **Local / Redis Caching:** Cache external lookup responses with deterministic TTL (e.g. 7–30 days for CNPJ company registry data) to prevent repeated billing or quota exhaustion.
- **Circuit Breakers & Retries:** Implement retry logic with exponential backoff for transient failures (status 5xx, timeouts) and fast-fail on 4xx authorization / invalid parameter errors.
- **Rate-Limiter queues:** Bound outgoing requests per minute (RPM) to match the external provider's SLA.
