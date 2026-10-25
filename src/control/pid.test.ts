import { describe, expect, it } from "vitest";
import { calculateControlMetrics } from "./metrics";
import { simulatePID, type PIDConfig, type PIDPlant } from "./pid";

interface JointState { readonly position: number; readonly velocity: number }

const plant: PIDPlant<JointState> = Object.freeze({
  initialState: Object.freeze({ position: 0, velocity: 0 }),
  measure: (state: JointState) => state.position,
  step: (state: JointState, input: number, dt: number) => {
    const velocity = state.velocity + (input - 1.2 * state.velocity) * dt;
    return Object.freeze({ position: state.position + velocity * dt, velocity });
  },
});

const base: PIDConfig = Object.freeze({
  kp: 12, ki: 2, kd: 5, dt: 0.01, duration: 10,
  outputMin: -20, outputMax: 20, integralMin: -3, integralMax: 3,
});

describe("deterministic PID simulation", () => {
  it("tracks a stable preset with low final error and limited overshoot", () => {
    const result = simulatePID(base, plant, 1);
    const metrics = calculateControlMetrics(result.samples);

    expect(result.samples.at(-1)?.time).toBeCloseTo(10, 8);
    expect(metrics.steadyStateError).toBeLessThan(0.05);
    expect(metrics.overshoot).toBeLessThan(10);
    expect(metrics.riseTime).not.toBeNull();
    expect(metrics.settlingTime).not.toBeNull();
  });

  it("distinguishes under-tuned and over-tuned responses", () => {
    const under = calculateControlMetrics(simulatePID({ ...base, kp: 0.1, ki: 0, kd: 0.3 }, plant, 1).samples);
    const over = calculateControlMetrics(simulatePID({ ...base, kp: 35, ki: 8, kd: 0.2 }, plant, 1).samples);

    expect(under.steadyStateError).toBeGreaterThan(0.2);
    expect(over.overshoot).toBeGreaterThan(20);
  });

  it("enforces output and integral windup limits", () => {
    const result = simulatePID({ ...base, kp: 20, ki: 20, outputMin: -0.5, outputMax: 0.5, integralMin: -0.2, integralMax: 0.2 }, plant, 4);
    expect(result.samples.every((sample) => sample.control >= -0.5 && sample.control <= 0.5)).toBe(true);
    expect(result.finalIntegral).toBeGreaterThanOrEqual(-0.2);
    expect(result.finalIntegral).toBeLessThanOrEqual(0.2);
  });

  it("rejects invalid gains, time settings, limits, setpoints, and plant output", () => {
    expect(() => simulatePID({ ...base, kp: -1 }, plant, 1)).toThrow(RangeError);
    expect(() => simulatePID({ ...base, dt: 0 }, plant, 1)).toThrow(RangeError);
    expect(() => simulatePID({ ...base, outputMin: 2, outputMax: 1 }, plant, 1)).toThrow(RangeError);
    expect(() => simulatePID(base, plant, Number.NaN)).toThrow(TypeError);
    expect(() => simulatePID(base, { ...plant, measure: () => Number.NaN }, 1)).toThrow(TypeError);
  });
});
