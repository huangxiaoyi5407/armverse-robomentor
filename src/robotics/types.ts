/** A Cartesian vector in metres unless a caller explicitly documents otherwise. */
export type Vector3 = readonly [x: number, y: number, z: number];

/**
 * A 4 x 4 homogeneous transform stored in row-major order.
 * Robotics transforms left-multiply column vectors; storage order does not
 * change that multiplication convention.
 */
export type Matrix4 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Unit quaternion ordered as x, y, z, w. */
export type Quaternion = readonly [x: number, y: number, z: number, w: number];

/**
 * A rigid pose with position in metres.
 *
 * Callers must name the reference and target frames. In particular, UR5
 * base-to-frame-6 kinematics produces a flange pose; it is a tool pose only
 * after composing a separate flange-to-tool transform.
 */
export interface Pose {
  readonly position: Vector3;
  readonly orientation: Quaternion;
}

/** Six revolute-joint angles ordered base through wrist 3, in radians. */
export type JointVector = readonly [number, number, number, number, number, number];

export interface StandardDhRow {
  /** Link length translated along x_i, in metres. */
  readonly a: number;
  /** Link offset along z_(i-1), in metres. */
  readonly d: number;
  /** Link twist rotated about x_i, in radians. */
  readonly alpha: number;
  /** Constant added to rotation about z_(i-1), in radians. */
  readonly thetaOffset: number;
}

export interface JointLimit {
  readonly min: number;
  readonly max: number;
}

export interface RobotModel {
  readonly name: string;
  readonly manufacturer: string;
  readonly dhConvention: "standard";
  readonly frameConvention: string;
  readonly units: Readonly<{
    readonly length: "metre";
    readonly angle: "radian";
  }>;
  readonly dhParameters: readonly StandardDhRow[];
  readonly jointLimits: readonly JointLimit[];
}

/**
 * Runtime boundary guard for numeric vectors.
 *
 * This deliberately accepts `unknown` so JSON, form, and AI-provider values are
 * validated before entering deterministic robotics calculations.
 */
export function assertFiniteVector(
  values: unknown,
  length: number,
): asserts values is readonly number[] {
  if (!Number.isInteger(length) || length < 0) {
    throw new TypeError("Vector length must be a non-negative integer.");
  }

  if (!Array.isArray(values) || values.length !== length) {
    throw new TypeError(`Expected a finite numeric vector of length ${length}.`);
  }

  for (let index = 0; index < length; index += 1) {
    const value = values[index];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`Expected a finite numeric vector of length ${length}.`);
    }
  }
}
