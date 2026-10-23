import { forwardKinematics } from "@/robotics/kinematics";
import type { JointVector, Matrix4, RobotModel } from "@/robotics/types";

const SIZE = 6;
const JACOBI_MAX_SWEEPS = 100;
const JACOBI_RELATIVE_TOLERANCE = 1e-14;
const NEGATIVE_EIGENVALUE_RELATIVE_TOLERANCE = 1e-12;

/**
 * A 6 x 6 matrix stored as six immutable rows. Jacobian rows 0..2 are
 * translational velocity x,y,z (metres/radian), and rows 3..5 are angular
 * velocity x,y,z (radians/radian, numerically dimensionless). Columns are
 * joints 1..6 in base-to-wrist order.
 */
export type Matrix6 = readonly [
  readonly [number, number, number, number, number, number],
  readonly [number, number, number, number, number, number],
  readonly [number, number, number, number, number, number],
  readonly [number, number, number, number, number, number],
  readonly [number, number, number, number, number, number],
  readonly [number, number, number, number, number, number],
];

/**
 * Educational raw-Jacobian thresholds. The raw geometric Jacobian mixes
 * metre-scaled linear rows with dimensionless angular rows, so these values
 * are stable simulator indicators, not a unit-invariant industrial metric.
 */
export const SINGULAR_VALUE_THRESHOLDS = Object.freeze({
  singular: 1e-4,
  warning: 5e-2,
});

export type SingularityRisk = "safe" | "warning" | "singular";

export interface SingularityMetrics {
  readonly minSingularValue: number;
  readonly manipulability: number;
  readonly risk: SingularityRisk;
}

function axisZ(transform: Matrix4): readonly [number, number, number] {
  return [transform[2], transform[6], transform[10]];
}

function origin(transform: Matrix4): readonly [number, number, number] {
  return [transform[3], transform[7], transform[11]];
}

function cross(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): readonly [number, number, number] {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

/** Builds the base-frame geometric Jacobian for six revolute joints. */
export function geometricJacobian(model: RobotModel, joints: JointVector): Matrix6 {
  // FK owns the shared model/joint runtime boundary and returns T_0_i frames.
  const { frames } = forwardKinematics(model, joints);
  const end = origin(frames[SIZE - 1]);
  const rows = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));

  for (let joint = 0; joint < SIZE; joint += 1) {
    // Joint 1 rotates about base z0 at o0; no T_0_0 is present in FK frames.
    const axis = joint === 0 ? ([0, 0, 1] as const) : axisZ(frames[joint - 1]);
    const jointOrigin = joint === 0 ? ([0, 0, 0] as const) : origin(frames[joint - 1]);
    const displacement = [
      end[0] - jointOrigin[0],
      end[1] - jointOrigin[1],
      end[2] - jointOrigin[2],
    ] as const;
    const linear = cross(axis, displacement);

    for (let coordinate = 0; coordinate < 3; coordinate += 1) {
      rows[coordinate][joint] = linear[coordinate];
      rows[coordinate + 3][joint] = axis[coordinate];
    }
  }

  if (rows.some((row) => row.some((value) => !Number.isFinite(value)))) {
    throw new RangeError("Jacobian calculation produced a non-finite value.");
  }
  return Object.freeze(rows.map((row) => Object.freeze(row))) as Matrix6;
}

function validateMatrix6(value: unknown): asserts value is Matrix6 {
  if (!Array.isArray(value) || value.length !== SIZE) {
    throw new TypeError("Jacobian must be a finite 6 x 6 row matrix.");
  }
  for (let row = 0; row < SIZE; row += 1) {
    if (!Array.isArray(value[row]) || value[row].length !== SIZE) {
      throw new TypeError("Jacobian must be a finite 6 x 6 row matrix.");
    }
    for (let column = 0; column < SIZE; column += 1) {
      if (typeof value[row][column] !== "number" || !Number.isFinite(value[row][column])) {
        throw new TypeError("Jacobian must be a finite 6 x 6 row matrix.");
      }
    }
  }
}

function symmetricEigenvalues(matrix: readonly (readonly number[])[]): readonly number[] {
  const work = matrix.map((row) => [...row]);
  const scale = Math.max(1, ...work.flat().map(Math.abs));

  for (let sweep = 0; sweep < JACOBI_MAX_SWEEPS; sweep += 1) {
    let p = 0;
    let q = 1;
    let largest = 0;
    for (let row = 0; row < SIZE; row += 1) {
      for (let column = row + 1; column < SIZE; column += 1) {
        const magnitude = Math.abs(work[row][column]);
        if (magnitude > largest) {
          largest = magnitude;
          p = row;
          q = column;
        }
      }
    }
    if (largest <= JACOBI_RELATIVE_TOLERANCE * scale) {
      return work.map((row, index) => row[index]);
    }

    const angle = 0.5 * Math.atan2(2 * work[p][q], work[q][q] - work[p][p]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const app = work[p][p];
    const aqq = work[q][q];
    const apq = work[p][q];
    work[p][p] = cosine * cosine * app - 2 * sine * cosine * apq + sine * sine * aqq;
    work[q][q] = sine * sine * app + 2 * sine * cosine * apq + cosine * cosine * aqq;
    work[p][q] = 0;
    work[q][p] = 0;
    for (let index = 0; index < SIZE; index += 1) {
      if (index === p || index === q) continue;
      const aip = work[index][p];
      const aiq = work[index][q];
      work[index][p] = cosine * aip - sine * aiq;
      work[p][index] = work[index][p];
      work[index][q] = sine * aip + cosine * aiq;
      work[q][index] = work[index][q];
    }
  }
  throw new RangeError("Singular-value calculation did not converge.");
}

/** Calculates singular values from eigenvalues of J J^T without mutating J. */
export function singularityMetrics(jacobian: Matrix6): SingularityMetrics {
  validateMatrix6(jacobian);
  const product = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));
  for (let row = 0; row < SIZE; row += 1) {
    for (let column = row; column < SIZE; column += 1) {
      let value = 0;
      for (let inner = 0; inner < SIZE; inner += 1) {
        value += jacobian[row][inner] * jacobian[column][inner];
      }
      if (!Number.isFinite(value)) {
        throw new RangeError("Jacobian magnitude is too large for stable metrics.");
      }
      product[row][column] = value;
      product[column][row] = value;
    }
  }

  const eigenvalues = symmetricEigenvalues(product);
  const largestEigenvalue = Math.max(0, ...eigenvalues);
  const noiseFloor = largestEigenvalue * NEGATIVE_EIGENVALUE_RELATIVE_TOLERANCE;
  const singularValues = eigenvalues.map((value) => {
    if (value < -noiseFloor) {
      throw new RangeError("Singular-value calculation produced an invalid negative eigenvalue.");
    }
    return Math.sqrt(Math.max(0, value));
  });
  const minSingularValue = Math.min(...singularValues);
  const manipulability = singularValues.reduce((productValue, value) => productValue * value, 1);
  if (!Number.isFinite(minSingularValue) || !Number.isFinite(manipulability)) {
    throw new RangeError("Singularity metrics must remain finite.");
  }

  const risk: SingularityRisk = minSingularValue <= SINGULAR_VALUE_THRESHOLDS.singular
    ? "singular"
    : minSingularValue <= SINGULAR_VALUE_THRESHOLDS.warning
      ? "warning"
      : "safe";
  return Object.freeze({ minSingularValue, manipulability, risk });
}
