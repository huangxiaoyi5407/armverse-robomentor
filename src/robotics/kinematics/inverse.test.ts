import { describe, expect, it } from "vitest";
import { forwardKinematics, solveInverseKinematics } from "@/robotics/kinematics";
import type { JointVector, Pose, RobotModel } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";

const POSITION_LIMIT = 0.001;
const ORIENTATION_LIMIT = 0.5 * Math.PI / 180;

function poseDistance(actual: Pose, expected: Pose): { position: number; orientation: number } {
  const position = Math.hypot(
    actual.position[0] - expected.position[0],
    actual.position[1] - expected.position[1],
    actual.position[2] - expected.position[2],
  );
  const dot = Math.abs(actual.orientation.reduce(
    (sum, value, index) => sum + value * expected.orientation[index],
    0,
  ));
  return { position, orientation: 2 * Math.acos(Math.min(1, Math.max(-1, dot))) };
}

function targetAt(joints: JointVector): Pose {
  return forwardKinematics(UR5_MODEL, joints).endEffector;
}

function multiplyQuaternion(left: readonly number[], right: readonly number[]): Pose["orientation"] {
  const [lx, ly, lz, lw] = left;
  const [rx, ry, rz, rw] = right;
  return [
    lw * rx + lx * rw + ly * rz - lz * ry,
    lw * ry - lx * rz + ly * rw + lz * rx,
    lw * rz + lx * ry - ly * rx + lz * rw,
    lw * rw - lx * rx - ly * ry - lz * rz,
  ];
}

const OPTIONS = Object.freeze({
  maxIterations: 240,
  positionTolerance: 5e-5,
  orientationTolerance: 5e-4,
  damping: 0.05,
  stepSize: 0.7,
  maxHistoryEntries: 64,
});

describe("solveInverseKinematics", () => {
  it.each([
    {
      targetJoints: [0.4, -0.9, 1.1, -0.5, 0.7, -0.2] as JointVector,
      seed: [0.1, -0.5, 0.7, -0.2, 0.4, 0.1] as JointVector,
    },
    {
      targetJoints: [-0.8, -1.2, 1.4, 0.3, -0.7, 0.9] as JointVector,
      seed: [-0.3, -0.8, 0.9, 0, -0.4, 0.5] as JointVector,
    },
  ])("solves reachable fixture %# and independently meets 1 mm / 0.5 degree", ({ targetJoints, seed }) => {
    const target = targetAt(targetJoints);
    const result = solveInverseKinematics(UR5_MODEL, target, seed, OPTIONS);
    const verified = poseDistance(forwardKinematics(UR5_MODEL, result.joints).endEffector, target);

    expect(result.status).toBe("converged");
    expect(verified.position).toBeLessThanOrEqual(POSITION_LIMIT);
    expect(verified.orientation).toBeLessThanOrEqual(ORIENTATION_LIMIT);
    expect(result.positionError).toBeLessThanOrEqual(OPTIONS.positionTolerance);
    expect(result.orientationError).toBeLessThanOrEqual(OPTIONS.orientationTolerance);
  });

  it("treats q and -q as the same shortest rotation target", () => {
    const target = targetAt([0.4, -0.9, 1.1, -0.5, 0.7, -0.2]);
    const negated = {
      position: [...target.position],
      orientation: target.orientation.map((value) => -value),
    } as unknown as Pose;
    const seed = [0.1, -0.5, 0.7, -0.2, 0.4, 0.1] as JointVector;

    const positive = solveInverseKinematics(UR5_MODEL, target, seed, OPTIONS);
    const negative = solveInverseKinematics(UR5_MODEL, negated, seed, OPTIONS);

    expect(negative).toEqual(positive);
  });

  it("keeps the shortest-rotation error finite and sign-stable at pi", () => {
    const current = targetAt([0.2, -0.7, 0.8, -0.4, 0.6, -0.3]);
    const orientation = multiplyQuaternion([1, 0, 0, 0], current.orientation);
    const target: Pose = { position: current.position, orientation };
    const negated: Pose = {
      position: current.position,
      orientation: orientation.map((value) => -value) as unknown as Pose["orientation"],
    };
    const options = { ...OPTIONS, maxIterations: 1 };
    const initial = [0.2, -0.7, 0.8, -0.4, 0.6, -0.3] as JointVector;

    const positive = solveInverseKinematics(UR5_MODEL, target, initial, options);
    const negative = solveInverseKinematics(UR5_MODEL, negated, initial, options);

    expect(negative).toEqual(positive);
    expect(positive.history[0].orientationError).toBeCloseTo(Math.PI, 12);
    expect(positive.history[0].stepNorm).toBeGreaterThan(0);
    expect(Number.isFinite(positive.history[0].stepNorm)).toBe(true);
  });

  it("returns bounded diagnostics instead of throwing for an unreachable pose", () => {
    const target: Pose = { position: [4, 4, 4], orientation: [0, 0, 0, 1] };
    const result = solveInverseKinematics(UR5_MODEL, target, [0.2, -0.7, 0.8, -0.4, 0.6, -0.3], {
      ...OPTIONS,
      maxIterations: 30,
      maxHistoryEntries: 8,
    });

    expect(result.status).toBe("failed");
    expect(["MAX_ITERATIONS", "STALLED_AT_LIMITS"]).toContain(result.failureCode);
    expect(result.history.length).toBeLessThanOrEqual(8);
    expect(result.history.length).toBeGreaterThan(0);
  });

  it("keeps a singular seed numerically finite and reports a deterministic outcome", () => {
    const target = targetAt([0.05, -0.05, 0.05, -0.05, 0.05, -0.05]);
    const result = solveInverseKinematics(UR5_MODEL, target, [0, 0, 0, 0, 0, 0], {
      ...OPTIONS,
      maxIterations: 80,
    });

    expect(["converged", "failed"]).toContain(result.status);
    expect([
      ...result.joints,
      result.positionError,
      result.orientationError,
    ].every(Number.isFinite)).toBe(true);
    expect(result.history.flatMap((entry) => [
      entry.positionError,
      entry.orientationError,
      entry.stepNorm,
    ]).every(Number.isFinite)).toBe(true);
  });

  it("clamps every candidate to model joint limits without NaN or Infinity", () => {
    const tightModel: RobotModel = {
      ...UR5_MODEL,
      jointLimits: UR5_MODEL.jointLimits.map(() => ({ min: -0.1, max: 0.1 })),
    };
    const result = solveInverseKinematics(
      tightModel,
      targetAt([0.8, -1, 1.2, -0.7, 0.8, 0.4]),
      [0, 0, 0, 0, 0, 0],
      { ...OPTIONS, maxIterations: 20 },
    );

    expect(result.joints.every((joint) => joint >= -0.1 && joint <= 0.1)).toBe(true);
    expect(result.history.every((entry) =>
      entry.joints.every((joint) => joint >= -0.1 && joint <= 0.1))).toBe(true);
    expect(result.history.flatMap((entry) => [
      ...entry.joints,
      entry.positionError,
      entry.orientationError,
      entry.stepNorm,
    ]).every(Number.isFinite)).toBe(true);
  });

  it("returns MAX_ITERATIONS when the iteration budget is exhausted", () => {
    const result = solveInverseKinematics(
      UR5_MODEL,
      targetAt([0.8, -1, 1.2, -0.7, 0.8, 0.4]),
      [0, 0, 0, 0, 0, 0],
      { ...OPTIONS, maxIterations: 1, stepSize: 0.1 },
    );

    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("MAX_ITERATIONS");
    expect(result.iterations).toBe(1);
    const finalEntry = result.history.at(-1);
    expect(finalEntry?.iteration).toBe(result.iterations);
    expect(finalEntry?.joints).toEqual(result.joints);
    expect(finalEntry?.positionError).toBe(result.positionError);
    expect(finalEntry?.orientationError).toBe(result.orientationError);
    expect(finalEntry?.stepNorm).toBe(0);
  });

  it("is deterministic, deeply immutable, and never mutates caller inputs", () => {
    const target = targetAt([0.4, -0.9, 1.1, -0.5, 0.7, -0.2]);
    const initial = [0.1, -0.5, 0.7, -0.2, 0.4, 0.1] as JointVector;
    const targetBefore = JSON.stringify(target);
    const initialBefore = [...initial];
    const modelBefore = JSON.stringify(UR5_MODEL);
    const first = solveInverseKinematics(UR5_MODEL, target, initial, OPTIONS);
    const second = solveInverseKinematics(UR5_MODEL, target, initial, OPTIONS);

    expect(second).toEqual(first);
    expect(JSON.stringify(target)).toBe(targetBefore);
    expect(initial).toEqual(initialBefore);
    expect(JSON.stringify(UR5_MODEL)).toBe(modelBefore);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.joints)).toBe(true);
    expect(Object.isFrozen(first.history)).toBe(true);
    expect(first.history.every((entry) => Object.isFrozen(entry) && Object.isFrozen(entry.joints))).toBe(true);
  });

  it.each([
    { label: "zero quaternion", target: { position: [0, 0, 0], orientation: [0, 0, 0, 0] } },
    { label: "non-finite position", target: { position: [0, Number.NaN, 0], orientation: [0, 0, 0, 1] } },
    { label: "wrong quaternion length", target: { position: [0, 0, 0], orientation: [0, 0, 1] } },
  ])("rejects malformed target: $label", ({ target }) => {
    expect(() => solveInverseKinematics(UR5_MODEL, target as never, [0, 0, 0, 0, 0, 0], OPTIONS))
      .toThrow();
  });

  it.each([
    { label: "wrong joint length", initial: [0, 0, 0, 0, 0] },
    { label: "non-finite joint", initial: [0, 0, Number.POSITIVE_INFINITY, 0, 0, 0] },
    { label: "joint outside model limits", initial: [7, 0, 0, 0, 0, 0] },
  ])("rejects malformed initial input: $label", ({ initial }) => {
    expect(() => solveInverseKinematics(UR5_MODEL, targetAt([0, 0, 0, 0, 0, 0]), initial as never, OPTIONS))
      .toThrow();
  });

  it.each([
    ["maxIterations", 0],
    ["maxIterations", 1.5],
    ["positionTolerance", 0],
    ["orientationTolerance", Number.NaN],
    ["damping", -0.1],
    ["stepSize", 1.1],
    ["maxHistoryEntries", 0],
    ["positionTolerance", Number.MIN_VALUE],
    ["orientationTolerance", Number.MIN_VALUE],
    ["damping", Number.MIN_VALUE],
    ["stepSize", Number.MIN_VALUE],
  ])("rejects invalid option %s=%s", (name, value) => {
    expect(() => solveInverseKinematics(
      UR5_MODEL,
      targetAt([0, 0, 0, 0, 0, 0]),
      [0, 0, 0, 0, 0, 0],
      { ...OPTIONS, [name]: value },
    )).toThrow();
  });
});
