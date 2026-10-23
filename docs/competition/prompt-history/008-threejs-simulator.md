# Prompt record 008 — Three.js simulator

> Git evidence: `d22e14f`.

Date: 2026-10-23

## Goal

Create the client-side simulation boundary: six accessible joint controls, a procedural UR5 scene, coordinate-frame toggle, target marker, trajectory playback, and operation-id protection against cancelled or stale commits.

## RED

Store and component tests were created before implementation. The first run failed to resolve `./store` and `./RobotScene`, proving the new behavior was absent.

## Visual direction

The simulator adopts an automation-lab visual language: dark blue-black workcell, desaturated engineering grid, pale metal joints, turquoise kinematic chain, and amber flange/target. The memorable element is the manipulable robot workcell; surrounding controls remain compact and technical rather than using generic SaaS cards.

## Implementation choices

- Zustand owns committed joints, preview state, operation id, and lifecycle status.
- Blocked safety reports never become an active preview.
- Cancel clears the active operation; stale completion ids are ignored.
- Procedural geometry derives joint locations directly from deterministic FK.
- The component test replaces the WebGL canvas but exercises the real accessible controls and status interface.
- Playback uses `requestAnimationFrame`; cancellation checks the current operation id on every frame.

Rejected suggestion: commit the final preview pose whenever an animation callback fires. This would allow cancelled or superseded operations to overwrite newer state.

## GREEN

```text
npm run test:run -- src/features/simulator/store.test.ts src/features/simulator/RobotScene.test.tsx
Test Files 2 passed; Tests 5 passed
```

Dependencies added from the approved stack: `three`, `@react-three/fiber`, `@react-three/drei`, `zustand`, and `@types/three`.

Commit subject: `feat: add interactive UR5 simulation scene`.
