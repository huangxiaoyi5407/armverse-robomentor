/** A Cartesian vector in metres unless a caller explicitly documents otherwise. */
export type Vector3 = readonly [x: number, y: number, z: number];

/** A row-major 4 x 4 homogeneous transform. */
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

/** A tool pose relative to the robot base frame. Position is in metres. */
export interface Pose {
  readonly position: Vector3;
  readonly orientation: Quaternion;
}

/** Six revolute-joint angles ordered base through wrist 3, in radians. */
export type JointVector = readonly [number, number, number, number, number, number];

export interface StandardDhRow {
  /** Link length along x_(i-1), in metres. */
  readonly a: number;
  /** Link offset along z_(i-1), in metres. */
  readonly d: number;
  /** Link twist about x_(i-1), in radians. */
  readonly alpha: number;
  /** Constant added to the revolute joint angle, in radians. */
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

  if (
    !Array.isArray(values) ||
    values.length !== length ||
    !values.every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    throw new TypeError(`Expected a finite numeric vector of length ${length}.`);
  }
}
