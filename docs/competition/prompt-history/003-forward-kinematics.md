# 003 — UR5 homogeneous transforms and forward kinematics

Date: 2026-10-23. Task: implement pure TypeScript standard-DH transforms and
frame-by-frame classic UR5 forward kinematics. No inverse kinematics, Jacobian,
UI, rendering, state, or Agent behavior was added.

## Prompt and decisions

- Implement Task 3 with strict red-green-refactor: write the complete behavioral
  test first, capture the missing-module failure, then add only the transform and
  forward-kinematics implementation required to pass it.
- Accepted: preserve Task 2's locked convention exactly. Matrices use row-major
  storage, left-multiply column vectors, and compose in joint order as
  `T_06 = T_01 T_12 ... T_56`, where every row is
  `Rz(theta + thetaOffset) Tz(d) Tx(a) Rx(alpha)`.
- Accepted: return six cumulative base-to-frame transforms. The sixth is the
  flange transform; there is no hidden flange-to-tool transform.
- Accepted: validate the complete model and joint vector before any trigonometry
  or matrix multiplication. Invalid shape, sparse/non-numeric/non-finite values,
  reversed or non-finite limits, and limit violations throw instead of producing
  NaN or silently clamping.
- Accepted: expose small framework-free identity and multiplication helpers
  because they are the exact composition primitives used by FK and make the
  multiplication convention directly testable.
- Accepted quaternion convention: `(x, y, z, w)`, normalized after conversion.
  Since `q` and `-q` encode the same rotation, output uses a deterministic sign:
  prefer non-negative `w`; when `|w| <= 1e-12`, treat the value as the numerical
  180-degree tie and prefer the first `x/y/z` component whose magnitude exceeds
  `1e-12` to be positive.
- Rejected: matrix transposition for display, reverse-order multiplication,
  modified DH, degree inputs, permissive clamping, implicit tool offsets,
  Math.js/robotics-library runtime dependencies, and mutable return arrays.

## Independent fixture provenance

The tests contain literal expected matrices; they never call production helpers
to build expected values.

- The zero fixture was reduced from the six classic UR5 standard-DH rows and
  checked against the documented frame convention.
- The non-zero fixture uses
  `[pi/6, -pi/4, pi/3, -pi/6, pi/4, -pi/3]`. It was calculated in a disposable
  Node command by constructing four separate elementary 4 x 4 matrices
  (`Rz`, `Tz`, `Tx`, `Rx`) and multiplying nested 2-D arrays with an independent
  triple-loop multiplier. Production code instead uses the closed-form DH row
  and flat row-major multiplication. The two paths therefore do not share the
  formula or implementation under test.
- Matrix entries are checked to 10 decimal places. This is tight enough to catch
  reversed composition, transposition, and sign mistakes while allowing normal
  IEEE-754 trigonometric round-off.

The resulting independent non-zero flange transform is:

```text
[ 0.27841558694280133,  0.9305176782880683,  -0.23795296035283586, -0.5746055510590828 ]
[-0.24750497639584917, -0.16987214914122556, -0.9538787866419042,  -0.5249819019562618 ]
[-0.9280226546839174,   0.324469264090644,    0.18301270189221927,  0.21179467747028818]
[ 0,                     0,                    0,                    1                  ]
```

## Red evidence — before implementation

Command:

```text
npm run test:run -- src/robotics/kinematics/forward.test.ts
```

Exit 1, expected failure:

```text
FAIL src/robotics/kinematics/forward.test.ts
Error: Failed to resolve import "@/robotics/kinematics"
Test Files  1 failed (1)
Tests  no tests
Duration  1.14s
```

At that point the test existed and the production kinematics module did not.

## First focused green

```text
npm run test:run -- src/robotics/kinematics/forward.test.ts
PASS src/robotics/kinematics/forward.test.ts (17 tests)
Test Files  1 passed (1)
Tests  17 passed (17)
Duration  1.24s
```

## Final verification

All commands ran from `D:/传智杯/.worktrees/robomentor-build`.

```text
npm run test:run
Test Files  3 passed (3)
Tests  33 passed (33)

npm run lint
> eslint . --max-warnings=0

npm run build
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages using 4 workers (3/3)

git show --check HEAD
```

Resolve the final Task 3 commit without embedding a stale hash:

```sh
git log -1 --format=%H -- docs/competition/prompt-history/003-forward-kinematics.md
```

Expected subject: `feat: implement UR5 forward kinematics`.

## Review correction 1 — stable 180-degree quaternions and finite derived values

Independent review found three defects in the initial Task 3 commit `052e674`:

1. Testing only `w === 0` did not canonicalize equivalent `+pi` and `-pi`
   rotations to the same numerical quaternion representative.
2. Finite inputs could overflow while adding `angle + thetaOffset` or summing
   matrix products, allowing public transform functions to return NaN/Infinity.
3. The initial evidence used plain `git diff --check` after committing, which
   checked an empty working-tree diff rather than the delivered commit; the
   commit also contained two extra EOF blank lines.

Regression tests were added before the correction. Focused red evidence:

```text
npm run test:run -- src/robotics/kinematics/forward.test.ts
Test Files  1 failed (1)
Tests  4 failed | 17 passed (21)

FAIL rejects a finite angle and offset whose derived theta overflows
FAIL rejects finite matrices whose multiplication overflows
FAIL chooses one stable unit-quaternion representative at and near 180 degrees
FAIL rejects finite model and joint values when FK angle derivation overflows
```

The correction introduces the documented `1e-12` quaternion sign-tie tolerance,
rejects a non-finite derived theta, and checks every matrix product/output entry
before returning. The exact and near-180-degree tests call public FK, verify unit
length and representative continuity, and the transform/FK overflow tests verify
that non-finite results cannot escape public APIs.

First correction green:

```text
npm run test:run -- src/robotics/kinematics/forward.test.ts
Test Files  1 passed (1)
Tests  21 passed (21)
```

The corrected submission is verified at commit level rather than against an
empty worktree:

```text
git show --check HEAD
```

Expected output is only the commit header and message, with no whitespace error.
