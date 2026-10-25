export interface JointPlantState {
  readonly position: number;
  readonly velocity: number;
  readonly acceleration: number;
}

export interface JointPlantParameters {
  readonly inertia: number;
  readonly payloadInertia: number;
  readonly viscousFriction: number;
  readonly coulombFriction: number;
}

function validate(state: JointPlantState, inputTorque: number, parameters: JointPlantParameters, dt: number): void {
  if (![state.position, state.velocity, state.acceleration, inputTorque, dt, ...Object.values(parameters)].every(Number.isFinite)) {
    throw new TypeError("Joint plant state, torque, parameters and time step must be finite.");
  }
  if (parameters.inertia <= 0) throw new RangeError("Joint inertia must be positive.");
  if (parameters.payloadInertia < 0 || parameters.viscousFriction < 0 || parameters.coulombFriction < 0) {
    throw new RangeError("Payload and friction parameters must not be negative.");
  }
  if (dt <= 0) throw new RangeError("Joint plant time step must be positive.");
}

export function stepTeachingJointPlant(
  state: JointPlantState,
  inputTorque: number,
  parameters: JointPlantParameters,
  dt: number,
): JointPlantState {
  validate(state, inputTorque, parameters, dt);
  const direction = Math.abs(state.velocity) > 1e-9 ? Math.sign(state.velocity) : Math.sign(inputTorque);
  const frictionTorque = parameters.viscousFriction * state.velocity + parameters.coulombFriction * direction;
  const acceleration = (inputTorque - frictionTorque) / (parameters.inertia + parameters.payloadInertia);
  let velocity = state.velocity + acceleration * dt;
  if (state.velocity !== 0 && Math.sign(state.velocity) !== Math.sign(velocity) && Math.abs(inputTorque) <= parameters.coulombFriction) velocity = 0;
  const position = state.position + velocity * dt;
  return Object.freeze({ position, velocity, acceleration });
}
