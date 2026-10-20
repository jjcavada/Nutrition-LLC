import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from './theme';

/* B-roll primitives shared by the problem scenes (extracted from Problem12 for v19). */

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t: number) => Math.pow(clamp01(t), 3);
export const CL = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

/** B-roll artifact: enters in perspective at `at`, rises and fades at `until`. */
export const Art: React.FC<{at: number; until: number; x: number; y: number; w: number; side?: 1 | -1; children: React.ReactNode; style?: React.CSSProperties}> = ({at, until, x, y, w, side = 1, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const out = clamp01((frame - until) / 10);
  if (out >= 1) return null;
  const p = spring({frame: frame - at, fps, config: {damping: 22, stiffness: 90, mass: 1.1}});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, perspective: 1600, opacity: Math.min(1, p * 1.8) * (1 - out), transform: `translateY(${-50 * out}px)`, ...style}}>
      <div style={{transform: `rotateY(${(1 - p) * 18 * side}deg) translateY(${(1 - p) * 44}px)`, transformStyle: 'preserve-3d'}}>{children}</div>
    </div>
  );
};

/** A photo under a flat tint with a slow push, between two beats. */
export const Plate: React.FC<{src: string; from: number; to: number; level?: number}> = ({src, from, to, level = 0.26}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to + 12) return null;
  const o = interpolate(frame, [from, from + 14, to, to + 12], [0, 1, 1, 0], CL);
  const t = clamp01((frame - from) / 320);
  return (
    <AbsoluteFill>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + 0.09 * t})`, filter: 'grayscale(0.35)', opacity: level * o}} />
    </AbsoluteFill>
  );
};

export const Card: React.FC<{w?: number; light?: boolean; style?: React.CSSProperties; children: React.ReactNode}> = ({w, light, style, children}) => (
  <div style={{width: w, background: light ? '#fff' : C.paper, border: light ? '1px solid #dfe3d8' : 'none', borderRadius: 18, overflow: 'hidden', color: C.charcoal, fontFamily: F.body, ...style}}>{children}</div>
);

/** Stage wipe helper: the old stage is the base while the wipe runs, the new one sweeps over it with an accent edge. */
export const Wipe: React.FC<{p: number; color: string}> = ({p, color}) =>
  p < 1 ? (
    <>
      <AbsoluteFill style={{background: color, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`}} />
      <div style={{position: 'absolute', top: 0, bottom: 0, left: p * 1920 - 4, width: 8, background: C.greenLight}} />
    </>
  ) : null;

/** A phone frame (390x844 screen at `scale`) for recordings and screenshots. */
export const PhoneFrame: React.FC<{x: number; y: number; scale?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, scale = 1, children, style}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 390 * scale, height: 844 * scale, ...style}}>
    <div style={{position: 'absolute', inset: -12 * scale, borderRadius: 54 * scale, background: '#121512', boxShadow: '0 40px 90px rgba(20,30,20,0.35), inset 0 0 0 3px #2a2e2a'}} />
    <div style={{position: 'absolute', inset: 0, borderRadius: 44 * scale, overflow: 'hidden', background: '#fff'}}>{children}</div>
    <div style={{position: 'absolute', top: 10 * scale, left: '50%', transform: 'translateX(-50%)', width: 110 * scale, height: 30 * scale, borderRadius: 20 * scale, background: '#121512'}} />
  </div>
);
