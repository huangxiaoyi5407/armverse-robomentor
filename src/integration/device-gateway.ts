import type { SafetyReport } from "@/robotics/safety";
import type { Trajectory } from "@/robotics/trajectory";

export type DeviceGatewayStatus = "disconnected" | "connecting" | "connected" | "emergency-stop" | "fault";
export interface DeviceGatewayState {
  readonly status: DeviceGatewayStatus;
  readonly heartbeatSequence: number;
  readonly queuedSamples: number;
}
export type DeviceGatewayEvent =
  | { readonly type: "connect" | "connected" | "heartbeat" | "emergency-stop" | "fault" | "reset" }
  | { readonly type: "queue-trajectory"; readonly trajectory: Trajectory; readonly safetyReport: SafetyReport };

function state(status: DeviceGatewayStatus, heartbeatSequence = 0, queuedSamples = 0): DeviceGatewayState {
  return Object.freeze({ status, heartbeatSequence, queuedSamples });
}

export function createDeviceGatewayState(): DeviceGatewayState { return state("disconnected"); }

export function reduceDeviceGateway(current: DeviceGatewayState, event: DeviceGatewayEvent): DeviceGatewayState {
  if (event.type === "reset") return state("disconnected");
  if (event.type === "emergency-stop") return state("emergency-stop", current.heartbeatSequence, current.queuedSamples);
  if (event.type === "fault") return state("fault", current.heartbeatSequence, current.queuedSamples);
  if (event.type === "connect") {
    if (current.status !== "disconnected") throw new RangeError("Gateway can connect only from disconnected state.");
    return state("connecting");
  }
  if (event.type === "connected") {
    if (current.status !== "connecting") throw new RangeError("Gateway handshake requires connecting state.");
    return state("connected");
  }
  if (current.status !== "connected") throw new RangeError("Gateway commands require a connected state.");
  if (event.type === "heartbeat") return state("connected", current.heartbeatSequence + 1, current.queuedSamples);
  if (event.type !== "queue-trajectory") throw new RangeError("Unsupported gateway transition.");
  if (event.safetyReport.approvedTrajectory !== event.trajectory || event.safetyReport.verdict === "blocked") {
    throw new RangeError("Only the trajectory approved by the deterministic safety gate may be queued.");
  }
  return state("connected", current.heartbeatSequence, event.trajectory.samples.length);
}
