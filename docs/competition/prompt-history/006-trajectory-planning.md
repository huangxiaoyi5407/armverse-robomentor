# Prompt record 006 — trajectory planning

Date: 2026-10-23

## Goal and constraints

Implement deterministic joint cubic/quintic trajectories and Cartesian straight-line planning for the classic UR5. Internal units remain metres, radians, and seconds. Samples must be immutable and finite; Cartesian planning uses sequential seeded IK and returns diagnostics instead of a partial trajectory as if it were complete.

## RED

Created `src/robotics/trajectory/index.test.ts` first and ran:

```text
npm run test:run -- src/robotics/trajectory/index.test.ts
FAIL Failed to resolve import "@/robotics/trajectory"
```

The failure was expected because the trajectory module did not exist.

## Decisions

- Joint paths use normalized cubic `3u²-2u³` or quintic `10u³-15u⁴+6u⁵`; analytic velocity is divided by duration.
- Public endpoints are copied exactly, and endpoint velocities are exactly zero.
- Cartesian positions interpolate linearly; orientations use shortest-path quaternion SLERP, treating q and -q as equivalent.
- Each Cartesian sample seeds IK from the previous successful sample. Any intermediate failure returns `IK_FAILED`, the failed index, and frozen partial samples.
- Sample count is bounded to 2–1001 to prevent accidental unbounded work or memory usage.

Rejected suggestion: return the requested Cartesian pose instead of FK output in each sample. That would hide IK residuals. Samples store the achieved FK pose so safety and UI consumers see the real robot state.

## GREEN

```text
npm run test:run -- src/robotics/trajectory/index.test.ts
Test Files 1 passed; Tests 7 passed
```

Coverage includes exact endpoints, monotonic timestamps, zero quintic endpoint velocity, joint-limit and malformed-input rejection, deep immutability, Cartesian straightness, graceful intermediate IK failure, and q/-q shortest interpolation.

Commit subject: `feat: add joint and Cartesian trajectory planning`.
Resolve the latest record correction with `git log -1 --format='%H%n%s' -- docs/competition/prompt-history/006-trajectory-planning.md`.
