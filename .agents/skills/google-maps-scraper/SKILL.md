---
name: google-maps-scraper
description: Run and manage this repository's local Google Maps business scraper, producing CSV or JSON lead lists with contact details. Use for requests to find businesses by category and place, build local lead lists, enrich listings with emails or social links, inspect scrape jobs, or troubleshoot the local scraper. Do not use for scraping individual people or social-media platforms directly.
---

# Google Maps Scraper

Operate the local Docker-backed scraper through the repository scripts. Treat a scrape as an asynchronous
job: create it, poll to completion, download the raw CSV, then keep only the fields the user needs.

## Default workflow

1. Work from the repository root.
2. Check the API:

   ```bash
   curl --fail --silent http://localhost:8080/api/v1/jobs >/dev/null
   ```

3. If it is unavailable, run `docker compose up -d`, wait for the container to become ready, and retry.
   If Docker is missing or the daemon is stopped, point the user to `SETUP.md` and stop.
4. Prefer the Python wrapper:

   ```bash
   python3 scripts/scrape.py "<business type> in <city>" \
     --city "<city, state/country>" \
     --depth 5 \
     --out "results/<descriptive-name>.csv"
   ```

5. Let the command poll until completion. If the execution environment returns a running session, poll
   that session for output instead of starting a duplicate job.
6. Report the result count, output path, missing-field caveats, and at most five sample rows. Do not paste
   a large CSV into chat.

## Defaults and options

- Use `depth 5` unless the user requests another scope. Higher depth is slower and more likely to be
  rate-limited.
- Email extraction is enabled by default. Use `--no-email` only for an explicitly fast or no-email run.
- Use `--socials` only when the user asks for Instagram, Facebook, or LinkedIn enrichment. It scans each
  business website; coverage is partial and it does not scrape those platforms directly.
- Use `--keywords-file <path>` for multiple queries. Submit them as one API job rather than launching
  concurrent jobs.
- Use `--fields "field_a,field_b"` for a custom projection, `--full` for all upstream columns, and
  `--json` or a `.json` output path for JSON.
- Choose a descriptive path under `results/` when the user gives a market or campaign name. The directory
  is ignored by Git.

Default lead fields:

```text
title, phone, emails, website, category, address, review_rating, review_count
```

If socials are requested, also include:

```text
instagram, facebook, linkedin
```

## Raw API fallback

Use the REST API only for options not exposed by `scripts/scrape.py`, such as proxies or a custom radius.
The base URL is `http://localhost:8080` with no authentication in the default localhost-only setup.

Create a job with `POST /api/v1/jobs`. These fields are required:

- `keywords`: array of search strings with the location included in each term.
- `lat` and `lon`: strings, not numbers.
- `max_time`: integer seconds.

Recommended starting body:

```json
{
  "name": "codex-scrape",
  "keywords": ["dentists in Embu das Artes SP"],
  "lang": "pt-BR",
  "zoom": 15,
  "lat": "-23.6486",
  "lon": "-46.8522",
  "fast_mode": false,
  "radius": 10000,
  "depth": 5,
  "email": true,
  "max_time": 600
}
```

The create response contains lowercase `id`. Poll `GET /api/v1/jobs/{id}` and read capitalized `Status`:
`working` becomes `ok` or `failed`. Download results from `GET /api/v1/jobs/{id}/download`.

Other endpoints:

- `GET /api/v1/jobs`: list jobs.
- `DELETE /api/v1/jobs/{id}`: delete a job and its stored result.
- `GET /api/v1/jobs/{id}/download`: download the raw CSV.
- `http://localhost:8080/api/docs`: local OpenAPI documentation.

## Scope, safety, and privacy

- Run one job at a time. For high depth, many keywords, or repeated runs, warn briefly that Google may
  temporarily rate-limit the user's IP and recommend lower depth, spacing runs, or configured proxies.
- Do not claim a guaranteed safe threshold; none is published.
- Treat results as leads to verify. Google Maps data can be stale or incomplete.
- Phone numbers and emails may be personal data. When the user plans outreach or storage, flag applicable
  privacy and marketing rules, including Brazil's LGPD where relevant, and the need for opt-outs.
- Do not assist with surveillance of individuals, harassment, spam, bypassing access controls, or resale
  of raw scraped datasets.
- Google Maps scraping may violate Google's Terms of Service. Keep usage modest and user-directed.
- Never change the API binding from `127.0.0.1` to a public interface without authentication.

## Troubleshooting

- Connection refused: start Docker and run `docker compose up -d`.
- HTTP 422 mentioning max time: add `max_time` in seconds.
- HTTP 422 mentioning coordinates: send `lat` and `lon` as strings.
- Job remains `working`: inspect `docker compose logs --tail=100`, lower depth, increase `max_time`, or
  back off if requests appear throttled.
- Empty or unexpectedly short CSV: verify the location, broaden the query/radius, or retry later if
  rate-limiting is likely.
- Social fields are empty: the business may lack a website or may not link social profiles from it.
