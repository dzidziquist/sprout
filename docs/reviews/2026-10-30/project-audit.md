# PlantFam project audit

Audited GitHub `main` at `b477b79f8e5e36b22d0c262d5fb683feb79782a0` on 2026-10-30. The workspace initially held the older `art-drop` branch; findings and validation below apply to the fetched main commit. No tracked project files were changed.

## Findings, in priority order

### 1. P1 — Backup validation admits data that breaks the restored app

Location: `src/lib/export.ts:88–94`; restore applies the result in `src/store/plantStore.ts:783`.

`parseBackup` asserts that a plant is a complete `Plant` after checking only five fields. It does not validate soil, placement, light, pot material, dates, or the nested profile settings. It accepts a profile containing `round: null`. Restoring this data replaces the current jungle and persists invalid settings. A subsequent care check can throw `Invalid time value`; screens that dereference the invalid profile can also fail after relaunch.

Reproduced against main using the real parser and store with mocked local storage: a plant containing only `id`, `name`, `speciesId`, `nextCheckAt`, and `k`, plus `profile: { round: null }`, is accepted. Calling `logCheck` after restore throws.

Recommendation: validate the complete persisted schema before changing state, including enum values, finite numbers, parseable dates, unique IDs and nested profile fields. Apply explicit migrations/defaults for supported older backups. Reject damaged data without replacing the existing jungle. Add regression coverage for these cases; the current parser tests explicitly accept an incomplete plant.

### 2. P2 — Failed household photo downloads are acknowledged permanently

Location: `modules/household/ios/HouseholdModule.swift:190–210`; acknowledgement persists in `src/lib/household.ts:133`.

The CloudKit bridge ignores directory-creation and photo-copy errors with `try?`, then unconditionally appends the photo name to the downloaded list. It also skips individual failed record results. The returned change token advances beyond those changes. JavaScript persists both that token and the photo name, so a temporary disk or per-record fetch failure is no longer retried through the normal incremental sync. A diary entry can remain present with its picture missing.

Evidence: native control-flow inspection. This was not exercised on an iPhone or against live CloudKit.

Recommendation: only acknowledge photo names after a successful copy or verified existing file. Keep a retry queue for failures, or fail the round without acknowledging its token. Handle individual record failures explicitly. Verify recovery after a simulated copy failure and after a per-record CloudKit failure.

### 3. P2 — Backdated watering is displayed as the latest watering

Location: `src/store/plantStore.ts:403–414` and `app/plant/[id].tsx:132`.

`setLastWatered` appends a historical watering event, but the plant page finds the latest watering by reversing insertion order. Recording a watering on October 30 and then entering October 23 makes the page report October 23 as the latest watering even though the October 30 event remains. The recent diary also uses insertion order. Household sync sorts events chronologically, so the displayed result can change after a sync.

Reproduced against main: the event dates become `[2026-10-30, 2026-10-23]`, and the page's selector chooses October 23.

Recommendation: decide whether editing "last watered" corrects the existing record or adds history, and implement that consistently. Derive the latest watering from event dates, and sort recent history by date rather than insertion order. Cover backdated edits and restored out-of-order events.

### 4. P2 — A stalled disease-name lookup blocks successful photo diagnosis

Location: `src/lib/plantHealth.ts:53–69` and `src/lib/plantHealth.ts:126`.

The optional disease-name lookup has no timeout or abort signal, is cached as a pending promise, and is always awaited after identification succeeds. A stalled lookup therefore leaves the doctor loading indefinitely, even when the identification response already supplies readable descriptions. Aborting the identification does not release this wait, and later checks reuse the same stalled promise.

Reproduced against main with an injected fetch: the identification POST succeeds, the name-list GET remains pending, and the overall request remains unsettled after abort. The name-list request receives no signal.

Recommendation: bound the optional lookup with a timeout, clear its cached promise on timeout, and return identification results without it when descriptions are already available. Add a regression case for a successful identification with an unresponsive name endpoint.

### 5. P2 — Dependency advisories need an upgrade and exposure review

Location: `package-lock.json:10937` (`tinypool`) and `package-lock.json:11609` (`vitest`), plus the Expo toolchain's transitive dependencies.

The fresh main installation's `npm audit` reports **29 affected package entries: 2 critical, 8 high, 10 moderate, 9 low**. These counts include propagated dependency findings, not 29 independent exploitable vulnerabilities. The critical entries are Vitest and its Tinypool dependency; the underlying Tinypool advisories describe prototype-pollution gadgets leading to code execution. This is development/test tooling, and exploitation requires the relevant input path or prerequisite; the audit does not establish a remote exploit in the shipped iPhone app.

High-severity leaf findings include XML/image parsers, Node Forge, PostCSS, Undici and URI decoding. Several npm recommendations cross major versions, including Expo-related versions, so automatic forced upgrades are inappropriate without compatibility validation.

Recommendation: update the test runner and worker dependency together to supported patched versions; apply compatible transitive fixes; then plan any needed Expo/router upgrades. Re-run tests, type checking and both platform bundle checks. Review each advisory's reachable input path before treating it as shipped-app exposure. Add an advisory review to CI, which currently runs only types and unit tests.

Advisory examples:

- https://github.com/advisories/GHSA-5gmw-xhrv-c9v3
- https://github.com/advisories/GHSA-85c8-ppgw-ccpr
- https://github.com/advisories/GHSA-82fw-gwwq-j7x9

## Validation

- Clean frozen-lockfile installation succeeded with Node **22.23.3** and a writable workspace npm cache. The initial install failed because the default `/home/agent/.npm` cache was unwritable; a fetched sample tarball matched both its lockfile hash and official registry metadata. Verification remained enabled.
- **476 tests passed across 31 files**, including knowledge evals: **36/36 must cases and 12/12 should cases**.
- `npm run ts:check` passed.
- Web production export passed.
- iOS JavaScript export passed. This bundles the native JavaScript and assets; it does not compile Swift or verify an installable iOS binary.
- **338** unique production image references, including app configuration, resolved successfully.
- **478 PNGs** passed image-integrity verification. All **30 symptom images** are present at **384 × 384**; their manifest hashes match. The earlier art delivery is now integrated on main.
- Focused logic reproductions used the real TypeScript modules with local-storage/native boundaries mocked. They did not alter the checkout or contact external diagnosis services.

## Limits and suggested order

Fix restore validation first, followed by photo-sync acknowledgement, watering-history ordering and the optional health lookup. Triage dependency upgrades alongside those changes.

This audit did not run Xcode, TestFlight, purchases, physical-device camera/light measurements, notifications on iOS, or a live two-phone CloudKit session. JavaScript exports do not validate Swift compilation, entitlements, CloudKit production schema or device behavior. Scientific claims were checked through the existing knowledge evals and ledger tests; this was not an independent horticultural fact-check of every catalogue entry or a full accessibility review.

The older branch's midnight-refresh and overlapping-reminder-scheduler issues are already addressed on current main and are intentionally excluded from the findings above.
