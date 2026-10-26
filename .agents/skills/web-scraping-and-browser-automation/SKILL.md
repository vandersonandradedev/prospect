---
name: web-scraping-and-browser-automation
description: Best practices and runbooks for automated browser consultation and ethical web data extraction from authorized sources. Use when automating searches on authorized commercial portals, respecting robots.txt, implementing rate limiting, backoff, browser fingerprinting, and handling CAPTCHAs, DOM selectors, and session persistence.
---

# Web Scraping & Browser Automation Skill

This skill provides guidelines and patterns for web scraping and browser automation targeting lead capture, business directories, and public validation sources.

## Core Rules & Ethics

1. **Authorized Sources Only:**
   - Always query authorized sources, official commercial directories, or sites with open terms of service.
   - Respect `robots.txt`, crawl-delay directives, and rate limits.
   - Implement exponential backoff and jitter on HTTP 429 or 503 responses.

2. **Browser Automation Engine Selection:**
   - **Playwright CLI / Playwright Core:** Preferred for interactive web workflows, SPAs, dynamic JavaScript rendering, and taking evidence screenshots.
   - **Agent-Browser:** Recommended for autonomous agent task execution and browser automation.
   - **Lightweight HTTP/Cheerio:** For static pages or SSR endpoints where browser rendering overhead is unnecessary.

3. **Anti-Detection & Resilience:**
   - Rotate User-Agents responsibly among realistic modern desktop browsers.
   - Set viewport sizes (e.g. 1920x1080) and locale settings matching the target market (e.g. `pt-BR`, `America/Sao_Paulo`).
   - Avoid aggressive burst requests; throttle requests (e.g. 1 request every 1.5–3 seconds per domain).
   - Use smart waiting (`waitForSelector`, `waitForLoadState('networkidle')`) rather than hardcoded sleep delays.

4. **Data Normalization & Extraction Pipeline:**
   - Extract raw data into structured TypeScript models (`name`, `category`, `phones`, `emails`, `website`, `address`, `city`, `state`, `socials`).
   - Clean whitespace, strip HTML tags, normalize phone numbers to E.164 / DDD format (+55 XX 9XXXX-XXXX).
   - Flag suspect entries with low data density or validation errors for manual review.
