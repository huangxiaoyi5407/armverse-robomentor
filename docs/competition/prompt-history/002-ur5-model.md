# 002 — Validated classic UR5 robot model

Date: 2026-10-23. Task: define the framework-independent robotics boundary
types and an immutable, source-backed classic UR5 (CB3) model. No transform,
forward-kinematics, rendering, state, or Agent behavior was added.

## Prompt and decisions

- Implement Task 2 with strict red-green-refactor: tests first, capture the
  missing-module failure, then add the smallest compliant implementation.
- Accepted: explicit runtime guards for unknown input, six standard-DH rows,
  six physical joint ranges, deep runtime freezing, SI units, and named frame
  convention.
- Accepted: use Universal Robots' official **UR5** rows and old UR5 technical
  sheet. This is the classic UR5 / CB3, not UR5e. The official page also lists
  UR5e/UR7e with different dimensions; those values were rejected to prevent a
  mixed model.
- Accepted convention: standard DH
  `T_(i-1,i) = RotZ(theta_i) TransZ(d_i) TransX(a_i) RotX(alpha_i)`.
  Joint `i` rotates about `z_(i-1)`; frame 0 is the robot base and frame 6 is the
  flange. Every `a` and `d` value is a metre; every angle is a radian.
- Accepted boundary behavior: `assertFiniteVector` rejects non-arrays, wrong
  lengths, non-numbers, NaN, and either infinity. `assertJointVector` additionally
  rejects values outside the official +/-360-degree range after conversion to
  `[-2*pi, 2*pi]`; inputs such as `90` are therefore caught as likely degrees.
- Rejected: UR5e dimensions, degree-valued internals, permissive clamping,
  modified DH, imported robot libraries, framework dependencies, and copying
  the manufacturer's images/CAD/spreadsheet. Clamping was rejected because it
  would hide invalid boundary input instead of reporting it.

## Authoritative evidence and licence status

The exact URLs, values, access date, model distinction, and copyright/licence
status are recorded in `docs/competition/third-party-notices.md`. The model uses
factual specifications only; no third-party source code or media is bundled.

## Red evidence — before implementation

Command:

```text
npm run test:run -- src/robotics/ur5-model/model.test.ts
```

Exit 1, expected failure:

```text
FAIL src/robotics/ur5-model/model.test.ts
Error: Failed to resolve import "@/robotics/types" from
"src/robotics/ur5-model/model.test.ts". Does the file exist?
Test Files  1 failed (1)
Tests  no tests
Duration  1.36s
```

At this point only the test existed; the production exports were absent.

## First focused green

After implementing the types, guards, immutable model, and barrel export:

```text
npm run test:run -- src/robotics/ur5-model/model.test.ts
PASS src/robotics/ur5-model/model.test.ts (11 tests)
Test Files  1 passed (1)
Tests  11 passed (11)
Duration  1.22s
```

## Final verification

All commands ran from `D:/传智杯/.worktrees/robomentor-build`.

```text
npm run test:run -- src/robotics/ur5-model/model.test.ts
✓ src/robotics/ur5-model/model.test.ts (11 tests)
Test Files  1 passed (1)
Tests  11 passed (11)

npm run test:run
✓ src/robotics/ur5-model/model.test.ts (11 tests)
✓ src/app/page.test.tsx (2 tests)
Test Files  2 passed (2)
Tests  13 passed (13)

npm run lint
> eslint . --max-warnings=0

npm run build
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages (3/3)
Route (app): / and /_not-found

git diff --check
```

Every command exited 0. The build used the existing Webpack build script and
required no Task 2 dependency or configuration change.

## Files and commit reference

- `src/robotics/types.ts`
- `src/robotics/ur5-model/model.ts`
- `src/robotics/ur5-model/index.ts`
- `src/robotics/ur5-model/model.test.ts`
- `docs/competition/third-party-notices.md`
- `docs/competition/prompt-history/002-ur5-model.md`

Resolve the final Task 2 commit without embedding a soon-to-be-stale hash:

```sh
git log -1 --format=%H -- docs/competition/prompt-history/002-ur5-model.md
```

Expected subject: `feat: define validated UR5 robot model`.
