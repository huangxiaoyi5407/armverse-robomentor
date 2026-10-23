# 004 — Geometric Jacobian and singularity indicators

Date: 2026-10-23. Task: implement the pure TypeScript geometric Jacobian and
educational singularity indicators for the classic UR5. No inverse kinematics,
trajectory planning, safety rules, UI, or Agent behavior was added.

## Prompt and decisions

- Implement Task 4 with strict red-green-refactor and retain the six-frame FK
  contract from Task 3.
- Accepted: for revolute joint `i`, use `z_(i-1) x (o_6 - o_(i-1))` for the
  linear column and `z_(i-1)` for the angular column. Joint 1 explicitly uses
  base identity values `z_0 = [0,0,1]` and `o_0 = [0,0,0]`; FK frame 1 must not
  be mistaken for the joint-1 axis.
- Accepted Matrix6 contract: six frozen rows by six columns. Rows are linear
  `x,y,z`, then angular `x,y,z`; columns are joints 1 through 6.
- Accepted: derive singular values from the eigenvalues of symmetric `J J^T`
  using a small Jacobi rotation solver. This avoids adding a dependency solely
  for a fixed 6 x 6 calculation and makes zero/noise handling explicit.
- Accepted thresholds on the raw geometric Jacobian: `<= 1e-4` is singular,
  `<= 5e-2` is warning, otherwise safe. Linear rows are metre-scaled while
  angular rows are dimensionless, so these are intentionally stable teaching
  indicators for this UR5 simulator, not unit-invariant industrial limits.
- Accepted numerical policy: exact zero stays zero; eigenvalues within
  `1e-12 * largestEigenvalue` below zero are treated as round-off and clamped;
  materially negative eigenvalues, non-convergence, overflow, malformed shape,
  sparse entries, and non-finite entries throw. Inputs are never mutated.
- Rejected: finite-difference Jacobians in production, using frame 1 for joint
  1, angular-first row order, silent repair of malformed data, UI coupling, and
  introducing Math.js only for singular-value calculation.

## Test fixtures and independent checks

The analytic translational rows are compared against central finite differences
of the existing FK position at two non-singular poses:

```text
[ 0.2, -0.7,  0.8, -0.4,  0.6, -0.3]
[-0.9, -1.1,  1.3,  0.4, -0.8,  0.7]
```

Each of the six joints is perturbed by `h = 1e-6` radians and checked as
`(p(q+h)-p(q-h))/(2h)` to six decimal places. The expected derivative path uses
FK positions and does not reuse the analytic cross-product implementation.
The classic UR5 all-zero configuration is the documented wrist-aligned singular
fixture. Separate diagonal matrices pin exact threshold equality and an exact
zero matrix pins finite zero metrics.

## Red evidence — before implementation

```text
npm run test:run -- src/robotics/jacobian/index.test.ts
```

Exit 1, expected missing-module failure:

```text
FAIL src/robotics/jacobian/index.test.ts
Error: Failed to resolve import "@/robotics/jacobian"
Test Files  1 failed (1)
Tests  no tests
Duration  1.19s
```

The test file existed and `src/robotics/jacobian/index.ts` did not.

## Green and final verification

First focused green after the minimum implementation:

```text
npm run test:run -- src/robotics/jacobian/index.test.ts
Test Files  1 passed (1)
Tests  18 passed (18)
```

Boundary coverage then added exact-zero and non-numeric matrix fixtures. Final
focused result: 20/20 tests passed.

```text
npm run test:run
Test Files  4 passed (4)
Tests  57 passed (57)

npm run lint
exit 0, zero warnings

npm run build
Compiled successfully
Finished TypeScript
Generating static pages (3/3)
```

After committing, resolve the immutable feature commit and verify whitespace
from Git itself:

```sh
git log -1 --format='%H%n%s' -- src/robotics/jacobian/index.ts
git show --check HEAD
```

The expected subject is `feat: calculate Jacobian and singularity risk`; the
live hash printed by Git is authoritative and avoids placing a pre-commit hash
in this file.
