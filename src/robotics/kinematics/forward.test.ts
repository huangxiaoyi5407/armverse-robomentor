import { describe, expect, it } from "vitest";
import type { Matrix4, RobotModel } from "@/robotics/types";
import { UR5_MODEL } from "@/robotics/ur5-model";
import {
  dhTransform,
  forwardKinematics,
  identityMatrix4,
  multiplyMatrix4,
} from "@/robotics/kinematics";

function expectMatrixClose(actual: Matrix4, expected: Matrix4): void {
  for (let index = 0; index < 16; index += 1) {
    expect(actual[index]).toBeCloseTo(expected[index], 10);
  }
}

function quaternionRotation([x, y, z, w]: readonly number[]): readonly number[] {
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - z * w),
    2 * (x * z + y * w),
    2 * (x * y + z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z - x * w),
    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (x * x + y * y),
  ] as const;
}

function expectPoseMatchesMatrix(matrix: Matrix4, pose: ReturnType<typeof forwardKinematics>["endEffector"]): void {
  expect(pose.position).toEqual([matrix[3], matrix[7], matrix[11]]);
  const rotation = quaternionRotation(pose.orientation);
  const expectedRotation = [
    matrix[0], matrix[1], matrix[2],
    matrix[4], matrix[5], matrix[6],
    matrix[8], matrix[9], matrix[10],
  ];
  rotation.forEach((value, index) => {
    expect(value).toBeCloseTo(expectedRotation[index], 10);
  });
  expect(Math.hypot(...pose.orientation)).toBeCloseTo(1, 12);
}

function modelWith(overrides: Partial<RobotModel>): RobotModel {
  return {
    ...UR5_MODEL,
    dhParameters: UR5_MODEL.dhParameters.map((row) => ({ ...row })),
    jointLimits: UR5_MODEL.jointLimits.map((limit) => ({ ...limit })),
    ...overrides,
  };
}

describe("homogeneous transforms", () => {
  it("keeps either operand unchanged when composing with identity", () => {
    const transform: Matrix4 = [
      0, 0, 1, 0,
      1, 0, 0, 2,
      0, 1, 0, 3,
      0, 0, 0, 1,
    ];

    expect(multiplyMatrix4(identityMatrix4(), transform)).toEqual(transform);
    expect(multiplyMatrix4(transform, identityMatrix4())).toEqual(transform);
  });

  it("builds a one-link standard-DH transform without transposing axes", () => {
    const transform = dhTransform(
      { a: 2, d: 3, alpha: Math.PI / 2, thetaOffset: 0 },
      Math.PI / 2,
    );

    expectMatrixClose(transform, [
      0, 0, 1, 0,
      1, 0, 0, 2,
      0, 1, 0, 3,
      0, 0, 0, 1,
    ]);
  });

  it("rejects a finite angle and offset whose derived theta overflows", () => {
    expect(() =>
      dhTransform(
        { a: 0, d: 0, alpha: 0, thetaOffset: Number.MAX_VALUE },
        Number.MAX_VALUE,
      ),
    ).toThrow(RangeError);
  });

  it("rejects finite matrices whose multiplication overflows", () => {
    const huge: Matrix4 = [
      Number.MAX_VALUE, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
    const scaleByTwo: Matrix4 = [
      2, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];

    expect(() => multiplyMatrix4(huge, scaleByTwo)).toThrow(RangeError);
  });
});

describe("forwardKinematics", () => {
  it("matches the classic UR5 zero-configuration flange fixture", () => {
    const result = forwardKinematics(UR5_MODEL, [0, 0, 0, 0, 0, 0]);

    expectMatrixClose(result.frames[5], [
      1, 0, 0, -0.81725,
      0, 0, -1, -0.19145,
      0, 1, 0, -0.005491,
      0, 0, 0, 1,
    ]);
  });

  it("matches an independently composed non-zero reference fixture", () => {
    // Fixture generated outside production code from explicit Rz*Tz*Tx*Rx
    // elementary matrices and a separate 2-D matrix multiplier.
    const result = forwardKinematics(UR5_MODEL, [
      Math.PI / 6,
      -Math.PI / 4,
      Math.PI / 3,
      -Math.PI / 6,
      Math.PI / 4,
      -Math.PI / 3,
    ]);

    expectMatrixClose(result.frames[5], [
      0.27841558694280133, 0.9305176782880683, -0.23795296035283586, -0.5746055510590828,
      -0.24750497639584917, -0.16987214914122556, -0.9538787866419042, -0.5249819019562618,
      -0.9280226546839174, 0.324469264090644, 0.18301270189221927, 0.21179467747028818,
      0, 0, 0, 1,
    ]);
  });

  it("returns exactly six cumulative frames ending at the flange pose", () => {
    const result = forwardKinematics(UR5_MODEL, [0.1, -0.2, 0.3, -0.4, 0.5, -0.6]);

    expect(result.frames).toHaveLength(6);
    expectPoseMatchesMatrix(result.frames[5], result.endEffector);
    expect(Object.isFrozen(result.frames)).toBe(true);
    expect(result.frames.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(result.endEffector)).toBe(true);
    expect(Object.isFrozen(result.endEffector.position)).toBe(true);
    expect(Object.isFrozen(result.endEffector.orientation)).toBe(true);
  });

  it("chooses one stable unit-quaternion representative at and near 180 degrees", () => {
    const positivePi = forwardKinematics(UR5_MODEL, [0, 0, 0, 0, 0, Math.PI])
      .endEffector.orientation;
    const negativePi = forwardKinematics(UR5_MODEL, [0, 0, 0, 0, 0, -Math.PI])
      .endEffector.orientation;
    const justBelowPositivePi = forwardKinematics(UR5_MODEL, [
      0, 0, 0, 0, 0, Math.PI - 1e-13,
    ]).endEffector.orientation;
    const justAboveNegativePi = forwardKinematics(UR5_MODEL, [
      0, 0, 0, 0, 0, -Math.PI + 1e-13,
    ]).endEffector.orientation;

    for (const quaternion of [
      positivePi,
      negativePi,
      justBelowPositivePi,
      justAboveNegativePi,
    ]) {
      expect(Math.hypot(...quaternion)).toBeCloseTo(1, 12);
    }
    positivePi.forEach((value, index) => {
      expect(value).toBeCloseTo(negativePi[index], 12);
    });
    const positiveSideDot = positivePi.reduce(
      (sum, value, index) => sum + value * justBelowPositivePi[index],
      0,
    );
    const negativeSideDot = negativePi.reduce(
      (sum, value, index) => sum + value * justAboveNegativePi[index],
      0,
    );
    expect(positiveSideDot).toBeGreaterThan(0.999999999999);
    expect(negativeSideDot).toBeGreaterThan(0.999999999999);
  });

  it("rejects finite model and joint values when FK angle derivation overflows", () => {
    const rows = UR5_MODEL.dhParameters.map((row, index) =>
      index === 0 ? { ...row, thetaOffset: Number.MAX_VALUE } : { ...row },
    );
    const limits = UR5_MODEL.jointLimits.map(() => ({
      min: -Number.MAX_VALUE,
      max: Number.MAX_VALUE,
    }));
    const model = modelWith({ dhParameters: rows, jointLimits: limits });

    expect(() =>
      forwardKinematics(model, [Number.MAX_VALUE, 0, 0, 0, 0, 0]),
    ).toThrow(RangeError);
  });

  it.each([
    { label: "wrong length", joints: [0, 0, 0, 0, 0] },
    { label: "non-number", joints: [0, 0, 0, "0", 0, 0] },
    { label: "NaN", joints: [0, 0, Number.NaN, 0, 0, 0] },
    { label: "infinity", joints: [0, 0, 0, Number.POSITIVE_INFINITY, 0, 0] },
    { label: "out of range", joints: [0, 0, 0, 0, 0, 2 * Math.PI + 1e-9] },
    { label: "sparse", joints: new Array(6) },
  ])("rejects $label joints before arithmetic", ({ joints }) => {
    expect(() => forwardKinematics(UR5_MODEL, joints as never)).toThrow();
  });

  it.each([
    { field: "a", value: Number.NaN },
    { field: "d", value: Number.POSITIVE_INFINITY },
    { field: "alpha", value: "0" },
    { field: "thetaOffset", value: undefined },
  ])("rejects a malformed model $field value", ({ field, value }) => {
    const rows = UR5_MODEL.dhParameters.map((row) => ({ ...row }));
    Object.assign(rows[2], { [field]: value });
    const malformed = { ...UR5_MODEL, dhParameters: rows } as RobotModel;

    expect(() => forwardKinematics(malformed, [0, 0, 0, 0, 0, 0])).toThrow(TypeError);
  });

  it("rejects malformed model shape and limits", () => {
    const missingRow = {
      ...UR5_MODEL,
      dhParameters: UR5_MODEL.dhParameters.slice(0, 5),
    } as RobotModel;
    const badLimit = {
      ...UR5_MODEL,
      jointLimits: UR5_MODEL.jointLimits.map((limit, index) =>
        index === 0 ? { min: 1, max: -1 } : limit,
      ),
    } as RobotModel;

    expect(() => forwardKinematics(missingRow, [0, 0, 0, 0, 0, 0])).toThrow(TypeError);
    expect(() => forwardKinematics(badLimit, [0, 0, 0, 0, 0, 0])).toThrow(TypeError);
  });

  it("does not mutate the caller's joints or model", () => {
    const joints = [0.1, -0.2, 0.3, -0.4, 0.5, -0.6] as const;
    const jointsBefore = [...joints];
    const modelBefore = JSON.stringify(UR5_MODEL);

    forwardKinematics(UR5_MODEL, joints);

    expect(joints).toEqual(jointsBefore);
    expect(JSON.stringify(UR5_MODEL)).toBe(modelBefore);
  });
});
