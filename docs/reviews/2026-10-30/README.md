# Second-reviewer handoff: PlantFam project and knowledgebase

## Scope and status

Please independently review the findings and proposed knowledgebase architecture in this packet. Assess the evidence and recommendations rather than treating the first review as authoritative. Record agreement, disagreement and uncertainty separately.

The first review examined GitHub main at **`b477b79f8e5e36b22d0c262d5fb683feb79782a0`**, on **2026-10-30**. Confirm the revision you review and distinguish subsequent fixes from findings that were incorrect at the original revision.

This packet contains review documents only. No application fixes, dependency upgrades or knowledgebase delivery changes have been implemented by the first reviewer. The packet has not been committed or pushed at handoff preparation time. Original audit copies also remain at `/workspace/project-audit.md` and `/workspace/knowledgebase-audit.md`; the copies here make the handoff portable with the repository.

## Read these documents

1. [Project audit](project-audit.md): five implementation/dependency findings, reproductions, verification results and limits.
2. [Knowledgebase audit](knowledgebase-audit.md): assessment of the product idea, evidence coverage, publication gates, uncertainty, review process and evals.
3. [Proposed app delivery architecture](knowledgebase-delivery-proposal.md): how reviewed knowledge should reach and run in the app. This is a proposal for review, not an implemented specification.

Relevant existing design and implementation sources:

- [Knowledge process](../../knowledge.md) and [reviewer roles](../../agents/).
- [Claims ledger](../../../knowledge/claims.json) and [approved source domains](../../../knowledge/sources.json).
- [Ledger checks](../../../src/data/knowledge.test.ts), [behavior cases](../../../evals/cases.ts), [eval runner](../../../evals/run.ts) and [source checker](../../../scripts/check-sources.mjs).
- [Diagnosis engine](../../../src/engine/diagnose.ts), [mix assumptions](../../../src/engine/mix.ts) and [knowledge data](../../../src/data/diagnosis.ts).

## Findings to verify

| Area | First-review finding | Evidence category |
|---|---|---|
| Restore | Incomplete plants and invalid nested profile settings pass validation and can break the restored app | Real parser/store reproduction with local-storage boundary mocked |
| Household photos | Failed photo copies can be acknowledged and the change token advanced, preventing normal retry | Native control-flow inspection; not device-tested |
| Watering history | Backdated events can be displayed as the latest watering because insertion order is used | Real store reproduction plus UI selector inspection |
| Photo diagnosis | An optional stalled disease-name request can block successful identification and ignore cancellation | Real module with injected fetch responses |
| Dependencies | 29 affected package entries reported, including two critical development-tool entries | Registry advisory report at audit time; exploitability not established |
| Knowledge evidence | Five claims across four causes do not cover most live content | Inventory of ledger and content at the audited revision |
| Publication gate | Machine checks enforce less than the documented all-claims/reviewer-approval contract | Test and schema inspection |
| Confidence | Relative ranking shares depend on display limit and do not establish diagnostic probability | Same-input reproduction with different result limits |
| Unknown history | Missing feeding records contribute an unfed signal | Engine inspection and empty-history reproduction |
| Source monitoring | Blocked pages can coexist with a successful exit and “All still say what we quote” | Source checker run with injected 403 responses |

The underlying audit documents contain exact source locations and fuller reasoning. Priorities are proposals for the second reviewer to reassess.

## Validation already completed

Against the audited main revision:

- Frozen-lockfile dependency installation with Node 22.23.3 succeeded using a writable workspace cache; integrity verification remained enabled.
- 476 tests passed in 31 files. Knowledge evals passed 36/36 must cases and 12/12 should cases.
- TypeScript checking passed.
- Web and iOS JavaScript production exports passed.
- All 338 unique production image references resolved; 478 PNGs passed integrity verification.
- All 30 symptom images were integrated at 384 × 384 with matching manifest hashes.

These checks do not establish that the reported defects are absent. They also do not validate Swift compilation, a signed iOS binary, device permissions, live CloudKit behavior or the scientific accuracy of every statement.

The initial checkout was an older art branch. The first reviewer fetched main and repeated the relevant checks there. Midnight-refresh and overlapping-notification scheduling issues found on the older branch were already fixed on main and were excluded from the final findings.

## Questions for independent judgement

1. Are the implementation findings reproducible, appropriately prioritised and complete enough to act on? In particular, confirm the CloudKit photo/token failure path on a device or with a native test harness.
2. Does the knowledgebase help a beginner choose a useful observation and a safe next action? Which recommendations need more context, an explicit unknown state or expert escalation?
3. What evidence should qualify an entry as verified? Can every published factual field and consequential instruction be traced to supported claims and approval of that exact revision?
4. How should legacy advice remain available during migration without implying it has passed the new evidence process?
5. Should the current “Likely” labels be replaced with action-order wording until independent calibration evidence exists?
6. Do product-specific fertiliser assumptions, broad brand matching and regional/climate applicability require changes before expansion?
7. Which eval expectations need independent expert approval? What safety cases, counterexamples and no-regression rules are missing?
8. Is the bundled, versioned delivery proposal below sufficient for the current release cycle? Is there a demonstrated need for downloadable updates now?
9. Which changes are necessary before the next release, and which can follow in a measured evidence-coverage backlog?

## Requested reviewer output

Return a review containing:

- The exact revision reviewed and checks actually executed.
- For each finding: agree, disagree, or needs evidence; priority; reasoning; source location; and a reproduction or counterexample where available.
- Newly discovered issues, kept separate from confirmations of this packet.
- An accept/revise recommendation for the knowledgebase delivery proposal, including the smallest sufficient implementation.
- A prioritised fix list with concrete acceptance criteria and any device/expert checks still required.

Do not infer that passed tests certify scientific correctness. Do not change benchmark expectations merely to make proposed advice pass. Distinguish an unsupported claim from a claim shown to be false, and a static risk from a behavior reproduced on a device.
