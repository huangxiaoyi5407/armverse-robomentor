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
const DENSE_KNOWN_SPECTRUM: Matrix6 = Object.freeze([
  Object.freeze([0.7072402178835736, 0.14244774484389172, 0.261563649896346, -0.13135088814658902, -0.221607650429398, 0.04130687120441276] as const),
  Object.freeze([0.14244774484389178, 0.5615450031897512, -0.05475805199022189, -0.17936051929694813, -0.3460525437604074, 0.3458368233458623] as const),
  Object.freeze([0.26156364989634606, -0.05475805199022192, 0.522432097085423, -0.10269133726730913, 0.08931379467847983, 0.1900518242916867] as const),
  Object.freeze([-0.13135088814658902, -0.1793605192969481, -0.10269133726730914, 0.46263494998697, -0.47571877873789453, -0.23824678901456275] as const),
  Object.freeze([-0.22160765042939795, -0.3460525437604074, 0.08931379467847983, -0.4757187787378945, 1.783128820729953, 0.07863624489153473] as const),
  Object.freeze([0.04130687120441274, 0.34583682334586224, 0.1900518242916867, -0.23824678901456273, 0.07863624489153473, 0.3930289111243286] as const),
]);

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

  it("converges for a dense Jacobian with an independently known spectrum", () => {
    const knownSingularValues = [1e-5, 0.11, 0.39, 0.73, 1.17, 2.03];
    const expectedManipulability = knownSingularValues.reduce((product, value) => product * value, 1);
    const metrics = singularityMetrics(DENSE_KNOWN_SPECTRUM);

    expect(metrics.minSingularValue).toBeCloseTo(knownSingularValues[0], 9);
    expect(metrics.manipulability / expectedManipulability).toBeCloseTo(1, 6);
    expect(metrics.risk).toBe("singular");
  });

  it.each([
    { label: "exact", epsilon: 0 },
    { label: "near", epsilon: 1e-8 },
  ])("returns finite metrics for a dense $label rank-deficient Jacobian", ({ epsilon }) => {
    const rows = DENSE_KNOWN_SPECTRUM.map((row) => [...row]);
    rows[1] = rows[0].map((value, column) => value + epsilon * DENSE_KNOWN_SPECTRUM[1][column]);
    const metrics = singularityMetrics(rows as unknown as Matrix6);

    expect(Number.isFinite(metrics.minSingularValue)).toBe(true);
    expect(Number.isFinite(metrics.manipulability)).toBe(true);
    expect(metrics.minSingularValue).toBeGreaterThanOrEqual(0);
    expect(metrics.manipulability).toBeGreaterThanOrEqual(0);
    expect(metrics.risk).toBe("singular");
  });

  it.each([1e-40, 1e-8, 1, 1e40])(
    "keeps dense metrics finite under uniform scale %s",
    (scale) => {
      const scaled = DENSE_KNOWN_SPECTRUM.map((row) =>
        row.map((value) => value * scale),
      ) as unknown as Matrix6;
      const metrics = singularityMetrics(scaled);

      expect(Number.isFinite(metrics.minSingularValue)).toBe(true);
      expect(Number.isFinite(metrics.manipulability)).toBe(true);
      expect(metrics.minSingularValue).toBeGreaterThanOrEqual(0);
      expect(metrics.manipulability).toBeGreaterThanOrEqual(0);
    },
  );

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
