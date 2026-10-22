import type { JointVector, RobotModel } from "@/robotics/types";
import { assertFiniteVector } from "@/robotics/types";

const FULL_REVOLUTION = 2 * Math.PI;

/**
 * Classic UR5 (CB3), not UR5e.
 *
 * Matrices are stored row-major and left-multiply column vectors. The standard
 * Denavit-Hartenberg transform maps frame-i coordinates into frame i-1:
 * p_(i-1) = T_(i-1,i) p_i, where T_(i-1,i) is
 * RotZ(theta_i) * TransZ(d_i) * TransX(a_i) * RotX(alpha_i).
 * Joint i rotates about z_(i-1); a_i and alpha_i act along/about x_i. Frame 0
 * is the robot base and frame 6 is the flange. A tool pose requires composing
 * a separate flange-to-tool transform. Values are nominal UR5 values.
 */
export const UR5_MODEL: RobotModel = Object.freeze({
  name: "UR5",
  manufacturer: "Universal Robots",
  dhConvention: "standard",
  frameConvention:
    "Row-major matrices store transforms that left-multiply column vectors: p_(i-1) = T_(i-1,i) p_i. T_(i-1,i) = RotZ(theta_i) TransZ(d_i) TransX(a_i) RotX(alpha_i). Joint i rotates about z_(i-1); a_i and alpha_i act along/about x_i. Frame 0 is base; frame 6 is flange. A tool pose requires a separate flange-to-tool transform.",
  units: Object.freeze({ length: "metre", angle: "radian" }),
  dhParameters: Object.freeze([
    Object.freeze({ a: 0, d: 0.089159, alpha: Math.PI / 2, thetaOffset: 0 }),
    Object.freeze({ a: -0.425, d: 0, alpha: 0, thetaOffset: 0 }),
    Object.freeze({ a: -0.39225, d: 0, alpha: 0, thetaOffset: 0 }),
    Object.freeze({ a: 0, d: 0.10915, alpha: Math.PI / 2, thetaOffset: 0 }),
    Object.freeze({ a: 0, d: 0.09465, alpha: -Math.PI / 2, thetaOffset: 0 }),
    Object.freeze({ a: 0, d: 0.0823, alpha: 0, thetaOffset: 0 }),
  ]),
  jointLimits: Object.freeze(
    Array.from({ length: 6 }, () =>
      Object.freeze({ min: -FULL_REVOLUTION, max: FULL_REVOLUTION }),
    ),
  ),
});

/** Validates six finite UR5 joint angles and their physical radian ranges. */
export function assertJointVector(values: unknown): asserts values is JointVector {
  assertFiniteVector(values, UR5_MODEL.jointLimits.length);

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const limit = UR5_MODEL.jointLimits[index];
    if (value < limit.min || value > limit.max) {
      throw new RangeError(
        `Joint ${index + 1} must be in radians within [${limit.min}, ${limit.max}].`,
      );
    }
  }
}
