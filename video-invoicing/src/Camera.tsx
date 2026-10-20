import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';

/**
 * v12 camera rig. A scene declares camera keys on its narration cues; the camera eases between them.
 *   scale: zoom factor (1 = the layout as designed)
 *   focus: the frame point (px) the move is about; `to` is where that point lands on screen (default: the centre)
 *   dur: frames the move takes (default 26); ease: in-out by default, 'out' for a settle, 'in' for a whip exit
 * "Detail first, then pull back", "punch-in on the beat", "zoom into the pin": all are two keys.
 *
 * Motion blur: `<CameraMotionBlur>` changes the time context for its children, so the component that reads
 * `useCurrentFrame()` and applies the transform MUST sit inside it (remotion.dev/docs/motion-blur/common-mistake).
 * That is why the transform lives in `Rig`, a child of the blur wrapper, and not in `Camera` itself.
 */
export type CamKey = {at: number; scale?: number; focus?: {x: number; y: number}; to?: {x: number; y: number}; dur?: number; ease?: 'inOut' | 'out' | 'in'};

const W = 1920;
const H = 1080;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

type Pose = {s: number; tx: number; ty: number};
const pose = (k: CamKey): Pose => {
  const s = k.scale ?? 1;
  const fx = k.focus?.x ?? W / 2;
  const fy = k.focus?.y ?? H / 2;
  const cx = k.to?.x ?? W / 2; // where on screen the focus point lands (default: the centre)
  const cy = k.to?.y ?? H / 2;
  return {s, tx: cx - s * fx, ty: cy - s * fy};
};

export const useCamera = (keys: CamKey[], frame: number): Pose => {
  const ks = [{at: -1e9, scale: 1} as CamKey, ...keys].sort((a, b) => a.at - b.at);
  let i = 0;
  for (let j = 0; j < ks.length; j++) if (ks[j].at <= frame) i = j;
  const cur = ks[i];
  const prev = ks[Math.max(0, i - 1)];
  const dur = cur.dur ?? 26;
  const t = Math.max(0, Math.min(1, (frame - cur.at) / dur));
  const e = (cur.ease === 'out' ? easeOut : cur.ease === 'in' ? easeIn : easeInOut)(t);
  const a = pose(prev);
  const b = pose(cur);
  return {s: a.s + (b.s - a.s) * e, tx: a.tx + (b.tx - a.tx) * e, ty: a.ty + (b.ty - a.ty) * e};
};

/** The transform itself: reads the frame inside the blur context. */
const Rig: React.FC<{keys: CamKey[]; idle: boolean; children: React.ReactNode}> = ({keys, idle, children}) => {
  const frame = useCurrentFrame();
  const {s, tx, ty} = useCamera(keys, frame);
  // living hold: a barely visible push, 3% over 30 s, so no held frame is dead (Shell does this for Shell scenes)
  const creep = idle ? 1 + 0.03 * Math.min(1, frame / 900) : 1;
  return <AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${s * creep})`, transformOrigin: '0 0'}}>{children}</AbsoluteFill>;
};

export const Camera: React.FC<{keys: CamKey[]; children: React.ReactNode; blur?: boolean; samples?: number; idle?: boolean}> = ({keys, children, blur, samples = 4, idle = false}) => {
  return blur ? (
    <CameraMotionBlur shutterAngle={180} samples={samples}>
      <Rig keys={keys} idle={idle}>
        {children}
      </Rig>
    </CameraMotionBlur>
  ) : (
    <Rig keys={keys} idle={idle}>
      {children}
    </Rig>
  );
};
