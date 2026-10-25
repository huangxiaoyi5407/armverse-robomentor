export interface PIDConfig {
  readonly kp: number;
  readonly ki: number;
  readonly kd: number;
  readonly dt: number;
  readonly duration: number;
  readonly outputMin: number;
  readonly outputMax: number;
  readonly integralMin: number;
  readonly integralMax: number;
}

export interface PIDPlant<State> {
  readonly initialState: State;
  readonly measure: (state: State) => number;
  readonly step: (state: State, input: number, dt: number) => State;
}

export interface PIDSample {
  readonly time: number;
  readonly setpoint: number;
  readonly output: number;
  readonly error: number;
  readonly control: number;
}

export interface PIDSimulationResult<State> {
  readonly samples: readonly PIDSample[];
  readonly finalIntegral: number;
  readonly finalState: State;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function validateConfig(config: PIDConfig, setpoint: number): void {
  const values = Object.values(config);
  if (!values.every(Number.isFinite) || !Number.isFinite(setpoint)) throw new TypeError("PID parameters and setpoint must be finite.");
  if (config.kp < 0 || config.ki < 0 || config.kd < 0) throw new RangeError("PID gains must not be negative.");
  if (config.dt <= 0 || config.duration <= 0) throw new RangeError("Simulation time settings must be positive.");
  if (config.outputMin >= config.outputMax || config.integralMin >= config.integralMax) throw new RangeError("PID limits must be ordered.");
  const steps = config.duration / config.dt;
  if (!Number.isInteger(steps) || steps > 100_000) throw new RangeError("Duration must contain a bounded whole number of time steps.");
}

export function simulatePID<State>(config: PIDConfig, plant: PIDPlant<State>, setpoint: number): PIDSimulationResult<State> {
  validateConfig(config, setpoint);
  let state = plant.initialState;
  let output = plant.measure(state);
  if (!Number.isFinite(output)) throw new TypeError("Plant output must be finite.");
  let integral = 0;
  let previousError = setpoint - output;
  const samples: PIDSample[] = [Object.freeze({ time: 0, setpoint, output, error: previousError, control: 0 })];
  const steps = Math.round(config.duration / config.dt);

  for (let index = 1; index <= steps; index += 1) {
    const error = setpoint - output;
    integral = clamp(integral + error * config.dt, config.integralMin, config.integralMax);
    const derivative = (error - previousError) / config.dt;
    const control = clamp(config.kp * error + config.ki * integral + config.kd * derivative, config.outputMin, config.outputMax);
    state = plant.step(state, control, config.dt);
    output = plant.measure(state);
    if (!Number.isFinite(output)) throw new TypeError("Plant output must be finite.");
    previousError = error;
    samples.push(Object.freeze({
      time: index * config.dt,
      setpoint,
      output,
      error: setpoint - output,
      control,
    }));
  }

  return Object.freeze({ samples: Object.freeze(samples), finalIntegral: integral, finalState: state });
}
