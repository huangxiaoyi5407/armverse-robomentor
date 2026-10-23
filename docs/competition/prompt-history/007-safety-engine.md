# Prompt record 007 — deterministic safety engine

> Git evidence: `f930025`.

Date: 2026-10-23

## Prompt and intention

Build a deterministic safety boundary that always outranks Agent text. Validate every trajectory sample for finite data, joint limits, teaching-workspace bounds, FK agreement, simplified link-obstacle collision, and Jacobian singularity risk. Unsafe input must return stable finding codes and must never expose an approved trajectory.

## RED

Tests were written first for safe motion, limit violation, NaN, workspace escape, singular warning, obstacle collision, immutability, and blocked approval. The first focused run failed because `@/robotics/safety` did not exist.

## Implementation decisions

- Findings use stable codes suitable for later reviewer/tutor explanations.
- Blocking checks are evaluated in deterministic order: numeric shape, joint limits, workspace, FK consistency, collision; singularity is a warning.
- Links are teaching approximations: line segments between cumulative FK origins expanded by a 35 mm capsule radius.
- Obstacles are axis-aligned boxes; segment collision uses slab intersection against the radius-expanded box.
- A blocked report sets `approvedTrajectory` to null and never mutates the original trajectory.

Rejected suggestion: let an Agent downgrade collision findings. Deterministic findings are authoritative by design and cannot be overridden by model output.

## GREEN

```text
npm run test:run -- src/robotics/safety/index.test.ts
Test Files 1 passed; Tests 6 passed
```

Commit subject: `feat: enforce deterministic trajectory safety`.
Resolve the latest record commit with `git log -1 --format='%H%n%s' -- docs/competition/prompt-history/007-safety-engine.md`.
