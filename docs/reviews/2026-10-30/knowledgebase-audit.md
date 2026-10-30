# Knowledgebase concept and assurance audit

Reviewed PlantFam main at `b477b79` on 2026-10-30. This extends the project audit and evaluates the product idea, evidence model, maintenance process and advice behavior. No application files were changed. This is an architecture and assurance review, not an independent scientific verification of every plant-care statement.

## Recommendation

Keep the knowledgebase. Offline, contextual advice is well suited to a private, free plant-care app. Its value is helping someone choose the next useful check for their own plant, then a proportionate action. Deterministic rules, plain-language explanations, expert sources, reversible care changes and human-reviewed releases all support that goal.

The current implementation is an early curated rules library with a newly added evidence process. Its documentation promises stronger assurance than its machine-enforced checks currently provide. Improve evidence coverage, uncertainty handling and review enforcement before making weekly expansion the main success measure.

## Present coverage

Measured from the current data, not the README's catalogue count:

| Content | Current inventory | Ledger coverage |
|---|---:|---|
| Doctor causes | 35: 4 verified, 31 without status | 5 claims cover 4 causes |
| Symptoms | 33, all without status | No symptom claims |
| Recognised potting mixes | 9, all without status | No mix claims |
| Catalogue species | 219 | Species care/toxicity fields have no entry type in the current ledger test |
| Live species-specific symptom notes | 21 | No note claims |
| Source pages in the ledger | 2 | Both concern nutrient problems |
| Behavior eval cases | 48 | 36 must and 12 should; all passed in the project audit |

Missing ledger coverage does not establish that advice is wrong. It means the new process has not established its evidence trail. Existing source links and manually reviewed legacy advice are different from complete claim-level verification.

## Material findings

### 1. High — Separate evidence, interpretation and product assumptions

A label listing organic ingredients is evidence about ingredients. It does not, by itself, establish a universal feeding duration. `src/engine/mix.ts:15–26` uses four weeks for organic mixes and eight/thirteen-week caps elsewhere. `src/data/mixes.ts:28–37` also matches some whole brands to a single food category. Product formulations can vary by bag, country and date.

Keep three explicit layers: sourced factual claims; the conditions under which they apply; and PlantFam's scheduling/ranking assumptions. Give assumptions their own rationale and validation history. Identify mixes by product and market where possible; ask the person to confirm the bag when a brand match is ambiguous. Evidence status must not imply that a derived timetable has been scientifically validated.

### 2. High — The promotion gate is weaker than the documented process

`docs/knowledge.md` requires every claim to be supported plus safety and grader approval. `src/data/knowledge.test.ts:45–55` only requires at least one supported claim for a verified cause or mix. Other claims can remain pending or partly supported. Verified symptoms only need a nonempty cause list. Review outputs and approval of the exact final revision are not machine-checked there.

Legacy entries remain visible because `isLive` accepts anything not marked draft. Catalogue and crop-guide content also lack the same publication-state model, despite being included in the weekly task's scope. The researcher therefore cannot use the documented draft mechanism uniformly across every permitted content type.

Require references from each changed factual field to its claim IDs, require all linked claims to pass, and persist review decisions against the content revision. Give legacy material an explicit unreviewed state and a measured migration backlog. It can remain available under an intentional policy, but editing it should trigger the new gate. Support the same evidence/publication contract across catalogue, crop, mix and doctor entries.

### 3. High — Ranking scores do not justify likelihood claims

`src/engine/diagnose.ts:115–137` multiplies hand-set priors and weights, keeps the top results and then normalises only those displayed results. It labels the first result "Likely" once its displayed share reaches 0.4. This is relative preference within a selected list, not a measured probability of the cause being true. Several causes can coexist, and omitted causes have no share.

A read-only reproduction using the same plant and symptom returned an overwatering share of approximately 0.457 with three results and 1.0 with one result. No new evidence was supplied; only the display limit changed.

Use wording such as "Check this first" and "Other possibilities" while ranking remains heuristic. Ask one or two discriminating questions before recommending a change. Allow "not enough information" and "none of these fits" outcomes. If probability-like language is retained, validate it against independently labelled cases and assess calibration, not only ranking order.

### 4. High — Missing records need to remain unknown

`src/engine/diagnose.ts:74–85` adds `unfed` when there is no recent recorded feed or active recorded mix. A newly added plant can therefore receive hunger-supporting evidence simply because earlier care was never entered. The current output can say "No feed logged in a couple of months" even when the app has only just met the plant.

Represent observations as known yes, known no, or unknown, with observation dates. Ask "Have you fed it recently?" when that answer would change advice. Do not strengthen a biological conclusion merely because the diary is incomplete. Add cases for first-day users, partial histories and care performed outside the app.

### 5. Medium — Independent agents help review but do not establish truth

The documented separation of researcher, fact-checker, safety editor and grader is useful. Fresh contexts can reduce anchoring. However, agents can still share the same model biases and repeat the same interpretation of an ambiguous source. A quote can be genuine while its use for an indoor plant, different climate or different substrate is inappropriate.

Record scope with each claim: plant/taxon, growth stage, substrate, indoor/outdoor setting, region, season and applicable product. Preserve the relevant source context and retrieval date. Require a qualified human review for high-consequence changes such as toxicity, edible-part safety and potentially damaging treatment. Reserve multiple specialist reviewers for changes that need them; a researcher plus an independent evidence reviewer can handle routine low-risk updates, with the human approving the release.

The grader's uncited "common sense" exception (`docs/agents/grader.md:7–8`) should not cover consequential care instructions. Define its permitted scope narrowly.

### 6. Medium — Evals currently prove consistency more strongly than correctness

The 48 behavior cases are valuable regression checks. But a process that drafts advice and proposes the cases that validate it can encode the same mistake in both places. Tests for cause IDs or a feeding-text regex cannot establish the underlying horticultural claim. The fixed 80% should-case threshold also allows existing cases to regress while the suite stays green (`evals/kb.eval.test.ts:38–41`).

Maintain a human-approved benchmark whose expectations cannot be changed merely to accommodate a content update. Test counterexamples and contraindications: wet roots plus yellowing, missing history, mixed symptoms, reservoir versus soil, local climate differences, unknown products and insufficient evidence. Require all safety cases to pass individually and no unexplained regressions in previously passing cases. Measure whether the recommended next check distinguishes causes, as well as whether a preferred cause appears in the top three.

### 7. Medium — Source availability is not semantic re-verification

The source script checks whether quoted words remain on a page. It cannot tell whether the advice is still correctly scoped or whether newer contrary guidance exists. It also treats 401/403/429 as manual-review rows without failing, then prints "All still say what we quote" when no other failure exists (`scripts/check-sources.mjs:44–60`).

Reproduced without network access by substituting two 403 responses: the script exited successfully and printed that success sentence even though neither page had been verified. This demonstrates the reporting gap; it is not a claim that these sites are currently blocking access.

Report verified, changed, unavailable and pending-human-review counts separately. Block promotion of new advice whose evidence cannot be checked; existing advice can follow a documented grace/escalation policy. Persist unresolved reviews with owners and dates. Re-review meaning and scope on a risk-based schedule; a surviving quotation is only one check.

## A practical next version

Keep the current local-data architecture. Add stable IDs and a small structured evidence record connecting:

`source passage → claim + applicability → advice revision → review decisions → behavior cases`

Start by reviewing the most used and consequential existing advice: watering/rot, feeding changes, toxicity and common pest triage. Expand from measured coverage gaps and user failures. Review urgent source changes or safety corrections immediately; batch ordinary updates at a pace a person can actually review. A fixed number of new facts each week is not an outcome metric.

Useful measures are: evidence coverage for live high-risk claims; age of their last review; unresolved source checks; safety-case failures; unexplained benchmark regressions; and, with explicit consent, whether users could complete the suggested check and found the explanation useful. These can begin as release reports and voluntary feedback without adding tracking.

The user-facing answer should normally contain: what was observed, what remains unknown, the next check, the conditional action, what to avoid, and when to seek expert help. Source details and review dates should be available on demand. Prioritise safe, reversible observations before recommendations that alter watering, feeding or treatment.

## Review boundaries

Inspected knowledge documentation, reviewer roles, ledger, source allowlist, content schemas, diagnosis/mix logic, behavior evals and source-check workflow. Counted the live content and ledger coverage. Reproduced the ranking/display-limit dependence, empty-history hunger signal and blocked-source success reporting. Existing test results are from the preceding project audit; no application code changed, so the full suite was not repeated. No agents were run, no external scientific claims were certified and no changes were published.
