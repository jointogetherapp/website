# Together website

A dependency-free, responsive public-product website and simulated product demo. This repository is separate from the Buttonwood application.

## Pages

- `index.html`: product positioning and feature overview
- `how-it-works.html`: clear workflow and decision rules
- `pricing.html`: proposed $8 USD/month or $72 USD/year organizer offer (not available to purchase)
- `about.html`: mission and honest development status
- `privacy.html`: current preview data practices
- `demo.html`: interactive fictional six-seat Wednesday game night
- `styles.css`, `site.js`, `demo.js`, `favicon.svg`: shared presentation and behavior

## Run locally

Use any static HTTP server, for example:

    python -m http.server 8765

Open `http://localhost:8765`. There is no build step, install step, environment variable, database, or external JavaScript dependency. Relative `.html` links work on ordinary static hosts and in subdirectories.

## Validate

    node --check site.js
    node --check demo.js
    node demo-tests.js
    python validate.py

Model tests cover initial state, capacity, repeated acceptance, decline/expiry FIFO, cancellation promotion, deadline quorum excluding offers, late cancellation and recovery, leaving/rejoining standby, direct RSVP, reset, immutability, and 10,000 seeded mixed transitions. The pseudo-random sample uses the full 32-bit normalized value.

Static validation checks local asset links, anchor targets, HTML main/h1/title metadata and viewport presence. These checks do not replace visual or accessibility testing.

Manual browser QA checklist:

1. At 360, 768, and 1440 CSS pixels, open all six pages; check wrapping, horizontal overflow, navigation, footer, and disclosure controls.
2. In the demo, select Member · Jordan and accept the seat. Confirm 6 confirmed. Select Organizer and cancel a guest; confirm Taylor receives an offer.
3. Reset. Cancel two guests. Advance the deadline; confirm the session is cancelled and pending offers do not count.
4. Reset. Advance the deadline with five people, then cancel two guests. Confirm a late-change warning. Accept Jordan’s offer; confirm the minimum is met again.
5. Reset. Expire Jordan’s offer; Taylor is next. Decline Taylor; the queue is empty.
6. Use keyboard-only navigation, check visible focus after updates, and test with a screen reader. Test browser back/forward and repeated actions.

## Product boundaries

All people and actions are fictional. The demo is local in-memory state, not a multiuser service; it has no authentication, real recurring events, notifications, backend, form submission, payment flow, tracking scripts, or persistent browser storage. Refresh or Reset restarts it. Browser back/forward may retain a page snapshot. Member/organizer switches are demonstration views, not security roles. Expiry and the decision deadline are manually simulated rather than real clocks.

At the decision deadline, fewer than four confirmed players cancels the sample session. A late drop after a successful decision instead flags organizer attention; it does not silently cancel a previously confirmed gathering. One active offer is held at a time, and pending offers never count as confirmed.

No claims of unique functionality, customer adoption, or proven results are made. Pricing describes an intended future offer only. No emails, contact information, invitation details, or payments are collected. Hosting providers may process technical request logs as described on the privacy page.

## Deployment

Deploy only the six HTML files, CSS/JS assets and SVG favicon. Tests and this README can stay in the repository. The website has no framework configuration requirement. Verify hosting terms and an authorized commercial plan before production publication. Do not change the Buttonwood project or its domain as part of this repository.

## Verification performed

Node syntax checks, 11 model tests including 10,000 transitions, and static link/structure validation passed. Local browser rendering could not be completed in the restricted execution environment; hosted preview visual, keyboard and screen-reader QA remain necessary before production. No form submissions or external mutations were performed during validation.
