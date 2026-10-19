# VISION story reliability and shared validators

## Scope

**Plan only.** No application/runtime source changes, commits, model generation, workflow runs or deployments during this review. Only this approval document is written. Preserve GitHub Actions, provider order, workflow routing, OIDC security, private storage and existing chat delivery.

## 1. Current architecture and evidence

- Default counted stories/linked prompts: `src/lib/ai/request-route.ts:18–63` → `components/chat-workspace/index.tsx:420–435` → `/api/jobs` → `jobs/dispatch.server.ts` → `runtime/runtime.server.ts` → `runtime/github.server.ts:24–32`.
- Both operations dispatch **prompts.yml**. GitHub `workers/prompts/index.py` aliases `workers/prompts/story/index.py`; `runtime/operations.py:194–208` registers both. Retain one generator.
- `runtime/runner.py:57–112` claims through OIDC, loads input, runs the worker, uploads and reports. `worker_base.py:53–78` supplies operation/path/signature gates. Cloudflare `auth-gateway/src/runtime.ts:43–125` authenticates runners and stores results.
- App `runtime/runtime.server.ts:158–198` checks bytes, validates output, optionally saves a requested file and saves the chat reply. Its text gate does not independently establish semantic clothing/background continuity.
- Deep chat is a separate Cloudflare path. `ai/deep/story.ts` already has canon, manifests and dependencies; `story-run.ts:195–423` has generation, review, repairs and dependent revalidation. Reuse these, not another engine.
- Existing coverage includes runtime `tests/test_prompts.py` and app `story-prd.test.ts`, `story-output.test.ts`, `runtime-story-validation.test.ts`. Mock passes do not establish live quality. Local Cloudflare changes were previously recorded as undeployed; deployed parity is not established here.

## 2. Failure diagnosis: confirmed versus unknown

**Run 39190584448**, revision **0521a11c**, 19 October 2026: planning started **02:34:23 UTC**. Three candidates failed at **02:36:52 / 02:37:41 / 02:38:26**, each with a logged background problem beginning `Fixed background requires the same location in every scene`. Failure was reported **02:38:27**; scene writing never started. This accounts for the approximately 255 seconds.

Four Nemotron calls returned successfully, logging 59/89/50/44 seconds. No logged 429, provider error or timeout. The workflow limit is 45 minutes. **The immediate cause was exhausted plan validation, not an observed timeout/outage.**

### Confirmed design gaps and proposed fixes

| Evidence | Fix |
|---|---|
| Planning sends `{brief, blueprint, N, repair: problems}` but not the rejected plan; errors lack affected paths/expected IDs (`story/index.py:926–949`). | Supply current candidate, exact findings and immutable constraints; apply scoped patches instead of repeatedly regenerating a plan. |
| Background gate compares raw room strings and selected position values (`202–215`). Direct pure-function probes reject equivalent-looking room aliases and allow an undeclared bedroom position. | Separate canonical room IDs from positions within rooms; validate references and resolve only registered aliases. |
| One-room preprocessing overwrites positions (`930–942`); normalization/validation rewrite before-state, times and wardrobe (`317–484`). | Make checks read-only; distinguish harmless formatting from semantic repair and retain before/after evidence. |
| Logs show counts/key names and shortened errors, not failed locations or repair responses. Rejected plans are not checkpointed; runner deletes scratch (`126–127`). | Store bounded owner-private candidates/diffs; public logs contain safe issue codes, paths, hashes, timings and revision only. |

**Not proved:** real movement outside, alias confusion, malformed locations, blueprint conflicts or model noncompliance. Stale validation is not shown: new candidates are revalidated. Scene repair/rollback cannot explain this particular stop because those stages never ran. My earlier statement that the background definitely changed was too strong.

Current main **252d3cef** differs from failed **0521a11c** by an outdoor-position phrase check; the planning payload is unchanged. Diagnose against the executed revision. Exact candidate-level root cause remains unknown without privately retained rejected plans and repair responses.

## 3. Root-level architecture — technical design

Create this Python package at the root of **tkdasofficial/vision-runtime**, outside workers:

```text
validators/
  __init__.py       validate entry point / explicit operation profiles
  contracts.py      versioned constraints, findings, reports
  structural.py     schema, IDs, count/order, references, output shape
  compliance.py     requested fields, languages, word/range restrictions
  continuity.py     canonical rooms/entities/time/props/dependencies
  semantic.py       injected evidence extraction / meaning checks
  repair.py         allowed patches, revalidation and stop decisions
```

Extract existing rules with compatibility wrappers, then remove duplicate implementations. Reuse format/signature/archive helpers; no module per extension or worker.

**Common API:** `validate(artifact, context) → ValidationReport`. Context contains operation/phase, source-backed requirements, canonical plan/state and validator version. Findings carry code, constraint ID, severity, unit/path, expected/observed values, evidence and permitted repair scope. Reports distinguish **passed / failed / unverified**, bound to request/contract and artifact hashes.

Validators never mutate candidates or initiate provider calls. Existing AI workers inject semantic evaluators; generic file workers never acquire AI keys. Objective checks use code. Meaning checks require actual-content evidence, not copied lock metadata. Scores cannot override failed/unverified checks or unresolved flagged scenes.

Cloudflare consumes a shared versioned JSON contract and fixtures through thin TS adapters. Keep existing Deep checks; do not duplicate the Python engine or treat a runner's score as proof.

## 4. Requirement and continuity enforcement

Compile a contract before planning: scene count, requested fields, spoken-word bounds, language, grouping, file opt-in and explicit invariants, each with source clause and scope. Detect conflicting instructions before model calls. Fixed background applies **only when requested**.

For Monkey/Rabbit: 10 ordered scenes; only Visual Prompt and Dialogue; 25–30 spoken words per scene excluding speaker labels/directions; unchanged appearance/clothes and one background; no blueprint or automatic file. Character/theme lists remain inputs, not additional output sections.

Reuse the bible/manifest: stable character/room IDs; separate within-room positions; immutable appearance/background versus mutable props/actions; causal dependencies. When outfits are unspecified, choose and lock once as an assumption. Permit intentional changes when authorized.

Validate plan, visible visual/dialogue content, scene boundaries and exact assembled output. Check temporal/spatial/prop/knowledge transitions. Unknown references fail precisely; never silently overwrite a contradictory room or timeline. Validate single-unit requests too, even without tracked props/positions.

## 5. Repairs, budgets and recovery

1. Preserve candidate/report; explicitly record normalization changes.
2. Repair receives rejected content, exact issues, allowed paths, canon and remaining shared budget. Word failures target dialogue only; spatial failures target affected plan/visual/action fields.
3. Apply validated patches to a copy; reject unauthorized/canon edits. Revalidate local content, whole relevant scope and dependency closure.
4. Commit accepted candidate plus matching report atomically; retain prior approved content on failure. Final assembly is revalidated. No high-score bypass of unresolved flags.
5. Allow at most two content repair rounds per target, subject to one overall deadline/call budget. Stop after two consecutive no-change/identical-failure repairs. Separate provider retries from content correction; honor Retry-After within remaining time.
6. Consume the supplied operation timeout with monotonic deadlines, bounded quota waits/calls and an audit/upload reserve. Existing Python/app/session/workflow limits differ; align effective budgets rather than merely extending all limits.
7. Checkpoints bind owner/request/contract/version/artifact hashes. Current runner-local files do not survive another Actions run. Durable resume must use existing private transport/storage, never public GitHub artifacts/logs, and reload only verified compatible state.
8. Exact-count requests stay all-or-nothing. Partial delivery requires explicit permission, clear missing-scene labels and valid partial content; never call it completed. Failure preserves approved checkpoints and returns an actionable reason.

### Separate orchestration risks, not observed run causes

Protect relay writes against cancellation/timeout races (`auth-gateway/src/runtime.ts:108–125`); enforce deadlines at claim/upload/complete; structurally bound metadata rather than truncate JSON at 20,000 characters; recover jobs interrupted before runtime insertion; reconcile delivery/terminal writes idempotently. Deep calls need cancellation/late-result checks, and saved approvals need validator-version checks. Add fault tests before changing these paths.

## 6. Dependency-ordered implementation

1. Define contract/schema, shared fixtures and private diagnostic retention.
2. Extract pure checks; introduce canonical references and explicit normalization.
3. Integrate plan/scene/assembly profiles and targeted repairs into the existing prompts/story worker; add shared budgets and report-bound checkpoints.
4. Add optional operation-profile hooks to shared worker/runner plumbing. Generic workers retain existing format/security checks; no story-specific policy leaks into conversions.
5. Integrate TS contract/report adapters and existing Deep state checks; fix runtime count validation's early return and presentation-dependent parsing.
6. Harden relay/recovery/delivery interleavings; then approved staged release and authenticated live verification. No automatic workflow triggering or deployment.

## 7. Tests and measurable acceptance

- Unit fixtures: aliases versus real room changes, unknown rooms, allowed changes, outfits/identity, time/props/knowledge, missing/duplicate/order errors, 24/25/30/31 spoken words, fields/grouping/scripts, conflicts, unavailable checks and high-score flagged failures.
- Repair fixtures: previous candidate in payload, patches applied, untouched fields unchanged, rejected canon edits, dependent revalidation, repeated-failure stop, rollback/report consistency and version/hash invalidation.
- Fake-clock/fault tests: 429/5xx/late responses, queue/deadline/session expiry, checkpoint restarts, duplicate dispatch/polls, cancelled-job writes, interruption after each delivery write, and permitted partial output.
- Run affected existing story, format, security, download and recovery suites. Shared contract fixtures cover Python/TS boundary parity without copying semantic engines.
- **After approval:** three consecutive authenticated live Monkey/Rabbit runs through submission → GitHub → Cloudflare → chat → reload. Require exactly 10 scenes and two requested sections each; every dialogue 25–30 spoken words; unchanged clothes/background; no blueprint/file; one durable reply; accepted artifact/report hashes match.
- Each live result needs independent evidence-based content/continuity review **≥90/100**, with rubric and cited failures. All mandatory checks must pass irrespective of score. Also exercise single prompt, timed story, permitted background changes, Deep mode and representative non-story operations.
- Record revision, job/run IDs, stage timings and call counts. Compare with the failed baseline; choose a latency target after an approved successful baseline, not an unmeasured speed promise.

## 8. Files and workflows in implementation scope

**Runtime:** new `validators/*`, `tests/test_validators.py`, `test_repair.py`, `test_runner_validation.py`, shared contract fixtures; modify `workers/prompts/story/index.py`, `tests/test_prompts.py`, `runtime/worker_base.py`, `runtime/runner.py`, `runtime/operations.py`, relevant AGENTS/docs. Preserve `workers/prompts/index.py` alias and routing registry.

**App:** new `src/lib/validation/contracts.ts`, `runtime-report.ts`, shared fixtures; modify `ai/story-output.ts`, `ai/deep/story.ts`, `story-run.ts`, `runtime/story-validation.ts`, `runtime.server.ts`, `operations.ts`, `auth-gateway/src/runtime.ts`; scoped job dispatch/recovery/delivery changes. Extend existing story/runtime tests; add relay/lifecycle tests. Storage changes require a reviewed migration.

**Workflows:** none new. Preserve existing workflow count and OIDC/secret scope. If budget integration requires settings changes, update `scripts/gen_workflows.py` and generated `.github/workflows/prompts.yml`, not hand-edit generated YAML. No provider migration, credentials changes or UI redesign.

## 9. Risks and approval decisions

Strict checks can falsely reject paraphrases; canonical IDs and scoped evidence review mitigate this. Semantic review adds latency/cost and remains fallible. Private diagnostics/checkpoints require owner isolation, bounded retention and no public content logging. Old reports cannot silently gain new approval.

Recommended defaults: existing GitHub/models, all-or-nothing exact-count delivery, bounded private diagnostics and staged compatibility rollout. No choice blocks approval. Live tests consume provider resources; workflow runs and app deployment require explicit authorization. **Wait for review and approval before implementation.**
