import type { Vector3 } from "@/robotics/types";

export interface AxisAlignedBox {
  readonly id: string;
  readonly min: Vector3;
  readonly max: Vector3;
}

export function segmentIntersectsExpandedBox(
  start: Vector3,
  end: Vector3,
  box: AxisAlignedBox,
  radius: number,
): boolean {
  let enter = 0;
  let exit = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const min = box.min[axis] - radius;
    const max = box.max[axis] + radius;
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < 1e-15) {
      if (start[axis] < min || start[axis] > max) return false;
      continue;
    }
    const inverse = 1 / delta;
    let near = (min - start[axis]) * inverse;
    let far = (max - start[axis]) * inverse;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    exit = Math.min(exit, far);
    if (enter > exit) return false;
  }
  return true;
}
