# 005 — Damped least-squares inverse kinematics

> Git evidence: `3f3d894` (implementation), `b994922` (boundary and diagnostic hardening).

Date: 2026-10-23. Task: implement deterministic bounded numerical IK for the
classic UR5 using the existing forward kinematics and geometric Jacobian. No
trajectory, safety, simulator, UI, or Agent workflow behavior was added.

## Prompt and mathematical decisions

- Implement Task 5 with strict red-green-refactor and independently verify every
  successful result by feeding its joints back through Task 3 FK.
- Accepted DLS update: solve `(J J^T + lambda^2 I) y = e`, then apply
  `delta_q = stepSize J^T y`. A pivoted fixed-size Gaussian solver is used for
  the six-dimensional system; positive damping keeps the system regular at
  singular seeds.
- Accepted row contract from Task 4: position error metres in rows 0..2 and
  base-frame rotation-vector error radians in rows 3..5.
- Accepted orientation error: normalize and canonicalize x,y,z,w quaternions,
  compute `q_target * conjugate(q_current)`, then use the shortest rotation
  vector `axis * 2 atan2(|v|, w)`. The small-angle branch uses `2v`; the
  180-degree sign tie uses a stable vector-component representative. Therefore
  `q` and `-q` produce byte-for-byte identical solver results.
- Accepted convergence rule: both position and orientation must meet their own
  tolerances. Meeting only one tolerance is not success.
- Accepted safety boundary: every candidate joint is clamped to the model's
  limits before the next FK/Jacobian calculation. The target, seed, model,
  result joints, history array, and each history snapshot are never mutated and
  are deeply frozen where owned by IK.
- Accepted stable failure codes for later trajectory/workflow tasks:
  `MAX_ITERATIONS`, `STALLED_AT_LIMITS`, and `NUMERIC_FAILURE`. Malformed API
  input (shape, non-finite values, zero quaternion, invalid options, or invalid
  seed/model) throws at the boundary; valid but unsolved poses return diagnostics.
- Accepted bounded teaching history: keep early iterations and always replace
  the final slot with the newest snapshot once the configured cap is reached.
- Rejected random restarts, pseudoinverse dependencies, Euler-angle orientation
  subtraction, trusting internal error fields without FK verification, silent
  option repair, and unbounded per-iteration logging.

## Red evidence

The 21-test focused suite was written before `inverse.ts` or its export existed:

```text
npm run test:run -- src/robotics/kinematics/inverse.test.ts
Test Files  1 failed (1)
Tests  8 failed | 13 passed (21)
TypeError: solveInverseKinematics is not a function
```

The 13 apparent passes were boundary assertions expecting a throw; the missing
function itself threw. They were not counted as green evidence. The eight
behavior tests failed for the intended missing-feature reason.

## Substantial AI debugging / iteration chain 1

### Attempt 1

The first implementation introduced the DLS equation, shortest quaternion
error, joint clamping, finite arithmetic checks, immutable diagnostics, and the
bounded iteration/history limits. Both reachable fixtures already converged,
but the focused run was not green:

```text
Test Files  1 failed (1)
Tests  1 failed | 20 passed (21)
expected JSON result not to match /null/
```

The actual result was a valid converged result. Its `failureCode` and
`failureReason` were intentionally `null`; the test had incorrectly treated a
legitimate tagged-union value as evidence of non-finite arithmetic.

### Review of suggestions

- Rejected changing successful results to fake string failure fields: that
  would weaken the API contract merely to satisfy a faulty assertion.
- Accepted changing the assertion to inspect every numeric joint/error/history
  field with `Number.isFinite`.
- Accepted adding a separate exact-pi regression. It composes a 180-degree
  base-frame rotation with a real FK orientation, compares positive and
  negated quaternion targets, pins the initial orientation error to pi, and
  requires a finite nonzero update.

Focused green after correction and the pi regression:

```text
Test Files  1 passed (1)
Tests  22 passed (22)
```

### Production type-check iteration

The first production build compiled JavaScript but TypeScript rejected an
implicit Jacobian type, direct `number[]` to six-tuple assertions, and one
test-only mapped quaternion cast. These were type-boundary defects, not solver
behavior defects. The implementation now imports `Matrix6` explicitly and
uses deliberate `unknown` tuple boundary casts after runtime validation; the
test uses the same explicit boundary for its constructed negated quaternion.
No tolerance, fixture, or numeric algorithm was relaxed.

The unchanged focused suite remained 22/22 green and the next production build
compiled, type-checked, and generated all 3 static pages.

## Fixtures and acceptance evidence

Two targets are generated from known non-singular joint fixtures, while their
seeds are materially different. Success is assessed from a new FK call on the
returned joints, not from the solver's own error fields. Both are explicitly
required to remain within 0.001 m and 0.5 degree.

Additional coverage includes normalized quaternion sign equivalence, exact pi,
an unreachable 4 m target, a singular all-zero seed, one-iteration exhaustion,
tight joint limits, malformed target/seed/options, deterministic repetition,
non-mutation, deep immutability, bounded history, and absence of NaN/Infinity.

## Final verification

```text
npm run test:run -- src/robotics/kinematics/inverse.test.ts
Test Files  1 passed (1); Tests  22 passed (22)

npm run test:run
Test Files  5 passed (5); Tests  87 passed (87)

npm run lint
exit 0, zero warnings

npm run build
Compiled successfully
Finished TypeScript
Generating static pages (3/3)
```

After committing, `git show --check HEAD` and the task commit range are checked
for whitespace. The live Git hash is recorded in the execution report so this
pre-commit evidence file does not invent a future hash.

## Independent review correction — meaningful option floors and final history

Review reproduced a reachable target falsely labelled `STALLED_AT_LIMITS` when
`stepSize: Number.MIN_VALUE` was accepted: the update rounded to zero without a
joint limit causing it. It also found that positive-but-subnormal damping could
square to zero, and that `MAX_ITERATIONS` omitted its final evaluated state from
history.

Regression tests were added first. Focused red:

```text
Test Files  1 failed (1)
Tests  5 failed | 21 passed (26)
```

Four failures proved subnormal position tolerance, orientation tolerance,
damping, and step size were accepted. The fifth proved history iteration 0 was
returned beside a result evaluated at iteration 1.

Accepted documented lower bounds are `1e-9 m`, `1e-9 rad`, `1e-6` damping, and
`1e-6` step size. They remain far tighter than the teaching acceptance targets
while preventing meaningless double-precision configuration. A zero actual
step is now `STALLED_AT_LIMITS` only when a meaningful unconstrained proposal
was removed by clamping; otherwise it is the distinct `NUMERIC_STALL` code.
The maximum-iteration branch appends or replaces the bounded history's last
slot with the final joints/errors at zero step.

Correction green: focused 26/26 and full suite 91/91. Lint passed. Production
build was attempted twice but Windows denied creation of different generated
`.next` directories with `EPERM`; compilation did not reach source/type-check,
and the previously unchanged production build had passed before this narrow
runtime/test correction.
