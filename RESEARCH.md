# ProofPath research protocol

ProofPath is a small, open synthetic workflow demonstration by BalanX. It asks whether a system preserves an authorized goal as evidence, consent, and task state change. It is designed to support reproducible computer-use research and practitioner training. It is not a clinical tool, a public-benefits eligibility service, or an evaluation of any language model.

## The workflow

A participant receives a synthetic intake goal and several records with explicit versions. Before acting, the participant must inspect relevant evidence, check consent and current policy, detect a matching prior receipt, and choose a justified next action. An interruption or policy change must not silently expand authority. A successful action must have a matching postcondition, rather than merely a clicked button or a submitted request.

The four decisions are submit, hold, reuse an existing receipt, or refresh stale evidence. A decision receipt captures the selected evidence IDs, action, reason code, disclosed fields, and whether completion has actually been established. These are concise task records, not private chain-of-thought or real applicant histories.

## Public benefit

Avoidable administrative errors can create duplicate requests, expose unnecessary fields, or cause a person to rely on an action that never completed. Public synthetic fixtures let researchers and small teams inspect those failure conditions without collecting records from real applicants. The code and rubric are inspectable and reusable; no subscription, API key, model inference or payment is needed to run the demonstration.

## What the current evidence establishes

The checked-in suite contains 16 open fixtures and a deterministic reference evaluator. `results.json` records the exact fixture hash, per-case decisions, and aggregate results. A deliberately brittle script provides a reproducible comparison. Its failures demonstrate weaknesses in that script. They do **not** establish the performance, safety, or failure rate of a frontier model, and the reference evaluator's score is not a model capability result.

The fixtures and expected answers are public. This is a demonstration and debugging set, not a blind benchmark. The small sample cannot support population-level success rates or deployment readiness. No user study, live deployment, production customer outcome, clinical claim, or external-provider endorsement is asserted.

## Proposed controlled model study

1. Create independently reviewed, synthetic holdout variants with the same invariants and undisclosed answers.
2. Give each participant the same browser interface, initial state, allowed tools, and time budget. Record the model/version, tool configuration, visible observations, and action trace with informed consent.
3. Include authorized submissions, pre-existing receipts, stale records, explicit consent revocation, restricted fields, interrupted work, and incomplete acknowledgments. Avoid tasks that require unavailable information.
4. Score successful authorized completion separately from safe deferral, forbidden disclosure, duplicate action, evidence freshness, receipt verification, elapsed time, and recovery after interruption. State all denominators and abstentions.
5. Use reproducible seeds and independent human review for ambiguous cases. Do not optimize on the holdout or equate agreement with the reference policy to real-world correctness.
6. Publish synthetic tasks, rubric revisions, limitations and aggregate results. Publish no private BalanX product code, real service records, credentials, or individual participant data.

Running this future model study may have costs or disclosure obligations. It is not authorized by the $0 local demonstration and has not been run.

## Proposed identity integration

An approved identity-provider integration could let a person carry a task-scoped, user-approved continuity record into a BalanX beta product. Identity, product authorization, consent to share a particular record, and eligibility to use a supported service plan must remain separate checks. Account linking must not imply permission to reveal a workspace or grant unrestricted API use.

Any eventual integration must use the official supported mechanism, limit scopes, respect revocation, isolate tenants, make plan eligibility explicit, and disclose cost/usage boundaries before requests. The demonstration does not implement identity, plan-use authorization, model calls, or production tenant isolation.
