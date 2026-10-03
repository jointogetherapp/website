# Together: reading-circle product preview

**Finish a book. Find your people.**

A phone-first, dependency-free static frontend built around human connection through reading. Virtual and in-person circles have equal prominence. The existing `together-website` and `together-review` projects are preserved separately.

## Run locally

Requires Python 3 and a modern browser. Node 18+ runs the model tests.

```sh
cd together-reading
python -m http.server 8765
# Open http://localhost:8765/
node --test model.test.mjs
node --check app.mjs
node --check site.js
python validate.py
```

Use HTTP rather than opening `app.html` directly: ES-module loading requires an HTTP origin. No install/build step, package dependencies, remote fonts, analytics, or frontend API keys are required.

## Routes

- `index.html`: landing, human-connection story, equal virtual/in-person discovery
- `explore.html`: two clearly labelled sample circles; URL and button filters
- `how-it-works.html`: workflow, proposed host, future author-encounter ambition
- `pricing.html`: proposed Free / Plus offer, no purchasing or subscription
- `community.html`: community principles and truthful prelaunch safety status
- `privacy.html`: preview data notice and current limitations
- `app.html`: local reader preview with Today / Circle / Me tabs
- Reader hash routes: `#today`, `#circle`, `#me`, `#join/slow-sundays`, `#join/around-the-table`, `#check-in`, `#plus`

## Working preview features

- Join/replace the one active sample circle; choose a book, date, and chapter pace
- Nickname, four avatars, local introduction, format preference
- Reading check-in and progress editing; complete schedules generated from the selected book's edition
- Chapter-specific threads, spoiler gate ahead of saved progress, explicit reveal per page session
- Three curated original prompts per chapter (early chapters are specific; later chapters use open questions)
- Local reflections, safely escaped on rendering; no invented member messages
- One changeable next-book vote per circle, including an explicit reread option
- Derived first-check-in, first-local-post, and self-reported completion badges
- Export local JSON, leave circle, explicit two-step reset
- Plus settings concept: preview an idea without saving/creating a real circle or purchase
- Browser storage exception handling and cross-tab state refresh

## Honest boundaries

This is not a launched community. There are no accounts, real members, messages sent to other people, booked events, vetted hosts, moderation operations, email notifications, live AI requests, invitations, purchases, or subscriptions. Nothing in the UI activates the backend. In-person venues are examples only. Author encounters are a future ambition, with no promised guest or partnership.

The lifestyle hero is an AI-generated illustrative image, disclosed on the page. It does not depict actual Together members. Covers are original typographic/geometric artwork and are not publisher covers or author endorsements.

Free is a proposed one-active-circle offer. Plus is a proposed **US$5.99/month** creator membership with friends joining free and a bounded extra-prompt allowance not yet defined. No payment controls are exposed. No paid resources were purchased for this build.

## Data and safety

`model.mjs` is a deterministic, DOM-independent state boundary. It validates known IDs and data types, bounds input size, rejects invalid posts and dates, derives badges from underlying state, and normalizes corrupt or unknown-version storage safely. `app.mjs` escapes all dynamic user text before inserting HTML. User input never becomes a URL, executable script, or style value.

State is stored under `together-reading:v1` in this browser's localStorage. It is not encrypted and is visible to anyone with access to the browser profile. The UI asks for non-identifying nicknames and discourages personal details. A failed storage write is explicitly disclosed. Export is a normal local JSON download; reset clears this key and does not remove exported files or other sites' storage.

The application makes no fetch, AI, analytics, or payment requests. Normal static hosting access logs may still exist. Clicking a public-domain book link visits Project Gutenberg under its policies.

## Book editions and prompts

- Jane Austen, *Pride and Prejudice*: 61 chapters. https://www.gutenberg.org/ebooks/1342
- H. G. Wells, *The Time Machine*: 16 numbered chapters plus Epilogue, 17 reading sections, as in the linked Gutenberg edition. https://www.gutenberg.org/ebooks/35

Other editions may divide chapters differently. Country-specific public-domain availability should be checked by each reader. No book text is bundled. Prompt copy is original, not copied from paid editions or represented as author-approved.

## Backend boundary

The frontend runs completely independently. A separate code-only `backend/` foundation, if included by the coordinating task, is **not provisioned or connected**. The app does not import or call it. Before live launch, independently provision the approved backend, test authorization/RLS and account deletion, establish operator/contact and legal notices, implement reporting/blocking/moderator response, finalize age/access policies, set AI budgets and limits, and obtain explicit approval before any paid deployment or subscription setup. Never use an unrelated existing project's credentials.

Adapters should replace persistence and mutations at the model boundary while preserving explicit pending/error UI and server-authoritative membership and entitlement checks. localStorage is a preview only, not a production authentication or authorization system.

## Verification

- Model: 21 automated tests, including storage failure, corrupt persistence, progress bounds, spoofed fields, membership replacement, vote changes, badge derivation, edition counts, and date/schedule boundaries.
- Static: local route/asset resolution, required title/viewport/lang/meta, CSS/JS entry existence, no unexpected third-party resources.
- JS syntax: `node --check` for both UI entrypoints.
- Independent DOM testing is reported separately by the coordinating task.
- **Real-browser visual QA was not completed.** The environment refused a local Chromium launch and the separate cloud browser could not access the local preview. DOM tests are not a substitute for real layout, device, assistive-technology, or keyboard visual-focus testing. Check the final build on a phone and desktop before launching.

Recommended manual cases: 320–430 px portrait; 768 px tablet; 1440 px desktop; 200% zoom; keyboard-only navigation and focus; reduced motion; screen-reader form names; storage disabled; multi-tab editing; HTML-like profile/post text; lower progress after finishing; explicit spoiler reveal; back/forward after joining; repeated voting; reset cancel and confirm.
