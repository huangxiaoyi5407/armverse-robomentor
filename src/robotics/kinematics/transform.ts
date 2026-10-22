import type { Matrix4, StandardDhRow } from "@/robotics/types";

const MATRIX_SIZE = 16;

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
}

function assertMatrix4(value: unknown, label: string): asserts value is Matrix4 {
  if (!Array.isArray(value) || value.length !== MATRIX_SIZE) {
    throw new TypeError(`${label} must be a 4 x 4 row-major matrix.`);
  }

  for (let index = 0; index < MATRIX_SIZE; index += 1) {
    assertFiniteNumber(value[index], `${label}[${index}]`);
  }
}

export function identityMatrix4(): Matrix4 {
  return Object.freeze([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]) as Matrix4;
}
/** Multiplies row-major matrices that left-multiply column vectors. */
export function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4 {
  assertMatrix4(left, "Left matrix");
  assertMatrix4(right, "Right matrix");

  const result = Array<number>(MATRIX_SIZE).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let value = 0;
      for (let inner = 0; inner < 4; inner += 1) {
        value += left[row * 4 + inner] * right[inner * 4 + column];
      }
      result[row * 4 + column] = value;
    }
  }

  return Object.freeze(result) as unknown as Matrix4;
}

/**
 * Standard-DH transform T_(i-1,i) = Rz(theta) Tz(d) Tx(a) Rx(alpha).
 * `angle` is the joint displacement and `thetaOffset` is added once here.
 */
export function dhTransform(row: StandardDhRow, angle: number): Matrix4 {
  if (typeof row !== "object" || row === null) {
    throw new TypeError("DH row must be an object.");
  }

  assertFiniteNumber(row.a, "DH a");
  assertFiniteNumber(row.d, "DH d");
  assertFiniteNumber(row.alpha, "DH alpha");
  assertFiniteNumber(row.thetaOffset, "DH thetaOffset");
  assertFiniteNumber(angle, "Joint angle");

  const theta = angle + row.thetaOffset;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosAlpha = Math.cos(row.alpha);
  const sinAlpha = Math.sin(row.alpha);

  return Object.freeze([
    cosTheta,
    -sinTheta * cosAlpha,
    sinTheta * sinAlpha,
    row.a * cosTheta,
    sinTheta,
    cosTheta * cosAlpha,
    -cosTheta * sinAlpha,
    row.a * sinTheta,
    0,
    sinAlpha,
    cosAlpha,
    row.d,
    0,
    0,
    0,
    1,
  ]) as Matrix4;
}

