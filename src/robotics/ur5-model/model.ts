import type { JointVector, RobotModel } from "@/robotics/types";
import { assertFiniteVector } from "@/robotics/types";

const FULL_REVOLUTION = 2 * Math.PI;

/**
 * Classic UR5 (CB3), not UR5e.
 *
 * Standard Denavit-Hartenberg transform from frame i-1 to frame i:
 * RotZ(theta_i) * TransZ(d_i) * TransX(a_i) * RotX(alpha_i).
 * Joint i rotates about z_(i-1); frame 0 is the robot base frame and frame 6
 * is the flange frame. Values are the nominal Universal Robots UR5 values.
 */
export const UR5_MODEL: RobotModel = Object.freeze({
  name: "UR5",
  manufacturer: "Universal Robots",
  dhConvention: "standard",
  frameConvention:
    "T_(i-1,i) = RotZ(theta_i) TransZ(d_i) TransX(a_i) RotX(alpha_i); joint i rotates about z_(i-1); frame 0 is base and frame 6 is flange.",
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

  values.forEach((value, index) => {
    const limit = UR5_MODEL.jointLimits[index];
    if (value < limit.min || value > limit.max) {
      throw new RangeError(
        `Joint ${index + 1} must be in radians within [${limit.min}, ${limit.max}].`,
      );
    }
  });
}
