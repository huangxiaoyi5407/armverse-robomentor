import { describe, expect, it } from "vitest";
import { forwardKinematics } from "@/robotics/kinematics";
import {
  SINGULAR_VALUE_THRESHOLDS,
  geometricJacobian,
  singularityMetrics,
  type Matrix6,
} from "@/robotics/jacobian";
import { UR5_MODEL } from "@/robotics/ur5-model";

const STEP = 1e-6;

function finiteDifferenceColumn(joints: readonly number[], joint: number): readonly number[] {
  const plus = [...joints];
  const minus = [...joints];
  plus[joint] += STEP;
  minus[joint] -= STEP;
  const plusPosition = forwardKinematics(UR5_MODEL, plus as never).endEffector.position;
  const minusPosition = forwardKinematics(UR5_MODEL, minus as never).endEffector.position;
  return plusPosition.map((value, axis) => (value - minusPosition[axis]) / (2 * STEP));
}

describe("geometricJacobian", () => {
  it("stores linear xyz rows before angular xyz and uses base z0 for joint 1", () => {
    const jacobian = geometricJacobian(UR5_MODEL, [0.2, -0.7, 0.8, -0.4, 0.6, -0.3]);

    expect(jacobian).toHaveLength(6);
    expect(jacobian.every((row) => row.length === 6)).toBe(true);
    expect(jacobian[3][0]).toBeCloseTo(0, 12);
    expect(jacobian[4][0]).toBeCloseTo(0, 12);
    expect(jacobian[5][0]).toBeCloseTo(1, 12);
  });

  it.each([
    [0.2, -0.7, 0.8, -0.4, 0.6, -0.3],
    [-0.9, -1.1, 1.3, 0.4, -0.8, 0.7],
  ])("matches central finite differences for translational columns at pose %#", (...joints) => {
    const jacobian = geometricJacobian(UR5_MODEL, joints as never);

    for (let joint = 0; joint < 6; joint += 1) {
      const expected = finiteDifferenceColumn(joints, joint);
      for (let axis = 0; axis < 3; axis += 1) {
        expect(jacobian[axis][joint]).toBeCloseTo(expected[axis], 6);
      }
    }
  });

  it("returns deeply frozen output and never mutates its inputs", () => {
    const joints = [0.2, -0.7, 0.8, -0.4, 0.6, -0.3] as const;
    const before = [...joints];
    const jacobian = geometricJacobian(UR5_MODEL, joints);

    expect(joints).toEqual(before);
    expect(Object.isFrozen(jacobian)).toBe(true);
    expect(jacobian.every(Object.isFrozen)).toBe(true);
  });

  it.each([
    [0, 0, 0, 0, 0],
    [0, 0, 0, Number.NaN, 0, 0],
    [0, 0, 0, Number.POSITIVE_INFINITY, 0, 0],
    new Array(6),
  ])("rejects malformed joints before arithmetic", (joints) => {
    expect(() => geometricJacobian(UR5_MODEL, joints as never)).toThrow();
  });
});

describe("singularityMetrics", () => {
  it("returns finite non-negative metrics for a documented regular pose", () => {
    const jacobian = geometricJacobian(UR5_MODEL, [0.2, -0.7, 0.8, -0.4, 0.6, -0.3]);
    const metrics = singularityMetrics(jacobian);

    expect(Number.isFinite(metrics.minSingularValue)).toBe(true);
    expect(Number.isFinite(metrics.manipulability)).toBe(true);
    expect(metrics.minSingularValue).toBeGreaterThanOrEqual(0);
    expect(metrics.manipulability).toBeGreaterThanOrEqual(0);
    expect(metrics.risk).toBe("safe");
  });

  it("classifies the UR5 all-zero wrist-aligned fixture as singular", () => {
    const metrics = singularityMetrics(
      geometricJacobian(UR5_MODEL, [0, 0, 0, 0, 0, 0]),
    );

    expect(metrics.minSingularValue).toBeLessThan(SINGULAR_VALUE_THRESHOLDS.singular);
    expect(metrics.risk).toBe("singular");
  });

  it("clamps exact zero to finite zero metrics", () => {
    const zero = Array.from({ length: 6 }, () => Object.freeze([0, 0, 0, 0, 0, 0]));
    const metrics = singularityMetrics(Object.freeze(zero) as Matrix6);

    expect(metrics).toEqual({
      minSingularValue: 0,
      manipulability: 0,
      risk: "singular",
    });
  });

  it("resolves a small non-diagonal rank-deficient block instead of accepting its diagonal", () => {
    const scale = 1e-8;
    const jacobian = Object.freeze([
      Object.freeze([scale, scale, 0, 0, 0, 0]),
      Object.freeze([scale, scale, 0, 0, 0, 0]),
      Object.freeze([0, 0, 1, 0, 0, 0]),
      Object.freeze([0, 0, 0, 1, 0, 0]),
      Object.freeze([0, 0, 0, 0, 1, 0]),
      Object.freeze([0, 0, 0, 0, 0, 1]),
    ]) as Matrix6;

    expect(singularityMetrics(jacobian)).toEqual({
      minSingularValue: 0,
      manipulability: 0,
      risk: "singular",
    });
  });

  it("applies explicit singular and warning boundaries deterministically", () => {
    const diagonal = (smallest: number): Matrix6 => Object.freeze([
      Object.freeze([smallest, 0, 0, 0, 0, 0]),
      Object.freeze([0, 1, 0, 0, 0, 0]),
      Object.freeze([0, 0, 1, 0, 0, 0]),
      Object.freeze([0, 0, 0, 1, 0, 0]),
      Object.freeze([0, 0, 0, 0, 1, 0]),
      Object.freeze([0, 0, 0, 0, 0, 1]),
    ]) as Matrix6;

    expect(singularityMetrics(diagonal(SINGULAR_VALUE_THRESHOLDS.singular)).risk)
      .toBe("singular");
    expect(singularityMetrics(diagonal(SINGULAR_VALUE_THRESHOLDS.warning)).risk)
      .toBe("warning");
    expect(singularityMetrics(diagonal(SINGULAR_VALUE_THRESHOLDS.warning * 1.01)).risk)
      .toBe("safe");
  });

  it("does not mutate the supplied matrix", () => {
    const jacobian = geometricJacobian(UR5_MODEL, [0.2, -0.7, 0.8, -0.4, 0.6, -0.3]);
    const before = JSON.stringify(jacobian);

    singularityMetrics(jacobian);

    expect(JSON.stringify(jacobian)).toBe(before);
  });

  it.each([
    [],
    Array.from({ length: 5 }, () => Array(6).fill(0)),
    Array.from({ length: 6 }, () => Array(5).fill(0)),
    Array.from({ length: 6 }, (_, row) => row === 2 ? new Array(6) : Array(6).fill(0)),
    Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 6 }, (_, column) => row === 2 && column === 3 ? Number.NaN : 0)),
    Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 6 }, (_, column) => row === 2 && column === 3 ? Infinity : 0)),
    Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 6 }, (_, column) => row === 2 && column === 3 ? "1" : 0)),
  ])("rejects malformed, sparse, or non-finite matrices", (matrix) => {
    expect(() => singularityMetrics(matrix as never)).toThrow(TypeError);
  });
});
