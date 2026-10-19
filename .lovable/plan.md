# VISION validators architecture and story reliability

## Scope and evidence boundary

Plan only. No implementation, source edits, commits, workflow runs, model generation, or deployment occurred during this review. Only this approval document is added; source snapshots and diagnostic probes stayed in `/tmp`.

Keep GitHub Actions, existing provider order, workflow routing, OIDC security, private storage and chat delivery. `validators/` belongs at the root of **tkdasofficial/vision-runtime**, not inside a worker. Cloudflare needs compatible contracts and boundary checks, not a duplicate Python engine.

## 1. Current architecture

- Default counted stories/linked prompts route through `src/lib/ai/request-route.ts:18–63` and `src/components/chat-workspace/index.tsx:420–435` to `/api/jobs`, then `jobs/dispatch.server.ts` → `runtime/runtime.server.ts` → `runtime/github.server.ts:24–32`.
- Both generation operations use `prompts.yml`. Runtime `workers/prompts/index.py` remains an alias; generation resides in `workers/prompts/story/index.py`. `runtime/operations.py:194–208` registers both operations against that implementation. Do not add another story generator.
- GitHub `runtime/runner.py:57–112` claims via OIDC, downloads verified input, invokes the worker, validates/uploads bytes, and reports completion. `runtime/worker_base.py:53–78` supplies shared operation, path and signature gates.
- Cloudflare `auth-gateway/src/runtime.ts:43–125` authenticates/pins runners and stores progress/results. `src/lib/runtime/runtime.server.ts:158–198` verifies bytes, checks story output, optionally saves a file, saves the chat reply and finalizes the job.
- Deep chat is a separate Cloudflare path: `ai/deep/story.ts` already has canonical IDs, scene manifests, state snapshots and dependencies; `story-run.ts:195–423` orchestrates generation, reviews, local repair and dependent revalidation. Reuse these structures.
- Existing tests include `tests/test_prompts.py`, `src/test/story-prd.test.ts`, `story-output.test.ts` and `runtime-story-validation.test.ts`. Mock-model passes are not evidence of live creative quality. Local Cloudflare edits were previously recorded as undeployed; deployed parity is not established here.

## 2. Actual failed run: confirmed facts versus hypotheses

**Evidence:** GitHub run **39190584448**, revision **0521a11cf4cbc7aa229190716374dad48110ccde**, 19 October 2026. Checkout succeeded. Planning started 02:34:23 UTC. Three candidates were rejected at 02:36:52, 02:37:41 and 02:38:26. Each logged one problem beginning `Fixed background requires the same location in every scene`. Failure was reported at 02:38:27. This accounts for the approximately 255-second run; scene writing never started.

Four successful Nemotron calls logged 59/89/50/44 seconds. There is no logged 429, provider error or timeout indicator. Workflow timeout is 45 minutes. **This was bounded planning rejection, not an observed GitHub timeout or provider outage.**

### Confirmed contributing design issues

1. **Planning “repair” does not edit the rejected plan.** `story/index.py:926–949` sends the original brief, unchanged blueprint, count and error strings on each attempt, but no previous candidate. Every attempt regenerates a full plan. The generic background error omits scene/path, observed IDs and expected ID. This limits targeted correction; it does not prove the model ignored instructions.
2. **Room identity is ambiguous.** `check_fixed_background:202–215` compares raw strings, mixing scene locations and selected character-position values. A pure-function probe rejects two equivalent-looking room aliases just like a real room change. An undeclared `bedroom` position passes the current checker. Room IDs and positions within rooms need distinct representation.
3. **Some checks silently change story meaning.** The one-room branch overwrites character positions before validation (`930–942`). Normalization rewrites before-state/index/cast data (`317–400`); validation changes times and wardrobe state (`403–484`). This can conceal contradictions rather than resolve them.
4. **Evidence is insufficient for the exact generated defect.** Logs retain key names/counts and a shortened error, not failed location values, plan versions or repair responses. Rejected plans are not checkpointed; `runner.py:126–127` deletes the work directory. The original model outputs cannot be reconstructed from these logs.

**Unproven hypotheses:** actual movement outdoors, inconsistent room aliases, malformed location values, blueprint/brief conflicts or model noncompliance. Stale validation is not shown: each new plan is revalidated. Scene patch application and audit rollback are not the stopping cause because this run never reached them. My earlier claim that the background definitely changed was too strong.

**Revision caveat:** current main is **252d3cef**. Its only story-code difference from failing 0521a11c adds recognition of selected outdoor-position phrases; it does not change the planning repair payload. Do not attribute the run to code it did not execute.

## 3. Proposed reusable validators architecture — technical design

```text
validators/
  __init__.py       public validate entry point and profile selection
  contracts.py      versioned context, constraints, findings, reports
  structural.py     shapes, IDs, counts, fields, references, assembled output
  compliance.py     requested fields, word/script/range rules, restrictions
  continuity.py     canonical room/time/entity/prop/dependency checks
  semantic.py       injected evidence extraction and meaning checks
  repair.py         scoped patch checks, revalidation and stop decisions
```

Move existing pure rules into these modules; keep temporary compatibility wrappers, then remove duplicate implementations. No module per worker, provider or file extension. Retain current format registry/signature and archive-security helpers instead of copying them.

**Interface:** `validate(artifact, context) → ValidationReport`. Context includes operation/profile, original requirement provenance, normalized request contract, relevant canon/dependencies and validator version. Findings include `code`, `constraintId`, severity, status, scene ID, JSON/section path, expected/actual values, evidence and allowed repair scope. Report statuses are **passed / failed / unverified**; unavailable semantic checks never count as passed. Bind reports to request/contract hash and exact artifact hash.

Validators do not mutate artifacts or call generation providers. Semantic evaluation accepts an injected evaluator from the existing AI worker; conversion workers never inherit AI credentials. Code checks objective rules; model evaluation handles narrative meaning with actual-content quotations. A 90–100 score cannot override a failed, unverified or flagged mandatory check.

## 4. Requirements and continuity

Compile one versioned contract before planning: count, requested output fields, per-scene spoken-word bounds, language, grouping, file opt-in and explicit invariants. Store each constraint with its source clause and scope. Detect contradictions before generation; do not invent a universal fixed-background policy.

For the Monkey/Rabbit brief: exactly 10 ordered scenes, only Visual Prompt and Dialogue, 25–30 spoken words per scene excluding labels/directions, unchanged character appearance/clothes, one consistent background, no blueprint or automatic file. Character/theme lists are inputs, not extra output sections.

Reuse the bible/manifest: stable character/location IDs; room identity separate from `positionWithinRoom`; immutable appearance/background separate from mutable props/actions; dependencies link causal scenes. If the user supplies no outfit, choose and record it once as an assumption, then keep it consistent. Intentional location/wardrobe changes remain allowed when the request permits them.

Validate the plan before writing, the actual visual/dialogue content against canon, then temporal/spatial/causal boundaries across scenes. Copied lock metadata is never evidence. Resolve registered aliases without guessing that different rooms are identical; unknown references fail with exact affected paths. Do not silently rewrite an explicitly contradictory location or timeline.

## 5. Bounded repair and recovery

1. Preserve original candidate and report; separate harmless format normalization from semantic changes and record a diff.
2. Feed the rejected plan/draft, exact findings, authoritative constraint IDs, permitted paths and remaining budget to repair.
3. Apply a schema-checked patch to a copy. Reject edits outside permitted fields or to locked canon. Repair dialogue alone for word failures; repair location/action fields for spatial failures.
4. Revalidate repaired fields, full plan/scene and affected dependency closure. Commit candidate plus matching report atomically only when gates pass; preserve prior approved content otherwise.
5. Track candidate/report hashes and failure signatures. Stop after two consecutive no-change/identical-failure repairs rather than repeating full regeneration. Permit at most two repair rounds per target, all drawing from one overall deadline/call budget; tune lower only after measured runs.
6. Consume the existing operation timeout with a monotonic deadline. Bound calls, quota waits, retries and backoff by remaining time, reserving time for audit/upload/reporting. Distinguish transient 429/5xx/network failures from content defects. Do not fix content by retrying workflow dispatch.
7. Revalidate the **assembled deliverable**, including single-unit requests; unresolved flags block regardless of score. Preserve the best valid artifact together with its report rather than score-only rollback.
8. Use owner-scoped private checkpoints with schema, request/contract/version hashes and integrity checks for approved scenes. Existing runner-local checkpoints do not survive a new Actions run; reuse private transport/storage, never public GitHub logs/artifacts. Fresh retries must resume only verified, compatible state.
9. Exact-count requests default to all-or-nothing. Partial output is delivered only when explicitly permitted, labeled with missing/blocked scenes and never marked complete. Preserve valid checkpoints even when no partial delivery is permitted.

## 6. Orchestration safeguards, separate from the observed cause

Fix verified static risks alongside integration: conditional relay mutations prevent late completion from resurrecting cancelled/timed-out jobs (`auth-gateway/src/runtime.ts:108–125`); enforce deadlines at claim/upload/complete; structurally bound metadata instead of truncating JSON at 20,000 characters; reconcile interrupted dispatch and delivery across `jobs`/`runtime_jobs`; make finalization/reply/artifact writes idempotent. These are not proven causes of run 39190584448.

Align existing 25-minute Python operation, 40-minute app/session and 45-minute workflow limits under one effective execution budget plus separate queue allowance and finalization reserve. Keep limits configurable; do not simply lengthen everything.

## 7. Implementation order and files

1. Define contracts/findings and shared JSON fixtures; add private, bounded attempt diagnostics with paths/IDs/hashes/timing. Store full candidate/repair records privately with retention limits, not in public logs.
2. Extract pure checks into root `validators/`; make normalization explicit and validation read-only. Add canonical room/reference handling and request-scoped invariants.
3. Integrate plan/scene/assembly profiles and scoped transactional repairs in `workers/prompts/story/index.py`; preserve the parent alias. Add budget and checkpoint/report versioning.
4. Add optional validation hooks in `runtime/worker_base.py` and final-report/deadline handling in `runtime/runner.py`. Existing workers opt into operation profiles; no story checks for conversion/checksum jobs.
5. Integrate compatible contracts and boundary gates in Cloudflare; reuse current Deep state/dependency logic, fix runtime count-check early return and avoid Markdown-format-dependent semantic acceptance. Version saved approvals.
6. Repair relay/lifecycle races and test fault recovery. Then authorized staged runtime/app release and authenticated live verification; deployment/workflow execution require approval.

**GitHub files:** new `validators/*`, `tests/test_validators.py`, `tests/test_repair.py`, `tests/test_runner_validation.py`, shared fixtures; modify `workers/prompts/story/index.py`, `tests/test_prompts.py`, `runtime/worker_base.py`, `runtime/runner.py`, `runtime/operations.py`, relevant AGENTS/docs. Preserve `workers/prompts/index.py` alias and registry routing. No new workflows. Modify `scripts/gen_workflows.py` and generated `.github/workflows/prompts.yml` only if budget/report integration requires workflow settings changes.

**App files:** new `src/lib/validation/contracts.ts`, `runtime-report.ts`, shared fixtures; modify `ai/story-output.ts`, `ai/deep/story.ts`, `story-run.ts`, `runtime/story-validation.ts`, `runtime.server.ts`, `operations.ts`, `auth-gateway/src/runtime.ts`, job dispatch/recovery/delivery modules as needed; existing story/runtime tests plus new relay/lifecycle tests. No UI redesign or provider migration. Any storage-schema change needs a separately reviewed migration.

## 8. Verification, acceptance and safeguards

- Unit/regression fixtures: room aliases versus real changes; undeclared rooms; allowed background changes; immutable clothes/identity; temporal/prop/knowledge continuity; missing/duplicate/out-of-order counts; 24/25/30/31 spoken words; fields/grouping/scripts; malformed/conflicting contracts; unavailable semantic checks and high-score flagged failures.
- Repair tests: previous candidate appears in payload; patches actually apply; valid fields remain byte-identical; unauthorized changes fail; dependents revalidate; repeated failures stop; rollback preserves matching report; saved approvals invalidate on version/hash change.
- Fake-clock/provider tests: deadline/queue delays, 429/5xx, late responses, expired sessions, restart checkpoint integrity, delivery interruption at each write, duplicate dispatch/poll, cancelled jobs, partial-output permission. Preserve format/security/download regression suites.
- Live acceptance after approval: run the exact Monkey/Rabbit brief through authenticated submission → GitHub → Cloudflare → chat → reload, recording run SHA, job ID, candidate/report hashes and latency. Require 10 scenes, exactly two requested sections each, every dialogue 25–30 spoken words, consistent clothes/background, no blueprint/file, one durable reply.
- Require **three consecutive live passes**, no mandatory violations, and an independent evidence-based continuity/content review ≥90/100 per result. Publish rubric and cited defects; never substitute the runtime score or mocked tests for this evidence. Also test a request permitting background changes, a single prompt, a timed story, Deep mode and representative non-story operations.
- Record stage latency/call counts against the failed baseline. Set a performance target after an approved baseline; do not promise a fixed generation speed without measurements.

## 9. Risks and decisions

Strict gates may reject paraphrases; canonical IDs and scoped semantic review reduce false failures. Semantic review remains fallible and adds cost; deterministic coverage and independent live review are required. Durable checkpoints/diagnostics introduce private-data retention concerns and must be owner-scoped, bounded and excluded from public logs. Versioned rollout must not treat old reports as current approvals.

Recommended defaults: keep GitHub/models; exact-count tasks stay all-or-nothing; private bounded diagnostics; staged compatibility rollout; no new workflow count. No architecture choice blocks plan approval. Live tests consume provider resources and require explicit approval; app deployment requires explicit authorization. The exact historical candidate-level cause remains unresolved until equivalent failures are captured with the proposed private diagnostics.
