import { describe, expect, it } from "vitest";
import { stepTeachingJointPlant, type JointPlantParameters, type JointPlantState } from "./plant";

const state: JointPlantState = Object.freeze({ position: 0, velocity: 0, acceleration: 0 });
const parameters: JointPlantParameters = Object.freeze({ inertia: 1, payloadInertia: 0, viscousFriction: 0.4, coulombFriction: 0.1 });

describe("teaching joint plant", () => {
  it("keeps a resting joint still under zero torque", () => {
    expect(stepTeachingJointPlant(state, 0, parameters, 0.01)).toEqual(state);
  });

  it("reduces acceleration when payload inertia increases", () => {
    const light = stepTeachingJointPlant(state, 2, parameters, 0.01);
    const heavy = stepTeachingJointPlant(state, 2, { ...parameters, payloadInertia: 2 }, 0.01);
    expect(heavy.acceleration).toBeGreaterThan(0);
    expect(heavy.acceleration).toBeLessThan(light.acceleration);
  });

  it("reduces velocity when viscous friction increases", () => {
    const moving = Object.freeze({ position: 0, velocity: 2, acceleration: 0 });
    const low = stepTeachingJointPlant(moving, 0, { ...parameters, viscousFriction: 0 }, 0.1);
    const high = stepTeachingJointPlant(moving, 0, { ...parameters, viscousFriction: 2 }, 0.1);
    expect(high.velocity).toBeLessThan(low.velocity);
  });

  it("rejects invalid parameters, state, torque, and time step", () => {
    expect(() => stepTeachingJointPlant(state, 1, { ...parameters, inertia: 0 }, 0.01)).toThrow(RangeError);
    expect(() => stepTeachingJointPlant(state, 1, { ...parameters, payloadInertia: -1 }, 0.01)).toThrow(RangeError);
    expect(() => stepTeachingJointPlant(state, 1, { ...parameters, coulombFriction: -1 }, 0.01)).toThrow(RangeError);
    expect(() => stepTeachingJointPlant(state, Number.NaN, parameters, 0.01)).toThrow(TypeError);
    expect(() => stepTeachingJointPlant({ ...state, velocity: Number.NaN }, 1, parameters, 0.01)).toThrow(TypeError);
    expect(() => stepTeachingJointPlant(state, 1, parameters, 0)).toThrow(RangeError);
  });

  it("remains finite during a bounded repeated simulation", () => {
    let current = state;
    for (let index = 0; index < 10_000; index += 1) current = stepTeachingJointPlant(current, Math.sin(index / 100), parameters, 0.001);
    expect([current.position, current.velocity, current.acceleration].every(Number.isFinite)).toBe(true);
  });
});
