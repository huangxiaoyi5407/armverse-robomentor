import { describe, expect, it } from "vitest";
import { assertFiniteVector } from "@/robotics/types";
import { assertJointVector, UR5_MODEL } from "@/robotics/ur5-model";

describe("UR5_MODEL", () => {
  it("identifies the classic UR5 and exposes six standard-DH rows", () => {
    expect(UR5_MODEL.name).toBe("UR5");
    expect(UR5_MODEL.dhConvention).toBe("standard");
    expect(UR5_MODEL.dhParameters).toHaveLength(6);
    expect(UR5_MODEL.dhParameters).toEqual([
      { a: 0, d: 0.089159, alpha: Math.PI / 2, thetaOffset: 0 },
      { a: -0.425, d: 0, alpha: 0, thetaOffset: 0 },
      { a: -0.39225, d: 0, alpha: 0, thetaOffset: 0 },
      { a: 0, d: 0.10915, alpha: Math.PI / 2, thetaOffset: 0 },
      { a: 0, d: 0.09465, alpha: -Math.PI / 2, thetaOffset: 0 },
      { a: 0, d: 0.0823, alpha: 0, thetaOffset: 0 },
    ]);
  });

  it("uses metres and radians with six official joint ranges", () => {
    expect(UR5_MODEL.units).toEqual({ length: "metre", angle: "radian" });
    expect(UR5_MODEL.jointLimits).toHaveLength(6);

    for (const limit of UR5_MODEL.jointLimits) {
      expect(limit.min).toBe(-2 * Math.PI);
      expect(limit.max).toBe(2 * Math.PI);
      expect(limit.min).toBeLessThan(limit.max);
    }

    const metreValues = UR5_MODEL.dhParameters.flatMap(({ a, d }) => [Math.abs(a), Math.abs(d)]);
    expect(Math.max(...metreValues)).toBeLessThan(1);
    expect(Math.max(...metreValues)).toBeGreaterThan(0.1);
  });

  it("is deeply immutable at runtime", () => {
    expect(Object.isFrozen(UR5_MODEL)).toBe(true);
    expect(Object.isFrozen(UR5_MODEL.dhParameters)).toBe(true);
    expect(Object.isFrozen(UR5_MODEL.dhParameters[0])).toBe(true);
    expect(Object.isFrozen(UR5_MODEL.jointLimits)).toBe(true);
    expect(Object.isFrozen(UR5_MODEL.jointLimits[0])).toBe(true);
    expect(() => {
      (UR5_MODEL.dhParameters[0] as { a: number }).a = 99;
    }).toThrow(TypeError);
    expect(UR5_MODEL.dhParameters[0].a).toBe(0);
  });
});

describe("robotics boundary guards", () => {
  it.each([
    { label: "NaN", values: [0, Number.NaN, 0] },
    { label: "positive infinity", values: [0, Number.POSITIVE_INFINITY, 0] },
    { label: "negative infinity", values: [0, Number.NEGATIVE_INFINITY, 0] },
    { label: "a non-number", values: [0, "1", 0] },
    { label: "the wrong length", values: [0, 0] },
    { label: "a non-array", values: "0,0,0" },
  ])("rejects $label", ({ values }) => {
    expect(() => assertFiniteVector(values, 3)).toThrow(TypeError);
  });

  it("accepts a finite vector of the required length", () => {
    const values: unknown = [0, -1.5, 2];
    expect(() => assertFiniteVector(values, 3)).not.toThrow();
  });

  it("rejects invalid or degree-like UR5 joint inputs", () => {
    expect(() => assertJointVector([0, 0, 0, 0, 0])).toThrow(TypeError);
    expect(() => assertJointVector([0, 0, 0, Number.NaN, 0, 0])).toThrow(TypeError);
    expect(() => assertJointVector([0, 0, 0, 0, "1", 0])).toThrow(TypeError);
    expect(() => assertJointVector([0, 0, 0, 0, 0, 90])).toThrow(RangeError);
    expect(() => assertJointVector([0, 0, 0, 0, 0, 2 * Math.PI + 1e-9])).toThrow(RangeError);
    expect(() => assertJointVector([0, 0, 0, 0, 0, -2 * Math.PI])).not.toThrow();
  });
});
