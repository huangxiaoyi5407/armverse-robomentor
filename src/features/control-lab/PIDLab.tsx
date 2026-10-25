"use client";

import { useMemo, useState } from "react";
import { calculateControlMetrics } from "@/control/metrics";
import { simulatePID, type PIDConfig, type PIDPlant } from "@/control/pid";
import { stepTeachingJointPlant, type JointPlantParameters, type JointPlantState } from "@/control/plant";

type PresetName = "stable" | "under" | "over";

const COMMON = Object.freeze({ dt: 0.01, duration: 10, outputMin: -20, outputMax: 20, integralMin: -3, integralMax: 3 });
const PRESETS: Readonly<Record<PresetName, PIDConfig>> = Object.freeze({
  stable: Object.freeze({ ...COMMON, kp: 12, ki: 2, kd: 5 }),
  under: Object.freeze({ ...COMMON, kp: 0.2, ki: 0, kd: 0.3 }),
  over: Object.freeze({ ...COMMON, kp: 35, ki: 8, kd: 0.2 }),
});
const LABELS: Readonly<Record<PresetName, string>> = { stable: "稳定响应", under: "欠调响应", over: "过调响应" };
const DEFAULT_PLANT_PARAMETERS: JointPlantParameters = Object.freeze({ inertia: 1, payloadInertia: 0, viscousFriction: 0.4, coulombFriction: 0.1 });

function createTeachingPlant(parameters: JointPlantParameters): PIDPlant<JointPlantState> {
  return Object.freeze({
    initialState: Object.freeze({ position: 0, velocity: 0, acceleration: 0 }),
    measure: (state: JointPlantState) => state.position,
    step: (state: JointPlantState, input: number, dt: number) => stepTeachingJointPlant(state, input, parameters, dt),
  });
}

function curvePath(values: readonly { readonly time: number; readonly output: number }[], duration: number): string {
  const points = values.filter((_, index) => index % 5 === 0 || index === values.length - 1);
  return points.map((sample, index) => {
    const x = 42 + sample.time / duration * 650;
    const y = 220 - Math.max(-0.2, Math.min(2.1, sample.output)) / 2.3 * 180;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

export function PIDLab() {
  const [config, setConfig] = useState(PRESETS.stable);
  const [preset, setPreset] = useState<PresetName>("stable");
  const [setpoint, setSetpoint] = useState(1);
  const [plantParameters, setPlantParameters] = useState(DEFAULT_PLANT_PARAMETERS);
  const teachingPlant = useMemo(() => createTeachingPlant(plantParameters), [plantParameters]);
  const result = useMemo(() => simulatePID(config, teachingPlant, setpoint), [config, setpoint, teachingPlant]);
  const metrics = useMemo(() => calculateControlMetrics(result.samples), [result.samples]);
  const updateGain = (key: "kp" | "ki" | "kd", value: number) => {
    setPreset("stable");
    setConfig((current) => Object.freeze({ ...current, [key]: Math.max(0, Number.isFinite(value) ? value : 0) }));
  };
  const updatePlantParameter = (key: keyof JointPlantParameters, value: number) => {
    const minimum = key === "inertia" ? 0.1 : 0;
    setPlantParameters((current) => Object.freeze({ ...current, [key]: Math.max(minimum, Number.isFinite(value) ? value : minimum) }));
  };
  const selectPreset = (name: PresetName) => { setPreset(name); setConfig(PRESETS[name]); };
  const path = curvePath(result.samples, config.duration);
  const targetY = 220 - Math.max(-0.2, Math.min(2.1, setpoint)) / 2.3 * 180;

  return <section className="pid-lab" aria-label="PID 单关节控制实验">
    <header className="pid-lab__header"><div><p className="panel-kicker">单关节闭环控制</p><h2>PID 响应实验</h2><p>调整比例、积分与微分增益，观察关节角度跟踪和动态性能指标。</p></div><p role="status" aria-label="响应类型">{LABELS[preset]}</p></header>
    <div className="pid-presets" aria-label="PID 预设">
      <button type="button" aria-pressed={preset === "under"} onClick={() => selectPreset("under")}>欠调预设</button>
      <button type="button" aria-pressed={preset === "stable"} onClick={() => selectPreset("stable")}>稳定预设</button>
      <button type="button" aria-pressed={preset === "over"} onClick={() => selectPreset("over")}>过调预设</button>
    </div>
    <div className="pid-layout">
      <fieldset className="pid-controls"><legend>控制参数</legend>
        <label>Kp<input aria-label="Kp" type="number" min="0" step="0.1" value={config.kp} onChange={(event) => updateGain("kp", Number(event.target.value))} /></label>
        <label>Ki<input aria-label="Ki" type="number" min="0" step="0.1" value={config.ki} onChange={(event) => updateGain("ki", Number(event.target.value))} /></label>
        <label>Kd<input aria-label="Kd" type="number" min="0" step="0.1" value={config.kd} onChange={(event) => updateGain("kd", Number(event.target.value))} /></label>
        <label>期望角度 / rad<input aria-label="期望角度" type="number" min="0.2" max="2" step="0.1" value={setpoint} onChange={(event) => setSetpoint(Math.max(0.2, Math.min(2, Number(event.target.value) || 0.2)))} /></label>
        <label>关节惯量<input aria-label="关节惯量" type="number" min="0.1" step="0.1" value={plantParameters.inertia} onChange={(event) => updatePlantParameter("inertia", Number(event.target.value))} /></label>
        <label>负载等效惯量<input aria-label="负载等效惯量" type="number" min="0" step="0.1" value={plantParameters.payloadInertia} onChange={(event) => updatePlantParameter("payloadInertia", Number(event.target.value))} /></label>
        <label>粘性摩擦<input aria-label="粘性摩擦" type="number" min="0" step="0.1" value={plantParameters.viscousFriction} onChange={(event) => updatePlantParameter("viscousFriction", Number(event.target.value))} /></label>
        <label>库仑摩擦<input aria-label="库仑摩擦" type="number" min="0" step="0.1" value={plantParameters.coulombFriction} onChange={(event) => updatePlantParameter("coulombFriction", Number(event.target.value))} /></label>
      </fieldset>
      <div className="pid-chart-panel">
        <div className="pid-legend"><span className="target">期望角度</span><span className="actual">实际角度</span></div>
        <svg role="img" aria-label="PID 响应曲线" viewBox="0 0 720 260" preserveAspectRatio="none">
          <line x1="42" y1="220" x2="692" y2="220" className="axis"/><line x1="42" y1="40" x2="42" y2="220" className="axis"/>
          <line x1="42" y1={targetY} x2="692" y2={targetY} className="target-line"/>
          <path d={path} className="response-line"/>
          <text x="42" y="242">0 s</text><text x="658" y="242">10 s</text><text x="8" y="46">角度</text>
        </svg>
      </div>
    </div>
    <section className="pid-metrics" aria-label="PID 响应指标">
      <article><span>超调量</span><strong>{metrics.overshoot.toFixed(1)}%</strong></article>
      <article><span>稳态误差</span><strong>{metrics.steadyStateError.toFixed(3)} rad</strong></article>
      <article><span>上升时间</span><strong>{metrics.riseTime === null ? "未达到" : `${metrics.riseTime.toFixed(2)} s`}</strong></article>
      <article><span>调节时间</span><strong>{metrics.settlingTime === null ? "未进入" : `${metrics.settlingTime.toFixed(2)} s`}</strong></article>
    </section>
    <section className="pid-model-state" aria-label="教学模型状态">
      <article><span>估算扭矩</span><strong>{(result.samples.at(-1)?.control ?? 0).toFixed(3)} N·m</strong></article>
      <article><span>关节速度</span><strong>{result.finalState.velocity.toFixed(3)} rad/s</strong></article>
      <article><span>关节加速度</span><strong>{result.finalState.acceleration.toFixed(3)} rad/s²</strong></article>
    </section>
    <p className="model-boundary">确定性教学仿真，无随机噪声，不直接控制真实机械臂</p>
    <p className="model-boundary">教学简化模型，不用于真实机械臂选型或安全控制</p>
  </section>;
}
