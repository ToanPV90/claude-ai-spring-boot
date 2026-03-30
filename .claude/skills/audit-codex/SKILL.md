---
name: audit-codex
description: External-audit workflow for sending a diff or recent commit history to OpenAI Codex CLI, then validating the returned findings against local code and project intent. Use when the user wants a second-opinion review, cross-audit, or independent validation beyond the normal local review pass while keeping review scope/completeness explicit.
license: MIT
metadata:
  author: local
  version: "1.1.1"
  domain: backend
  triggers:
    - codex audit
    - independent review
    - cross-audit
    - external review
    - diff audit
    - second opinion
    - codex
  role: workflow
  scope: review
  output-format: analysis
  related-skills: java-code-review, clean-code, api-contract-review, backend-practices-review, jpa-master, kafka-master, redis-master, keycloak-master
allowed-tools: Bash(git:*), Bash(codex:*)
---

# Codex Audit Skill

Workflow guide for getting an external review from Codex CLI and filtering the results through local project context before presenting anything as a real finding.

## When to Use
- The user explicitly wants a second-opinion review or cross-audit
- A diff, branch, or recent commit needs independent external validation
- You want another reviewer to pressure-test bugs, security issues, logic risks, or performance concerns after a normal local review

## When Not to Use
- The task is a normal in-repo review without a request for external validation — use `java-code-review`
- The task is readability cleanup or refactoring rather than audit workflow — use `clean-code` or `request-refactor-plan`
- The main concern is API contract semantics rather than general code audit — use `api-contract-review`

## Reference Guide

| Topic | Reference | Load When |
|------|-----------|-----------|
| Shared review intake, completeness, severity, and disposition contract | `references/review-intake-and-output.md` | Starting an external audit so the target, missing context, and validated output shape stay explicit |

## Shared Review Contract

Start every external audit by stating the target, diff source or commit range, supporting context used, and whether the result is **complete** or **partial** because important inputs were missing.

For each validated finding, keep the report shape explicit:
- **severity** — `Critical`, `High`, `Medium`, or `Low`
- **disposition** — `patch`, `decision-needed`, `defer`, or `dismiss`
- **impact** — why the finding matters after local validation
- **next move** — patch now, route to a sibling review skill, or hold for a decision

## Symptom Triage

| Situation | Default Move |
|-----------|--------------|
| There are uncommitted changes | Audit `git diff HEAD` |
| Working tree is clean but the last change needs review | Audit `git diff HEAD~1 HEAD` |
| Codex returns many findings | Validate each one locally, then classify them by severity before surfacing them |
| Codex is unavailable | Fall back to a normal local review and say the external audit could not run |

## Audit Ladder

1. **Collect the review target** — diff, status, and recent commits.
2. **Summarize what changed** — give Codex focused context.
3. **Run Codex on the diff** — prefer uncommitted changes, otherwise the last commit.
4. **Validate every reported finding locally** — code first, then project intent docs.
5. **Classify the validated findings by severity** — reuse the same Critical / High / Medium / Low framing as `java-code-review`.
6. **Filter out misunderstandings and low-value noise** — only elevate what is both real and meaningful.
7. **Present validated findings with next actions** — or say the audit came back clean.

## Quick Mapping

| Situation | Preferred Move | Avoid |
|-----------|----------------|-------|
| External second opinion requested | Run Codex CLI and validate results locally | Treating Codex output as automatically correct |
| Clean working tree | Review the last commit instead of aborting | Claiming there is nothing to audit |
| Codex suggests context-blind issues | Verify against source and local docs before reporting | Forwarding hallucinations directly to the user |
| Codex CLI missing | State that clearly and route to `java-code-review` for the local review pass | Stopping without any review |

## Constraints

### MUST DO

| Rule | Preferred Move |
|------|----------------|
| Validate every Codex finding against the actual code | Confirm the issue is real before reporting it |
| Check local docs and project intent when findings look questionable | Use `AGENTS.md`, `README.md`, `CLAUDE.md`, and related docs as context |
| Explain why a finding matters | Tie it to bug risk, security, performance, or maintainability impact |
| Make fallback behavior explicit | If Codex cannot run, still perform a local review |

### MUST NOT DO
- Do not present Codex output verbatim without local validation
- Do not over-trust context-blind findings that conflict with repo intent
- Do not bury the user in low-value or purely stylistic external comments
- Do not stop after saying Codex is unavailable; continue with a routed local review path

## Gotchas

- External auditors often invent issues because they do not understand local constraints or architectural intent.
- A second opinion is useful only if the findings are filtered for truth and relevance.
- Codex may over-report style or speculative risk; the real task is validation, not transcription.
- A clean external audit does not replace your own judgment about project-specific conventions.

## Minimal Workflow

1. Run `git status --short`, `git log --oneline -10`, and either `git diff HEAD` or `git diff HEAD~1 HEAD`.
2. Write a concise diff summary for Codex.
3. Run Codex CLI against the diff.
4. Validate each returned finding locally.
5. Classify the validated findings by severity.
6. Present only validated findings, plus the highest-priority next actions.

## Post-Validation Routing

| Validated Finding Type | Route / Reference |
|------------------------|------------------|
| General Java bug risk or framework-heavy diff | `java-code-review` |
| HTTP contract / versioning / status code issue | `api-contract-review` |
| Backend production-safety issue (trust boundary, retry safety, dependency call risk, storage/files) | `backend-practices-review` |
| JPA fetch / transaction / persistence concern | `jpa-master` |
| Kafka producer / consumer / retry / DLT concern | `kafka-master` |
| Redis cache / TTL / lock / rate-limiting concern | `redis-master` |
| Keycloak / JWT / role-mapping concern | `keycloak-master` |
| Readability-only cleanup | `clean-code` |

## Codex Commands

Use `git diff HEAD` when uncommitted changes exist:

```bash
git diff HEAD | codex exec --full-auto -m "gpt-5.4" -c 'model_reasoning_effort="high"' -c 'service_tier="fast"' -s danger-full-access -C "$(pwd)" "You are a code reviewer. The following diff is piped to your stdin. Review it for: bugs, security issues, performance problems, logic errors, and style concerns. Be specific about file names and line numbers. You can read files, run tests, search the web for relevant docs, or do whatever you need for a thorough review. If everything looks good, say so. Do a deep audit and think from first principles. Leave no question unanswered. Here is context about what changed: <DIFF_SUMMARY>"
```

If there are no uncommitted changes, fall back to the last commit:

```bash
git diff HEAD~1 HEAD | codex exec --full-auto -m "gpt-5.4" -c 'model_reasoning_effort="high"' -c 'service_tier="fast"' -s danger-full-access -C "$(pwd)" "You are a code reviewer. The following diff is piped to your stdin. Review it for: bugs, security issues, performance problems, logic errors, and style concerns. Be specific about file names and line numbers. You can read files, run tests, search the web for relevant docs, or do whatever you need for a thorough review. If everything looks good, say so. Here is context about what changed: <DIFF_SUMMARY>"
```

## Fallback

If `codex` CLI is not installed:
1. Tell the user Codex CLI is unavailable.
2. Route to `java-code-review` for the local review pass, then pull in specialty skills only if the findings clearly belong there.

## What to Verify
- The audit states target, context used, missing context, and whether completeness is full or partial
- The review target actually matched the intended diff or commit range
- Every external finding was checked against real code and local docs
- Validated findings were severity-ranked instead of forwarded raw
- Validated findings use an explicit disposition (`patch`, `decision-needed`, `defer`, or `dismiss`)
- Noise and misunderstandings were filtered out before reporting
- The final report distinguishes validated findings from clean-audit outcomes

## See References
- `references/review-intake-and-output.md` for the shared review scope/completeness/disposition contract
