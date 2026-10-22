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

  it("pins the matrix, vector, standard-DH, and flange-frame conventions", () => {
    expect(UR5_MODEL.frameConvention).toBe(
      "Row-major matrices store transforms that left-multiply column vectors: p_(i-1) = T_(i-1,i) p_i. T_(i-1,i) = RotZ(theta_i) TransZ(d_i) TransX(a_i) RotX(alpha_i). Joint i rotates about z_(i-1); a_i and alpha_i act along/about x_i. Frame 0 is base; frame 6 is flange. A tool pose requires a separate flange-to-tool transform.",
    );
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

  it("rejects fully and partially sparse finite vectors", () => {
    expect(() => assertFiniteVector(new Array(3), 3)).toThrow(TypeError);

    const partiallySparse = [0, 1, 2];
    delete partiallySparse[1];
    expect(() => assertFiniteVector(partiallySparse, 3)).toThrow(TypeError);
  });

  it("rejects invalid or degree-like UR5 joint inputs", () => {
    expect(() => assertJointVector([0, 0, 0, 0, 0])).toThrow(TypeError);
    expect(() => assertJointVector([0, 0, 0, Number.NaN, 0, 0])).toThrow(TypeError);
    expect(() => assertJointVector([0, 0, 0, 0, "1", 0])).toThrow(TypeError);
    expect(() => assertJointVector([0, 0, 0, 0, 0, 90])).toThrow(RangeError);
    expect(() => assertJointVector([0, 0, 0, 0, 0, 2 * Math.PI + 1e-9])).toThrow(RangeError);
    expect(() => assertJointVector([0, 0, 0, 0, 0, -2 * Math.PI])).not.toThrow();
  });

  it("rejects fully and partially sparse joint vectors", () => {
    expect(() => assertJointVector(new Array(6))).toThrow(TypeError);

    const partiallySparse = [0, 0, 0, 0, 0, 0];
    delete partiallySparse[4];
    expect(() => assertJointVector(partiallySparse)).toThrow(TypeError);
  });
});
