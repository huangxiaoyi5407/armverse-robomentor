import { describe, expect, it } from "vitest";
import { planJointTrajectory } from "@/robotics/trajectory";
import { validateTrajectory } from "@/robotics/safety";
import { INITIAL_JOINTS } from "@/features/simulator/store";
import { UR5_MODEL } from "@/robotics/ur5-model";
import { createDeviceGatewayState, reduceDeviceGateway } from "./device-gateway";

const trajectory = planJointTrajectory(INITIAL_JOINTS, INITIAL_JOINTS, { duration: 1, sampleCount: 2, mode: "cubic" });
const report = validateTrajectory(UR5_MODEL, trajectory, { obstacles: [] });

describe("simulated device gateway", () => {
  it("connects, emits deterministic heartbeats, and queues only the approved trajectory", () => {
    let state = createDeviceGatewayState();
    state = reduceDeviceGateway(state, { type: "connect" });
    expect(state.status).toBe("connecting");
    state = reduceDeviceGateway(state, { type: "connected" });
    state = reduceDeviceGateway(state, { type: "heartbeat" });
    state = reduceDeviceGateway(state, { type: "telemetry", joints: [0.2, -0.8, 1, -0.4, 0.6, -0.2] });
    state = reduceDeviceGateway(state, { type: "queue-trajectory", trajectory, safetyReport: report });
    expect(state).toMatchObject({ status: "connected", heartbeatSequence: 1, queuedSamples: 2 });
    expect(state.telemetryJoints).toEqual([0.2, -0.8, 1, -0.4, 0.6, -0.2]);
  });

  it("blocks commands during emergency stop and rejects trajectories without matching approval", () => {
    const connected = reduceDeviceGateway(reduceDeviceGateway(createDeviceGatewayState(), { type: "connect" }), { type: "connected" });
    const stopped = reduceDeviceGateway(connected, { type: "emergency-stop" });
    expect(stopped.status).toBe("emergency-stop");
    expect(() => reduceDeviceGateway(stopped, { type: "heartbeat" })).toThrow(RangeError);
    expect(() => reduceDeviceGateway(stopped, { type: "telemetry", joints: [0, 0, 0, 0, 0, 0] })).toThrow(RangeError);
    expect(() => reduceDeviceGateway(stopped, { type: "queue-trajectory", trajectory, safetyReport: report })).toThrow(RangeError);
    expect(() => reduceDeviceGateway(connected, { type: "queue-trajectory", trajectory, safetyReport: { ...report, approvedTrajectory: null } })).toThrow(RangeError);
    expect(reduceDeviceGateway(stopped, { type: "reset" }).status).toBe("disconnected");
  });

  it("rejects malformed simulated telemetry", () => {
    const connected = reduceDeviceGateway(reduceDeviceGateway(createDeviceGatewayState(), { type: "connect" }), { type: "connected" });
    expect(() => reduceDeviceGateway(connected, { type: "telemetry", joints: [0, 0] })).toThrow(TypeError);
    expect(() => reduceDeviceGateway(connected, { type: "telemetry", joints: [0, 0, 0, 0, 0, Number.NaN] })).toThrow(TypeError);
  });

  it("enters fault deterministically and requires reset before reconnecting", () => {
    const faulted = reduceDeviceGateway(createDeviceGatewayState(), { type: "fault" });
    expect(faulted.status).toBe("fault");
    expect(() => reduceDeviceGateway(faulted, { type: "connect" })).toThrow(RangeError);
    expect(reduceDeviceGateway(faulted, { type: "reset" }).status).toBe("disconnected");
  });
});
