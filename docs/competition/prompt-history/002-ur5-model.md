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
  Row-major arrays store matrices that left-multiply column vectors, so
  `p_(i-1) = T_(i-1,i) p_i`. Joint `i` rotates about `z_(i-1)`; `d_i` acts on
  `z_(i-1)`, while `a_i` and `alpha_i` act along/about `x_i`. Frame 0 is the
  robot base and frame 6 is the flange. A tool pose requires a separate
  flange-to-tool transform. Every `a` and `d` value is a metre; every angle is
  a radian.
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

## Review correction 1 — sparse boundaries and pinned DH semantics

Independent review found two defects in the initial Task 2 commit
`92792e85540b0ff439cbe732253738ea36fcd42a`:

1. `Array.prototype.every` and `forEach` skip sparse array slots, so fully or
   partially sparse vectors could pass both runtime guards.
2. The standard-DH formula used `TransX(a_i) RotX(alpha_i)` while field comments
   incorrectly named `x_(i-1)`. Matrix storage/vector multiplication and flange
   versus tool semantics were also not explicit enough for Task 3.

Regression tests were added before the fix. Focused red evidence:

```text
npm run test:run -- src/robotics/ur5-model/model.test.ts
❌ pins the matrix, vector, standard-DH, and flange-frame conventions
❌ rejects fully and partially sparse finite vectors
❌ rejects fully and partially sparse joint vectors
Test Files  1 failed (1)
Tests  3 failed | 11 passed (14)
```

The guards now inspect every numeric index with ordinary `for` loops. The type
comments, model documentation, and an exact convention regression assertion now
agree on row-major storage, column-vector multiplication, standard-DH axes,
base-to-frame-6 flange meaning, and the separate tool transform.

First correction green:

```text
npm run test:run -- src/robotics/ur5-model/model.test.ts
✓ src/robotics/ur5-model/model.test.ts (14 tests)
Test Files  1 passed (1)
Tests  14 passed (14)
```

The final correction commit is resolved with the same `git log` command above.

Correction verification:

```text
npm run test:run -- src/robotics/ur5-model/model.test.ts
Test Files  1 passed (1); Tests  14 passed (14)

npm run test:run
Test Files  2 passed (2); Tests  16 passed (16)

npm run lint
> eslint . --max-warnings=0

npm run build
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages (3/3)

git diff --check
```

All final commands exited 0. An earlier build launched in parallel with tests
failed to create `.next/server/app/_global-error` with Windows `EPERM`; running
the same build alone immediately passed, so no product/configuration workaround
was added for that transient file-access conflict.
