# Together backend foundation

Code prepared for review; **no backend is provisioned or live**. Do not point this at Buttonwood (`nxfsuntmtmdawacxssas`). A separate approved Supabase project is the recommended boundary. Creating projects, credentials, persistent access, changing Auth settings, or incurring charges requires the owner's applicable approvals. None was performed.

## Included

- `schema.sql`: atomic bootstrap for fresh PostgreSQL/Supabase. Creates only `together` and `together_private`; does not edit `public`, existing financial tables, auth triggers, or auth configuration. Intentionally fails on already-existing schemas instead of replacing arbitrary objects.
- `adapter.js`: dependency-free browser ES module, disabled by default; accepts only an explicitly configured HTTPS Supabase project and publishable key, rejects the known unrelated project and secret/legacy keys. Memory-only access tokens; expiration requires reauthentication. No persistence or refresh-token storage.
- `tests`: adapter checks and executable PostgreSQL/RLS tests using pinned PGlite 0.5.8. This is a local Postgres engine with mocked Supabase auth functions, not hosted Supabase integration.

Implemented: pseudonymous profiles, curator-published books, public circle discovery, atomic membership admission, free one-active-circle admission, capacity 2–12 (new host drafts fixed at 8), server-owned Plus entitlements, one active owned Plus circle, chapter-scoped posts, private progress, server-awarded reading badges, one next-book vote per circle/member, blocking and private reports. Chapters group discussion posts into threads; no separate thread creation is exposed. All client mutations go through a uid-bound command function.

No real books, circles, members, venues, meeting dates, reports, or entitlements are seeded. Hosted circles must be verified before a privileged operator publishes them. In-person forms must tell readers to provide only approximate city/public venues and never a home address; free text cannot itself guarantee that users avoid personal information.

## Local verification

From this folder:

```sh
npm ci --ignore-scripts
npm test
```

Four tests pass, including actual schema execution and RLS allow/deny assertions. The database test covers multiple users, authenticated/anonymous permissions, outsider and blocked visibility, membership/capacity limits, report confidentiality, chapter bounds, badges, entitlement requirements, and disabled direct mutation. It does **not** establish multi-session race behavior, actual GoTrue authentication, PostgREST exposure, email delivery, or hosted configuration.

## Setup after approval

1. Obtain explicit authorization for an isolated project, its billing limit, and any required persistent access. Do not use the existing Buttonwood project. No service-role or secret key may enter frontend files, browser storage, client env variables, logs, or this repository.
2. In an approved local Supabase development environment, inspect current CLI help/version, create a migration via `supabase migration new together_foundation`, and place the reviewed bootstrap in that generated migration. This folder intentionally contains `schema.sql`, **not an invented migration-history filename**. Validate locally and run current Supabase database advisors before deploying.
3. Apply only to the approved isolated project after reviewing the target and backup/recovery plan. Never run this bootstrap against an existing application as an opportunistic workaround.
4. Expose only `together` to the Data API. Keep `together_private` unexposed. Explicit grants/RLS are included; do not replace them with broad schema grants. Private command/check helpers use empty search paths and explicit schema qualification; exposed command is security invoker. No role authority uses user metadata.
5. Configure and verify email confirmation, exact allowed redirect URLs, email delivery, abuse controls and intended password policy with necessary approvals. Anonymous sign-ins must be disabled for launch. The adapter does not implement OAuth, password recovery, session refresh, or email callback routing.
6. A privileged operator inserts verified books and actual circles, publishes approved draft circles, handles moderation, and maintains entitlements. There is no public moderation queue or client entitlement setter. Do not expose private tables to build an admin UI. Future admin tooling needs its own authenticated authorization boundary.
7. Run `TEST_PLAN.md` against hosted staging and resolve every release gate. Only then explicitly enable the adapter in the app with the approved project URL and existing approved publishable key. The frontend must handle errors without silently falling back to fake success.

## Adapter contract

```js
import { createTogetherClient } from './adapter.js';
const backend = createTogetherClient({
  enabled: false, // remains false until independent backend release gates pass
  url: '',
  publishableKey: ''
});
```

- `configured`: boolean. Configuration format is not proof of a healthy backend.
- `signUp(email,password)`: requests account creation, returns a confirmation/sign-in prompt, never claims the user is authenticated.
- `signIn(email,password)`: returns `{user,expiresAt}` after Auth success; keeps token in memory only.
- `signOut()`: requests session logout, always clears local token even if network fails.
- Public reads: `listBooks()`, `listCircles()` (open circles only).
- Member reads: `listMemberships()`, `listProfiles()`, `listPosts(circleId)`, `listProgress()`, `listBadges()`. Membership list includes visible members of own circles; filter returned `user_id` against signed-in user when displaying their personal memberships.
- Writes: `saveProfile(pseudonym)`, `joinCircle(circleId)`, `leaveCircle(circleId)`, `createPost(circleId,chapter,body)`, `saveProgress(circleId,chapter)`, `reportPost(postId,reason)`, `blockMember(userId)`, `voteNextBook(circleId,bookId)`.
- Plus: `getEntitlement()` yields `{plus:boolean}` from server data; `createCircle({bookId,name,mode,city,publicVenue})` produces a **draft** and `{id,status:'draft'}`, not a public event.
- All methods return promises except immediate UUID validation. Database constraint errors are surfaced; render messages as text, never HTML.

## Explicit limitations and launch blockers

- This is a minimal data foundation, not production-ready service operations. Hosted auth, advisor review, independent RLS security review, two-session concurrency tests and actual browser integration remain required.
- Free max-one-active is enforced **on admission**. A future Plus expiry/downgrade worker must reconcile existing multiple memberships before subscriptions can launch; this foundation does not revoke existing memberships automatically. The entitlement writer must acquire the same profile-row lock before changing entitlement to coordinate with membership writes.
- Capacity is serialized on the circle row and per-user admission on profile row. Privileged/admin scripts must honor those locks and invariants too; table-owner access bypasses client rules.
- Hosts cannot publish/change/close circles through this adapter. A privileged moderation/operator workflow is required, including closing circles before owners can leave and handling account deletion for owners (owner FK deliberately restricts deletion).
- No payments, checkout, billing webhooks, paid activation, live AI generation, video meetings, location tracking, direct messaging, push/email notification service, admin UI, scheduled meetings, or external-provider credentials are wired. Do not claim any of these work.
- Add bounded rate limiting/moderation, report deduplication/triage, safe unblock and post-removal flows, retention/export/deletion procedures, age/community policies and automated backups before a public community launch. This version stores no birth dates, precise coordinates or private venue fields.
- Badges reflect self-reported progress, not verified reading. The books/chapter count must be curated for the exact edition. Reads currently cap at 100 rows; production pagination is still needed.

## Documentation reviewed

Supabase changelog and docs checked 2026-10-03:

- https://supabase.com/changelog.md
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically (explicit grants; this design also uses custom schemas)
- https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes (no affected ltree/btree_gist/legacy crypto used)
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw

### Integration boundary for this website

The website currently uses its local preview model only. This adapter is not connected to its forms. Do not enable live mode by simply changing a flag: the member UI, authentication, pagination and full hosted flows still need integration and testing.

Invite-only private-circle admission and secure invitation tokens are not implemented in this foundation. Discovery currently includes all published/open circles, so the published service must not advertise private invitations until admission controls are implemented and tested. Profiles here store a pseudonym only; avatar, introduction and visibility preferences in the frontend are preview-only. Posts are chapter-scoped, without reply-to threading. Scheduled AI hosting, notifications and production subscription lifecycle handling remain unimplemented.
