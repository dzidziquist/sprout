# Proposal: making reviewed knowledge available to the app

Status: proposed architecture for independent review. No delivery changes have been implemented. This develops the recommendation given alongside the knowledgebase audit.

## Intended outcome

The app should always have a working offline knowledgebase. Published advice should have an identifiable version, an evidence trail, explicit applicability and a review decision. The app should explain how the user's observations relate to the advice while retaining unknown information as unknown.

Use the existing local-data approach as the starting point. Keep the evidence model and publication process small enough for maintainers to review reliably.

## Authoring and review

Maintain structured source records in the repository with stable IDs. Connect:

`source passage → claim and applicability → advice revision → review decisions → behavior cases`

The authoring records should capture:

- Source URL, publisher, exact relevant passage, retrieval date and last substantive review date.
- Claim wording and applicability: plant/taxon, growth stage, substrate, indoor/outdoor context, region, season and product/market where relevant.
- Evidence verdict, unresolved limitations and the fields or instructions the claim supports.
- Explicit publication state and review decisions tied to the exact content revision.
- Product assumptions, such as scheduling defaults or ranking weights, identified separately from sourced facts.
- Stable references to behavior and safety cases.

Retain drafts, rejected claims, research discussion and reviewer deliberation in the repository. Give legacy material an explicit migration policy. Do not assume that old advice is incorrect, or describe it as newly verified without completing the review.

## Build and publication

Add a CI validation/build step that emits a compact, deterministic app bundle from eligible content. Its responsibilities should include:

1. Validate schemas, unique IDs, references and supported content/schema versions.
2. Enforce the publication policy: required claims supported, required reviews approved, and no unresolved blocking decision on that revision.
3. Validate applicability, safety constraints and benchmark behavior. Require every safety case to pass and explain regressions in previously passing cases.
4. Exclude drafts and retain the evidence summaries needed to explain published advice.
5. Emit a manifest identifying the knowledge version, schema version, compatible app/rule-engine versions, build revision and content hashes.
6. Produce a human-readable release diff showing changed advice, sources, assumptions and behavior cases.

The generated bundle should include approved advice, applicability and selection rules, stable IDs, concise source references, relevant review dates and any necessary uncertainty statements. Full research transcripts need not ship. Choose the concrete serialization format to fit the current typed TypeScript data and build tooling; a new storage service is not a prerequisite.

## App behavior

The app selects applicable advice locally using the plant's species, conditions and dated observations. It must distinguish recorded absence from missing history. When an unknown answer would materially alter a recommendation, ask a short discriminating question.

An answer should normally make available:

- What was observed and what remains unknown.
- The next useful check and why it matters.
- A conditional, proportionate action and any relevant contraindications.
- When more information or expert help is needed.
- An optional “Why this advice?” view with the source references and review date.

Use wording that matches the evidence. Heuristic ranking can support “Check this first” and “Other possibilities”; probability-like labels need independent calibration. A plant may have several problems, and the app should permit insufficient-evidence and no-match outcomes.

Keep the rule engine and knowledge schema compatible. Data-only updates must not introduce new executable logic or rule operators that the installed app cannot understand.

## Initial distribution recommendation

Bundle a reviewed knowledge snapshot into each app release. Test that exact snapshot with the release's rule engine. App releases provide a straightforward version boundary, offline availability and reproducible behavior for support and review.

Initially, publish ordinary knowledge changes through that release process. Prioritise urgent corrections through an expedited reviewed release when needed. Decide the review and release cadence from user impact and available reviewer capacity; weekly content growth is not itself a success metric.

## Optional downloadable updates, if later justified

If the product needs corrections faster than its release process can deliver, add a controlled update mechanism while retaining the bundled snapshot:

- Signed, versioned content and a trusted verification mechanism in the app.
- Schema and rule-engine compatibility checks before activation.
- Content-hash and size validation, with downloads staged and activated atomically.
- A retained last working snapshot and a tested rollback path.
- Offline startup using the current valid snapshot; download failure must not prevent use.
- Protection against accidentally activating an incompatible or superseded snapshot, with an explicit policy for authorised rollback.
- Release provenance and enough version information to reproduce the advice shown to a user.

Signatures establish who published the bytes and whether they changed; scientific correctness still depends on the evidence and review process. Choose hosting, signing-key management and update frequency only if this delivery path is approved as necessary.

## Proposed acceptance criteria for the first implementation

- A fresh offline install can show the bundled advice and its knowledge version.
- Draft content cannot appear in the emitted app bundle.
- Invalid references, unsupported required claims, missing required review or incompatible schema cause publication validation to fail.
- The released app bundle can be traced back to the reviewed content revision and reproduced.
- Partial histories do not become negative observations without user confirmation.
- Safety cases pass individually; ranking remains stable when only display limits change, and wording does not imply unsupported probability.
- Sources and review dates are accessible without cluttering the main care flow.
- The migration policy for legacy advice is documented and tested.
- No downloadable-update system is required to complete the initial bundled approach.

## Decisions for the second reviewer

Confirm the minimum evidence schema, approval requirements by risk level, legacy migration policy and acceptable confidence wording. Assess whether generated TypeScript or a serialized data artifact is the smallest maintainable bundle. Identify any required release-cadence change before adding a download service.
