/**
 * Shared, tiny state store for the landing page's 3D journey filament.
 *
 * The grip writes here on pointer/keyboard input and LandingDepth reads it once
 * per rendered frame. Keeping it outside React avoids a scroll/pointer-driven
 * re-render loop in the WebGL layer and lets the SPA reuse the same control.
 */

export type JourneyControlSnapshot = Readonly<{
  /** -1..1 lateral orbit. */
  yaw: number;
  /** -1..1 vertical orbit. */
  pitch: number;
  dragging: boolean;
}>;

type MutableControls = {
  yaw: number;
  pitch: number;
  dragging: boolean;
};

const state: MutableControls = {
  yaw: 0,
  pitch: 0,
  dragging: false,
};

const listeners = new Set<() => void>();

const clamp = (value: number) => Math.min(1, Math.max(-1, value));

function emit() {
  listeners.forEach((listener) => listener());
}

export const journeyControls = {
  /** Read-only live state. Do not mutate the returned object. */
  get(): JourneyControlSnapshot {
    return state;
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setYawPitch(yaw: number, pitch: number) {
    const nextYaw = clamp(yaw);
    const nextPitch = clamp(pitch);
    if (state.yaw === nextYaw && state.pitch === nextPitch) return;
    state.yaw = nextYaw;
    state.pitch = nextPitch;
    emit();
  },

  nudge(yawDelta: number, pitchDelta: number) {
    const nextYaw = clamp(state.yaw + yawDelta);
    const nextPitch = clamp(state.pitch + pitchDelta);
    if (state.yaw === nextYaw && state.pitch === nextPitch) return;
    state.yaw = nextYaw;
    state.pitch = nextPitch;
    emit();
  },

  setDragging(dragging: boolean) {
    if (state.dragging === dragging) return;
    state.dragging = dragging;
    emit();
  },

  reset() {
    if (state.yaw === 0 && state.pitch === 0 && !state.dragging) return;
    state.yaw = 0;
    state.pitch = 0;
    state.dragging = false;
    emit();
  },
};
