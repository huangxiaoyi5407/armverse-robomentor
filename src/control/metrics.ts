import type { PIDSample } from "./pid";

export interface ControlMetrics {
  readonly overshoot: number;
  readonly steadyStateError: number;
  readonly riseTime: number | null;
  readonly settlingTime: number | null;
}

export function calculateControlMetrics(samples: readonly PIDSample[]): ControlMetrics {
  if (samples.length < 2) throw new RangeError("At least two PID samples are required.");
  if (!samples.every((sample) => [sample.time, sample.setpoint, sample.output, sample.error, sample.control].every(Number.isFinite))) {
    throw new TypeError("PID samples must contain finite values.");
  }
  const first = samples[0];
  const last = samples.at(-1)!;
  const change = first.setpoint - first.output;
  const direction = Math.sign(change) || 1;
  const peakProgress = Math.max(...samples.map((sample) => direction * (sample.output - first.output)));
  const overshootDistance = Math.max(0, peakProgress - Math.abs(change));
  const overshoot = Math.abs(change) > 1e-12 ? overshootDistance / Math.abs(change) * 100 : 0;
  const riseThreshold = first.output + change * 0.9;
  const riseSample = samples.find((sample) => direction * (sample.output - riseThreshold) >= 0);
  const tolerance = Math.max(Math.abs(first.setpoint) * 0.02, 0.002);
  let settlingTime: number | null = null;
  for (let index = 0; index < samples.length; index += 1) {
    if (samples.slice(index).every((sample) => Math.abs(sample.error) <= tolerance)) {
      settlingTime = samples[index].time;
      break;
    }
  }
  return Object.freeze({
    overshoot,
    steadyStateError: Math.abs(last.error),
    riseTime: riseSample?.time ?? null,
    settlingTime,
  });
}
